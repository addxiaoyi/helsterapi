package user

import (
	"context"
	"errors"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/repository"
)

// UserService 定义用户业务逻辑接口
type UserService interface {
	// 用户注册和认证
	RegisterUser(ctx context.Context, req RegisterRequest) (*model.User, error)
	LoginUser(ctx context.Context, req LoginRequest) (*model.User, error)
	ValidatePassword(ctx context.Context, username, password string) (*model.User, error)

	// 用户管理
	GetUserByID(ctx context.Context, id int) (*model.User, error)
	GetUserByUsername(ctx context.Context, username string) (*model.User, error)
	GetAllUsers(ctx context.Context, page, pageSize int, order string) ([]*model.User, int64, error)
	SearchUsers(ctx context.Context, keyword string) ([]*model.User, error)
	UpdateUser(ctx context.Context, user *model.User) error
	DeleteUser(ctx context.Context, id int) error

	// 用户状态管理
	EnableUser(ctx context.Context, id int) error
	DisableUser(ctx context.Context, id int) error

	// 额度管理
	IncreaseQuota(ctx context.Context, userID int, amount int) error
	DecreaseQuota(ctx context.Context, userID int, amount int) error
	CheckQuota(ctx context.Context, userID int, required int) error
}

// userServiceImpl 是 UserService 的实现
type userServiceImpl struct {
	userRepo repository.UserRepository
}

// NewUserService 创建用户服务实例
func NewUserService(userRepo repository.UserRepository) UserService {
	return &userServiceImpl{
		userRepo: userRepo,
	}
}

// RegisterRequest 注册请求
type RegisterRequest struct {
	Username    string
	Password    string
	Email       string
	DisplayName string
}

// LoginRequest 登录请求
type LoginRequest struct {
	Username string
	Password string
}

// RegisterUser 注册新用户
func (s *userServiceImpl) RegisterUser(ctx context.Context, req RegisterRequest) (*model.User, error) {
	// 检查用户名是否已存在
	existingUser, err := s.userRepo.FindByUsername(ctx, req.Username)
	if err == nil && existingUser != nil {
		return nil, errors.New("用户名已存在")
	}

	// 检查邮箱是否已存在
	if req.Email != "" {
		existingUser, err = s.userRepo.FindByEmail(ctx, req.Email)
		if err == nil && existingUser != nil {
			return nil, errors.New("邮箱已被使用")
		}
	}

	// 创建新用户
	accessToken := common.GetUUID()
	user := &model.User{
		Username:    req.Username,
		Password:    req.Password, // 密码应该在这里哈希
		Email:       req.Email,
		DisplayName: req.DisplayName,
		Role:        common.RoleCommonUser,
		Status:      common.UserStatusEnabled,
		Quota:       common.QuotaForNewUser,
		AccessToken: &accessToken,
	}

	// 哈希密码
	hashedPassword, err := common.Password2Hash(user.Password)
	if err != nil {
		return nil, err
	}
	user.Password = hashedPassword

	// 保存用户
	err = s.userRepo.Create(ctx, user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// LoginUser 用户登录
func (s *userServiceImpl) LoginUser(ctx context.Context, req LoginRequest) (*model.User, error) {
	user, err := s.userRepo.FindByUsername(ctx, req.Username)
	if err != nil {
		return nil, errors.New("用户名或密码错误")
	}

	// 验证密码
	if !common.ValidatePasswordAndHash(req.Password, user.Password) {
		return nil, errors.New("用户名或密码错误")
	}

	// 检查用户状态
	if user.Status != common.UserStatusEnabled {
		return nil, errors.New("用户已被禁用")
	}

	return user, nil
}

// ValidatePassword 验证用户密码
func (s *userServiceImpl) ValidatePassword(ctx context.Context, username, password string) (*model.User, error) {
	return s.LoginUser(ctx, LoginRequest{Username: username, Password: password})
}

// GetUserByID 根据ID获取用户
func (s *userServiceImpl) GetUserByID(ctx context.Context, id int) (*model.User, error) {
	return s.userRepo.FindByID(ctx, id)
}

// GetUserByUsername 根据用户名获取用户
func (s *userServiceImpl) GetUserByUsername(ctx context.Context, username string) (*model.User, error) {
	return s.userRepo.FindByUsername(ctx, username)
}

// GetAllUsers 获取所有用户(分页)
func (s *userServiceImpl) GetAllUsers(ctx context.Context, page, pageSize int, order string) ([]*model.User, int64, error) {
	startIdx := (page - 1) * pageSize
	users, err := s.userRepo.GetAllUsers(ctx, startIdx, pageSize, order)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.userRepo.CountUsers(ctx)
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// SearchUsers 搜索用户
func (s *userServiceImpl) SearchUsers(ctx context.Context, keyword string) ([]*model.User, error) {
	return s.userRepo.SearchUsers(ctx, keyword, "")
}

// UpdateUser 更新用户信息
func (s *userServiceImpl) UpdateUser(ctx context.Context, user *model.User) error {
	return s.userRepo.Update(ctx, user)
}

// DeleteUser 删除用户
func (s *userServiceImpl) DeleteUser(ctx context.Context, id int) error {
	return s.userRepo.Delete(ctx, id)
}

// EnableUser 启用用户
func (s *userServiceImpl) EnableUser(ctx context.Context, id int) error {
	return s.userRepo.UpdateUserStatus(ctx, id, common.UserStatusEnabled)
}

// DisableUser 禁用用户
func (s *userServiceImpl) DisableUser(ctx context.Context, id int) error {
	return s.userRepo.UpdateUserStatus(ctx, id, common.UserStatusDisabled)
}

// IncreaseQuota 增加用户额度
func (s *userServiceImpl) IncreaseQuota(ctx context.Context, userID int, amount int) error {
	if amount <= 0 {
		return errors.New("额度必须大于0")
	}
	return s.userRepo.IncreaseUserQuota(ctx, userID, amount)
}

// DecreaseQuota 减少用户额度
func (s *userServiceImpl) DecreaseQuota(ctx context.Context, userID int, amount int) error {
	if amount <= 0 {
		return errors.New("额度必须大于0")
	}

	// 检查额度是否足够
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.Quota < amount {
		return errors.New("额度不足")
	}

	return s.userRepo.DecreaseUserQuota(ctx, userID, amount)
}

// CheckQuota 检查用户额度是否足够
func (s *userServiceImpl) CheckQuota(ctx context.Context, userID int, required int) error {
	user, err := s.userRepo.FindByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.Quota < required {
		return errors.New("额度不足")
	}

	return nil
}
