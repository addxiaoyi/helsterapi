package service

import (
	"strings"
	"testing"
)

func TestBuildRouteReasonIncludesRoutingInputs(t *testing.T) {
	reason := buildRouteReason("explicit", "default", 2, "standard", "model-not-configured-for-test")
	for _, part := range []string{
		"explicit group=default",
		"user_ratio=",
		"model_price=unconfigured",
		"retry=2",
		"latency-weight-priority",
	} {
		if !strings.Contains(reason, part) {
			t.Fatalf("route reason %q does not contain %q", reason, part)
		}
	}
}
