package repository

import (
	"context"
	"github.com/QuantumNous/new-api/model"

	"gorm.io/gorm"
)

// TokenRepository 定义令牌数据访问接口
type TokenRepository interface {
	// 基础 CRUD
	Create(ctx context.Context, token *model.Token) error
	Update(ctx context.Context, token *model.Token) error
	Delete(ctx context.Context, id int) error
	FindByID(ctx context.Context, id int) (*model.Token, error)
	FindByKey(ctx context.Context, key string) (*model.Token, error)

	// 查询方法
	GetAllTokens(ctx context.Context, startIdx int, num int) ([]*model.Token, error)
	GetTokensByUserID(ctx context.Context, userID int) ([]*model.Token, error)
	GetTokensByUserIDWithPagination(ctx context.Context, userID int, startIdx int, num int) ([]*model.Token, error)

	// 统计方法
	CountTokens(ctx context.Context) (int64, error)
	CountTokensByUserID(ctx context.Context, userID int) (int64, error)

	// 状态相关
	UpdateTokenStatus(ctx context.Context, id int, status int) error
	BatchUpdateStatus(ctx context.Context, ids []int, status int) error

	// 额度相关
	UpdateTokenQuota(ctx context.Context, id int, remainQuota int, usedQuota int) error
	DecreaseTokenQuota(ctx context.Context, id int, quota int) error

	// 访问时间
	UpdateAccessTime(ctx context.Context, id int) error
}

// gormTokenRepository 是基于 GORM 的实现
type gormTokenRepository struct {
	db *gorm.DB
}

// NewTokenRepository 创建令牌仓储实例
func NewTokenRepository(db *gorm.DB) TokenRepository {
	return &gormTokenRepository{db: db}
}

// Create 创建令牌
func (r *gormTokenRepository) Create(ctx context.Context, token *model.Token) error {
	return r.db.WithContext(ctx).Create(token).Error
}

// Update 更新令牌
func (r *gormTokenRepository) Update(ctx context.Context, token *model.Token) error {
	return r.db.WithContext(ctx).Save(token).Error
}

// Delete 删除令牌
func (r *gormTokenRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.Token{}, id).Error
}

// FindByID 根据ID查找令牌
func (r *gormTokenRepository) FindByID(ctx context.Context, id int) (*model.Token, error) {
	var token model.Token
	err := r.db.WithContext(ctx).First(&token, id).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

// FindByKey 根据Key查找令牌
func (r *gormTokenRepository) FindByKey(ctx context.Context, key string) (*model.Token, error) {
	var token model.Token
	err := r.db.WithContext(ctx).Where("`key` = ?", key).First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

// GetAllTokens 获取所有令牌（分页）
func (r *gormTokenRepository) GetAllTokens(ctx context.Context, startIdx int, num int) ([]*model.Token, error) {
	var tokens []*model.Token
	err := r.db.WithContext(ctx).Order("id DESC").Offset(startIdx).Limit(num).Find(&tokens).Error
	return tokens, err
}

// GetTokensByUserID 根据用户ID获取所有令牌
func (r *gormTokenRepository) GetTokensByUserID(ctx context.Context, userID int) ([]*model.Token, error) {
	var tokens []*model.Token
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("id DESC").Find(&tokens).Error
	return tokens, err
}

// GetTokensByUserIDWithPagination 根据用户ID获取令牌（分页）
func (r *gormTokenRepository) GetTokensByUserIDWithPagination(ctx context.Context, userID int, startIdx int, num int) ([]*model.Token, error) {
	var tokens []*model.Token
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("id DESC").Offset(startIdx).Limit(num).Find(&tokens).Error
	return tokens, err
}

// CountTokens 统计令牌数量
func (r *gormTokenRepository) CountTokens(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Token{}).Count(&count).Error
	return count, err
}

// CountTokensByUserID 统计用户的令牌数量
func (r *gormTokenRepository) CountTokensByUserID(ctx context.Context, userID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Token{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

// UpdateTokenStatus 更新令牌状态
func (r *gormTokenRepository) UpdateTokenStatus(ctx context.Context, id int, status int) error {
	return r.db.WithContext(ctx).Model(&model.Token{}).Where("id = ?", id).Update("status", status).Error
}

// BatchUpdateStatus 批量更新令牌状态
func (r *gormTokenRepository) BatchUpdateStatus(ctx context.Context, ids []int, status int) error {
	return r.db.WithContext(ctx).Model(&model.Token{}).Where("id IN ?", ids).Update("status", status).Error
}

// UpdateTokenQuota 更新令牌额度
func (r *gormTokenRepository) UpdateTokenQuota(ctx context.Context, id int, remainQuota int, usedQuota int) error {
	return r.db.WithContext(ctx).Model(&model.Token{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"remain_quota": remainQuota,
			"used_quota":   usedQuota,
		}).Error
}

// DecreaseTokenQuota 减少令牌额度
func (r *gormTokenRepository) DecreaseTokenQuota(ctx context.Context, id int, quota int) error {
	return r.db.WithContext(ctx).Model(&model.Token{}).Where("id = ?", id).
		Updates(map[string]interface{}{
			"remain_quota": gorm.Expr("remain_quota - ?", quota),
			"used_quota":   gorm.Expr("used_quota + ?", quota),
		}).Error
}

// UpdateAccessTime 更新令牌访问时间
func (r *gormTokenRepository) UpdateAccessTime(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Model(&model.Token{}).Where("id = ?", id).
		Update("accessed_time", gorm.Expr("UNIX_TIMESTAMP()")).Error
}
