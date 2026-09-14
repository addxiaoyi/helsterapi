package token

import (
	"context"
	"errors"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/repository"
)

// TokenService 定义令牌业务逻辑接口
type TokenService interface {
	// 令牌管理
	CreateToken(ctx context.Context, req CreateTokenRequest) (*model.Token, error)
	UpdateToken(ctx context.Context, token *model.Token) error
	DeleteToken(ctx context.Context, id int) error
	GetTokenByID(ctx context.Context, id int) (*model.Token, error)
	GetTokenByKey(ctx context.Context, key string) (*model.Token, error)

	// 令牌查询
	GetAllTokens(ctx context.Context, page, pageSize int) ([]*model.Token, int64, error)
	GetTokensByUserID(ctx context.Context, userID int, page, pageSize int) ([]*model.Token, int64, error)

	// 令牌状态管理
	EnableToken(ctx context.Context, id int) error
	DisableToken(ctx context.Context, id int) error

	// 令牌额度管理
	ConsumeQuota(ctx context.Context, id int, quota int) error
	CheckQuota(ctx context.Context, id int, required int) error

	// 令牌验证
	ValidateToken(ctx context.Context, key string) (*model.Token, error)
}

// tokenServiceImpl 是 TokenService 的实现
type tokenServiceImpl struct {
	tokenRepo repository.TokenRepository
}

// NewTokenService 创建令牌服务实例
func NewTokenService(tokenRepo repository.TokenRepository) TokenService {
	return &tokenServiceImpl{
		tokenRepo: tokenRepo,
	}
}

// CreateTokenRequest 创建令牌请求
type CreateTokenRequest struct {
	UserID      int
	Name        string
	Key         string
	RemainQuota int
	ExpiredTime int64
	UnlimitedQuota bool
}

// CreateToken 创建新令牌
func (s *tokenServiceImpl) CreateToken(ctx context.Context, req CreateTokenRequest) (*model.Token, error) {
	// 验证必填字段
	if req.UserID <= 0 {
		return nil, errors.New("用户ID无效")
	}

	if req.Key == "" {
		req.Key = common.GetUUID()
	}

	// 检查 key 是否已存在
	existing, _ := s.tokenRepo.FindByKey(ctx, req.Key)
	if existing != nil {
		return nil, errors.New("令牌Key已存在")
	}

	token := &model.Token{
		UserId:         req.UserID,
		Name:           req.Name,
		Key:            req.Key,
		RemainQuota:    req.RemainQuota,
		UsedQuota:      0,
		ExpiredTime:    req.ExpiredTime,
		UnlimitedQuota: req.UnlimitedQuota,
		Status:         common.TokenStatusEnabled,
		CreatedTime:    time.Now().Unix(),
	}

	err := s.tokenRepo.Create(ctx, token)
	if err != nil {
		return nil, err
	}

	return token, nil
}

// UpdateToken 更新令牌信息
func (s *tokenServiceImpl) UpdateToken(ctx context.Context, token *model.Token) error {
	// 检查令牌是否存在
	_, err := s.tokenRepo.FindByID(ctx, token.Id)
	if err != nil {
		return errors.New("令牌不存在")
	}

	return s.tokenRepo.Update(ctx, token)
}

// DeleteToken 删除令牌
func (s *tokenServiceImpl) DeleteToken(ctx context.Context, id int) error {
	// 检查令牌是否存在
	_, err := s.tokenRepo.FindByID(ctx, id)
	if err != nil {
		return errors.New("令牌不存在")
	}

	return s.tokenRepo.Delete(ctx, id)
}

// GetTokenByID 根据ID获取令牌
func (s *tokenServiceImpl) GetTokenByID(ctx context.Context, id int) (*model.Token, error) {
	return s.tokenRepo.FindByID(ctx, id)
}

// GetTokenByKey 根据Key获取令牌
func (s *tokenServiceImpl) GetTokenByKey(ctx context.Context, key string) (*model.Token, error) {
	return s.tokenRepo.FindByKey(ctx, key)
}

// GetAllTokens 获取所有令牌(分页)
func (s *tokenServiceImpl) GetAllTokens(ctx context.Context, page, pageSize int) ([]*model.Token, int64, error) {
	startIdx := (page - 1) * pageSize

	tokens, err := s.tokenRepo.GetAllTokens(ctx, startIdx, pageSize)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.tokenRepo.CountTokens(ctx)
	if err != nil {
		return nil, 0, err
	}

	return tokens, total, nil
}

// GetTokensByUserID 根据用户ID获取令牌(分页)
func (s *tokenServiceImpl) GetTokensByUserID(ctx context.Context, userID int, page, pageSize int) ([]*model.Token, int64, error) {
	startIdx := (page - 1) * pageSize

	tokens, err := s.tokenRepo.GetTokensByUserIDWithPagination(ctx, userID, startIdx, pageSize)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.tokenRepo.CountTokensByUserID(ctx, userID)
	if err != nil {
		return nil, 0, err
	}

	return tokens, total, nil
}

// EnableToken 启用令牌
func (s *tokenServiceImpl) EnableToken(ctx context.Context, id int) error {
	return s.tokenRepo.UpdateTokenStatus(ctx, id, common.TokenStatusEnabled)
}

// DisableToken 禁用令牌
func (s *tokenServiceImpl) DisableToken(ctx context.Context, id int) error {
	return s.tokenRepo.UpdateTokenStatus(ctx, id, common.TokenStatusDisabled)
}

// ConsumeQuota 消费令牌额度
func (s *tokenServiceImpl) ConsumeQuota(ctx context.Context, id int, quota int) error {
	if quota <= 0 {
		return errors.New("消费额度必须大于0")
	}

	// 检查令牌状态和额度
	token, err := s.tokenRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if token.Status != common.TokenStatusEnabled {
		return errors.New("令牌未启用")
	}

	// 检查是否过期
	if token.ExpiredTime > 0 && token.ExpiredTime < time.Now().Unix() {
		return errors.New("令牌已过期")
	}

	// 如果不是无限额度,检查剩余额度
	if !token.UnlimitedQuota && token.RemainQuota < quota {
		return errors.New("额度不足")
	}

	// 减少额度
	return s.tokenRepo.DecreaseTokenQuota(ctx, id, quota)
}

// CheckQuota 检查令牌额度是否足够
func (s *tokenServiceImpl) CheckQuota(ctx context.Context, id int, required int) error {
	token, err := s.tokenRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if token.Status != common.TokenStatusEnabled {
		return errors.New("令牌未启用")
	}

	// 检查是否过期
	if token.ExpiredTime > 0 && token.ExpiredTime < time.Now().Unix() {
		return errors.New("令牌已过期")
	}

	// 如果不是无限额度,检查剩余额度
	if !token.UnlimitedQuota && token.RemainQuota < required {
		return errors.New("额度不足")
	}

	return nil
}

// ValidateToken 验证令牌
func (s *tokenServiceImpl) ValidateToken(ctx context.Context, key string) (*model.Token, error) {
	token, err := s.tokenRepo.FindByKey(ctx, key)
	if err != nil {
		return nil, errors.New("令牌无效")
	}

	if token.Status != common.TokenStatusEnabled {
		return nil, errors.New("令牌未启用")
	}

	// 检查是否过期
	if token.ExpiredTime > 0 && token.ExpiredTime < time.Now().Unix() {
		return nil, errors.New("令牌已过期")
	}

	// 更新最后访问时间
	_ = s.tokenRepo.UpdateAccessTime(ctx, token.Id)

	return token, nil
}
