package middleware

import (
	"crypto/subtle"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

const (
	csrfTokenKey    = "csrf_token"
	csrfHeaderName  = "X-CSRF-Token"
	csrfTokenLength = 32
)

// CSRFProtection 提供CSRF保护中间件
// 使用双重Cookie防御模式：
// 1. 在session中存储token
// 2. 要求客户端在请求头中发送相同的token
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 只保护状态改变的请求方法
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		session := sessions.Default(c)

		// 从session获取存储的CSRF token
		storedToken := session.Get(csrfTokenKey)
		if storedToken == nil {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "CSRF token missing in session. Please refresh the page.",
			})
			c.Abort()
			return
		}

		// 从请求头获取客户端发送的token
		clientToken := c.GetHeader(csrfHeaderName)
		if clientToken == "" {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "CSRF token missing in request header.",
			})
			c.Abort()
			return
		}

		// 使用常量时间比较防止时序攻击
		storedTokenStr, ok := storedToken.(string)
		if !ok || subtle.ConstantTimeCompare([]byte(storedTokenStr), []byte(clientToken)) != 1 {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"message": "CSRF token validation failed.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GenerateCSRFToken 生成并存储CSRF token到session中
// 这个函数应该在用户登录或session创建时调用
func GenerateCSRFToken(session sessions.Session) (string, error) {
	// 生成随机token，使用现有的GenerateRandomKey函数
	token, err := common.GenerateRandomKey(csrfTokenLength)
	if err != nil {
		return "", err
	}

	// 存储到session
	session.Set(csrfTokenKey, token)
	if err := session.Save(); err != nil {
		return "", err
	}

	return token, nil
}

// GetCSRFToken 从session获取现有的CSRF token，如果不存在则生成新的
func GetCSRFToken(session sessions.Session) (string, error) {
	if token := session.Get(csrfTokenKey); token != nil {
		if tokenStr, ok := token.(string); ok {
			return tokenStr, nil
		}
	}

	// 如果token不存在，生成新的
	return GenerateCSRFToken(session)
}

// RotateCSRFToken 轮换CSRF token（在敏感操作后调用）
func RotateCSRFToken(session sessions.Session) (string, error) {
	return GenerateCSRFToken(session)
}

// CSRFTokenEndpoint 提供获取CSRF token的API端点
func CSRFTokenEndpoint() gin.HandlerFunc {
	return func(c *gin.Context) {
		session := sessions.Default(c)

		token, err := GetCSRFToken(session)
		if err != nil {
			common.SysLog("Failed to generate CSRF token: " + err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "Failed to generate CSRF token",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"token":   token,
			"expires": time.Now().Add(30 * 24 * time.Hour).Unix(), // 30天，与session一致
		})
	}
}
