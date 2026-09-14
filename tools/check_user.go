package main

import (
	"fmt"
	"os"

	"github.com/QuantumNous/new-api/model"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("用法: go run check_user.go <用户名或邮箱>")
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

	// 显示用户信息
	fmt.Println("=== 用户信息 ===")
	fmt.Printf("ID:           %d\n", user.Id)
	fmt.Printf("用户名:       %s\n", user.Username)
	fmt.Printf("邮箱:         %s\n", user.Email)
	fmt.Printf("显示名称:     %s\n", user.DisplayName)
	fmt.Printf("角色:         %d ", user.Role)

	switch user.Role {
	case 1:
		fmt.Println("(普通用户)")
	case 10:
		fmt.Println("(管理员)")
	case 100:
		fmt.Println("(超级管理员)")
	default:
		fmt.Println("(未知)")
	}

	fmt.Printf("状态:         %d ", user.Status)
	switch user.Status {
	case 1:
		fmt.Println("✓ (启用)")
	case 2:
		fmt.Println("✗ (禁用 - 这会导致登录失败！)")
	default:
		fmt.Println("✗ (未知状态 - 这会导致登录失败！)")
	}

	fmt.Printf("用户组:       %s\n", user.Group)

	if user.Password == "" {
		fmt.Println("密码:         ✗ 未设置 (这会导致登录失败！)")
	} else {
		fmt.Printf("密码哈希:     %s... (已设置)\n", user.Password[:min(20, len(user.Password))])
	}

	fmt.Println("\n=== 诊断结果 ===")

	problems := []string{}

	if user.Status != 1 {
		problems = append(problems, fmt.Sprintf("❌ 用户状态异常 (status=%d)，应该为 1", user.Status))
	}

	if user.Password == "" {
		problems = append(problems, "❌ 用户密码未设置")
	}

	if len(problems) > 0 {
		fmt.Println("发现以下问题:")
		for _, p := range problems {
			fmt.Println("  " + p)
		}
		fmt.Println("\n修复建议:")
		fmt.Println("  运行以下命令重置密码:")
		fmt.Printf("  go run reset_password.go %s\n", username)
	} else {
		fmt.Println("✓ 用户配置正常，如果仍无法登录，请检查:")
		fmt.Println("  1. 输入的密码是否正确")
		fmt.Println("  2. 系统是否启用了密码登录")
		fmt.Println("  3. 浏览器控制台是否有错误信息")
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
