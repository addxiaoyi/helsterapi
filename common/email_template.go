package common

import (
	"bytes"
	"fmt"
	"html/template"
)

type emailTemplateData struct {
	SystemName string
	Title      string
	Intro      string
	Code       string
	ActionText string
	ActionURL  string
	Minutes    int
}

var helstareEmailTemplate = template.Must(template.New("helstare-email").Parse(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{.Title}}</title>
</head>
<body style="margin:0;padding:0;background:#070a16;color:#eaf1ff;font-family:Arial,'Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:radial-gradient(circle at top,#172554 0,#070a16 55%);">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#10172b;border:1px solid #263a6b;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:28px 32px;background:linear-gradient(135deg,#172554,#1d4ed8);">
          <div style="font-size:12px;letter-spacing:3px;color:#93c5fd;">HELSTARE / SECURE MESSAGE</div>
          <div style="margin-top:8px;font-size:28px;font-weight:700;color:#ffffff;">{{.SystemName}}</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.35;color:#ffffff;">{{.Title}}</h1>
          <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.8;">{{.Intro}}</p>
          {{if .Code}}
          <div style="margin:26px 0;padding:18px;border:1px solid #3156a6;border-radius:12px;background:#0a1022;text-align:center;">
            <div style="font-size:12px;letter-spacing:2px;color:#93c5fd;">VERIFICATION CODE</div>
            <div style="margin-top:8px;font-size:34px;font-weight:700;letter-spacing:8px;color:#ffffff;">{{.Code}}</div>
          </div>
          {{end}}
          {{if .ActionURL}}
          <div style="margin:26px 0;text-align:center;">
            <a href="{{.ActionURL}}" style="display:inline-block;padding:13px 24px;border-radius:10px;background:#3b82f6;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">{{.ActionText}}</a>
          </div>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.7;word-break:break-all;">如果按钮无法打开，请复制此链接到浏览器：<br>{{.ActionURL}}</p>
          {{end}}
          <p style="margin:26px 0 0;color:#cbd5e1;font-size:14px;line-height:1.8;">此操作将在 <strong style="color:#ffffff;">{{.Minutes}} 分钟内有效</strong>。如非本人操作，请忽略此邮件。</p>
        </td></tr>
        <tr><td style="padding:18px 32px;border-top:1px solid #263a6b;color:#64748b;font-size:12px;line-height:1.6;">这是一封系统自动邮件，请勿直接回复。</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`))

func renderHelstareEmail(data emailTemplateData) (string, error) {
	var buffer bytes.Buffer
	if err := helstareEmailTemplate.Execute(&buffer, data); err != nil {
		return "", fmt.Errorf("render Helstare email template: %w", err)
	}
	return buffer.String(), nil
}

func RenderVerificationEmail(systemName, code string, validMinutes int) (string, error) {
	return renderHelstareEmail(emailTemplateData{
		SystemName: systemName,
		Title:      "验证你的邮箱",
		Intro:      "你正在注册或绑定 Helstare 账户，请使用下方验证码完成验证。",
		Code:       code,
		Minutes:    validMinutes,
	})
}

func RenderPasswordResetEmail(systemName, resetURL string, validMinutes int) (string, error) {
	return renderHelstareEmail(emailTemplateData{
		SystemName: systemName,
		Title:      "重置密码",
		Intro:      "我们收到了你的密码重置请求。请点击下方按钮继续操作。",
		ActionText: "重置密码",
		ActionURL:  resetURL,
		Minutes:    validMinutes,
	})
}
