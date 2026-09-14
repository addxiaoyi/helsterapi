package repository

import (
	"context"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"gorm.io/gorm"
)

// ChannelRepository 定义渠道数据访问接口
type ChannelRepository interface {
	// 基础 CRUD
	Create(ctx context.Context, channel *model.Channel) error
	Update(ctx context.Context, channel *model.Channel) error
	Delete(ctx context.Context, id int) error
	FindByID(ctx context.Context, id int) (*model.Channel, error)

	// 查询方法
	GetAllChannels(ctx context.Context, startIdx int, num int, includeDisabled bool) ([]*model.Channel, error)
	GetChannelsByGroup(ctx context.Context, group string) ([]*model.Channel, error)
	GetChannelsByType(ctx context.Context, channelType int) ([]*model.Channel, error)
	GetEnabledChannels(ctx context.Context) ([]*model.Channel, error)
	GetEnabledChannelsByType(ctx context.Context, channelType int) ([]*model.Channel, error)

	// 统计方法
	CountChannels(ctx context.Context, includeDisabled bool) (int64, error)

	// 状态相关
	UpdateChannelStatus(ctx context.Context, id int, status int) error
	BatchUpdateStatus(ctx context.Context, ids []int, status int) error

	// 优先级相关
	UpdateChannelPriority(ctx context.Context, id int, priority int) error

	// 权重相关
	UpdateChannelWeight(ctx context.Context, id int, weight int) error
}

// gormChannelRepository 是基于 GORM 的实现
type gormChannelRepository struct {
	db *gorm.DB
}

// NewChannelRepository 创建渠道仓储实例
func NewChannelRepository(db *gorm.DB) ChannelRepository {
	return &gormChannelRepository{db: db}
}

// Create 创建渠道
func (r *gormChannelRepository) Create(ctx context.Context, channel *model.Channel) error {
	return r.db.WithContext(ctx).Create(channel).Error
}

// Update 更新渠道
func (r *gormChannelRepository) Update(ctx context.Context, channel *model.Channel) error {
	return r.db.WithContext(ctx).Save(channel).Error
}

// Delete 删除渠道
func (r *gormChannelRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.Channel{}, id).Error
}

// FindByID 根据ID查找渠道
func (r *gormChannelRepository) FindByID(ctx context.Context, id int) (*model.Channel, error) {
	var channel model.Channel
	err := r.db.WithContext(ctx).First(&channel, id).Error
	if err != nil {
		return nil, err
	}
	return &channel, nil
}

// GetAllChannels 获取所有渠道（分页）
func (r *gormChannelRepository) GetAllChannels(ctx context.Context, startIdx int, num int, includeDisabled bool) ([]*model.Channel, error) {
	var channels []*model.Channel
	db := r.db.WithContext(ctx)

	if !includeDisabled {
		db = db.Where("status = ?", common.ChannelStatusEnabled)
	}

	err := db.Order("priority DESC, id DESC").Offset(startIdx).Limit(num).Find(&channels).Error
	return channels, err
}

// GetChannelsByGroup 根据分组获取渠道
func (r *gormChannelRepository) GetChannelsByGroup(ctx context.Context, group string) ([]*model.Channel, error) {
	var channels []*model.Channel
	err := r.db.WithContext(ctx).Where("`group` = ?", group).
		Order("priority DESC, id DESC").Find(&channels).Error
	return channels, err
}

// GetChannelsByType 根据类型获取渠道
func (r *gormChannelRepository) GetChannelsByType(ctx context.Context, channelType int) ([]*model.Channel, error) {
	var channels []*model.Channel
	err := r.db.WithContext(ctx).Where("type = ?", channelType).
		Order("priority DESC, id DESC").Find(&channels).Error
	return channels, err
}

// GetEnabledChannels 获取所有启用的渠道
func (r *gormChannelRepository) GetEnabledChannels(ctx context.Context) ([]*model.Channel, error) {
	var channels []*model.Channel
	err := r.db.WithContext(ctx).Where("status = ?", common.ChannelStatusEnabled).
		Order("priority DESC, id DESC").Find(&channels).Error
	return channels, err
}

// GetEnabledChannelsByType 获取指定类型的启用渠道
func (r *gormChannelRepository) GetEnabledChannelsByType(ctx context.Context, channelType int) ([]*model.Channel, error) {
	var channels []*model.Channel
	err := r.db.WithContext(ctx).
		Where("status = ? AND type = ?", common.ChannelStatusEnabled, channelType).
		Order("priority DESC, id DESC").Find(&channels).Error
	return channels, err
}

// CountChannels 统计渠道数量
func (r *gormChannelRepository) CountChannels(ctx context.Context, includeDisabled bool) (int64, error) {
	var count int64
	db := r.db.WithContext(ctx).Model(&model.Channel{})

	if !includeDisabled {
		db = db.Where("status = ?", common.ChannelStatusEnabled)
	}

	err := db.Count(&count).Error
	return count, err
}

// UpdateChannelStatus 更新渠道状态
func (r *gormChannelRepository) UpdateChannelStatus(ctx context.Context, id int, status int) error {
	return r.db.WithContext(ctx).Model(&model.Channel{}).Where("id = ?", id).Update("status", status).Error
}

// BatchUpdateStatus 批量更新渠道状态
func (r *gormChannelRepository) BatchUpdateStatus(ctx context.Context, ids []int, status int) error {
	return r.db.WithContext(ctx).Model(&model.Channel{}).Where("id IN ?", ids).Update("status", status).Error
}

// UpdateChannelPriority 更新渠道优先级
func (r *gormChannelRepository) UpdateChannelPriority(ctx context.Context, id int, priority int) error {
	return r.db.WithContext(ctx).Model(&model.Channel{}).Where("id = ?", id).Update("priority", priority).Error
}

// UpdateChannelWeight 更新渠道权重
func (r *gormChannelRepository) UpdateChannelWeight(ctx context.Context, id int, weight int) error {
	return r.db.WithContext(ctx).Model(&model.Channel{}).Where("id = ?", id).Update("weight", weight).Error
}
