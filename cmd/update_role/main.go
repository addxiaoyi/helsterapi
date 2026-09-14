// UpdateUserRole - directly promotes user "admin" to role 100 (Root)
package main

import (
	"fmt"
	"log"

	"github.com/QuantumNous/new-api/model"
)

func main() {
	if err := model.InitDB(); err != nil {
		log.Fatalf("Failed to init DB: %v", err)
	}

	db := model.DB
	if db == nil {
		log.Fatal("DB is nil after InitDB")
	}

	// Show all users
	type User struct {
		Id       int
		Username string
		Role     int
		Status   int
	}
	var users []User
	if err := db.Raw("SELECT id, username, role, status FROM users ORDER BY id").Scan(&users).Error; err != nil {
		log.Fatalf("Failed to list users: %v", err)
	}
	fmt.Println("Current users:")
	fmt.Println("ID  Username          Role  Status")
	for _, u := range users {
		roleStr := fmt.Sprintf("%d", u.Role)
		switch u.Role {
		case 1:
			roleStr = "1 (Common)"
		case 10:
			roleStr = "10 (Admin)"
		case 100:
			roleStr = "100 (Root)"
		}
		fmt.Printf("%-3d %-18s %-15s %d\n", u.Id, u.Username, roleStr, u.Status)
	}

	res := db.Exec("UPDATE users SET role = 100 WHERE username = ?", "admin")
	if res.Error != nil {
		log.Fatalf("Update failed: %v", res.Error)
	}
	fmt.Printf("\nUpdated %d row(s). 'admin' is now role=100 (Root).\n", res.RowsAffected)

	// Verify
	var updated User
	if err := db.Raw("SELECT id, username, role, status FROM users WHERE username = ?", "admin").Scan(&updated).Error; err == nil {
		fmt.Printf("Verification: admin user role=%d\n", updated.Role)
	}
}
