package service

import (
	"github.com/QuantumNous/new-api/repository"
	"github.com/QuantumNous/new-api/service/channel"
	"github.com/QuantumNous/new-api/service/log"
	"github.com/QuantumNous/new-api/service/token"
	"github.com/QuantumNous/new-api/service/user"
)

// ServiceContainer 服务容器，集中管理所有服务实例
type ServiceContainer struct {
	User    user.UserService
	Channel channel.ChannelService
	Token   token.TokenService
	Log     log.LogService
}

// NewServiceContainer 创建服务容器
// 接收仓储容器作为依赖，构建服务层
func NewServiceContainer(repos *repository.RepositoryContainer) *ServiceContainer {
	return &ServiceContainer{
		User:    user.NewUserService(repos.User),
		Channel: channel.NewChannelService(repos.Channel),
		Token:   token.NewTokenService(repos.Token),
		Log:     log.NewLogService(repos.Log),
	}
}
