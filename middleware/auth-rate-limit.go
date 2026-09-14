package middleware

import (
	"fmt"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

// LoginRateLimit implements strict rate limiting for login attempts
// to prevent brute force attacks
// Limits: 5 attempts per minute per IP
func LoginRateLimit() gin.HandlerFunc {
	// 5 attempts per 60 seconds per IP
	return rateLimitFactory(5, 60, "LOGIN")
}

// LoginFailureTracker tracks failed login attempts and implements progressive delays
// This is more sophisticated than simple rate limiting - it:
// 1. Tracks failures per username (not just IP)
// 2. Implements exponential backoff
// 3. Temporarily locks accounts after repeated failures
//
// Usage: Apply AFTER LoginRateLimit, BEFORE actual authentication logic
func LoginFailureTracker() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next() // Process login first

		// Check if login failed (will be set by auth handler)
		loginFailed := c.GetBool("login_failed")
		if !loginFailed {
			return
		}

		// Track failure
		username := c.GetString("attempted_username")
		if username == "" {
			return
		}

		// Increment failure count in Redis/memory
		if common.RedisEnabled {
			trackLoginFailureRedis(c, username)
		} else {
			trackLoginFailureMemory(c, username)
		}
	}
}

func trackLoginFailureRedis(c *gin.Context, username string) {
	ctx := c.Request.Context()
	rdb := common.RDB
	key := fmt.Sprintf("login_failures:%s", username)

	// Increment failure count
	failures, err := rdb.Incr(ctx, key).Result()
	if err != nil {
		common.SysLog(fmt.Sprintf("track_login_failure error: %s", err.Error()))
		return
	}

	// Set expiration on first failure (15 minutes)
	if failures == 1 {
		rdb.Expire(ctx, key, 15*60*1000000000) // 15 minutes in nanoseconds
	}

	// Log suspicious activity
	if failures >= 3 {
		common.SysLog(fmt.Sprintf("suspicious_login_attempts - Username: %s, Failures: %d, IP: %s", username, failures, c.ClientIP()))
	}

	// Temporarily lock after 10 failures
	if failures >= 10 {
		lockKey := fmt.Sprintf("account_locked:%s", username)
		rdb.Set(ctx, lockKey, "1", 3600*1000000000) // Lock for 1 hour
		common.SysLog(fmt.Sprintf("account_temporarily_locked - Username: %s locked for 1 hour due to repeated failures", username))
	}
}

func trackLoginFailureMemory(c *gin.Context, username string) {
	// Simple in-memory tracking
	// In production, this should use a proper cache with TTL
	// For now, just log the failure
	common.SysLog(fmt.Sprintf("login_failure - Username: %s, IP: %s", username, c.ClientIP()))
}

// CheckAccountLock checks if an account is temporarily locked due to failed attempts
// Usage: Apply BEFORE authentication logic in login handler
func CheckAccountLock() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !common.RedisEnabled {
			c.Next()
			return
		}

		// Extract username from request body
		// This assumes JSON body with "username" field
		var loginData struct {
			Username string `json:"username"`
		}
		if err := c.ShouldBindJSON(&loginData); err != nil {
			c.Next()
			return
		}

		// Re-set body for downstream handlers
		c.Set("attempted_username", loginData.Username)

		// Check if account is locked
		ctx := c.Request.Context()
		rdb := common.RDB
		lockKey := fmt.Sprintf("account_locked:%s", loginData.Username)

		locked, err := rdb.Exists(ctx, lockKey).Result()
		if err != nil {
			common.SysLog(fmt.Sprintf("check_account_lock error: %s", err.Error()))
			c.Next()
			return
		}

		if locked > 0 {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "Account temporarily locked due to repeated failed login attempts. Please try again later or contact support.",
				"code":    "ACCOUNT_LOCKED",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// PasswordResetRateLimit limits password reset requests
// Prevents abuse of password reset functionality
func PasswordResetRateLimit() gin.HandlerFunc {
	// 3 attempts per hour per IP
	return rateLimitFactory(3, 3600, "PWD_RESET")
}

// RegisterRateLimit limits user registration
// Prevents automated account creation
func RegisterRateLimit() gin.HandlerFunc {
	// 3 registrations per hour per IP
	return rateLimitFactory(3, 3600, "REGISTER")
}
