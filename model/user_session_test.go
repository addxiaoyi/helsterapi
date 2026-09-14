package model

import (
	"fmt"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestUserSessionIsolationAndRevocation(t *testing.T) {
	oldDB := DB
	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:user-session-%d?mode=memory&cache=shared", time.Now().UnixNano())), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	DB = db
	t.Cleanup(func() { DB = oldDB })
	if err := db.AutoMigrate(&UserSession{}); err != nil {
		t.Fatal(err)
	}

	current, err := RegisterUserSession(7, "current-cookie", "Browser A", "192.0.2.10")
	if err != nil || current == nil {
		t.Fatalf("register current session: %v", err)
	}
	other, err := RegisterUserSession(7, "other-cookie", "Browser B", "192.0.2.11")
	if err != nil || other == nil {
		t.Fatalf("register other session: %v", err)
	}
	if _, err := RegisterUserSession(8, "different-user-cookie", "Browser C", "192.0.2.12"); err != nil {
		t.Fatal(err)
	}

	sessions, err := ListUserSessions(7)
	if err != nil || len(sessions) != 2 {
		t.Fatalf("unexpected user session list: len=%d err=%v", len(sessions), err)
	}
	if err := RevokeOtherUserSessions(7, "current-cookie"); err != nil {
		t.Fatal(err)
	}
	if revoked, err := IsSessionRevoked("current-cookie"); err != nil || revoked {
		t.Fatalf("current session should remain usable: revoked=%v err=%v", revoked, err)
	}
	if revoked, err := IsSessionRevoked("other-cookie"); err != nil || !revoked {
		t.Fatalf("other session should be revoked: revoked=%v err=%v", revoked, err)
	}
	remaining, err := ListUserSessions(7)
	if err != nil || len(remaining) != 1 || remaining[0].ID != current.ID {
		t.Fatalf("unexpected remaining sessions: %+v err=%v", remaining, err)
	}
}
