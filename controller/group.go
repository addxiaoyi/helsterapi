package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"

	"github.com/gin-gonic/gin"
)

type GroupConfig struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Ratio       float64  `json:"ratio"`
	Enabled     bool     `json:"enabled"`
	Models      []string `json:"models"`
	Channels    int64    `json:"channels"`
}

func GetGroups(c *gin.Context) {
	groupNames := make([]string, 0)
	for groupName := range ratio_setting.GetGroupRatioCopy() {
		groupNames = append(groupNames, groupName)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    groupNames,
	})
}

func GetGroupConfigs(c *gin.Context) {
	usable := setting.GetUserUsableGroupsCopy()
	ratios := ratio_setting.GetGroupRatioCopy()
	configs := make([]GroupConfig, 0, len(ratios))
	for name, ratio := range ratios {
		var channels int64
		model.ApplyChannelGroupFilter(model.DB.Model(&model.Channel{}), name).Count(&channels)
		configs = append(configs, GroupConfig{
			Name: name, Description: usable[name], Ratio: ratio,
			Enabled: usable[name] != "" || name == "default",
			Models:  model.GetGroupEnabledModels(name), Channels: channels,
		})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": configs})
}

type groupConfigRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Ratio       float64 `json:"ratio"`
	Enabled     bool    `json:"enabled"`
}

func saveGroupConfig(c *gin.Context, oldName string, remove bool) {
	var req groupConfigRequest
	if !remove {
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "无效的分组参数"})
			return
		}
	}
	previousRatios := ratio_setting.GetGroupRatioCopy()
	previousUsable := setting.GetUserUsableGroupsCopy()
	name := strings.TrimSpace(req.Name)
	if remove {
		name = strings.TrimSpace(oldName)
	}
	if name == "" || utf8.RuneCountInString(name) > 64 || strings.ContainsAny(name, ",\r\n") || req.Ratio < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "分组名称或倍率无效"})
		return
	}
	ratios := ratio_setting.GetGroupRatioCopy()
	usable := setting.GetUserUsableGroupsCopy()
	if oldName != "" && oldName != name {
		if _, exists := ratios[name]; exists {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "分组名称已存在"})
			return
		}
		delete(ratios, oldName)
		delete(usable, oldName)
	}
	if remove {
		if name == "default" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "默认分组不可删除"})
			return
		}
		var channels int64
		if err := model.ApplyChannelGroupFilter(model.DB.Model(&model.Channel{}), name).Count(&channels).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "无法检查分组引用"})
			return
		}
		if channels > 0 {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": fmt.Sprintf("分组仍被 %d 个渠道使用", channels), "data": gin.H{"channels": channels, "models": model.GetGroupEnabledModels(name)}})
			return
		}
		delete(ratios, name)
		delete(usable, name)
	} else {
		ratios[name] = req.Ratio
		if req.Enabled {
			usable[name] = strings.TrimSpace(req.Description)
			if usable[name] == "" {
				usable[name] = name
			}
		} else {
			delete(usable, name)
		}
	}
	ratioJSON, _ := json.Marshal(ratios)
	usableJSON, _ := json.Marshal(usable)
	if err := model.UpdateOption("GroupRatio", string(ratioJSON)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	if err := model.UpdateOption("UserUsableGroups", string(usableJSON)); err != nil {
		// Restore the previous ratio if the second config cannot be persisted.
		oldJSON, _ := json.Marshal(previousRatios)
		_ = model.UpdateOption("GroupRatio", string(oldJSON))
		previousUsableJSON, _ := json.Marshal(previousUsable)
		_ = model.UpdateOption("UserUsableGroups", string(previousUsableJSON))
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": gin.H{"name": name}})
}

func CreateGroupConfig(c *gin.Context) { saveGroupConfig(c, "", false) }
func UpdateGroupConfig(c *gin.Context) { saveGroupConfig(c, c.Param("name"), false) }
func DeleteGroupConfig(c *gin.Context) {
	name := strings.TrimSpace(c.Param("name"))
	saveGroupConfig(c, name, true)
}

func GetUserGroups(c *gin.Context) {
	usableGroups := make(map[string]map[string]interface{})
	userId := c.GetInt("id")
	if userId <= 0 {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "用户身份无效"})
		return
	}
	userGroup, _ := model.GetUserGroup(userId, false)
	userUsableGroups := service.GetUserUsableGroups(userGroup)
	for groupName, _ := range ratio_setting.GetGroupRatioCopy() {
		// UserUsableGroups contains the groups that the user can use
		if desc, ok := userUsableGroups[groupName]; ok {
			usableGroups[groupName] = map[string]interface{}{
				"ratio": service.GetUserGroupRatio(userGroup, groupName),
				"desc":  desc,
			}
		}
	}
	if _, ok := userUsableGroups["auto"]; ok {
		usableGroups["auto"] = map[string]interface{}{
			"ratio": "自动",
			"desc":  setting.GetUsableGroupDescription("auto"),
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    usableGroups,
	})
}
