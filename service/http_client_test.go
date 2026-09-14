package service

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestInitHttpClientDoesNotForceHTTP2ForRelayTraffic(t *testing.T) {
	previousClient := httpClient
	previousProtectedClient := ssrfProtectedHTTPClient
	t.Cleanup(func() {
		httpClient = previousClient
		ssrfProtectedHTTPClient = previousProtectedClient
	})

	InitHttpClient()

	transport, ok := httpClient.Transport.(*http.Transport)
	require.True(t, ok)
	require.False(t, transport.ForceAttemptHTTP2)
	require.NotNil(t, transport.TLSNextProto)
	require.Empty(t, transport.TLSNextProto)
}
