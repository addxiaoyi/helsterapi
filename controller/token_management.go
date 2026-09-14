package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// RevokeAccessToken 撤销 AccessToken（管理员或用户自己）
func RevokeAccessToken(c *gin.Context) {
	id := c.GetInt("id")
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 检查是否有 access_token
	if user.AccessToken == nil || *user.AccessToken == "" {
		common.ApiErrorI18n(c, i18n.MsgTokenNotFound)
		return
	}

	// 撤销 token（设置过期时间为过去）
	if err := model.RevokeAccessToken(user.Id); err != nil {
		common.SysLog("failed to revoke access token: " + err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "Failed to revoke access token",
		})
		return
	}

	// 清除数据库中的 access_token
	user.SetAccessToken("")
	if err := user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Access token revoked successfully",
	})
}

// GetAccessTokenInfo 获取 AccessToken 信息（包括过期时间）
func GetAccessTokenInfo(c *gin.Context) {
	id := c.GetInt("id")
	user, err := model.GetUserById(id, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}

	// 检查是否有 access_token
	if user.AccessToken == nil || *user.AccessToken == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data": map[string]interface{}{
				"has_token": false,
				"token":     nil,
				"expires_at": nil,
				"is_expired": false,
			},
		})
		return
	}

	// 获取过期信息
	expiry, err := model.GetAccessTokenExpiry(user.Id)
	var expiresAt interface{} = nil
	var isExpired = false

	if err == nil && expiry != nil {
		expiresAt = expiry.ExpiresAt
		expired, _ := model.IsAccessTokenExpired(user.Id)
		isExpired = expired
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": map[string]interface{}{
			"has_token":  true,
			"token":      user.AccessToken,
			"expires_at": expiresAt,
			"is_expired": isExpired,
		},
	})
}
