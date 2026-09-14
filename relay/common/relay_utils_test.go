package common

import "testing"

func TestJoinRequestPathAvoidsDuplicateV1(t *testing.T) {
	tests := []struct {
		name string
		base string
		path string
		want string
	}{
		{"base already has v1", "https://upstream.example/v1", "/v1/chat/completions", "https://upstream.example/v1/chat/completions"},
		{"base has no version", "https://upstream.example", "/v1/chat/completions", "https://upstream.example/v1/chat/completions"},
		{"base path is preserved", "https://upstream.example/openai", "/v1/chat/completions", "https://upstream.example/openai/v1/chat/completions"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := joinRequestPath(test.base, test.path); got != test.want {
				t.Fatalf("joinRequestPath() = %q, want %q", got, test.want)
			}
		})
	}
}
