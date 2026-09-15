package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders adds essential security headers to all responses
// Implements OWASP security best practices
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking attacks
		c.Header("X-Frame-Options", "DENY")

		// Enable XSS protection (legacy browsers)
		c.Header("X-XSS-Protection", "1; mode=block")

		// Enforce HTTPS in production
		// TODO: Enable only in production environment
		// c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

		// Content Security Policy - restrict resource loading
		// Start with a restrictive policy, adjust based on needs
		csp := "default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com; " + // Turnstile requires the Cloudflare loader
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
			"img-src 'self' data: https:; " +
			"font-src 'self' data: https://fonts.gstatic.com; " +
			"connect-src 'self' https://challenges.cloudflare.com; " +
			"frame-src 'self' https://challenges.cloudflare.com; " +
			"frame-ancestors 'none'"
		c.Header("Content-Security-Policy", csp)

		// Referrer policy - don't leak referrer to external sites
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		// Permissions policy - disable dangerous browser features
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

		c.Next()
	}
}

// SecurityHeadersRelaxed provides a more permissive CSP for development
// Use this in development mode if strict CSP breaks functionality
func SecurityHeadersRelaxed() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "SAMEORIGIN") // Allow same-origin framing for dev tools
		c.Header("X-XSS-Protection", "1; mode=block")

		// Relaxed CSP for development
		csp := "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
			"img-src 'self' data: https:; " +
			"connect-src 'self' ws: wss:"
		c.Header("Content-Security-Policy", csp)

		c.Header("Referrer-Policy", "no-referrer-when-downgrade")

		c.Next()
	}
}
