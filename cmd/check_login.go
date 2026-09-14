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
		fmt.Println("使用方法: go run cmd/check_login.go <用户名或邮箱>")
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

	// 查询用户（支持用户名或邮箱）
	var user model.User
	err = model.DB.Where("username = ? OR email = ?", username, username).First(&user).Error
	if err != nil {
		fmt.Printf("❌ 用户不存在: %s\n", username)
		os.Exit(1)
	}

	// 显示用户信息
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("🔍 用户诊断报告: %s\n", username)
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("ID:           %d\n", user.Id)
	fmt.Printf("用户名:       %s\n", user.Username)
	fmt.Printf("邮箱:         %s\n", user.Email)
	fmt.Printf("显示名:       %s\n", user.DisplayName)
	fmt.Printf("角色:         %d\n", user.Role)
	fmt.Printf("状态:         %d ", user.Status)

	// 状态检查
	if user.Status == common.UserStatusEnabled {
		fmt.Println("✅ (正常)")
	} else {
		fmt.Println("❌ (已禁用)")
		fmt.Println("\n⚠️  问题: 用户状态被禁用")
		fmt.Println("修复: 运行以下命令重置密码并启用账户:")
		fmt.Printf("      go run cmd/reset_password.go %s\n", user.Username)
		os.Exit(1)
	}

	// 密码检查
	if user.Password == "" {
		fmt.Println("密码哈希:     (空)")
		fmt.Println("\n❌ 问题: 密码字段为空")
		fmt.Println("修复: 运行以下命令设置密码:")
		fmt.Printf("      go run cmd/reset_password.go %s\n", user.Username)
		os.Exit(1)
	} else {
		hashPreview := user.Password
		if len(hashPreview) > 30 {
			hashPreview = hashPreview[:30] + "..."
		}
		fmt.Printf("密码哈希:     %s\n", hashPreview)
	}

	// 尝试验证密码
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("🔐 测试密码验证...")
	fmt.Print("请输入密码进行测试: ")
	var password string
	fmt.Scanln(&password)

	ok := common.ValidatePasswordAndHash(password, user.Password)
	if ok {
		fmt.Println("✅ 密码验证成功！")
		fmt.Println("\n✨ 用户账户一切正常，应该可以登录")
		fmt.Println("如果仍然无法登录，请检查:")
		fmt.Println("  1. 前端是否正常连接到后端")
		fmt.Println("  2. 浏览器控制台是否有错误")
		fmt.Println("  3. Session/Cookie 设置是否正确")
	} else {
		fmt.Println("❌ 密码验证失败！")
		fmt.Println("\n⚠️  问题: 输入的密码不正确")
		fmt.Println("修复: 运行以下命令重置密码:")
		fmt.Printf("      go run cmd/reset_password.go %s\n", user.Username)
	}
	fmt.Println(strings.Repeat("=", 60))
}
