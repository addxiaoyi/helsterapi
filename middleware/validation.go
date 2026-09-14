package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"one-api/common"
)

// RequestSizeLimit 限制请求体大小
func RequestSizeLimit(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// SQLInjectionPatterns SQL注入检测模式
var SQLInjectionPatterns = []string{
	"'", "\"", ";", "--", "/*", "*/", "xp_", "sp_",
	"union", "select", "insert", "update", "delete", "drop",
	"exec", "execute", "script", "javascript", "alter", "create",
}

// XSSPatterns XSS攻击检测模式
var XSSPatterns = []string{
	"<script", "</script", "javascript:", "onerror=", "onload=",
	"<iframe", "</iframe", "<object", "</object", "<embed", "</embed",
	"alert(", "prompt(", "confirm(",
}

// ContainsSQLInjection 检测字符串是否包含SQL注入特征
func ContainsSQLInjection(input string) bool {
	lower := strings.ToLower(input)
	for _, pattern := range SQLInjectionPatterns {
		if strings.Contains(lower, strings.ToLower(pattern)) {
			// 检查是否在SQL上下文中（简单启发式）
			if containsSQLContext(lower, pattern) {
				return true
			}
		}
	}
	return false
}

// containsSQLContext 检查模式是否在SQL上下文中
func containsSQLContext(input, pattern string) bool {
	idx := strings.Index(input, strings.ToLower(pattern))
	if idx == -1 {
		return false
	}

	// 检查前后是否有SQL关键字
	before := ""
	after := ""
	if idx > 10 {
		before = input[idx-10 : idx]
	} else {
		before = input[:idx]
	}
	if idx+len(pattern)+10 < len(input) {
		after = input[idx+len(pattern) : idx+len(pattern)+10]
	} else {
		after = input[idx+len(pattern):]
	}

	context := before + after
	sqlKeywords := []string{"select", "from", "where", "union", "order", "by"}
	for _, keyword := range sqlKeywords {
		if strings.Contains(context, keyword) {
			return true
		}
	}

	return false
}

// ContainsXSS 检测字符串是否包含XSS攻击特征
func ContainsXSS(input string) bool {
	lower := strings.ToLower(input)
	for _, pattern := range XSSPatterns {
		if strings.Contains(lower, strings.ToLower(pattern)) {
			return true
		}
	}
	return false
}

// SanitizeInput 清理输入（移除潜在危险字符）
func SanitizeInput(input string) string {
	// HTML实体编码
	input = strings.ReplaceAll(input, "<", "&lt;")
	input = strings.ReplaceAll(input, ">", "&gt;")
	input = strings.ReplaceAll(input, "\"", "&quot;")
	input = strings.ReplaceAll(input, "'", "&#x27;")
	input = strings.ReplaceAll(input, "&", "&amp;")
	return input
}

// ValidateNoSQLInjection 中间件：检测并阻止SQL注入
func ValidateNoSQLInjection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查查询参数
		for key, values := range c.Request.URL.Query() {
			for _, value := range values {
				if ContainsSQLInjection(value) {
					common.SysError("SQL injection detected in query parameter: " + key)
					c.JSON(http.StatusBadRequest, gin.H{
						"success": false,
						"message": "Invalid input detected",
					})
					c.Abort()
					return
				}
			}
		}

		c.Next()
	}
}

// ValidateNoXSS 中间件：检测并阻止XSS攻击
func ValidateNoXSS() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查查询参数
		for key, values := range c.Request.URL.Query() {
			for _, value := range values {
				if ContainsXSS(value) {
					common.SysError("XSS attack detected in query parameter: " + key)
					c.JSON(http.StatusBadRequest, gin.H{
						"success": false,
						"message": "Invalid input detected",
					})
					c.Abort()
					return
				}
			}
		}

		c.Next()
	}
}
