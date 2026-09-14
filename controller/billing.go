package controller

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
)

func GetSubscription(c *gin.Context) {
	var remainQuota int
	var usedQuota int
	var err error
	var expiredTime int64
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(200, gin.H{"error": gin.H{"message": "未登录", "type": "auth_error"}})
		return
	}
	remainQuota, err = model.GetUserQuota(userId, false)
	usedQuota, err = model.GetUserUsedQuota(userId)
	if expiredTime <= 0 {
		expiredTime = 0
	}
	if err != nil {
		openAIError := types.OpenAIError{
			Message: err.Error(),
			Type:    "upstream_error",
		}
		c.JSON(200, gin.H{
			"error": openAIError,
		})
		return
	}
	quota := remainQuota + usedQuota
	amount := float64(quota)
	// OpenAI 兼容接口中的 *_USD 字段含义保持“额度单位”对应值：
	// 我们将其解释为以“站点展示类型”为准：
	// - USD: 直接除以 QuotaPerUnit
	// - CNY: 先转 USD 再乘汇率
	// - TOKENS: 直接使用 tokens 数量
	switch operation_setting.GetQuotaDisplayType() {
	case operation_setting.QuotaDisplayTypeCNY:
		amount = amount / common.QuotaPerUnit * operation_setting.USDExchangeRate
	case operation_setting.QuotaDisplayTypeTokens:
		// amount 保持 tokens 数值
	default:
		amount = amount / common.QuotaPerUnit
	}
	subscription := OpenAISubscriptionResponse{
		Object:             "billing_subscription",
		HasPaymentMethod:   true,
		SoftLimitUSD:       amount,
		HardLimitUSD:       amount,
		SystemHardLimitUSD: amount,
		AccessUntil:        expiredTime,
	}
	c.JSON(200, subscription)
	return
}

// GetDashboardBillingUsage serves /api/dashboard/billing/usage
// Returns a usage summary for the dashboard
func GetDashboardBillingUsage(c *gin.Context) {
	var usedQuota int
	var remainQuota int
	var err error
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(200, gin.H{"error": gin.H{"message": "未登录", "type": "auth_error"}})
		return
	}
	usedQuota, err = model.GetUserUsedQuota(userId)
	remainQuota, _ = model.GetUserQuota(userId, false)
	if err != nil {
		c.JSON(200, gin.H{"error": gin.H{"message": err.Error(), "type": "upstream_error"}})
		return
	}
	c.JSON(200, gin.H{
		"used_quota":  usedQuota,
		"remain_quota": remainQuota,
		"total_quota":  usedQuota + remainQuota,
	})
}

func GetUsage(c *gin.Context) {
	var quota int
	var err error
	userId := c.GetInt("id")
	if userId == 0 {
		c.JSON(200, gin.H{"error": types.OpenAIError{Message: "未登录", Type: "auth_error"}})
		return
	}
	quota, err = model.GetUserUsedQuota(userId)
	if err != nil {
		openAIError := types.OpenAIError{
			Message: err.Error(),
			Type:    "new_api_error",
		}
		c.JSON(200, gin.H{
			"error": openAIError,
		})
		return
	}
	amount := float64(quota)
	switch operation_setting.GetQuotaDisplayType() {
	case operation_setting.QuotaDisplayTypeCNY:
		amount = amount / common.QuotaPerUnit * operation_setting.USDExchangeRate
	case operation_setting.QuotaDisplayTypeTokens:
		// tokens 保持原值
	default:
		amount = amount / common.QuotaPerUnit
	}
	usage := OpenAIUsageResponse{
		Object:     "list",
		TotalUsage: amount * 100,
	}
	c.JSON(200, usage)
	return
}
