package main

import (
	"fmt"
	"os"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) != 2 {
		fmt.Println("用法: go run gen_hash.go <密码>")
		os.Exit(1)
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(os.Args[1]), 12)
	fmt.Print(string(hash))
}
