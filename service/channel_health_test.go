package service

import "testing"

func TestChannelHealthCooldownAndRecovery(t *testing.T) {
	const channelID = 987654321
	RecordChannelHealthSuccess(channelID)
	baseline := GetChannelHealthSnapshot(channelID)
	if IsChannelCoolingDown(channelID) {
		t.Fatal("fresh channel must not be cooling down")
	}

	for i := 0; i < channelFailureThreshold; i++ {
		RecordChannelHealthFailure(channelID)
	}
	if !IsChannelCoolingDown(channelID) {
		t.Fatal("channel should cool down after consecutive failures")
	}
	snapshot := GetChannelHealthSnapshot(channelID)
	if snapshot.Requests != baseline.Requests+channelFailureThreshold || snapshot.Failures != baseline.Failures+channelFailureThreshold {
		t.Fatalf("unexpected health snapshot: %+v", snapshot)
	}
	if snapshot.ErrorRate <= 0 || snapshot.ErrorRate >= 1 {
		t.Fatalf("unexpected error rate: %v", snapshot.ErrorRate)
	}

	RecordChannelHealthSuccess(channelID)
	if IsChannelCoolingDown(channelID) {
		t.Fatal("successful request should clear cooldown")
	}
	snapshot = GetChannelHealthSnapshot(channelID)
	if snapshot.Requests != baseline.Requests+channelFailureThreshold+1 || snapshot.Successes != baseline.Successes+1 || snapshot.ConsecutiveFailures != 0 {
		t.Fatalf("unexpected recovery snapshot: %+v", snapshot)
	}
}
