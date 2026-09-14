package common

import "testing"

func TestInMemoryRateLimiterZeroLimitMeansUnlimited(t *testing.T) {
	var limiter InMemoryRateLimiter
	limiter.Init(0)

	if !limiter.Request("unlimited", 0, 60) {
		t.Fatal("expected zero limit to allow requests")
	}
	if !limiter.Request("unlimited", -1, 60) {
		t.Fatal("expected negative limit to fail open safely")
	}
}

func TestInMemoryRateLimiterRejectsNonPositiveDuration(t *testing.T) {
	var limiter InMemoryRateLimiter
	limiter.Init(0)

	if limiter.Request("invalid-duration", 1, 0) {
		t.Fatal("expected non-positive duration to be rejected")
	}
}
