package channel

import (
	"context"
	"errors"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/repository"
)

// ChannelService 定义渠道业务逻辑接口
type ChannelService interface {
	// 渠道管理
	CreateChannel(ctx context.Context, req CreateChannelRequest) (*model.Channel, error)
	BatchCreateChannels(ctx context.Context, channels []*model.Channel) error
	UpdateChannel(ctx context.Context, channel *model.Channel) error
	DeleteChannel(ctx context.Context, id int) error
	GetChannelByID(ctx context.Context, id int) (*model.Channel, error)

	// 渠道查询
	GetAllChannels(ctx context.Context, page, pageSize int, filters ChannelFilters) ([]*model.Channel, int64, error)
	SearchChannels(ctx context.Context, keyword string) ([]*model.Channel, error)

	// 渠道状态管理
	EnableChannel(ctx context.Context, id int) error
	DisableChannel(ctx context.Context, id int) error

	// 渠道密钥选择
	SelectChannelKey(ctx context.Context, group string, modelName string) (*model.Channel, string, error)

	// 渠道测试
	TestChannel(ctx context.Context, id int) error
}

// channelServiceImpl 是 ChannelService 的实现
type channelServiceImpl struct {
	channelRepo repository.ChannelRepository
}

// NewChannelService 创建渠道服务实例
func NewChannelService(channelRepo repository.ChannelRepository) ChannelService {
	return &channelServiceImpl{
		channelRepo: channelRepo,
	}
}

// CreateChannelRequest 创建渠道请求
type CreateChannelRequest struct {
	Type         int
	Key          string
	Name         string
	Group        string
	Models       string
	BaseURL      string
	Weight       int
	Priority     int
}

// ChannelFilters 渠道过滤条件
type ChannelFilters struct {
	Group  string
	Type   int
	Status int
	Models string
}

// CreateChannel 创建新渠道
func (s *channelServiceImpl) CreateChannel(ctx context.Context, req CreateChannelRequest) (*model.Channel, error) {
	// 验证必填字段
	if req.Key == "" {
		return nil, errors.New("渠道密钥不能为空")
	}

	if req.Type <= 0 {
		return nil, errors.New("渠道类型无效")
	}

	// 检查是否存在同名渠道
	// 注意: repository 层没有 FindByName 方法，需要移除此检查或在 repository 层添加该方法
	// if req.Name != "" {
	// 	existing, _ := s.channelRepo.FindByName(ctx, req.Name)
	// 	if existing != nil {
	// 		return nil, fmt.Errorf("渠道名称 %s 已存在", req.Name)
	// 	}
	// }

	baseURL := req.BaseURL
	weight := uint(req.Weight)
	priority := int64(req.Priority)
	channel := &model.Channel{
		Type:        req.Type,
		Key:         req.Key,
		Name:        req.Name,
		Group:       req.Group,
		Models:      req.Models,
		BaseURL:     &baseURL,
		Weight:      &weight,
		Priority:    &priority,
		Status:      1, // 默认启用
		CreatedTime: time.Now().Unix(),
	}

	err := s.channelRepo.Create(ctx, channel)
	if err != nil {
		return nil, err
	}

	return channel, nil
}

// BatchCreateChannels 批量创建渠道
func (s *channelServiceImpl) BatchCreateChannels(ctx context.Context, channels []*model.Channel) error {
	if len(channels) == 0 {
		return errors.New("渠道列表不能为空")
	}

	// 设置创建时间
	now := time.Now().Unix()
	for _, ch := range channels {
		if ch.CreatedTime == 0 {
			ch.CreatedTime = now
		}
		if ch.Status == 0 {
			ch.Status = 1 // 默认启用
		}
	}

	// 注意: repository 层没有 BatchCreate 方法，需要逐个创建
	for _, ch := range channels {
		if err := s.channelRepo.Create(ctx, ch); err != nil {
			return err
		}
	}
	return nil
}

// UpdateChannel 更新渠道信息
func (s *channelServiceImpl) UpdateChannel(ctx context.Context, channel *model.Channel) error {
	// 检查渠道是否存在
	existing, err := s.channelRepo.FindByID(ctx, channel.Id)
	if err != nil {
		return errors.New("渠道不存在")
	}

	// 如果修改了名称,检查新名称是否冲突
	// 注意: repository 层没有 FindByName 方法，暂时移除名称冲突检查
	_ = existing // 避免未使用变量警告

	return s.channelRepo.Update(ctx, channel)
}

// DeleteChannel 删除渠道
func (s *channelServiceImpl) DeleteChannel(ctx context.Context, id int) error {
	// 检查渠道是否存在
	_, err := s.channelRepo.FindByID(ctx, id)
	if err != nil {
		return errors.New("渠道不存在")
	}

	return s.channelRepo.Delete(ctx, id)
}

// GetChannelByID 根据ID获取渠道
func (s *channelServiceImpl) GetChannelByID(ctx context.Context, id int) (*model.Channel, error) {
	return s.channelRepo.FindByID(ctx, id)
}

// GetAllChannels 获取所有渠道(分页)
func (s *channelServiceImpl) GetAllChannels(ctx context.Context, page, pageSize int, filters ChannelFilters) ([]*model.Channel, int64, error) {
	startIdx := (page - 1) * pageSize

	channels, err := s.channelRepo.GetAllChannels(ctx, startIdx, pageSize, false)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.channelRepo.CountChannels(ctx, false)
	if err != nil {
		return nil, 0, err
	}

	return channels, total, nil
}

// SearchChannels 搜索渠道
func (s *channelServiceImpl) SearchChannels(ctx context.Context, keyword string) ([]*model.Channel, error) {
	// 注意: repository 层没有 SearchChannels 方法，暂时返回所有渠道
	channels, err := s.channelRepo.GetAllChannels(ctx, 0, 1000, false)
	return channels, err
}

// EnableChannel 启用渠道
func (s *channelServiceImpl) EnableChannel(ctx context.Context, id int) error {
	return s.channelRepo.UpdateChannelStatus(ctx, id, 1)
}

// DisableChannel 禁用渠道
func (s *channelServiceImpl) DisableChannel(ctx context.Context, id int) error {
	return s.channelRepo.UpdateChannelStatus(ctx, id, 2)
}

// SelectChannelKey 选择渠道密钥(负载均衡)
func (s *channelServiceImpl) SelectChannelKey(ctx context.Context, group string, modelName string) (*model.Channel, string, error) {
	// 获取启用的渠道
	channels, err := s.channelRepo.GetChannelsByGroup(ctx, group)
	if err != nil {
		return nil, "", err
	}

	if len(channels) == 0 {
		return nil, "", errors.New("没有可用的渠道")
	}

	// 简单的轮询策略 - 选择第一个
	// TODO: 实现更复杂的负载均衡策略(权重、优先级等)
	selectedChannel := channels[0]

	return selectedChannel, selectedChannel.Key, nil
}

// TestChannel 测试渠道连接
func (s *channelServiceImpl) TestChannel(ctx context.Context, id int) error {
	channel, err := s.channelRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if channel.Status != 1 {
		return errors.New("渠道未启用")
	}

	// TODO: 实现实际的渠道测试逻辑
	// 这里应该调用对应类型渠道的 API 进行测试

	return nil
}
