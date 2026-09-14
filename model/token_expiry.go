package model

import (
	"time"

	"gorm.io/gorm"
)

// AccessTokenExpiry 管理 AccessToken 的过期时间
type AccessTokenExpiry struct {
	UserID    int   `gorm:"primaryKey;column:user_id"`
	ExpiresAt int64 `gorm:"column:expires_at;index"` // Unix timestamp
	CreatedAt int64 `gorm:"autoCreateTime;column:created_at"`
}

func (AccessTokenExpiry) TableName() string {
	return "access_token_expiry"
}

// SetAccessTokenExpiry 设置 AccessToken 的过期时间（默认90天）
func SetAccessTokenExpiry(userID int, durationDays int) error {
	if durationDays <= 0 {
		durationDays = 90 // 默认90天
	}

	expiresAt := time.Now().Add(time.Duration(durationDays) * 24 * time.Hour).Unix()

	expiry := &AccessTokenExpiry{
		UserID:    userID,
		ExpiresAt: expiresAt,
	}

	return DB.Save(expiry).Error
}

// GetAccessTokenExpiry 获取 AccessToken 的过期时间
func GetAccessTokenExpiry(userID int) (*AccessTokenExpiry, error) {
	expiry := &AccessTokenExpiry{}
	err := DB.Where("user_id = ?", userID).First(expiry).Error
	if err != nil {
		return nil, err
	}
	return expiry, nil
}

// IsAccessTokenExpired 检查 AccessToken 是否过期
func IsAccessTokenExpired(userID int) (bool, error) {
	expiry, err := GetAccessTokenExpiry(userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// 没有过期记录，认为没有设置过期时间（永久有效）
			return false, nil
		}
		return true, err
	}

	now := time.Now().Unix()
	return now > expiry.ExpiresAt, nil
}

// RevokeAccessToken 撤销 AccessToken（设置为已过期）
func RevokeAccessToken(userID int) error {
	return DB.Model(&AccessTokenExpiry{}).
		Where("user_id = ?", userID).
		Update("expires_at", time.Now().Unix()-1).Error
}

// CleanupExpiredTokens 清理已过期的 token 记录（定期任务）
func CleanupExpiredTokens() error {
	now := time.Now().Unix()

	// 1. 找出所有过期的 token
	var expiredUsers []int
	err := DB.Model(&AccessTokenExpiry{}).
		Where("expires_at < ?", now).
		Pluck("user_id", &expiredUsers).Error
	if err != nil {
		return err
	}

	// 2. 将这些用户的 access_token 设置为 NULL
	if len(expiredUsers) > 0 {
		err = DB.Model(&User{}).
			Where("id IN ?", expiredUsers).
			Update("access_token", nil).Error
		if err != nil {
			return err
		}
	}

	// 3. 删除过期记录
	return DB.Where("expires_at < ?", now).Delete(&AccessTokenExpiry{}).Error
}

// InitAccessTokenExpiryTable 初始化表（在 migration 中调用）
func InitAccessTokenExpiryTable() error {
	return DB.AutoMigrate(&AccessTokenExpiry{})
}
