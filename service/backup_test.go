package service

import (
	"bytes"
	"testing"
)

func TestBackupEncryptionRoundTripAndTamperDetection(t *testing.T) {
	plain := []byte(`{"version":1,"options":{"GroupRatio":"{}"}}`)
	ciphertext, err := encryptBackup(plain)
	if err != nil {
		t.Fatal(err)
	}
	decoded, err := decryptBackup(ciphertext)
	if err != nil || !bytes.Equal(decoded, plain) {
		t.Fatalf("round trip failed: err=%v decoded=%q", err, decoded)
	}
	ciphertext[len(ciphertext)-1] ^= 1
	if _, err := decryptBackup(ciphertext); err == nil {
		t.Fatal("tampered backup must fail authentication")
	}
}

func TestSafeBackupOptionRejectsSecrets(t *testing.T) {
	for _, key := range []string{"EpayKey", "SMTPToken", "WaffoPrivateKey", "OAuthClientSecret", "PasswordLoginEnabled"} {
		if isSafeBackupOption(key) {
			t.Fatalf("sensitive option accepted: %s", key)
		}
	}
	for _, key := range []string{"GroupRatio", "ModelRatio", "Notice", "SystemName"} {
		if !isSafeBackupOption(key) {
			t.Fatalf("safe option rejected: %s", key)
		}
	}
}
