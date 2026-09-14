package middleware

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
)

// SQL注入常见模式
var sqlInjectionPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)(union.*select)`),
	regexp.MustCompile(`(?i)(insert.*into)`),
	regexp.MustCompile(`(?i)(delete.*from)`),
	regexp.MustCompile(`(?i)(drop.*table)`),
	regexp.MustCompile(`(?i)(update.*set)`),
	regexp.MustCompile(`(?i)(exec.*\()`),
	regexp.MustCompile(`(?i)(script.*>)`),
	regexp.MustCompile(`(?i)(javascript:)`),
	regexp.MustCompile(`(?i)(onerror\s*=)`),
	regexp.MustCompile(`(?i)(onload\s*=)`),
	regexp.MustCompile(`(<script[^>]*>.*?</script>)`),
	regexp.MustCompile(`(--|;|\/\*|\*\/|xp_|sp_)`),
}

// SQLInjectionProtection 检测并阻止潜在的SQL注入攻击
// 这是一个额外的防护层，主要防护仍应依靠参数化查询
func SQLInjectionProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查查询参数
		for key, values := range c.Request.URL.Query() {
			for _, value := range values {
				if containsSQLInjection(value) {
					c.JSON(http.StatusBadRequest, gin.H{
						"success": false,
						"message": "Invalid input detected",
						"code":    "INVALID_INPUT",
					})
					c.Abort()
					return
				}
			}
			_ = key // 也可以检查key
		}

		// 检查路径参数
		for _, param := range c.Params {
			if containsSQLInjection(param.Value) {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "Invalid input detected",
					"code":    "INVALID_INPUT",
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

func containsSQLInjection(input string) bool {
	for _, pattern := range sqlInjectionPatterns {
		if pattern.MatchString(input) {
			return true
		}
	}
	return false
}

// XSSProtection 检测并阻止跨站脚本攻击
func XSSProtection() gin.HandlerFunc {
	xssPatterns := []*regexp.Regexp{
		regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`),
		regexp.MustCompile(`(?i)javascript:`),
		regexp.MustCompile(`(?i)on\w+\s*=`), // onclick, onerror, onload等
		regexp.MustCompile(`(?i)<iframe[^>]*>`),
		regexp.MustCompile(`(?i)<embed[^>]*>`),
		regexp.MustCompile(`(?i)<object[^>]*>`),
	}

	return func(c *gin.Context) {
		// 检查查询参数
		for _, values := range c.Request.URL.Query() {
			for _, value := range values {
				for _, pattern := range xssPatterns {
					if pattern.MatchString(value) {
						c.JSON(http.StatusBadRequest, gin.H{
							"success": false,
							"message": "Invalid input detected",
							"code":    "INVALID_INPUT",
						})
						c.Abort()
						return
					}
				}
			}
		}

		c.Next()
	}
}

// InputValidation 通用输入验证中间件
func InputValidation() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查请求体大小（已有request_body_limit.go，这里是额外检查）
		if c.Request.ContentLength > 10*1024*1024 { // 10MB
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"success": false,
				"message": "Request body too large",
				"code":    "PAYLOAD_TOO_LARGE",
			})
			c.Abort()
			return
		}

		// 检查路径遍历攻击
		if strings.Contains(c.Request.URL.Path, "..") {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid path",
				"code":    "INVALID_PATH",
			})
			c.Abort()
			return
		}

		// 检查空字节注入
		if strings.Contains(c.Request.URL.RawQuery, "\x00") {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Invalid input",
				"code":    "INVALID_INPUT",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// SanitizeLikeInput 转义LIKE查询中的特殊字符
// 应在model层调用，这里提供工具函数
func SanitizeLikeInput(input string) string {
	// 转义SQL LIKE特殊字符
	input = strings.ReplaceAll(input, "\\", "\\\\") // 必须先转义反斜杠
	input = strings.ReplaceAll(input, "%", "\\%")
	input = strings.ReplaceAll(input, "_", "\\_")
	return input
}

// ValidateTableName 验证表名是否合法
// 仅允许字母、数字、下划线，且不以数字开头
func ValidateTableName(tableName string) bool {
	if tableName == "" {
		return false
	}
	// 表名模式: 字母或下划线开头，后跟字母、数字或下划线
	pattern := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)
	return pattern.MatchString(tableName)
}

// ValidateIdentifier 验证数据库标识符（表名、列名等）
func ValidateIdentifier(identifier string) bool {
	if identifier == "" || len(identifier) > 64 {
		return false
	}
	return ValidateTableName(identifier)
}

// WhitelistTableNames 表名白名单
var WhitelistTableNames = []string{
	"users",
	"channels",
	"tokens",
	"logs",
	"abilities",
	"redemptions",
	"options",
	"user_fingerprints",
	"user_sessions",
	// 添加其他合法表名
}

// IsTableNameAllowed 检查表名是否在白名单中
func IsTableNameAllowed(tableName string) bool {
	for _, allowed := range WhitelistTableNames {
		if tableName == allowed {
			return true
		}
	}
	return false
}
