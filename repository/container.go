package repository

import (
	"context"

	"gorm.io/gorm"
)

// RepositoryContainer 仓储容器，集中管理所有仓储实例
type RepositoryContainer struct {
	User    UserRepository
	Channel ChannelRepository
	Token   TokenRepository
	Log     LogRepository
}

// NewRepositoryContainer 创建仓储容器
func NewRepositoryContainer(db *gorm.DB) *RepositoryContainer {
	return &RepositoryContainer{
		User:    NewUserRepository(db),
		Channel: NewChannelRepository(db),
		Token:   NewTokenRepository(db),
		Log:     NewLogRepository(db),
	}
}

// Transaction 事务包装器
type Transaction interface {
	// WithTransaction 在事务中执行操作
	WithTransaction(ctx context.Context, fn func(ctx context.Context, repos *RepositoryContainer) error) error
}

// transactionManager 事务管理器
type transactionManager struct {
	db *gorm.DB
}

// NewTransactionManager 创建事务管理器
func NewTransactionManager(db *gorm.DB) Transaction {
	return &transactionManager{db: db}
}

// WithTransaction 在事务中执行操作
func (tm *transactionManager) WithTransaction(ctx context.Context, fn func(ctx context.Context, repos *RepositoryContainer) error) error {
	return tm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 创建使用事务的仓储容器
		txRepos := NewRepositoryContainer(tx)
		return fn(ctx, txRepos)
	})
}
