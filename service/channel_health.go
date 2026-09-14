package service

import (
	"sync"
	"time"
)

const (
	channelFailureThreshold = 3
	channelCooldown         = 30 * time.Second
)

type channelHealthState struct {
	consecutiveFailures int
	requests            uint64
	successes           uint64
	failures            uint64
	lastFailureAt       time.Time
	cooldownEnd         time.Time
}

type ChannelHealthSnapshot struct {
	ChannelID           int       `json:"channel_id"`
	Requests            uint64    `json:"requests"`
	Successes           uint64    `json:"successes"`
	Failures            uint64    `json:"failures"`
	ErrorRate           float64   `json:"error_rate"`
	ConsecutiveFailures int       `json:"consecutive_failures"`
	LastFailureAt       time.Time `json:"last_failure_at,omitempty"`
	CooldownUntil       time.Time `json:"cooldown_until,omitempty"`
}

var channelHealth = struct {
	sync.RWMutex
	items map[int]channelHealthState
}{items: make(map[int]channelHealthState)}

func RecordChannelHealthFailure(channelID int) {
	if channelID <= 0 {
		return
	}
	channelHealth.Lock()
	state := channelHealth.items[channelID]
	state.requests++
	state.failures++
	state.consecutiveFailures++
	state.lastFailureAt = time.Now()
	if state.consecutiveFailures >= channelFailureThreshold {
		state.cooldownEnd = time.Now().Add(channelCooldown)
		state.consecutiveFailures = 0
	}
	channelHealth.items[channelID] = state
	channelHealth.Unlock()
}

func RecordChannelHealthSuccess(channelID int) {
	if channelID <= 0 {
		return
	}
	channelHealth.Lock()
	state := channelHealth.items[channelID]
	state.requests++
	state.successes++
	state.consecutiveFailures = 0
	state.cooldownEnd = time.Time{}
	channelHealth.items[channelID] = state
	channelHealth.Unlock()
}

func GetChannelHealthSnapshot(channelID int) ChannelHealthSnapshot {
	channelHealth.RLock()
	state := channelHealth.items[channelID]
	channelHealth.RUnlock()
	errorRate := 0.0
	if state.requests > 0 {
		errorRate = float64(state.failures) / float64(state.requests)
	}
	return ChannelHealthSnapshot{
		ChannelID:           channelID,
		Requests:            state.requests,
		Successes:           state.successes,
		Failures:            state.failures,
		ErrorRate:           errorRate,
		ConsecutiveFailures: state.consecutiveFailures,
		LastFailureAt:       state.lastFailureAt,
		CooldownUntil:       state.cooldownEnd,
	}
}

func IsChannelCoolingDown(channelID int) bool {
	channelHealth.RLock()
	state, ok := channelHealth.items[channelID]
	channelHealth.RUnlock()
	return ok && time.Now().Before(state.cooldownEnd)
}
