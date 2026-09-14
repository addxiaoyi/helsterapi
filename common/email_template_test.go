package common

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRenderVerificationEmailUsesStarXHTMLLayout(t *testing.T) {
	html, err := RenderVerificationEmail("StarX", "123456", 10)

	require.NoError(t, err)
	require.Contains(t, html, "<!doctype html>")
	require.Contains(t, html, "StarX")
	require.Contains(t, html, "123456")
	require.Contains(t, html, "10 分钟内有效")
	require.Contains(t, html, "验证码")
}

func TestRenderPasswordResetEmailEscapesResetURL(t *testing.T) {
	resetURL := "https://ai.star-mc.top/user/reset?token=<unsafe>"
	html, err := RenderPasswordResetEmail("StarX", resetURL, 10)

	require.NoError(t, err)
	require.Contains(t, html, "重置密码")
	require.Contains(t, html, "10 分钟内有效")
	require.Contains(t, html, "https://ai.star-mc.top/user/reset?token=&lt;unsafe&gt;")
	require.NotContains(t, html, "token=<unsafe>")
}
