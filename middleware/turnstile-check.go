package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

type turnstileCheckResponse struct {
	Success bool `json:"success"`
}

type turnstileTokenRequest struct {
	CfTurnstileResponse string `json:"cf_turnstile_response"`
}

func TurnstileCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		if common.TurnstileCheckEnabled {
			session := sessions.Default(c)
			turnstileChecked := session.Get("turnstile")
			if turnstileChecked != nil {
				c.Next()
				return
			}
			// Prefer query param, fall back to form body, then JSON body.
			token := c.Query("turnstile")
			if token == "" && c.Request.ContentLength > 0 {
				ct := c.ContentType()
				if ct == "application/x-www-form-urlencoded" || ct == "multipart/form-data" {
					if err := c.Request.ParseForm(); err == nil {
						token = c.Request.PostFormValue("cf_turnstile_response")
					}
				} else if ct == "application/json" {
					body, _ := readBodyLimited(c.Request, 64*1024)
					if len(body) > 0 {
						var req turnstileTokenRequest
						if err := json.Unmarshal(body, &req); err == nil {
							token = req.CfTurnstileResponse
						}
					}
				}
			}
			if token == "" {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"code":    "turnstile_required",
					"message": "Turnstile token 为空",
				})
				c.Abort()
				return
			}
			payload := url.Values{
				"secret":   {common.TurnstileSecretKey},
				"response": {token},
				"remoteip": {c.ClientIP()},
			}.Encode()
			req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost,
				"https://challenges.cloudflare.com/turnstile/v0/siteverify", bytes.NewBufferString(payload))
			if err == nil {
				req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			}
			var rawRes *http.Response
			if err == nil {
				rawRes, err = (&http.Client{Timeout: 5 * time.Second}).Do(req)
			}
			if err != nil {
				common.SysLog(fmt.Sprintf("turnstile request failed: %v", err))
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"code":    "turnstile_unavailable",
					"message": "Turnstile 校验服务暂时不可用，请稍后重试",
				})
				c.Abort()
				return
			}
			defer rawRes.Body.Close()
			var res turnstileCheckResponse
			err = json.NewDecoder(rawRes.Body).Decode(&res)
			if err != nil {
				common.SysLog(err.Error())
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"code":    "turnstile_unavailable",
					"message": "Turnstile 校验服务返回异常，请稍后重试",
				})
				c.Abort()
				return
			}
			if !res.Success {
				c.JSON(http.StatusOK, gin.H{
					"success": false,
					"code":    "turnstile_failed",
					"message": "Turnstile 校验失败，请刷新重试！",
				})
				c.Abort()
				return
			}
			session.Set("turnstile", true)
			err = session.Save()
			if err != nil {
				c.JSON(http.StatusOK, gin.H{
					"message": "无法保存会话信息，请重试",
					"success": false,
				})
				return
			}
		}
		c.Next()
	}
}

func readBodyLimited(r *http.Request, max int64) ([]byte, error) {
	if r.Body == nil {
		return nil, nil
	}
	if max <= 0 {
		max = 32 * 1024
	}
	data, err := io.ReadAll(http.MaxBytesReader(nil, r.Body, max))
	if err != nil {
		return data, err
	}
	r.Body = io.NopCloser(bytes.NewReader(data))
	return data, nil
}
