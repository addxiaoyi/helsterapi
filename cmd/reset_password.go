package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("使用方法: go run cmd/reset_password.go <用户名或邮箱>")
		os.Exit(1)
	}

	username := os.Args[1]

	// 初始化数据库
	err := model.InitDB()
	if err != nil {
		fmt.Printf("❌ 数据库初始化失败: %v\n", err)
		os.Exit(1)
	}
	defer model.CloseDB()

	// 查询用户
	var user model.User
	err = model.DB.Where("username = ? OR email = ?", username, username).First(&user).Error
	if err != nil {
		fmt.Printf("❌ 用户不存在: %s\n", username)
		os.Exit(1)
	}

	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("🔧 重置密码: %s (ID: %d)\n", user.Username, user.Id)
	fmt.Println(strings.Repeat("=", 60))

	// 获取新密码
	fmt.Print("请输入新密码: ")
	var password1 string
	fmt.Scanln(&password1)

	fmt.Print("请再次输入新密码: ")
	var password2 string
	fmt.Scanln(&password2)

	if password1 != password2 {
		fmt.Println("❌ 两次输入的密码不一致")
		os.Exit(1)
	}

	if len(password1) < 6 {
		fmt.Println("❌ 密码长度至少为 6 位")
		os.Exit(1)
	}

	// 哈希密码
	hashedPassword, err := common.Password2Hash(password1)
	if err != nil {
		fmt.Printf("❌ 密码哈希失败: %v\n", err)
		os.Exit(1)
	}

	// 更新数据库
	err = model.DB.Model(&user).Updates(map[string]interface{}{
		"password": hashedPassword,
		"status":   common.UserStatusEnabled,
	}).Error
	if err != nil {
		fmt.Printf("❌ 更新失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("✅ 密码重置成功！")
	fmt.Printf("✅ 用户状态已设置为: 启用 (status=%d)\n", common.UserStatusEnabled)
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("现在可以使用新密码登录了")
}
