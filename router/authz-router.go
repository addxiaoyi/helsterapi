package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"

	"github.com/gin-gonic/gin"
)

// registerAuthzRoutes mounts the authorization API under its own /authz
// namespace. GET /authz/catalog returns the permission schema (resources,
// actions, and role baselines) used by the client permission editor.
func registerAuthzRoutes(apiRouter *gin.RouterGroup) {
	authzRoute := apiRouter.Group("/authz")
	authzRoute.Use(middleware.AdminAuth())
	authzRoute.Use(middleware.CSRFProtection()) // CSRF保护权限管理（虽然当前只有GET，但为未来扩展做准备）
	{
		authzRoute.GET("/catalog", controller.GetPermissionCatalog)
	}
}
