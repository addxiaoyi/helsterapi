package middleware

import (
	"github.com/QuantumNous/new-api/repository"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ServiceInjector 创建服务注入中间件
// 将服务容器注入到 Gin Context 中，供 Controller 使用
func ServiceInjector(db *gorm.DB) gin.HandlerFunc {
	// 创建仓储容器
	repos := repository.NewRepositoryContainer(db)

	// 创建服务容器
	services := service.NewServiceContainer(repos)

	return func(c *gin.Context) {
		// 将服务容器注入到 Context
		c.Set("services", services)
		c.Next()
	}
}

// GetServices 从 Context 中获取服务容器
func GetServices(c *gin.Context) *service.ServiceContainer {
	services, exists := c.Get("services")
	if !exists {
		return nil
	}
	return services.(*service.ServiceContainer)
}
