package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetUserRanking(c *gin.Context) {
	period := c.DefaultQuery("period", "week")
	limit := 20
	if rawLimit := c.Query("limit"); rawLimit != "" {
		parsed, err := strconv.Atoi(rawLimit)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "limit must be 10, 20, or 50"})
			return
		}
		limit = parsed
	}
	rows, err := service.GetUserRanking(period, limit)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": rows})
}
