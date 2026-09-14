package controller

import (
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

type auditLogItem struct {
	EventID    string                 `json:"event_id"`
	UserID     int                    `json:"user_id"`
	Username   string                 `json:"username"`
	ActorRole  int                    `json:"actor_role"`
	CreatedAt  int64                  `json:"created_at"`
	Category   string                 `json:"category"`
	Action     string                 `json:"action"`
	TokenRef   string                 `json:"token_ref"`
	AuthMethod string                 `json:"auth_method,omitempty"`
	IP         string                 `json:"ip"`
	UserAgent  string                 `json:"user_agent"`
	Method     string                 `json:"method"`
	Route      string                 `json:"route"`
	Status     int                    `json:"status"`
	Success    bool                   `json:"success"`
	RequestID  string                 `json:"request_id"`
	Content    string                 `json:"content"`
	Other      map[string]interface{} `json:"other"`
}

func auditItem(log *model.Log) auditLogItem {
	other, _ := common.StrToMap(log.Other)
	action := ""
	if op, ok := other["op"].(map[string]interface{}); ok {
		action, _ = op["action"].(string)
	}
	if action == "" {
		action = log.Content
	}
	category := action
	if dot := strings.IndexByte(category, '.'); dot > 0 {
		category = category[:dot]
	}
	adminInfo, _ := other["admin_info"].(map[string]interface{})
	auditInfo, _ := other["audit_info"].(map[string]interface{})
	actorRole := 0
	if value, ok := adminInfo["admin_role"].(float64); ok {
		actorRole = int(value)
	}
	status := 200
	if value, ok := auditInfo["status"].(float64); ok {
		status = int(value)
	}
	success := status >= 200 && status < 400
	if value, ok := auditInfo["success"].(bool); ok {
		success = value
	}
	authMethod, _ := adminInfo["auth_method"].(string)
	route, _ := auditInfo["route"].(string)
	method, _ := auditInfo["method"].(string)
	return auditLogItem{
		EventID: log.RequestId,
		UserID:  log.UserId, Username: log.Username, ActorRole: actorRole,
		CreatedAt: log.CreatedAt, Category: category, Action: action,
		TokenRef: log.TokenName, AuthMethod: authMethod, IP: log.Ip,
		Method: method, Route: route, Status: status, Success: success,
		RequestID: log.RequestId, Content: log.Content, Other: other,
	}
}

func getAuditLogs(c *gin.Context, self bool) {
	pageInfo := common.GetPageQuery(c)
	start, _ := strconv.ParseInt(c.Query("start_timestamp"), 10, 64)
	end, _ := strconv.ParseInt(c.Query("end_timestamp"), 10, 64)
	var logs []*model.Log
	var total int64
	var err error
	if self {
		logs, total, err = model.GetUserLogs(c.GetInt("id"), model.LogTypeManage, start, end, "", "", pageInfo.GetStartIdx(), pageInfo.GetPageSize(), "", c.Query("request_id"), "")
	} else {
		logs, total, err = model.GetAllLogs(model.LogTypeManage, start, end, "", c.Query("username"), "", pageInfo.GetStartIdx(), pageInfo.GetPageSize(), 0, "", c.Query("request_id"), "")
	}
	if err != nil {
		common.ApiError(c, err)
		return
	}
	items := make([]auditLogItem, 0, len(logs))
	for _, log := range logs {
		items = append(items, auditItem(log))
	}
	c.JSON(200, gin.H{"success": true, "message": "", "data": gin.H{
		"items": items, "total": total, "page": pageInfo.GetPage(), "page_size": pageInfo.GetPageSize(),
	}})
}

func GetAuditLogs(c *gin.Context)     { getAuditLogs(c, false) }
func GetSelfAuditLogs(c *gin.Context) { getAuditLogs(c, true) }
