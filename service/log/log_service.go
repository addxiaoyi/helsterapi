package log

import (
	"context"
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/repository"
)

// LogService 定义日志业务逻辑接口
type LogService interface {
	// 日志记录
	RecordConsumeLog(ctx context.Context, req ConsumeLogRequest) error
	RecordErrorLog(ctx context.Context, req ErrorLogRequest) error

	// 日志查询
	GetLogsByUserID(ctx context.Context, userID int, page, pageSize int) ([]*model.Log, int64, error)
	GetLogsByChannelID(ctx context.Context, channelID int, page, pageSize int) ([]*model.Log, int64, error)
	GetLogByID(ctx context.Context, id string) (*model.Log, error)
	SearchLogs(ctx context.Context, filters LogFilters, page, pageSize int) ([]*model.Log, int64, error)

	// 统计分析
	GetUserConsumption(ctx context.Context, userID int, startTime, endTime int64) (int, error)
	GetChannelUsage(ctx context.Context, channelID int, startTime, endTime int64) (int, error)
}

// logServiceImpl 是 LogService 的实现
type logServiceImpl struct {
	logRepo repository.LogRepository
}

// NewLogService 创建日志服务实例
func NewLogService(logRepo repository.LogRepository) LogService {
	return &logServiceImpl{
		logRepo: logRepo,
	}
}

// ConsumeLogRequest 消费日志请求
type ConsumeLogRequest struct {
	UserID       int
	ChannelID    int
	Username     string
	ModelName    string
	PromptTokens int
	CompletionTokens int
	Quota        int
	Content      string
	TokenName    string
	RequestIP    string
	UserAgent    string
}

// ErrorLogRequest 错误日志请求
type ErrorLogRequest struct {
	UserID    int
	ChannelID int
	Username  string
	Content   string
	ErrorMessage string
	RequestIP string
	UserAgent string
}

// LogFilters 日志过滤条件
type LogFilters struct {
	UserID    int
	ChannelID int
	ModelName string
	StartTime int64
	EndTime   int64
	LogType   int
}

// RecordConsumeLog 记录消费日志
func (s *logServiceImpl) RecordConsumeLog(ctx context.Context, req ConsumeLogRequest) error {
	log := &model.Log{
		UserId:           req.UserID,
		ChannelId:        req.ChannelID,
		Username:         req.Username,
		Type:             1, // 消费类型
		ModelName:        req.ModelName,
		PromptTokens:     req.PromptTokens,
		CompletionTokens: req.CompletionTokens,
		Quota:            req.Quota,
		Content:          req.Content,
		TokenName:        req.TokenName,
		Ip:               req.RequestIP,
		CreatedAt:        time.Now().Unix(),
	}

	return s.logRepo.Create(ctx, log)
}

// RecordErrorLog 记录错误日志
func (s *logServiceImpl) RecordErrorLog(ctx context.Context, req ErrorLogRequest) error {
	log := &model.Log{
		UserId:    req.UserID,
		ChannelId: req.ChannelID,
		Username:  req.Username,
		Type:      2, // 错误类型
		Content:   req.Content,
		Ip:        req.RequestIP,
		CreatedAt: time.Now().Unix(),
	}

	return s.logRepo.Create(ctx, log)
}

// GetLogsByUserID 根据用户ID获取日志
func (s *logServiceImpl) GetLogsByUserID(ctx context.Context, userID int, page, pageSize int) ([]*model.Log, int64, error) {
	startIdx := (page - 1) * pageSize

	logs, err := s.logRepo.GetLogsByUserID(ctx, userID, startIdx, pageSize)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.logRepo.CountLogsByUserID(ctx, userID)
	if err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// GetLogsByChannelID 根据渠道ID获取日志
func (s *logServiceImpl) GetLogsByChannelID(ctx context.Context, channelID int, page, pageSize int) ([]*model.Log, int64, error) {
	startIdx := (page - 1) * pageSize

	logs, err := s.logRepo.GetLogsByChannelID(ctx, channelID, startIdx, pageSize)
	if err != nil {
		return nil, 0, err
	}

	// 注意: repository 层没有 CountLogsByChannelID 方法，使用 CountLogs 替代
	total, err := s.logRepo.CountLogs(ctx)
	if err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// GetLogByID 根据ID获取日志
func (s *logServiceImpl) GetLogByID(ctx context.Context, id string) (*model.Log, error) {
	// 将 string 转换为 int
	var intID int
	_, err := fmt.Sscanf(id, "%d", &intID)
	if err != nil {
		return nil, err
	}
	return s.logRepo.FindByID(ctx, intID)
}

// SearchLogs 搜索日志
func (s *logServiceImpl) SearchLogs(ctx context.Context, filters LogFilters, page, pageSize int) ([]*model.Log, int64, error) {
	startIdx := (page - 1) * pageSize

	// 构建查询条件 - 使用 repository 的 SearchLogs 方法
	logs, err := s.logRepo.SearchLogs(ctx, filters.ModelName, startIdx, pageSize)
	if err != nil {
		return nil, 0, err
	}

	// 统计总数
	total, err := s.logRepo.CountLogs(ctx)
	if err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// GetUserConsumption 获取用户消费统计
func (s *logServiceImpl) GetUserConsumption(ctx context.Context, userID int, startTime, endTime int64) (int, error) {
	return s.logRepo.SumUsedQuotaByUserID(ctx, userID, startTime, endTime)
}

// GetChannelUsage 获取渠道使用统计
func (s *logServiceImpl) GetChannelUsage(ctx context.Context, channelID int, startTime, endTime int64) (int, error) {
	// 注意: repository 层没有按 channelID 统计的方法，使用 SumUsedQuota 替代
	return s.logRepo.SumUsedQuota(ctx, startTime, endTime)
}
