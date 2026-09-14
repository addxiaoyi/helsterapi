package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

const taskPluginOptionsKey = "BuiltinTaskPlugins"

type taskPlugin struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Version      string   `json:"version"`
	Description  string   `json:"description"`
	Capabilities []string `json:"capabilities"`
	Enabled      bool     `json:"enabled"`
	Status       string   `json:"status"`
}

var builtinTaskPlugins = []taskPlugin{
	{ID: "log_cleanup", Name: "Log cleanup", Version: "builtin", Description: "Remove expired request logs through the existing system task runner.", Capabilities: []string{"cleanup", "system-task"}, Enabled: true, Status: "available"},
}

func GetTaskPlugins(c *gin.Context) {
	plugins := append([]taskPlugin(nil), builtinTaskPlugins...)
	if options, err := model.AllOption(); err == nil {
		for _, option := range options {
			if len(option.Key) > len(taskPluginOptionsKey)+1 && option.Key[:len(taskPluginOptionsKey)+1] == taskPluginOptionsKey+":" {
				id := option.Key[len(taskPluginOptionsKey)+1:]
				for i := range plugins {
					if plugins[i].ID == id {
						plugins[i].Enabled, _ = strconv.ParseBool(option.Value)
						if !plugins[i].Enabled {
							plugins[i].Status = "disabled"
						}
					}
				}
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": plugins})
}

func UpdateTaskPlugin(c *gin.Context) {
	id := c.Param("id")
	var request struct {
		Enabled *bool `json:"enabled" binding:"required"`
	}
	if err := c.ShouldBindJSON(&request); err != nil || request.Enabled == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "enabled is required"})
		return
	}
	for _, plugin := range builtinTaskPlugins {
		if plugin.ID == id {
			if err := model.UpdateOption(taskPluginOptionsKey+":"+id, map[bool]string{true: "true", false: "false"}[*request.Enabled]); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": gin.H{"id": id, "enabled": *request.Enabled}})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "task plugin not found"})
}

func TestTaskPlugin(c *gin.Context) {
	for _, plugin := range builtinTaskPlugins {
		if plugin.ID == c.Param("id") {
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": gin.H{"id": plugin.ID, "status": plugin.Status}})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "task plugin not found"})
}
