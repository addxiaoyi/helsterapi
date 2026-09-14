package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

// RateLimitConfig 速率限制配置
type RateLimitConfig struct {
	RequestsPerMinute int
	BurstSize         int
}

// RateLimiter 速率限制器接口
type RateLimiter struct {
	visitors map[string]*visitorInfo
	mu       sync.RWMutex
	config   RateLimitConfig
}

type visitorInfo struct {
	tokens     float64
	lastUpdate time.Time
	violations int
}

// NewRateLimiter 创建速率限制器
func NewRateLimiter(config RateLimitConfig) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitorInfo),
		config:   config,
	}

	// 定期清理过期访客记录
	go rl.cleanupVisitors()

	return rl
}

// Allow 检查是否允许请求
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	visitor, exists := rl.visitors[key]

	if !exists {
		rl.visitors[key] = &visitorInfo{
			tokens:     float64(rl.config.BurstSize),
			lastUpdate: now,
			violations: 0,
		}
		visitor = rl.visitors[key]
	}

	// Token Bucket算法
	elapsed := now.Sub(visitor.lastUpdate).Seconds()
	tokensToAdd := elapsed * float64(rl.config.RequestsPerMinute) / 60.0
	visitor.tokens = min(visitor.tokens+tokensToAdd, float64(rl.config.BurstSize))
	visitor.lastUpdate = now

	if visitor.tokens >= 1.0 {
		visitor.tokens -= 1.0
		visitor.violations = 0
		return true
	}

	// 违规计数
	visitor.violations++
	return false
}

// GetViolations 获取违规次数
func (rl *RateLimiter) GetViolations(key string) int {
	rl.mu.RLock()
	defer rl.mu.RUnlock()

	if visitor, exists := rl.visitors[key]; exists {
		return visitor.violations
	}
	return 0
}

// cleanupVisitors 定期清理过期访客记录
func (rl *RateLimiter) cleanupVisitors() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, visitor := range rl.visitors {
			// 清理10分钟未活动的记录
			if now.Sub(visitor.lastUpdate) > 10*time.Minute {
				delete(rl.visitors, key)
			}
		}
		rl.mu.Unlock()
	}
}

// 全局速率限制器
var (
	globalRateLimiter   *RateLimiter
	loginRateLimiter    *RateLimiter
	registerRateLimiter *RateLimiter
)

func init() {
	// 全局限制：每分钟120次请求
	globalRateLimiter = NewRateLimiter(RateLimitConfig{
		RequestsPerMinute: 120,
		BurstSize:         20,
	})

	// 登录限制：每分钟5次
	loginRateLimiter = NewRateLimiter(RateLimitConfig{
		RequestsPerMinute: 5,
		BurstSize:         2,
	})

	// 注册限制：每分钟2次
	registerRateLimiter = NewRateLimiter(RateLimitConfig{
		RequestsPerMinute: 2,
		BurstSize:         1,
	})
}

// RateLimit 全局速率限制中间件
func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()

		if !globalRateLimiter.Allow(key) {
			violations := globalRateLimiter.GetViolations(key)

			// 渐进式惩罚
			if violations > 10 {
				common.SysLog("Rate limit exceeded (blocked): " + key)
				c.JSON(http.StatusTooManyRequests, gin.H{
					"success": false,
					"message": "请求过于频繁，请稍后再试",
				})
				c.Abort()
				return
			}

			c.Header("X-RateLimit-Retry-After", "60")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "请求过于频繁，请稍后再试",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// LoginRateLimit 登录接口速率限制
func LoginRateLimit() gin.HandlerFunc {
	return rateLimitHandler(loginRateLimiter, "登录")
}

// RegisterRateLimit 注册接口速率限制
func RegisterRateLimit() gin.HandlerFunc {
	return rateLimitHandler(registerRateLimiter, "注册")
}

// rateLimitHandler 通用速率限制处理
func rateLimitHandler(limiter *RateLimiter, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.ClientIP()

		if !limiter.Allow(key) {
			violations := limiter.GetViolations(key)
			common.SysLog(action + " rate limit exceeded: " + key + " (violations: " + string(rune(violations)) + ")")

			// 严重违规时封禁
			if violations > 20 {
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"message": action + "尝试过多，账户已被临时封禁",
				})
				c.Abort()
				return
			}

			c.Header("X-RateLimit-Retry-After", "60")
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": action + "过于频繁，请稍后再试",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// min helper function
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
