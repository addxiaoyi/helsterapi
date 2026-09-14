package service

import (
	"testing"

	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/stretchr/testify/require"
)

func TestGetUserAutoGroupOrdersByEffectiveRatio(t *testing.T) {
	originalGroups := setting.UserUsableGroups2JSONString()
	originalRatios := ratio_setting.GroupRatio2JSONString()
	t.Cleanup(func() {
		require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(originalGroups))
		require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(originalRatios))
	})

	require.NoError(t, setting.UpdateUserUsableGroupsByJSONString(`{"cheap":"Cheap","premium":"Premium","auto":"Auto"}`))
	require.NoError(t, ratio_setting.UpdateGroupRatioByJSONString(`{"cheap":0.05,"premium":0.4,"default":1}`))

	require.Equal(t, []string{"cheap", "premium", "default"}, GetUserAutoGroup("default"))
}
