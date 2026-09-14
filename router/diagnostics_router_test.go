package router

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestChannelHealthRouteIsRegistered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()

	require.NotPanics(t, func() { SetApiRouter(engine) })

	for _, route := range engine.Routes() {
		if route.Method == http.MethodGet && route.Path == "/api/diagnostics/channel-health" {
			require.NotNil(t, route.HandlerFunc)
			return
		}
	}
	t.Fatal("channel health route is not registered")
}
