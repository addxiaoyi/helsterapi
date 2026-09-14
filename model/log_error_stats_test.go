package model

import (
	"fmt"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestGetUserErrorStatsFiltersUserAndCalculatesRate(t *testing.T) {
	oldDB, oldLogDB := DB, LOG_DB
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:error-stats-%d?mode=memory&cache=shared", time.Now().UnixNano())), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	DB, LOG_DB = db, db
	t.Cleanup(func() { DB, LOG_DB = oldDB, oldLogDB })
	if err := db.AutoMigrate(&Log{}); err != nil {
		t.Fatal(err)
	}

	now := time.Now().Unix()
	logs := []Log{
		{UserId: 7, Username: "alice", Type: LogTypeConsume, CreatedAt: now, ModelName: "gpt-test"},
		{UserId: 7, Username: "alice", Type: LogTypeError, CreatedAt: now, ModelName: "gpt-test"},
		{UserId: 8, Username: "bob", Type: LogTypeError, CreatedAt: now, ModelName: "gpt-test"},
	}
	if err := db.Create(&logs).Error; err != nil {
		t.Fatal(err)
	}

	stats, err := GetUserErrorStats("alice", now-1, now+1, "gpt-test", "", 0, "")
	if err != nil {
		t.Fatal(err)
	}
	if stats.Requests != 1 || stats.Errors != 1 || stats.Rate != 0.5 {
		t.Fatalf("unexpected stats: %+v", stats)
	}
}
