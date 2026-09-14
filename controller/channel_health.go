package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type channelHealthResponse struct {
	ID           int                           `json:"id"`
	Name         string                        `json:"name"`
	Status       int                           `json:"status"`
	ResponseTime int                           `json:"response_time"`
	Health       service.ChannelHealthSnapshot `json:"health"`
}

func GetChannelHealth(c *gin.Context) {
	channels, err := model.GetAllChannels(0, 0, true, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "failed to load channel health: " + err.Error(),
		})
		return
	}

	items := make([]channelHealthResponse, 0, len(channels))
	for _, channel := range channels {
		if channel == nil {
			continue
		}
		items = append(items, channelHealthResponse{
			ID:           channel.Id,
			Name:         channel.Name,
			Status:       channel.Status,
			ResponseTime: channel.ResponseTime,
			Health:       service.GetChannelHealthSnapshot(channel.Id),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    items,
	})
}
