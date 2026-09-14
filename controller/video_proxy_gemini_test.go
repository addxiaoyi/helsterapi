package controller

import (
	"bytes"
	"strings"
	"testing"
)

func TestReadVideoTaskResponse(t *testing.T) {
	valid := bytes.Repeat([]byte("a"), int(maxVideoTaskResponseBytes))
	response, err := readVideoTaskResponse(bytes.NewReader(valid))
	if err != nil {
		t.Fatalf("read valid response: %v", err)
	}
	if len(response) != len(valid) {
		t.Fatalf("response length = %d, want %d", len(response), len(valid))
	}

	_, err = readVideoTaskResponse(strings.NewReader(strings.Repeat("a", int(maxVideoTaskResponseBytes)+1)))
	if err == nil {
		t.Fatal("expected oversized response error")
	}
}
