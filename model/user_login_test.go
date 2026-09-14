package model

import "testing"

func TestNormalizeLoginIdentifier(t *testing.T) {
	tests := map[string]string{
		" user-name ":               "user-name",
		" USER@Example.COM ":        "user@example.com",
		`18852585703\@163.com`:      "18852585703@163.com",
		` user\name-without-email `: `user\name-without-email`,
	}

	for input, want := range tests {
		if got := normalizeLoginIdentifier(input); got != want {
			t.Fatalf("normalizeLoginIdentifier(%q) = %q, want %q", input, got, want)
		}
	}
}
