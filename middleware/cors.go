package middleware

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func CORS() gin.HandlerFunc {
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:3099",
		"http://127.0.0.1:3099",
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://localhost:4173",
		"http://127.0.0.1:4173",
		"https://api.star-mc.top",
		"https://ai.star-mc.top",
		"https://star-mc-frontend.pages.dev",
	}
	config.AllowOriginFunc = func(origin string) bool {
		if origin == "http://localhost:3099" || origin == "http://127.0.0.1:3099" || origin == "http://localhost:5173" || origin == "http://127.0.0.1:5173" || origin == "http://localhost:4173" || origin == "http://127.0.0.1:4173" || origin == "https://api.star-mc.top" || origin == "https://ai.star-mc.top" {
			return true
		}
		return strings.HasPrefix(origin, "https://") && strings.HasSuffix(origin, ".star-mc-frontend.pages.dev")
	}
	config.AllowCredentials = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{
		"Authorization",
		"Cache-Control",
		"Content-Type",
		"New-Api-User",
		"X-Requested-With",
	}
	return cors.New(config)
}

func Version() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-New-Api-Version", common.Version)
		c.Next()
	}
}
