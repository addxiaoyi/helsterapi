package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSEchoesOriginForCredentialedRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORS())
	router.POST("/api/user/login", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodOptions, "/api/user/login", nil)
	req.Header.Set("Origin", "http://localhost:4173")
	req.Header.Set("Access-Control-Request-Method", http.MethodPost)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusNoContent {
		t.Fatalf("expected preflight status %d, got %d", http.StatusNoContent, res.Code)
	}
	if got := res.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:4173" {
		t.Fatalf("expected credentialed origin to be echoed, got %q", got)
	}
	if got := res.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("expected credentialed requests to be allowed, got %q", got)
	}
}

func TestCORSAllowsCacheControlHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORS())
	router.GET("/api/status", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodOptions, "/api/status", nil)
	req.Header.Set("Origin", "http://localhost:4173")
	req.Header.Set("Access-Control-Request-Method", http.MethodGet)
	req.Header.Set("Access-Control-Request-Headers", "cache-control")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if got := res.Header().Get("Access-Control-Allow-Headers"); !strings.Contains(got, "Cache-Control") {
		t.Fatalf("expected Cache-Control to be allowed explicitly, got %q", got)
	}
}

func TestCORSAllowsStarXFrontendOriginOnActualRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORS())
	router.GET("/api/status", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	req.Header.Set("Origin", "https://ai.star-mc.top")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if got := res.Header().Get("Access-Control-Allow-Origin"); got != "https://ai.star-mc.top" {
		t.Fatalf("expected StarX frontend origin to be allowed, got %q", got)
	}
}

func TestCORSAllowsCanonicalAPIFrontendOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(CORS())
	router.GET("/api/status", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	req.Header.Set("Origin", "https://api.star-mc.top")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if got := res.Header().Get("Access-Control-Allow-Origin"); got != "https://api.star-mc.top" {
		t.Fatalf("expected canonical frontend origin to be allowed, got %q", got)
	}
}
