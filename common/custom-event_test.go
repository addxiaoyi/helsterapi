package common

import (
	"bytes"
	"testing"
)

func TestWriteDataAcceptsNonStringValues(t *testing.T) {
	var buffer bytes.Buffer
	err := writeData(checkWriter(&buffer), 42)
	if err != nil {
		t.Fatalf("write data: %v", err)
	}
	if buffer.String() != "42" {
		t.Fatalf("event data = %q, want %q", buffer.String(), "42")
	}
}
