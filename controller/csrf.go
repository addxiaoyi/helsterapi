package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetCSRFToken 返回当前会话的 CSRF token 给前端
// 前端需要在每个状态修改请求中携带这个 token（通过 X-CSRF-Token header）
func GetCSRFToken(c *gin.Context) {
	token, exists := c.Get("csrf_token")
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "无法生成 CSRF token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"csrf_token": token.(string),
		},
	})
}
