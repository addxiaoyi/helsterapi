package main

import (
	"fmt"
	"os"
	"syscall"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/glebarez/sqlite"
	"golang.org/x/term"
	"gorm.io/gorm"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("用法: go run reset_password.go <用户名或邮箱>")
		os.Exit(1)
	}

	username := os.Args[1]

	// 连接数据库
	db, err := gorm.Open(sqlite.Open("one-api.db"), &gorm.Config{})
	if err != nil {
		fmt.Printf("❌ 无法连接数据库: %v\n", err)
		os.Exit(1)
	}

	// 查询用户
	var user model.User
	err = db.Where("username = ? OR email = ?", username, username).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			fmt.Printf("❌ 用户不存在: %s\n", username)
		} else {
			fmt.Printf("❌ 数据库查询错误: %v\n", err)
		}
		os.Exit(1)
	}

	fmt.Printf("找到用户: %s (ID: %d)\n", user.Username, user.Id)

	// 输入新密码
	fmt.Print("请输入新密码: ")
	password, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		fmt.Printf("\n❌ 读取密码失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Println()

	fmt.Print("请再次输入新密码: ")
	password2, err := term.ReadPassword(int(syscall.Stdin))
	if err != nil {
		fmt.Printf("\n❌ 读取密码失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Println()

	if string(password) != string(password2) {
		fmt.Println("❌ 两次输入的密码不一致")
		os.Exit(1)
	}

	if len(password) < 6 {
		fmt.Println("❌ 密码长度至少为6个字符")
		os.Exit(1)
	}

	// 使用项目的密码哈希函数
	hashedPassword, err := common.Password2Hash(string(password))
	if err != nil {
		fmt.Printf("❌ 生成密码哈希失败: %v\n", err)
		os.Exit(1)
	}

	// 更新密码和状态
	err = db.Model(&user).Updates(map[string]interface{}{
		"password": hashedPassword,
		"status":   common.UserStatusEnabled, // 确保用户状态为启用
	}).Error

	if err != nil {
		fmt.Printf("❌ 更新密码失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✓ 密码重置成功！")
	fmt.Println("✓ 用户状态已设置为启用")
	fmt.Println("\n现在可以使用新密码登录了。")
}
