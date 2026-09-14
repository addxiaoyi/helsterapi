package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

func main() {
	username := flag.String("u", "", "用户名 (留空则列出所有用户)")
	password := flag.String("p", "", "新密码 (必须)")
	flag.Parse()

	if *password == "" {
		fmt.Println("错误: 必须提供 -p 参数指定新密码")
		flag.Usage()
		os.Exit(1)
	}

	// Init env
	common.InitEnv()

	// Init DB
	err := model.InitDB()
	if err != nil {
		fmt.Printf("数据库初始化失败: %v\n", err)
		os.Exit(1)
	}
	defer func() {
		sqlDB, _ := model.DB.DB()
		if sqlDB != nil {
			sqlDB.Close()
		}
	}()

	// Hash password
	hashedPassword, err := common.Password2Hash(*password)
	if err != nil {
		fmt.Printf("密码加密失败: %v\n", err)
		os.Exit(1)
	}

	if *username == "" {
		// List all users
		var users []model.User
		err = model.DB.Find(&users).Error
		if err != nil {
			fmt.Printf("查询用户失败: %v\n", err)
			os.Exit(1)
		}
		fmt.Println("用户列表:")
		for _, u := range users {
			fmt.Printf("  Id=%d, Username=%s, Role=%d, Status=%d\n", u.Id, u.Username, u.Role, u.Status)
		}
		return
	}

	// Reset specific user
	var user model.User
	err = model.DB.Where("username = ?", *username).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			fmt.Printf("用户 '%s' 不存在\n", *username)
		} else {
			fmt.Printf("查询用户失败: %v\n", err)
		}
		os.Exit(1)
	}

	user.Password = hashedPassword
	err = model.DB.Save(&user).Error
	if err != nil {
		fmt.Printf("更新密码失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("✅ 用户 '%s' (Id=%d, Role=%d) 的密码已重置\n", user.Username, user.Id, user.Role)
}
