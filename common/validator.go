package common

import (
	"fmt"
	"net/mail"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

// CustomValidator 自定义验证器
type CustomValidator struct {
	validator *validator.Validate
}

// NewCustomValidator 创建自定义验证器实例
func NewCustomValidator() *CustomValidator {
	v := validator.New()
	cv := &CustomValidator{validator: v}

	// 注册自定义验证规则
	_ = v.RegisterValidation("no_sql_injection", validateNoSQLInjection)
	_ = v.RegisterValidation("no_xss", validateNoXSS)
	_ = v.RegisterValidation("safe_string", validateSafeString)
	_ = v.RegisterValidation("username", validateUsername)
	_ = v.RegisterValidation("strong_password", validateStrongPassword)
	_ = v.RegisterValidation("api_key", validateAPIKey)

	return cv
}

// Validate 验证结构体
func (cv *CustomValidator) Validate(i interface{}) error {
	if err := cv.validator.Struct(i); err != nil {
		return formatValidationError(err)
	}
	return nil
}

// formatValidationError 格式化验证错误信息
func formatValidationError(err error) error {
	if validationErrs, ok := err.(validator.ValidationErrors); ok {
		var messages []string
		for _, e := range validationErrs {
			messages = append(messages, fmt.Sprintf(
				"字段 '%s' 验证失败: %s",
				e.Field(),
				getErrorMessage(e),
			))
		}
		return fmt.Errorf("%s", strings.Join(messages, "; "))
	}
	return err
}

// getErrorMessage 获取友好的错误信息
func getErrorMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return "必填字段"
	case "email":
		return "邮箱格式无效"
	case "min":
		return fmt.Sprintf("最小长度为 %s", e.Param())
	case "max":
		return fmt.Sprintf("最大长度为 %s", e.Param())
	case "no_sql_injection":
		return "包含不安全的字符"
	case "no_xss":
		return "包含不安全的HTML/脚本"
	case "safe_string":
		return "包含不允许的字符"
	case "username":
		return "用户名格式无效（仅允许字母、数字、下划线、连字符，3-32位）"
	case "strong_password":
		return "密码强度不足（至少8位，包含字母和数字）"
	case "api_key":
		return "API密钥格式无效"
	default:
		return fmt.Sprintf("验证失败: %s", e.Tag())
	}
}

// validateNoSQLInjection 验证无SQL注入
func validateNoSQLInjection(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	lower := strings.ToLower(value)

	// SQL注入关键字检测
	dangerousPatterns := []string{
		"' or ", "\" or ", "'; ", "\"; ",
		" union ", " select ", " drop ", " delete ",
		" insert ", " update ", " exec ", " execute ",
		"xp_", "sp_", "--", "/*", "*/",
	}

	for _, pattern := range dangerousPatterns {
		if strings.Contains(lower, pattern) {
			return false
		}
	}

	return true
}

// validateNoXSS 验证无XSS攻击
func validateNoXSS(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	lower := strings.ToLower(value)

	// XSS攻击模式检测
	xssPatterns := []string{
		"<script", "</script", "javascript:", "onerror=", "onload=",
		"<iframe", "</iframe", "onclick=", "onmouseover=",
		"eval(", "alert(", "prompt(", "confirm(",
	}

	for _, pattern := range xssPatterns {
		if strings.Contains(lower, pattern) {
			return false
		}
	}

	return true
}

// validateSafeString 验证安全字符串（同时检查SQL注入和XSS）
func validateSafeString(fl validator.FieldLevel) bool {
	return validateNoSQLInjection(fl) && validateNoXSS(fl)
}

// validateUsername 验证用户名格式
func validateUsername(fl validator.FieldLevel) bool {
	username := fl.Field().String()

	// 用户名规则：3-32位，仅字母、数字、下划线、连字符
	match, _ := regexp.MatchString(`^[a-zA-Z0-9_-]{3,32}$`, username)
	return match
}

// validateStrongPassword 验证密码强度
func validateStrongPassword(fl validator.FieldLevel) bool {
	password := fl.Field().String()

	// 至少8位
	if len(password) < 8 {
		return false
	}

	// 最大128位（防止DoS）
	if len(password) > 128 {
		return false
	}

	// 至少包含一个字母和一个数字
	hasLetter := regexp.MustCompile(`[a-zA-Z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)

	return hasLetter && hasDigit
}

// validateAPIKey 验证API密钥格式
func validateAPIKey(fl validator.FieldLevel) bool {
	key := fl.Field().String()

	// API密钥应该是32-128位的字母数字字符串
	if len(key) < 32 || len(key) > 128 {
		return false
	}

	// 只允许字母、数字、下划线、连字符
	match, _ := regexp.MatchString(`^[a-zA-Z0-9_-]+$`, key)
	return match
}

// ValidateEmail 验证邮箱格式
func ValidateEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// ValidateURL 验证URL格式
func ValidateURL(url string) bool {
	// 简单的URL验证
	match, _ := regexp.MatchString(`^https?://[^\s]+$`, url)
	return match
}

// SanitizeString 清理字符串（移除危险字符）
func SanitizeString(input string) string {
	// HTML实体编码
	input = strings.ReplaceAll(input, "<", "&lt;")
	input = strings.ReplaceAll(input, ">", "&gt;")
	input = strings.ReplaceAll(input, "\"", "&quot;")
	input = strings.ReplaceAll(input, "'", "&#x27;")
	input = strings.ReplaceAll(input, "&", "&amp;")
	return input
}

// TruncateString 截断字符串到指定长度
func TruncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
