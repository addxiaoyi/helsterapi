package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func ListBackups(c *gin.Context) {
	items, err := service.ListBackups()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": items})
}

func CreateBackup(c *gin.Context) {
	item, err := service.CreateBackup()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "message": "", "data": item})
}

func DownloadBackup(c *gin.Context) {
	data, info, err := service.ReadBackup(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.Data(http.StatusOK, "application/octet-stream", data)
	c.Header("Content-Disposition", `attachment; filename="`+info.ID+`.bak"`)
}

func RestoreBackup(c *gin.Context) {
	item, err := service.RestoreBackup(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": item})
}

func DeleteBackup(c *gin.Context) {
	if err := service.DeleteBackup(c.Param("id")); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "", "data": nil})
}
