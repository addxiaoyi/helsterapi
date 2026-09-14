package service

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/google/uuid"
)

const backupVersion = 1

type BackupInfo struct {
	ID        string `json:"id"`
	CreatedAt int64  `json:"created_at"`
	Size      int64  `json:"size"`
}

type backupPayload struct {
	Version   int               `json:"version"`
	CreatedAt int64             `json:"created_at"`
	Options   map[string]string `json:"options"`
}

func backupDir() string {
	if value := strings.TrimSpace(os.Getenv("BACKUP_DIR")); value != "" {
		return value
	}
	return filepath.Join("backups")
}

func CreateBackup() (BackupInfo, error) {
	options, err := model.AllOption()
	if err != nil {
		return BackupInfo{}, err
	}
	values := make(map[string]string)
	for _, option := range options {
		if option != nil && isSafeBackupOption(option.Key) {
			values[option.Key] = option.Value
		}
	}
	payload := backupPayload{Version: backupVersion, CreatedAt: time.Now().Unix(), Options: values}
	plaintext, err := json.Marshal(payload)
	if err != nil {
		return BackupInfo{}, err
	}
	ciphertext, err := encryptBackup(plaintext)
	if err != nil {
		return BackupInfo{}, err
	}
	if err := os.MkdirAll(backupDir(), 0o700); err != nil {
		return BackupInfo{}, err
	}
	id := time.Now().UTC().Format("20060102T150405Z") + "-" + uuid.NewString()[:8]
	path := filepath.Join(backupDir(), id+".bak")
	if err := os.WriteFile(path, ciphertext, 0o600); err != nil {
		return BackupInfo{}, err
	}
	return BackupInfo{ID: id, CreatedAt: payload.CreatedAt, Size: int64(len(ciphertext))}, nil
}

func ListBackups() ([]BackupInfo, error) {
	entries, err := os.ReadDir(backupDir())
	if errors.Is(err, os.ErrNotExist) {
		return []BackupInfo{}, nil
	}
	if err != nil {
		return nil, err
	}
	items := make([]BackupInfo, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".bak") {
			continue
		}
		id := strings.TrimSuffix(entry.Name(), ".bak")
		info, err := entry.Info()
		if err != nil {
			return nil, err
		}
		items = append(items, BackupInfo{ID: id, CreatedAt: info.ModTime().Unix(), Size: info.Size()})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].CreatedAt > items[j].CreatedAt })
	return items, nil
}

func ReadBackup(id string) ([]byte, BackupInfo, error) {
	if !validBackupID(id) {
		return nil, BackupInfo{}, errors.New("invalid backup id")
	}
	path := filepath.Join(backupDir(), id+".bak")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, BackupInfo{}, err
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil, BackupInfo{}, err
	}
	return data, BackupInfo{ID: id, CreatedAt: info.ModTime().Unix(), Size: info.Size()}, nil
}

func RestoreBackup(id string) (BackupInfo, error) {
	data, _, err := ReadBackup(id)
	if err != nil {
		return BackupInfo{}, err
	}
	payload, err := decodeBackup(data)
	if err != nil {
		return BackupInfo{}, err
	}
	current, err := CreateBackup()
	if err != nil {
		return BackupInfo{}, fmt.Errorf("current state backup failed: %w", err)
	}
	if err := model.UpdateOptionsBulk(payload.Options); err != nil {
		if rollbackErr := restoreOptionsFromBackup(current.ID); rollbackErr != nil {
			return BackupInfo{}, fmt.Errorf("restore failed: %v; rollback failed: %v", err, rollbackErr)
		}
		return BackupInfo{}, fmt.Errorf("restore failed and was rolled back: %w", err)
	}
	return BackupInfo{ID: id, CreatedAt: payload.CreatedAt, Size: int64(len(data))}, nil
}

func decodeBackup(data []byte) (backupPayload, error) {
	plaintext, err := decryptBackup(data)
	if err != nil {
		return backupPayload{}, fmt.Errorf("backup authentication failed: %w", err)
	}
	var payload backupPayload
	if err := json.Unmarshal(plaintext, &payload); err != nil || payload.Version != backupVersion {
		return backupPayload{}, errors.New("unsupported or malformed backup")
	}
	for key := range payload.Options {
		if !isSafeBackupOption(key) {
			return backupPayload{}, fmt.Errorf("backup contains forbidden option: %s", key)
		}
	}
	return payload, nil
}

func restoreOptionsFromBackup(id string) error {
	data, _, err := ReadBackup(id)
	if err != nil {
		return err
	}
	payload, err := decodeBackup(data)
	if err != nil {
		return err
	}
	return model.UpdateOptionsBulk(payload.Options)
}

func DeleteBackup(id string) error {
	if !validBackupID(id) {
		return errors.New("invalid backup id")
	}
	return os.Remove(filepath.Join(backupDir(), id+".bak"))
}

func isSafeBackupOption(key string) bool {
	lower := strings.ToLower(strings.TrimSpace(key))
	if lower == "" {
		return false
	}
	for _, word := range []string{"key", "secret", "token", "password", "private", "cert", "credential", "clientid", "access"} {
		if strings.Contains(lower, word) {
			return false
		}
	}
	return true
}

func validBackupID(id string) bool {
	if id == "" || strings.ContainsAny(id, `/\\`) || strings.Contains(id, "..") {
		return false
	}
	return len(id) <= 80
}

func backupKey() []byte {
	digest := sha256.Sum256([]byte(common.CryptoSecret))
	return digest[:]
}

func encryptBackup(plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(backupKey())
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

func decryptBackup(data []byte) ([]byte, error) {
	block, err := aes.NewCipher(backupKey())
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(data) < gcm.NonceSize() {
		return nil, errors.New("backup is truncated")
	}
	nonce, ciphertext := data[:gcm.NonceSize()], data[gcm.NonceSize():]
	return gcm.Open(nil, nonce, ciphertext, nil)
}
