package repository

import (
	"context"
	"github.com/QuantumNous/new-api/model"

	"gorm.io/gorm"
)

// LogRepository 定义日志数据访问接口
type LogRepository interface {
	// 基础 CRUD
	Create(ctx context.Context, log *model.Log) error
	Delete(ctx context.Context, id int) error
	FindByID(ctx context.Context, id int) (*model.Log, error)

	// 查询方法
	GetAllLogs(ctx context.Context, startIdx int, num int, order string) ([]*model.Log, error)
	GetLogsByUserID(ctx context.Context, userID int, startIdx int, num int) ([]*model.Log, error)
	GetLogsByChannelID(ctx context.Context, channelID int, startIdx int, num int) ([]*model.Log, error)
	GetLogsByTokenID(ctx context.Context, tokenID int, startIdx int, num int) ([]*model.Log, error)
	SearchLogs(ctx context.Context, keyword string, startIdx int, num int) ([]*model.Log, error)

	// 统计方法
	CountLogs(ctx context.Context) (int64, error)
	CountLogsByUserID(ctx context.Context, userID int) (int64, error)
	SumUsedQuota(ctx context.Context, startTimestamp int64, endTimestamp int64) (int, error)
	SumUsedQuotaByUserID(ctx context.Context, userID int, startTimestamp int64, endTimestamp int64) (int, error)

	// 批量删除
	DeleteLogsBefore(ctx context.Context, timestamp int64) error
	DeleteLogsByUserID(ctx context.Context, userID int) error
}

// gormLogRepository 是基于 GORM 的实现
type gormLogRepository struct {
	db *gorm.DB
}

// NewLogRepository 创建日志仓储实例
func NewLogRepository(db *gorm.DB) LogRepository {
	return &gormLogRepository{db: db}
}

// Create 创建日志
func (r *gormLogRepository) Create(ctx context.Context, log *model.Log) error {
	return r.db.WithContext(ctx).Create(log).Error
}

// Delete 删除日志
func (r *gormLogRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.Log{}, id).Error
}

// FindByID 根据ID查找日志
func (r *gormLogRepository) FindByID(ctx context.Context, id int) (*model.Log, error) {
	var log model.Log
	err := r.db.WithContext(ctx).First(&log, id).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// GetAllLogs 获取所有日志（分页）
func (r *gormLogRepository) GetAllLogs(ctx context.Context, startIdx int, num int, order string) ([]*model.Log, error) {
	var logs []*model.Log
	db := r.db.WithContext(ctx)

	if order != "" {
		db = db.Order(order)
	} else {
		db = db.Order("id DESC")
	}

	err := db.Offset(startIdx).Limit(num).Find(&logs).Error
	return logs, err
}

// GetLogsByUserID 根据用户ID获取日志
func (r *gormLogRepository) GetLogsByUserID(ctx context.Context, userID int, startIdx int, num int) ([]*model.Log, error) {
	var logs []*model.Log
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("id DESC").Offset(startIdx).Limit(num).Find(&logs).Error
	return logs, err
}

// GetLogsByChannelID 根据渠道ID获取日志
func (r *gormLogRepository) GetLogsByChannelID(ctx context.Context, channelID int, startIdx int, num int) ([]*model.Log, error) {
	var logs []*model.Log
	err := r.db.WithContext(ctx).Where("channel_id = ?", channelID).
		Order("id DESC").Offset(startIdx).Limit(num).Find(&logs).Error
	return logs, err
}

// GetLogsByTokenID 根据令牌ID获取日志
func (r *gormLogRepository) GetLogsByTokenID(ctx context.Context, tokenID int, startIdx int, num int) ([]*model.Log, error) {
	var logs []*model.Log
	err := r.db.WithContext(ctx).Where("token_id = ?", tokenID).
		Order("id DESC").Offset(startIdx).Limit(num).Find(&logs).Error
	return logs, err
}

// SearchLogs 搜索日志
func (r *gormLogRepository) SearchLogs(ctx context.Context, keyword string, startIdx int, num int) ([]*model.Log, error) {
	var logs []*model.Log
	db := r.db.WithContext(ctx)

	if keyword != "" {
		db = db.Where("model_name LIKE ? OR content LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	err := db.Order("id DESC").Offset(startIdx).Limit(num).Find(&logs).Error
	return logs, err
}

// CountLogs 统计日志数量
func (r *gormLogRepository) CountLogs(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Log{}).Count(&count).Error
	return count, err
}

// CountLogsByUserID 统计用户的日志数量
func (r *gormLogRepository) CountLogsByUserID(ctx context.Context, userID int) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.Log{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

// SumUsedQuota 统计时间范围内的总消费额度
func (r *gormLogRepository) SumUsedQuota(ctx context.Context, startTimestamp int64, endTimestamp int64) (int, error) {
	var sum int64
	err := r.db.WithContext(ctx).Model(&model.Log{}).
		Where("created_at >= ? AND created_at <= ?", startTimestamp, endTimestamp).
		Select("COALESCE(SUM(quota), 0)").Scan(&sum).Error
	return int(sum), err
}

// SumUsedQuotaByUserID 统计用户在时间范围内的总消费额度
func (r *gormLogRepository) SumUsedQuotaByUserID(ctx context.Context, userID int, startTimestamp int64, endTimestamp int64) (int, error) {
	var sum int64
	err := r.db.WithContext(ctx).Model(&model.Log{}).
		Where("user_id = ? AND created_at >= ? AND created_at <= ?", userID, startTimestamp, endTimestamp).
		Select("COALESCE(SUM(quota), 0)").Scan(&sum).Error
	return int(sum), err
}

// DeleteLogsBefore 删除指定时间之前的日志
func (r *gormLogRepository) DeleteLogsBefore(ctx context.Context, timestamp int64) error {
	return r.db.WithContext(ctx).Where("created_at < ?", timestamp).Delete(&model.Log{}).Error
}

// DeleteLogsByUserID 删除用户的所有日志
func (r *gormLogRepository) DeleteLogsByUserID(ctx context.Context, userID int) error {
	return r.db.WithContext(ctx).Where("user_id = ?", userID).Delete(&model.Log{}).Error
}
