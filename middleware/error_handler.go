package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

// ErrorResponse 统一错误响应结构
type ErrorResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Code    string      `json:"code,omitempty"`
	Details interface{} `json:"details,omitempty"`
}

// GlobalErrorHandler 全局错误处理中间件
func GlobalErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// 记录panic堆栈
				stack := debug.Stack()
				common.SysError(fmt.Sprintf("Panic recovered: %v\nStack: %s", err, stack))

				// 检查是否已经写入响应
				if !c.Writer.Written() {
					c.JSON(http.StatusInternalServerError, ErrorResponse{
						Success: false,
						Message: "Internal server error",
						Code:    "INTERNAL_ERROR",
					})
				}
				c.Abort()
			}
		}()

		c.Next()

		// 处理gin.Context中设置的错误
		if len(c.Errors) > 0 {
			err := c.Errors.Last()

			// 如果响应还没写入，返回错误信息
			if !c.Writer.Written() {
				statusCode := c.Writer.Status()
				if statusCode == http.StatusOK {
					statusCode = http.StatusInternalServerError
				}

				c.JSON(statusCode, ErrorResponse{
					Success: false,
					Message: err.Error(),
					Code:    "REQUEST_ERROR",
				})
			}
		}
	}
}

// AbortWithError 中止请求并返回错误（辅助函数）
func AbortWithError(c *gin.Context, statusCode int, code, message string) {
	c.JSON(statusCode, ErrorResponse{
		Success: false,
		Message: message,
		Code:    code,
	})
	c.Abort()
}

// AbortWithErrorDetails 中止请求并返回带详情的错误
func AbortWithErrorDetails(c *gin.Context, statusCode int, code, message string, details interface{}) {
	c.JSON(statusCode, ErrorResponse{
		Success: false,
		Message: message,
		Code:    code,
		Details: details,
	})
	c.Abort()
}
