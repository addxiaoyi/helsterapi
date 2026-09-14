package model

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

type UserSession struct {
	ID            uint64         `json:"id" gorm:"primaryKey"`
	UserID        int            `json:"user_id" gorm:"index;not null"`
	SessionIDHash string         `json:"-" gorm:"uniqueIndex;size:64;not null"`
	DeviceName    string         `json:"device_name" gorm:"size:255"`
	UserAgent     string         `json:"user_agent" gorm:"size:512"`
	IP            string         `json:"-" gorm:"size:128"`
	CreatedAt     int64          `json:"created_at" gorm:"index"`
	LastSeenAt    int64          `json:"last_seen_at"`
	ExpiresAt     int64          `json:"expires_at"`
	RevokedAt     *int64         `json:"revoked_at,omitempty"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

func HashSessionCookie(value string) string {
	digest := sha256.Sum256([]byte(value))
	return hex.EncodeToString(digest[:])
}

func RegisterUserSession(userID int, cookieValue, userAgent, ip string) (*UserSession, error) {
	if userID <= 0 || strings.TrimSpace(cookieValue) == "" {
		return nil, nil
	}
	now := common.GetTimestamp()
	hash := HashSessionCookie(cookieValue)
	session := &UserSession{}
	err := DB.Where("session_id_hash = ?", hash).First(session).Error
	if err == nil {
		if session.RevokedAt != nil || (session.ExpiresAt > 0 && session.ExpiresAt <= now) {
			return session, nil
		}
		session.LastSeenAt = now
		session.UserAgent = truncateSessionValue(userAgent, 512)
		session.IP = truncateSessionValue(ip, 128)
		return session, DB.Save(session).Error
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}
	session = &UserSession{
		UserID:        userID,
		SessionIDHash: hash,
		DeviceName:    sessionDeviceName(userAgent),
		UserAgent:     truncateSessionValue(userAgent, 512),
		IP:            truncateSessionValue(ip, 128),
		CreatedAt:     now,
		LastSeenAt:    now,
		ExpiresAt:     now + 30*24*60*60,
	}
	return session, DB.Create(session).Error
}

func IsSessionRevoked(cookieValue string) (bool, error) {
	if strings.TrimSpace(cookieValue) == "" {
		return false, nil
	}
	var session UserSession
	err := DB.Where("session_id_hash = ?", HashSessionCookie(cookieValue)).First(&session).Error
	if err == gorm.ErrRecordNotFound {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	now := common.GetTimestamp()
	return session.RevokedAt != nil || (session.ExpiresAt > 0 && session.ExpiresAt <= now), nil
}

func ListUserSessions(userID int) ([]*UserSession, error) {
	var sessions []*UserSession
	err := DB.Where("user_id = ? AND revoked_at IS NULL", userID).Order("last_seen_at DESC, id DESC").Find(&sessions).Error
	return sessions, err
}

func RevokeUserSession(userID int, id uint64) error {
	now := common.GetTimestamp()
	return DB.Model(&UserSession{}).Where("id = ? AND user_id = ? AND revoked_at IS NULL", id, userID).Updates(map[string]interface{}{"revoked_at": now}).Error
}

func RevokeOtherUserSessions(userID int, currentCookie string) error {
	hash := HashSessionCookie(currentCookie)
	now := common.GetTimestamp()
	return DB.Model(&UserSession{}).Where("user_id = ? AND session_id_hash <> ? AND revoked_at IS NULL", userID, hash).Updates(map[string]interface{}{"revoked_at": now}).Error
}

func truncateSessionValue(value string, max int) string {
	value = strings.TrimSpace(value)
	if len(value) > max {
		return value[:max]
	}
	return value
}

func sessionDeviceName(userAgent string) string {
	userAgent = strings.TrimSpace(userAgent)
	if userAgent == "" {
		return "Unknown device"
	}
	if len(userAgent) > 80 {
		return userAgent[:80]
	}
	return userAgent
}
