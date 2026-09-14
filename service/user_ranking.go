package service

import (
	"fmt"
	"time"

	"github.com/QuantumNous/new-api/model"
)

type UserRankingPeriod string

const (
	UserRankingToday UserRankingPeriod = "today"
	UserRankingWeek  UserRankingPeriod = "week"
	UserRankingMonth UserRankingPeriod = "month"
	UserRankingYear  UserRankingPeriod = "year"
	UserRankingAll   UserRankingPeriod = "all"
)

type UserRankingItem struct {
	Rank     int    `json:"rank"`
	Username string `json:"username"`
	Quota    int64  `json:"quota"`
	Requests int64  `json:"requests"`
}

func GetUserRanking(period string, limit int) ([]UserRankingItem, error) {
	if limit != 10 && limit != 20 && limit != 50 {
		return nil, fmt.Errorf("invalid user ranking limit: %d", limit)
	}

	end := time.Now().Unix()
	start := int64(0)
	switch UserRankingPeriod(period) {
	case UserRankingToday:
		start = time.Now().Add(-24 * time.Hour).Unix()
	case UserRankingWeek:
		start = time.Now().Add(-7 * 24 * time.Hour).Unix()
	case UserRankingMonth:
		start = time.Now().Add(-30 * 24 * time.Hour).Unix()
	case UserRankingYear:
		now := time.Now()
		start = time.Date(now.Year(), time.January, 1, 0, 0, 0, 0, now.Location()).Unix()
	case UserRankingAll:
	default:
		return nil, fmt.Errorf("invalid user ranking period: %s", period)
	}

	rows, err := model.GetUserRankingRows(start, end, limit)
	if err != nil {
		return nil, fmt.Errorf("query user rankings: %w", err)
	}
	items := make([]UserRankingItem, 0, len(rows))
	for index, row := range rows {
		items = append(items, UserRankingItem{
			Rank:     index + 1,
			Username: row.Username,
			Quota:    row.Quota,
			Requests: row.Requests,
		})
	}
	return items, nil
}
