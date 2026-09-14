package relay

import (
	"fmt"

	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

func WssHelper(c *gin.Context, info *relaycommon.RelayInfo) (newAPIError *types.NewAPIError) {
	info.InitChannelMeta(c)

	adaptor := GetAdaptor(info.ApiType)
	if adaptor == nil {
		return types.NewError(fmt.Errorf("invalid api type: %d", info.ApiType), types.ErrorCodeInvalidApiType, types.ErrOptionWithSkipRetry())
	}
	adaptor.Init(info)
	//var requestBody io.Reader
	//firstWssRequest, _ := c.Get("first_wss_request")
	//requestBody = bytes.NewBuffer(firstWssRequest.([]byte))

	statusCodeMappingStr := c.GetString("status_code_mapping")
	resp, err := adaptor.DoRequest(c, info, nil)
	if err != nil {
		return types.NewError(err, types.ErrorCodeDoRequestFailed)
	}

	if resp != nil {
		connection, ok := resp.(*websocket.Conn)
		if !ok || connection == nil {
			return types.NewError(fmt.Errorf("adaptor returned invalid WebSocket connection"), types.ErrorCodeBadResponseBody, types.ErrOptionWithSkipRetry())
		}
		info.TargetWs = connection
		defer info.TargetWs.Close()
	}

	usage, newAPIError := adaptor.DoResponse(c, nil, info)
	if newAPIError != nil {
		// reset status code 重置状态码
		service.ResetStatusCode(newAPIError, statusCodeMappingStr)
		return newAPIError
	}
	realtimeUsage, ok := usage.(*dto.RealtimeUsage)
	if !ok || realtimeUsage == nil {
		return types.NewError(fmt.Errorf("adaptor returned invalid realtime usage"), types.ErrorCodeBadResponseBody, types.ErrOptionWithSkipRetry())
	}
	service.PostWssConsumeQuota(c, info, info.UpstreamModelName, realtimeUsage, "")
	return nil
}
