package controller

// 这个文件展示如何在Controller中使用新的验证框架

import (
	"github.com/gin-gonic/gin"
	"net/http"
	"one-api/common"
)

// 示例：用户注册请求结构体，使用验证标签
type RegisterRequest struct {
	Username string `json:"username" binding:"required,username"`           // 使用自定义username验证
	Password string `json:"password" binding:"required,strong_password"`    // 使用强密码验证
	Email    string `json:"email" binding:"required,email"`                 // 邮箱验证
	Nickname string `json:"nickname" binding:"required,min=2,max=50,safe_string"` // 安全字符串验证
}

// 示例：渠道创建请求
type CreateChannelRequest struct {
	Name        string   `json:"name" binding:"required,min=1,max=100,safe_string"`
	Type        int      `json:"type" binding:"required,min=1"`
	Key         string   `json:"key" binding:"required,api_key"`  // API密钥验证
	BaseURL     string   `json:"base_url" binding:"omitempty,url"`
	Models      []string `json:"models" binding:"required,min=1,dive,no_xss"` // 数组元素验证
	Description string   `json:"description" binding:"omitempty,max=500,safe_string"`
}

// 示例：使用验证的Controller方法
func ExampleRegister(c *gin.Context) {
	var req RegisterRequest

	// ShouldBindJSON会自动使用binding标签验证
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "输入验证失败: " + err.Error(),
		})
		return
	}

	// 额外的业务验证
	if !common.ValidateEmail(req.Email) {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "邮箱格式无效",
		})
		return
	}

	// 处理业务逻辑...
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "注册成功",
	})
}

// 示例：手动使用CustomValidator
func ExampleWithManualValidation(c *gin.Context) {
	var req CreateChannelRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "JSON解析失败: " + err.Error(),
		})
		return
	}

	// 使用自定义验证器
	validator := common.NewCustomValidator()
	if err := validator.Validate(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "验证失败: " + err.Error(),
		})
		return
	}

	// 业务逻辑...
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "创建成功",
	})
}

// 示例：清理用户输入
func ExampleSanitizeInput(c *gin.Context) {
	comment := c.PostForm("comment")

	// 清理HTML/脚本字符
	cleanComment := common.SanitizeString(comment)

	// 限制长度
	cleanComment = common.TruncateString(cleanComment, 500)

	// 保存清理后的数据...
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    cleanComment,
	})
}
