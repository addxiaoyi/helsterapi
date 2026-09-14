package common

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

func Sha256Raw(data []byte) []byte {
	h := sha256.New()
	h.Write(data)
	return h.Sum(nil)
}

func Sha256(data []byte) string {
	return hex.EncodeToString(Sha256Raw(data))
}

// Sha1Raw is deprecated, use Sha256Raw instead
// Kept for backwards compatibility
func Sha1Raw(data []byte) []byte {
	return Sha256Raw(data)
}

// Sha1 is deprecated, use Sha256 instead
// Kept for backwards compatibility
func Sha1(data []byte) string {
	return Sha256(data)
}

func HmacSha256Raw(message, key []byte) []byte {
	h := hmac.New(sha256.New, key)
	h.Write(message)
	return h.Sum(nil)
}

func HmacSha256(message, key string) string {
	return hex.EncodeToString(HmacSha256Raw([]byte(message), []byte(key)))
}
