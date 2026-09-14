package repository

import (
	"context"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"gorm.io/gorm"
)

// UserRepository 定义用户数据访问接口
type UserRepository interface {
	// 基础 CRUD
	Create(ctx context.Context, user *model.User) error
	Update(ctx context.Context, user *model.User) error
	Delete(ctx context.Context, id int) error
	FindByID(ctx context.Context, id int) (*model.User, error)
	FindByUsername(ctx context.Context, username string) (*model.User, error)
	FindByEmail(ctx context.Context, email string) (*model.User, error)

	// 查询方法
	GetAllUsers(ctx context.Context, startIdx int, num int, order string) ([]*model.User, error)
	SearchUsers(ctx context.Context, keyword string, order string) ([]*model.User, error)
	GetUsersByRole(ctx context.Context, role int) ([]*model.User, error)
	GetAdminUsers(ctx context.Context) ([]*model.User, error)

	// 统计方法
	CountUsers(ctx context.Context) (int64, error)

	// 额度相关
	UpdateUserQuota(ctx context.Context, id int, quota int) error
	IncreaseUserQuota(ctx context.Context, id int, quota int) error
	DecreaseUserQuota(ctx context.Context, id int, quota int) error

	// 状态相关
	UpdateUserStatus(ctx context.Context, id int, status int) error
}

// gormUserRepository 是基于 GORM 的实现
type gormUserRepository struct {
	db *gorm.DB
}

// NewUserRepository 创建用户仓储实例
func NewUserRepository(db *gorm.DB) UserRepository {
	return &gormUserRepository{db: db}
}

// Create 创建用户
func (r *gormUserRepository) Create(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

// Update 更新用户
func (r *gormUserRepository) Update(ctx context.Context, user *model.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

// Delete 删除用户
func (r *gormUserRepository) Delete(ctx context.Context, id int) error {
	return r.db.WithContext(ctx).Delete(&model.User{}, id).Error
}

// FindByID 根据ID查找用户
func (r *gormUserRepository) FindByID(ctx context.Context, id int) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUsername 根据用户名查找用户
func (r *gormUserRepository) FindByUsername(ctx context.Context, username string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByEmail 根据邮箱查找用户
func (r *gormUserRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetAllUsers 获取所有用户（分页）
func (r *gormUserRepository) GetAllUsers(ctx context.Context, startIdx int, num int, order string) ([]*model.User, error) {
	var users []*model.User
	db := r.db.WithContext(ctx)

	if order != "" {
		db = db.Order(order)
	}

	err := db.Offset(startIdx).Limit(num).Find(&users).Error
	return users, err
}

// SearchUsers 搜索用户
func (r *gormUserRepository) SearchUsers(ctx context.Context, keyword string, order string) ([]*model.User, error) {
	var users []*model.User
	db := r.db.WithContext(ctx)

	if keyword != "" {
		db = db.Where("username LIKE ? OR email LIKE ? OR display_name LIKE ?",
			"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}

	if order != "" {
		db = db.Order(order)
	}

	err := db.Find(&users).Error
	return users, err
}

// GetUsersByRole 根据角色获取用户
func (r *gormUserRepository) GetUsersByRole(ctx context.Context, role int) ([]*model.User, error) {
	var users []*model.User
	err := r.db.WithContext(ctx).Where("role = ?", role).Find(&users).Error
	return users, err
}

// GetAdminUsers 获取所有管理员用户
func (r *gormUserRepository) GetAdminUsers(ctx context.Context) ([]*model.User, error) {
	var users []*model.User
	err := r.db.WithContext(ctx).Where("role >= ?", common.RoleAdminUser).Find(&users).Error
	return users, err
}

// CountUsers 统计用户数量
func (r *gormUserRepository) CountUsers(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&model.User{}).Count(&count).Error
	return count, err
}

// UpdateUserQuota 更新用户额度
func (r *gormUserRepository) UpdateUserQuota(ctx context.Context, id int, quota int) error {
	return r.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", id).Update("quota", quota).Error
}

// IncreaseUserQuota 增加用户额度
func (r *gormUserRepository) IncreaseUserQuota(ctx context.Context, id int, quota int) error {
	return r.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", id).
		UpdateColumn("quota", gorm.Expr("quota + ?", quota)).Error
}

// DecreaseUserQuota 减少用户额度
func (r *gormUserRepository) DecreaseUserQuota(ctx context.Context, id int, quota int) error {
	return r.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", id).
		UpdateColumn("quota", gorm.Expr("quota - ?", quota)).Error
}

// UpdateUserStatus 更新用户状态
func (r *gormUserRepository) UpdateUserStatus(ctx context.Context, id int, status int) error {
	return r.db.WithContext(ctx).Model(&model.User{}).Where("id = ?", id).Update("status", status).Error
}
