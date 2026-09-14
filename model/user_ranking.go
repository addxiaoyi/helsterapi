package model

import "github.com/QuantumNous/new-api/common"

type UserRankingRow struct {
	UserID   int    `json:"-"`
	Username string `json:"username"`
	Quota    int64  `json:"quota"`
	Requests int64  `json:"requests"`
}

func GetUserRankingRows(startTime, endTime int64, limit int) ([]UserRankingRow, error) {
	var rows []UserRankingRow
	query := LOG_DB.Table("logs").
		Select("user_id, username, COALESCE(SUM(quota), 0) AS quota, COUNT(*) AS requests").
		Where("type = ? AND user_id > 0 AND username <> ''", LogTypeConsume).
		Group("user_id, username").
		Order("quota DESC, requests DESC, user_id ASC").
		Limit(limit)
	if startTime > 0 {
		query = query.Where("created_at >= ?", startTime)
	}
	if endTime > 0 {
		query = query.Where("created_at <= ?", endTime)
	}
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		query = query.Order("quota DESC, requests DESC, user_id ASC")
	}
	return rows, query.Find(&rows).Error
}
