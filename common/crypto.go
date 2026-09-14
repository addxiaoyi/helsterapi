package common

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"

	"golang.org/x/crypto/bcrypt"
)

// BcryptCost 是密码哈希的成本因子
// 从 DefaultCost (10) 提升到 12，以抵御现代GPU加速的暴力破解攻击
// Cost=12 意味着 2^12 = 4096 次迭代，在安全性和性能之间取得平衡
const BcryptCost = 12

func GenerateHMACWithKey(key []byte, data string) string {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

func GenerateHMAC(data string) string {
	h := hmac.New(sha256.New, []byte(CryptoSecret))
	h.Write([]byte(data))
	return hex.EncodeToString(h.Sum(nil))
}

func Password2Hash(password string) (string, error) {
	passwordBytes := []byte(password)
	// 使用更强的成本因子 12 替代 DefaultCost (10)
	hashedPassword, err := bcrypt.GenerateFromPassword(passwordBytes, BcryptCost)
	return string(hashedPassword), err
}

func ValidatePasswordAndHash(password string, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
