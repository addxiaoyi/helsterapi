package common

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetPageQueryNormalizesInvalidValues(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest("GET", "/?p=-2&page_size=-1", nil)

	page := GetPageQuery(ctx)

	require.Equal(t, 1, page.GetPage())
	require.Equal(t, ItemsPerPage, page.GetPageSize())
	require.Equal(t, 0, page.GetStartIdx())
}

func TestGetPageQueryUsesPositiveLegacyPageSize(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest("GET", "/?p=2&page_size=-1&ps=25", nil)

	page := GetPageQuery(ctx)

	require.Equal(t, 2, page.GetPage())
	require.Equal(t, 25, page.GetPageSize())
	require.Equal(t, 25, page.GetStartIdx())
}

func TestGetPageQueryCapsHugePageNumber(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx, _ := gin.CreateTestContext(httptest.NewRecorder())
	ctx.Request = httptest.NewRequest("GET", "/?p=9223372036854775807&page_size=100", nil)

	page := GetPageQuery(ctx)

	require.Equal(t, maxPageNumber, page.GetPage())
	require.Equal(t, maxPageNumber*100-100, page.GetStartIdx())
}
