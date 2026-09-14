package controller

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type userSessionResponse struct {
	ID         uint64 `json:"id"`
	DeviceName string `json:"device_name"`
	UserAgent  string `json:"user_agent"`
	IP         string `json:"ip"`
	CreatedAt  int64  `json:"created_at"`
	LastSeenAt int64  `json:"last_seen_at"`
	ExpiresAt  int64  `json:"expires_at"`
	Current    bool   `json:"current"`
}

func GetUserSessions(c *gin.Context) {
	sessions, err := model.ListUserSessions(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	currentCookie, _ := c.Cookie("session_v2")
	currentHash := model.HashSessionCookie(currentCookie)
	items := make([]userSessionResponse, 0, len(sessions))
	for _, session := range sessions {
		items = append(items, userSessionResponse{
			ID: session.ID, DeviceName: session.DeviceName, UserAgent: session.UserAgent,
			IP: maskSessionIP(session.IP), CreatedAt: session.CreatedAt, LastSeenAt: session.LastSeenAt,
			ExpiresAt: session.ExpiresAt, Current: session.SessionIDHash == currentHash,
		})
	}
	common.ApiSuccess(c, items)
}

func RevokeUserSession(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid session id"})
		return
	}
	if err := model.RevokeUserSession(c.GetInt("id"), id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func RevokeOtherUserSessions(c *gin.Context) {
	currentCookie, err := c.Cookie("session_v2")
	if err != nil || strings.TrimSpace(currentCookie) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "current session is unavailable"})
		return
	}
	if err := model.RevokeOtherUserSessions(c.GetInt("id"), currentCookie); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func maskSessionIP(ip string) string {
	parts := strings.Split(ip, ".")
	if len(parts) == 4 {
		return strings.Join(parts[:3], ".") + ".***"
	}
	if strings.Contains(ip, ":") {
		segments := strings.Split(ip, ":")
		if len(segments) > 2 {
			return strings.Join(segments[:2], ":") + ":****"
		}
	}
	return "***"
}
