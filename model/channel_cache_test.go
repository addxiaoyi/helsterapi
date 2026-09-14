package model

import "testing"

func TestSortChannelsForRouting(t *testing.T) {
	channels := []*Channel{
		{Id: 3, ResponseTime: 0, Weight: uintPtr(100)},
		{Id: 2, ResponseTime: 120, Weight: uintPtr(1)},
		{Id: 1, ResponseTime: 80, Weight: uintPtr(1)},
		{Id: 4, ResponseTime: 80, Weight: uintPtr(1)},
	}

	sortChannelsForRouting(channels)
	for i, want := range []int{1, 4, 2, 3} {
		if channels[i].Id != want {
			t.Fatalf("position %d: got channel %d, want %d", i, channels[i].Id, want)
		}
	}
}

func uintPtr(value uint) *uint {
	return &value
}
