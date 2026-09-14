package main

import (
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

func main() {
	// 初始化数据库
	err := model.InitDB()
	if err != nil {
		fmt.Printf("❌ 数据库初始化失败: %v\n", err)
		return
	}
	defer model.CloseDB()

	// 查询所有用户
	var users []model.User
	err = model.DB.Find(&users).Error
	if err != nil {
		fmt.Printf("❌ 查询失败: %v\n", err)
		return
	}

	if len(users) == 0 {
		fmt.Println("数据库中没有任何用户")
		return
	}

	fmt.Println(strings.Repeat("=", 80))
	fmt.Println("数据库中的所有用户:")
	fmt.Println(strings.Repeat("=", 80))
	fmt.Printf("%-5s %-20s %-30s %-8s %-10s\n", "ID", "用户名", "邮箱", "状态", "角色")
	fmt.Println(strings.Repeat("-", 80))

	for _, user := range users {
		statusText := "启用"
		if user.Status != common.UserStatusEnabled {
			statusText = "禁用"
		}

		roleText := "普通用户"
		if user.Role == common.RoleRootUser {
			roleText = "Root"
		} else if user.Role == common.RoleAdminUser {
			roleText = "管理员"
		}

		email := user.Email
		if len(email) > 28 {
			email = email[:28] + "..."
		}

		fmt.Printf("%-5d %-20s %-30s %-8s %-10s\n",
			user.Id, user.Username, email, statusText, roleText)
	}
	fmt.Println(strings.Repeat("=", 80))
	fmt.Printf("总计: %d 个用户\n", len(users))
}
