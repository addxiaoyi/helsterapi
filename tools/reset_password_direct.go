package main

import (
	"fmt"
	"os"

	"github.com/QuantumNous/new-api/common"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type User struct {
	Id       int    `gorm:"primaryKey"`
	Username string
	Password string
	Status   int
}

func main() {
	if len(os.Args) != 3 {
		fmt.Println("用法: go run reset_password_direct.go <用户名> <新密码>")
		os.Exit(1)
	}

	username := os.Args[1]
	newPassword := os.Args[2]

	db, err := gorm.Open(sqlite.Open("one-api.db"), &gorm.Config{})
	if err != nil {
		fmt.Printf("❌ 数据库连接失败: %v\n", err)
		os.Exit(1)
	}

	var user User
	result := db.Table("users").Where("username = ? OR email = ?", username, username).First(&user)
	if result.Error != nil {
		fmt.Printf("❌ 用户不存在: %s\n", username)
		os.Exit(1)
	}

	fmt.Printf("找到用户: %s (ID: %d)\n", user.Username, user.Id)

	// 使用推荐的 bcrypt cost = 12
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		fmt.Printf("❌ 密码哈希失败: %v\n", err)
		os.Exit(1)
	}

	// 更新密码和状态
	updates := map[string]interface{}{
		"password": string(hashedPassword),
		"status":   common.UserStatusEnabled,
	}

	result = db.Table("users").Where("id = ?", user.Id).Updates(updates)
	if result.Error != nil {
		fmt.Printf("❌ 更新失败: %v\n", result.Error)
		os.Exit(1)
	}

	fmt.Println("✅ 密码重置成功!")
	fmt.Println("✅ 用户状态已设置为启用")
	fmt.Printf("\n新的登录凭据:\n")
	fmt.Printf("  用户名: %s\n", user.Username)
	fmt.Printf("  密码: %s\n", newPassword)
}
