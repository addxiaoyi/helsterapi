# Backend Routes vs Frontend API Calls: Coverage Audit Report

## Scope

- **Backend router files** (all `.go` files under `/app/router/`):
  - `api-router.go` (418 lines)
  - `channel-router.go`
  - `model-router.go`
  - `deployment-router.go`
  - `subscription-router.go`
  - `authz-router.go`
  - `pg-router.go`
  - `video-router.go`

- **Frontend API layer**: `/app/web/src/lib/api.ts` (~1500 lines)

- **Frontend pages**: all `.tsx` files under `/app/web/src/pages/`

---

## 1. Backend Route Inventory

### 1.1 `api-router.go` — Top-level routes

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/setup` | `GetSetup` | - |
| POST | `/setup` | `PostSetup` | anonymous |
| GET | `/status` | `GetStatus` | - |
| GET | `/uptime/status` | `GetUptimeKumaStatus` | - |
| GET | `/models` | `DashboardListModels` | user |
| GET | `/status/test` | `TestStatus` | admin |
| GET | `/notice` | `GetNotice` | - |
| GET | `/user-agreement` | `GetUserAgreement` | - |
| GET | `/privacy-policy` | `GetPrivacyPolicy` | - |
| GET | `/about` | `GetAbout` | - |
| GET | `/home_page_content` | `GetHomePageContent` | - |
| POST | `/iframe-jwt` | `GenerateIframeJWT` | user |
| GET | `/pricing` | `GetPricing` | HeaderNav |
| GET | `/user-ranking` | `GetUserRanking` | user |
| GET | `/rankings` | `GetRankings` | HeaderNav |
| GET | `/verification` | `SendEmailVerification` | rate limit |
| GET | `/reset_password` | `SendPasswordResetEmail` | rate limit |
| POST | `/user/reset` | `ResetPassword` | rate limit |
| GET | `/oauth/state` | `GenerateOAuthCode` | rate limit |
| POST | `/oauth/email/bind` | `EmailBind` | rate limit |
| GET | `/oauth/wechat` | `WeChatAuth` | rate limit |
| POST | `/oauth/wechat/bind` | `WeChatBind` | rate limit |
| GET | `/oauth/telegram/login` | `TelegramLogin` | rate limit |
| GET | `/oauth/telegram/bind` | `TelegramBind` | rate limit |
| GET | `/oauth/:provider` | `HandleOAuth` | rate limit |
| GET | `/ratio_config` | `GetRatioConfig` | rate limit |
| POST | `/stripe/webhook` | `StripeWebhook` | anonymous |
| POST | `/creem/webhook` | `CreemWebhook` | anonymous |
| POST | `/waffo/webhook` | `WaffoWebhook` | anonymous |
| POST | `/waffo-pancake/webhook/:env` | `WaffoPancakeWebhook` | anonymous |
| POST | `/verify` | `UniversalVerify` | user |
| GET | `/perf-metrics` | `GetPerfMetrics` | admin |
| GET | `/perf-metrics/summary` | `GetPerfMetrics` | admin |

#### `/user` group

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/user/register` | `Register` | - |
| POST | `/user/login` | `Login` | - |
| POST | `/user/login/2fa` | `Verify2FALogin` | - |
| POST | `/user/passkey/login/begin` | `PasskeyLoginBegin` | - |
| POST | `/user/passkey/login/finish` | `PasskeyLoginFinish` | - |
| GET | `/user/logout` | `Logout` | - |
| GET/POST | `/user/epay/notify` | `EpayNotify` | anonymous |
| GET | `/user/groups` | `GetUserGroups` | - |

##### `/user/` (authenticated self)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/self/groups` | `GetUserGroups` |
| GET | `/self` | `GetSelf` |
| GET | `/models` | `GetUserModels` |
| PUT | `/self` | `UpdateSelf` |
| DELETE | `/self` | `DeleteSelf` |
| GET | `/token` | `GenerateAccessToken` |
| GET | `/passkey` | `PasskeyStatus` |
| POST | `/passkey/register/begin` | `PasskeyRegisterBegin` |
| POST | `/passkey/register/finish` | `PasskeyRegisterFinish` |
| POST | `/passkey/verify/begin` | `PasskeyVerifyBegin` |
| POST | `/passkey/verify/finish` | `PasskeyVerifyFinish` |
| DELETE | `/passkey` | `PasskeyDelete` |
| GET | `/aff` | `GetAffCode` |
| GET | `/topup/info` | `GetTopUpInfo` |
| GET | `/topup/self` | `GetUserTopUps` |
| POST | `/topup` | `TopUp` |
| POST | `/pay` | `RequestEpay` |
| POST | `/amount` | `RequestAmount` |
| POST | `/stripe/pay` | `RequestStripePay` |
| POST | `/stripe/amount` | `RequestStripeAmount` |
| POST | `/creem/pay` | `RequestCreemPay` |
| POST | `/waffo/amount` | `RequestWaffoAmount` |
| POST | `/waffo/pay` | `RequestWaffoPay` |
| POST | `/waffo-pancake/amount` | `RequestWaffoPancakeAmount` |
| POST | `/waffo-pancake/pay` | `RequestWaffoPancakePay` |
| POST | `/aff_transfer` | `TransferAffQuota` |
| PUT | `/setting` | `UpdateUserSetting` |
| GET | `/2fa/status` | `Get2FAStatus` |
| POST | `/2fa/setup` | `Setup2FA` |
| POST | `/2fa/enable` | `Enable2FA` |
| POST | `/2fa/disable` | `Disable2FA` |
| POST | `/2fa/backup_codes` | `RegenerateBackupCodes` |
| GET | `/checkin` | `GetCheckinStatus` |
| POST | `/checkin` | `DoCheckin` |
| GET | `/oauth/bindings` | `GetUserOAuthBindings` |
| DELETE | `/oauth/bindings/:provider_id` | `UnbindCustomOAuth` |

##### `/user/` (admin)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/` | `GetAllUsers` |
| GET | `/topup` | `GetAllTopUps` |
| POST | `/topup/complete` | `AdminCompleteTopUp` |
| POST | `/topup/epay/reconcile` | `AdminReconcileEpay` |
| GET | `/search` | `SearchUsers` |
| GET | `/:id/oauth/bindings` | `GetUserOAuthBindingsByAdmin` |
| DELETE | `/:id/oauth/bindings/:provider_id` | `UnbindCustomOAuthByAdmin` |
| DELETE | `/:id/bindings/:binding_type` | `AdminClearUserBinding` |
| GET | `/:id` | `GetUser` |
| POST | `/` | `CreateUser` |
| POST | `/manage` | `ManageUser` |
| PUT | `/` | `UpdateUser` |
| DELETE | `/:id` | `DeleteUser` |
| DELETE | `/:id/reset_passkey` | `AdminResetPasskey` |
| GET | `/2fa/stats` | `Admin2FAStats` |
| DELETE | `/:id/2fa` | `AdminDisable2FA` |

#### `/subscription` group

| Method | Path | Handler |
|--------|------|---------|
| GET | `/plans` | `GetSubscriptionPlans` |
| GET | `/self` | `GetSubscriptionSelf` |
| PUT | `/self/preference` | `UpdateSubscriptionPreference` |
| POST | `/balance/pay` | `SubscriptionRequestBalancePay` |
| POST | `/epay/pay` | `SubscriptionRequestEpay` |
| POST | `/stripe/pay` | `SubscriptionRequestStripePay` |
| POST | `/creem/pay` | `SubscriptionRequestCreemPay` |
| POST | `/waffo/pay` | `SubscriptionRequestWaffoPay` |
| POST | `/waffo-pancake/pay` | `SubscriptionRequestWaffoPancakePay` |
| GET | `/:id` | `GetSubscription` |
| DELETE | `/:id` | `CancelSubscription` |
| PUT | `/:id/reactivate` | `ReactivateSubscription` |
| GET | `/epay/notify` | `SubscriptionEpayNotify` |
| GET/POST | `/epay/return` | `SubscriptionEpayReturn` |
| POST | `/option/payment_compliance` | `ConfirmPaymentCompliance` |

### 1.2 `channel-router.go`

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/channel/list` | `ListChannels` | user |
| GET | `/channel/:id` | `GetChannel` | user |
| POST | `/channel` | `CreateChannel` | user |
| PUT | `/channel/:id` | `UpdateChannel` | user |
| DELETE | `/channel/:id` | `DeleteChannel` | user |
| PUT | `/channel/:id/status` | `UpdateChannelStatus` | user |
| POST | `/channel/copy` | `CopyChannel` | user |
| POST | `/channel/balance` | `UpdateChannelBalance` | user |
| POST | `/channel/test` | `TestChannel` | user |
| GET | `/channel/ops` | `GetChannelOps` | admin |
| POST | `/channel/tag` | `UpdateChannelTag` | user |
| GET | `/channel/tag/models` | `GetChannelTagModels` | user |
| POST | `/channel/batch/tag` | `BatchSetChannelTag` | user |
| POST | `/channel/fix` | `FixChannelAbilities` | admin |
| GET | `/channel/:id/models` | `GetChannelModels` | user |
| GET | `/channel/:id/upstream_ratios` | `GetUpstreamRatios` | user |
| GET | `/channel/affinity` | `GetChannelAffinity` | user |
| PUT | `/channel/affinity` | `SetChannelAffinity` | user |
| GET | `/channel/affinity/cache` | `GetChannelAffinityCache` | admin |
| POST | `/channel/affinity/cache` | `UpdateChannelAffinityCache` | admin |
| DELETE | `/channel/affinity/cache` | `ClearChannelAffinityCache` | admin |
| GET | `/channel/detect_upstream_updates` | `DetectUpstreamUpdates` | user |
| POST | `/channel/apply_upstream_updates` | `ApplyUpstreamUpdates` | user |
| GET | `/channel/tag` | `ListChannelTags` | user |
| DELETE | `/channel/tag/:id` | `DeleteChannelTag` | user |
| POST | `/channel/tag` | `CreateChannelTag` | user |

### 1.3 `model-router.go`

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/model/list` | `ListModels` | user |
| GET | `/model/:id` | `GetModel` | user |
| POST | `/model` | `CreateModel` | user |
| PUT | `/model/:id` | `UpdateModel` | user |
| DELETE | `/model/:id` | `DeleteModel` | user |
| GET | `/model/missing` | `GetMissingModels` | user |
| POST | `/model/preview_sync` | `PreviewModelSync` | user |
| POST | `/model/sync` | `SyncUpstreamModels` | user |

### 1.4 `deployment-router.go`

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/deployments/` | `ListDeployments` | admin |
| GET | `/deployments/search` | `SearchDeployments` | admin |
| GET | `/deployments/test-connection` | `TestDeploymentConnection` | admin |
| POST | `/deployments/` | `CreateDeployment` | admin |
| GET | `/deployments/hardware-types` | `GetDeploymentHardwareTypes` | admin |
| GET | `/deployments/locations` | `GetDeploymentLocations` | admin |
| GET | `/deployments/available-replicas` | `GetAvailableReplicas` | admin |
| POST | `/deployments/price-estimation` | `EstimateDeploymentPrice` | admin |
| GET | `/deployments/:id` | `GetDeployment` | admin |
| GET | `/deployments/:id/containers` | `GetDeploymentContainers` | admin |
| PUT | `/deployments/:id` | `UpdateDeployment` | admin |
| DELETE | `/deployments/:id` | `DeleteDeployment` | admin |
| PUT | `/deployments/:id/name` | `RenameDeployment` | admin |
| POST | `/deployments/:id/extend` | `ExtendDeployment` | admin |
| POST | `/deployments/:id/containers/:containerId` | `UpdateContainer` | admin |
| GET | `/deployments/:id/logs` | `GetDeploymentLogs` | admin |
| GET | `/deployments/check-name` | `CheckDeploymentName` | admin |

### 1.5 `subscription-router.go` (admin management)

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/subscription/:id` | `GetSubscription` | admin |
| GET | `/subscription/` | `ListUserSubscriptions` | admin |
| PUT | `/subscription/:id` | `UpdateSubscriptionPlan` | admin |
| DELETE | `/subscription/:id` | `DeleteUserSubscription` | admin |
| POST | `/subscription/:id/invalidate` | `InvalidateUserSubscription` | admin |
| POST | `/subscription/:id/reset` | `ResetUserSubscriptions` | admin |
| GET | `/subscription/:id/billing` | `GetSubscriptionBilling` | admin |
| GET | `/subscription/plans` | `ListSubscriptionPlans` | admin |
| POST | `/subscription/plans` | `CreateSubscriptionPlan` | admin |
| PUT | `/subscription/plans/:id` | `UpdateSubscriptionPlan` | admin |
| DELETE | `/subscription/plans/:id` | `DeleteSubscriptionPlan` | admin |
| PUT | `/subscription/plans/:id/status` | `UpdateSubscriptionPlanStatus` | admin |

### 1.6 `authz-router.go`

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | `/permission/catalog` | `GetPermissionCatalog` | admin |
| GET | `/permission/group` | `ListPermissionGroups` | admin |
| GET | `/permission/user` | `ListUserPermissions` | admin |
| POST | `/permission/user` | `SetUserPermission` | admin |
| GET | `/permission/channel` | `ListChannelPermissions` | admin |
| POST | `/permission/channel` | `SetChannelPermission` | admin |
| GET | `/group/` | `ListGroups` | user |
| POST | `/group/` | `CreateGroup` | admin |
| GET | `/group/:id` | `GetGroup` | user |
| PUT | `/group/:id` | `UpdateGroup` | admin |
| DELETE | `/group/:id` | `DeleteGroup` | admin |
| GET | `/group/:id/members` | `ListGroupMembers` | admin |
| POST | `/group/:id/members` | `AddGroupMembers` | admin |
| DELETE | `/group/:id/members/:userId` | `RemoveGroupMember` | admin |
| POST | `/group/:id/quota` | `SetGroupQuota` | admin |
| GET | `/group/:id/quota/dates` | `GetGroupQuotaDates` | user |
| GET | `/prefill_group/` | `ListPrefillGroups` | admin |
| POST | `/prefill_group/` | `CreatePrefillGroup` | admin |
| PUT | `/prefill_group/:id` | `UpdatePrefillGroup` | admin |
| DELETE | `/prefill_group/:id` | `DeletePrefillGroup` | admin |
| GET | `/oauth/providers` | `ListOAuthProviders` | admin |
| POST | `/oauth/providers` | `CreateOAuthProvider` | admin |
| PUT | `/oauth/providers/:id` | `UpdateOAuthProvider` | admin |
| DELETE | `/oauth/providers/:id` | `DeleteOAuthProvider` | admin |
| GET | `/oauth/discover` | `DiscoverOAuth` | - |
| GET | `/vendor/` | `ListVendors` | admin |
| POST | `/vendor/` | `CreateVendor` | admin |
| PUT | `/vendor/:id` | `UpdateVendor` | admin |
| DELETE | `/vendor/:id` | `DeleteVendor` | admin |
| GET | `/vendor/:id` | `GetVendor` | admin |
| GET | `/redemption/` | `ListRedemptions` | admin |
| POST | `/redemption/` | `CreateRedemptions` | admin |
| DELETE | `/redemption/:id` | `DeleteRedemption` | admin |
| DELETE | `/redemption/invalid` | `DeleteInvalidRedemptions` | admin |
| POST | `/task/` | `CreateLogCleanupTask` | admin |
| GET | `/task/:id` | `GetSystemTask` | admin |
| GET | `/system-task/list` | `ListSystemTasks` | admin |
| GET | `/system-task/current` | `GetCurrentSystemTask` | admin |
| POST | `/system-task/log-cleanup` | `CreateLogCleanupTask` | admin |
| POST | `/option/update` | `UpdateOption` | admin |
| POST | `/option/rest_model_ratio` | `ResetModelRatio` | admin |
| POST | `/option/migrate_console_setting` | `MigrateConsoleSetting` | admin |
| GET | `/ratio_sync/channels` | `ListSyncableChannels` | admin |
| POST | `/ratio_sync/fetch` | `FetchUpstreamRatios` | admin |
| GET | `/codex/channel/:id/usage` | `GetCodexChannelUsage` | user |
| POST | `/codex/channel/:id/reset_credits` | `ResetCodexChannelCredits` | user |
| POST | `/codex/channel/:id/refresh_credential` | `RefreshCodexChannelCredential` | user |
| GET | `/channel/:id/keys` | `GetChannelKeys` | user |
| POST | `/channel/:id/keys` | `ManageChannelKeys` | user |
| DELETE | `/channel/:id/keys/:keyId` | `DeleteChannelKey` | user |
| POST | `/channel/:id/ollama/pull` | `OllamaPull` | user |
| POST | `/channel/:id/ollama/pull/stream` | `OllamaPullStream` | user |
| DELETE | `/channel/:id/ollama/:model` | `OllamaDelete` | user |
| GET | `/channel/:id/ollama/version` | `OllamaVersion` | user |
| GET | `/logs/stats` | `GetLogStats` | user |
| GET | `/logs/quota/dates` | `GetQuotaDates` | user |
| GET | `/logs/user/quota/dates` | `GetUserQuotaDates` | user |
| GET | `/logs/user/flow/quota/dates` | `GetUserFlowQuotaDates` | user |
| GET | `/logs/user/tasks` | `GetUserTasks` | user |
| GET | `/logs/user/midjourney_tasks` | `GetUserMidjourneyTasks` | user |
| POST | `/logs/user/midjourney_tasks` | `CreateMidjourneyTask` | user |
| GET | `/logs/user/topup` | `GetUserTopUps` | user |
| POST | `/option/force_gc` | `ForceGC` | admin |
| POST | `/option/clear_disk_cache` | `ClearDiskCache` | admin |
| POST | `/option/clear_stale_instances` | `ClearStaleInstances` | admin |
| GET | `/option/system_instances` | `ListSystemInstances` | admin |
| GET | `/option/performance_logs` | `GetPerformanceLogs` | admin |
| GET | `/option/performance_stats` | `GetPerformanceStats` | admin |
| POST | `/option/reset_performance_stats` | `ResetPerformanceStats` | admin |
| DELETE | `/logs/history` | `DeleteHistoryLogs` | admin |
| GET | `/debug/recent_calls` | `GetRecentCalls` | admin |
| GET | `/debug/recent_calls/:id` | `GetRecentCall` | admin |

### 1.7 `pg-router.go`

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/pg/chat/completions` | `ProxyChatCompletions` | user |
| POST | `/pg/embeddings` | `ProxyEmbeddings` | user |

### 1.8 `video-router.go`

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| POST | `/video/generate` | `GenerateVideo` | user |
| GET | `/video/task/:id` | `GetVideoTask` | user |
| POST | `/video/generate/stream` | `GenerateVideoStream` | user |

---

## 2. Frontend API Layer (`lib/api.ts`) Coverage

All 180+ API functions in `lib/api.ts` are organized into sub-objects. Below is a complete index.

### Core / Auth
`api.about`, `api.status`, `api.setupState`, `api.notice`, `api.userAgreement`, `api.privacyPolicy`, `api.homePageContent`, `api.iframeJwt`, `api.get`, `api.del`, `api.json`, `api.request`, `api.withQuery`

### User
`api.register`, `api.login`, `api.verifyTwoFactorLogin`, `api.passkeyLoginBegin`, `api.passkeyLoginFinish`, `api.logout`, `api.self`, `api.updateSelf`, `api.deleteSelf`, `api.generateAccessToken`, `api.tokenKey`, `api.tokenKeysBatch`, `api.topupInfo`, `api.topupRecords`, `api.topup`, `api.redeemTopup`, `api.completeTopup`, `api.requestPayment`, `api.requestStripePayment`, `api.requestCreemPayment`, `api.requestWaffoPayment`, `api.requestWaffoPancakePayment`, `api.transferAffQuota`, `api.updateUserSetting`, `api.twoFactorStatus`, `api.setupTwoFactor`, `api.enableTwoFactor`, `api.disableTwoFactor`, `api.regenerateBackupCodes`, `api.checkinStatus`, `api.checkin`, `api.passkeyStatus`, `api.passkeyRegisterBegin`, `api.passkeyRegisterFinish`, `api.passkeyVerifyBegin`, `api.passkeyVerifyFinish`, `api.deletePasskey`, `api.oauthBindings`, `api.unbindOAuth`, `api.userGroups`, `api.aff`

### Admin User Management
`api.users`, `api.searchUsers`, `api.getUser`, `api.createUser`, `api.manageUser`, `api.updateUser`, `api.deleteUser`, `api.adminTopups`, `api.adminCompleteTopup`, `api.reconcileEpay`, `api.adminResetPasskey`, `api.adminDisableTwoFactor`, `api.adminTwoFactorStats`, `api.adminUserOAuthBindings`, `api.adminUnbindOAuth`, `api.clearUserBinding`

### Channels
`api.channels`, `api.channelDetails`, `api.createChannel`, `api.updateChannel`, `api.deleteChannel`, `api.deleteChannelBatch`, `api.copyChannel`, `api.updateChannelStatus`, `api.batchUpdateChannelStatus`, `api.testChannel`, `api.updateChannelBalance`, `api.channelOps`, `api.channelTagModels`, `api.batchSetChannelTag`, `api.fixChannelAbilities`, `api.fetchChannelModels`, `api.fetchChannelModelsAll`, `api.fetchUpstreamRatios`, `api.detectChannelUpstreamUpdates`, `api.applyChannelUpstreamUpdates`, `api.detectAllChannelUpstreamUpdates`, `api.applyAllChannelUpstreamUpdates`, `api.disableTagChannels`, `api.enableTagChannels`, `api.editChannelTag`, `api.getChannelAffinitySetting`, `api.updateChannelAffinitySetting`, `api.channelAffinityCache`, `api.clearChannelAffinityCache`

### Channel / Codex
`api.codexChannelUsage`, `api.codexChannelResetCredits`, `api.resetCodexChannelUsage`, `api.refreshCodexChannelCredential`, `api.manageChannelKeys`, `api.ollamaPull`, `api.ollamaPullStream`, `api.ollamaDelete`, `api.ollamaVersion`

### Models
`api.models`, `api.modelDetails`, `api.createModel`, `api.updateModel`, `api.deleteModel`, `api.missingModels`, `api.previewModelSync`, `api.syncUpstreamModels`, `api.dashboardModels`

### Quota / Logs
`api.logStats`, `api.quotaDates`, `api.userQuotaDates`, `api.userFlowQuotaDates`, `api.userRanking`, `api.userTasks`, `api.userMidjourneyTasks`, `api.flowQuotaDates`

### Deployments
`api.deployments`, `api.deploymentDetails`, `api.deploymentContainers`, `api.deploymentSettings`, `api.deploymentHardware`, `api.deploymentLocations`, `api.deploymentLogs`, `api.searchDeployments`, `api.testDeploymentConnection`, `api.createDeployment`, `api.updateDeployment`, `api.deleteDeployment`, `api.renameDeployment`, `api.extendDeployment`, `api.availableReplicas`, `api.estimateDeploymentPrice`, `api.checkDeploymentName`, `api.containerDetails`

### Groups & Permissions
`api.groups`, `api.prefillGroups`, `api.permissionCatalog`, `api.prefillGroupCreate`, `api.prefillGroupUpdate`, `api.prefillGroupDelete`

### OAuth / Auth Providers
`api.oauthProviders`, `api.createOAuthProvider`, `api.updateOAuthProvider`, `api.deleteOAuthProvider`, `api.discoverOAuth`

### Vendors & Redemptions
`api.vendors`, `api.vendorDetails`, `api.addVendor`, `api.updateVendor`, `api.deleteVendor`, `api.redemptions`, `api.createRedemptions`, `api.deleteRedemption`, `api.deleteInvalidRedemptions`

### Subscriptions
`api.subscriptionPlans`, `api.mySubscription`, `api.purchaseSubscription`, `api.purchaseSubscriptionStripe`, `api.purchaseSubscriptionCreem`, `api.purchaseSubscriptionEpay`, `api.purchaseSubscriptionWaffo`, `api.purchaseSubscriptionWaffoPancake`, `api.listUserSubscriptions`, `api.createUserSubscription`, `api.deleteUserSubscription`, `api.invalidateUserSubscription`, `api.resetUserSubscriptions`, `api.bindSubscription`, `api.adminSubscriptionPlans`, `api.updateSubscriptionPlan`, `api.updateSubscriptionPlanStatus`, `api.resetPlanSubscriptions`, `api.dashboardBillingUsage`, `api.dashboardBillingSubscription`

### System / Admin
`api.uptimeStatus`, `api.statusTest`, `api.forceGc`, `api.clearDiskCache`, `api.clearStaleInstances`, `api.clearStaleInstance`, `api.systemInstances`, `api.performanceLogs`, `api.performanceStats`, `api.resetPerformanceStats`, `api.activeTaskStats`, `api.activeTaskHistory`, `api.cleanupLogs`, `api.deleteHistoryLogs`, `api.recentCalls`, `api.recentCall`, `api.systemTasks`, `api.systemTask`, `api.currentSystemTask`, `api.getRatioConfig`, `api.resetModelRatio`, `api.migrateConsoleSetting`, `api.syncableChannels`, `api.waffoPancakeCatalog`, `api.waffoPancakePair`, `api.waffoPancakeSave`, `api.waffoPancakeSubscriptionProduct`, `api.waffoPancakeSubscriptionProductOptions`, `api.confirmPaymentCompliance`

### Performance / Monitoring
`api.perfMetricsSummary`, `api.perfMetrics`, `api.uptimeStatus`

### Playground
`api.openai`, `api.anthropic`, `api.playgroundStream`

---

## 3. Cross-Reference Findings

### 3.1 Backend routes NOT covered by frontend

The following backend routes have **no corresponding function** in `lib/api.ts` and **no usage in any page**:

| Router | Path | Handler | Notes |
|--------|------|---------|-------|
| authz-router | `/permission/group` | `ListPermissionGroups` | Admin permission group listing |
| authz-router | `/permission/user` | `ListUserPermissions` | Admin user permission listing |
| authz-router | `/permission/channel` | `ListChannelPermissions` | Admin channel permission listing |
| authz-router | `/permission/user` (POST) | `SetUserPermission` | Admin set user permission |
| authz-router | `/permission/channel` (POST) | `SetChannelPermission` | Admin set channel permission |
| authz-router | `/group/:id/quota` (POST) | `SetGroupQuota` | Admin set group quota |
| authz-router | `/group/:id/quota/dates` | `GetGroupQuotaDates` | User group quota dates |
| authz-router | `/group/:id/members` | `ListGroupMembers` | Admin list group members |
| authz-router | `/group/:id/members` (POST) | `AddGroupMembers` | Admin add group members |
| authz-router | `/group/:id/members/:userId` (DELETE) | `RemoveGroupMember` | Admin remove group member |
| authz-router | `/channel/:id/keys` | `GetChannelKeys` | Channel API keys |
| authz-router | `/channel/:id/keys/:keyId` | `DeleteChannelKey` | Delete channel API key |
| authz-router | `/option/system_instances` | `ListSystemInstances` | Admin system instances |
| video-router | `/video/generate` | `GenerateVideo` | Video generation |
| video-router | `/video/task/:id` | `GetVideoTask` | Video task status |
| video-router | `/video/generate/stream` | `GenerateVideoStream` | Video streaming generation |
| pg-router | `/pg/embeddings` | `ProxyEmbeddings` | Embeddings proxy |

### 3.2 Frontend API functions with no backend route

| API function | Path called | Status |
|-------------|-------------|--------|
| `api.tokenKeysBatch` | `/token_keys/batch` | Likely defined in model-router (not visible in grep) |

### 3.3 Mismatched HTTP methods or paths

| Backend route | Frontend function | Issue |
|---------------|-----------------|-------|
| `DELETE /user/:id/bindings/:binding_type` | `api.clearUserBinding` | Backend uses path param `:binding_type`, frontend likely passes as query or body |

---

## 4. Frontend Pages Using Raw `fetch` (Bypassing `api.ts`)

| File | Path | Purpose | Uses response? |
|------|------|---------|----------------|
| `NoticeBanner.tsx` | `/api/notice` | Fetch notice banner text | Yes — `res.json()` read, result stored in state |
| `LanguageContext.tsx` | `/locales/${lang}.json` | Fetch i18n JSON | Yes — used for language strings |
| `Auth.tsx` | `/api/oauth/*` (6 routes) | OAuth redirects | No — `window.location.assign()` just navigates |
| `Auth.tsx` | `/api/oauth/github` | GitHub OAuth redirect | No — `window.location.assign()` |

### 4.1 `NoticeBanner.tsx` — Response swallowed on error

```tsx
const load = useCallback(async () => {
  try {
    const res = await fetch("/api/notice", { credentials: "include" });
    if (!res.ok) return;           // silently returns on non-2xx
    const data = (await res.json()) as { data?: unknown };
    const value = data?.data;
    if (typeof value === "string" && value.trim().length > 0) {
      setText(value.trim());
    }
  } catch {
    // ignore — the notice is best-effort
  }
}, []);
```

This is **intentional** — the notice is "best-effort" and silent failure is by design.

---

## 5. Swallowed Response Patterns in Frontend

### 5.1 Intentional / Acceptable (fire-and-forget with toast feedback)

These patterns use `void runAction(...)` which shows a success/error toast:

| Page | Pattern | Notes |
|------|---------|-------|
| `Operations.tsx` | `void runAction("gc", api.forceGc)` | Admin system GC — toast on success/failure |
| `Operations.tsx` | `void runAction("clear-cache", api.clearDiskCache)` | Toast on result |
| `Operations.tsx` | `void runAction("reset-stats", api.resetPerformanceStats)` | Toast on result |
| `Operations.tsx` | `void runAction("clean-logs", api.cleanupLogs)` | Toast on result |
| `Operations.tsx` | `void runAction("current-task", () => api.currentSystemTask(...))` | Toast on result |
| `Operations.tsx` | `void runAction("fetch-ratios", () => api.fetchUpstreamRatios(...))` | Toast on result |
| `Operations.tsx` | `void runAction("clear-stale", api.clearStaleInstances)` | Toast on result |
| `SystemSettings.tsx` | `void runAction("compliance", () => api.confirmPaymentCompliance())` | Toast on result |
| `SystemSettings.tsx` | `void runAction("cache", () => api.channelAffinityCache())` | Toast on result |
| `SystemSettings.tsx` | `void runAction("clear-cache", () => api.clearChannelAffinityCache())` | Toast on result |
| `SystemSettings.tsx` | `void runAction("ratio", () => api.resetModelRatio())` | Toast on result |
| `SystemSettings.tsx` | `void runAction("migrate", () => api.migrateConsoleSetting())` | Toast on result |
| `SystemSettings.tsx` | `void runAction("waffo", () => api.waffoPancakeCatalog())` | Toast on result |

### 5.2 Potentially Problematic (await but no return value check)

| File | Line | Code | Issue |
|------|------|------|-------|
| `Channels.tsx` | 336 | `await api.testChannel(id)` | Tests channel — result not captured. If the test fails, error propagates (caught by outer try/catch). No toast shown on success. |
| `Channels.tsx` | 353 | `await api.testChannel()` | Same — test result silently discarded. |
| `Channels.tsx` | 371 | `await api.updateChannelBalance()` | Balance update result not captured or displayed. |
| `Channels.tsx` | 437 | `await api.applyAllChannelUpstreamUpdates()` | Apply result not shown to user — if it fails, caught by outer try/catch. |
| `Channels.tsx` | 536 | `await api.fixChannelAbilities()` | Fix result not displayed. |
| `Channels.tsx` | 685 | `await api.batchSetChannelTag({ ids, tag })` | Batch tag result not shown. |
| `Channels.tsx` | 763 | `await api.resetCodexChannelUsage(id)` | Reset result not captured. |
| `Channels.tsx` | 781 | `await api.refreshCodexChannelCredential(id)` | Refresh result not captured. |
| `Channels.tsx` | 800 | `await api.ollamaVersion(id)` | Result IS captured: `setCodexUsage(...)` — correct. |
| `Models.tsx` | 144 | `await api.previewModelSync()` | Sync preview result not captured. |
| `Models.tsx` | 147 | `await api.syncUpstreamModels()` | Sync result not captured. |
| `Logs.tsx` | 246 | `await api.deleteHistoryLogs()` | Delete result not captured. |
| `Keys.tsx` | 336 | `await api.deleteToken(token.id)` | Delete result not captured. |
| `Keys.tsx` | 392 | `await api.deleteTokenBatch(selectedIds)` | Batch delete result not captured. |
| `Users.tsx` | 105 | `await api.deleteUser(user.id)` | Delete result not captured. |
| `Users.tsx` | 150, 216, 406 | `await api.manageUser(...)` | Management result not captured — action-specific. |
| `Users.tsx` | 249 | `await api.adminResetPasskey(user.id)` | Reset result not captured. |
| `Users.tsx` | 272 | `await api.adminDisableTwoFactor(user.id)` | Disable result not captured. |
| `Users.tsx` | 329 | `await api.adminUnbindOAuth(...)` | Unbind result not captured. |
| `Users.tsx` | 359 | `await api.clearUserBinding(...)` | Clear binding result not captured. |
| `Users.tsx` | 451 | `await api.deleteUser(Number(id))` | Delete result not captured. |
| `Models.tsx` | 75 | `await api.deleteModel(model.id)` | Delete result not captured. |
| `Channels.tsx` | 142 | `await api.deleteChannel(channel.id)` | Delete result not captured. |
| `Channels.tsx` | 216-217 | `await api.updateChannel(...)` / `await api.createChannel(...)` | Result not captured — page state may not refresh. |
| `Channels.tsx` | 245 | `await api.updateChannelStatus(...)` | Status update result not shown. |
| `Channels.tsx` | 267 | `await api.copyChannel(...)` | Copy result not captured. |
| `RedemptionCodes.tsx` | 98 | `await api.deleteInvalidRedemptions()` | Delete result not captured. |
| `RatioConfig.tsx` | 136 | `await api.resetModelRatio()` | Reset result not captured. |
| `SystemSettings.tsx` | 161 | `await api.updateOption(...)` | Option update result not captured. |
| `PaymentComplianceGate.tsx` | 33 | `await api.confirmPaymentCompliance()` | Confirm result not captured. |
| `AppContext.tsx` | 39 | `await api.logout()` | Logout result not captured — navigates to login. |
| `Auth.tsx` | 246 | `await api.register(...)` | Register result not captured — may need refresh. |
| `Auth.tsx` | 369 | `await api.passkeyLoginFinish(...)` | Passkey login result not captured. |
| `Auth.tsx` | 407 | `await api.sendEmailVerification(...)` | Verification send result not captured. |
| `Channels.tsx` | 614 | `await api.manageChannelKeys(...)` | Channel keys management result not captured. |
| `Channels.tsx` | 569-570 | `await api.ollamaPull(...)` / `await api.ollamaDelete(...)` | Ollama operations result not captured. |

### 5.3 Properly Handled (return value used)

These calls correctly capture and use the return value:

- `Dashboard.tsx` — `logStats`, `firstChannelPage`, `modelMap`, `performanceSummary` all stored in state
- `Operations.tsx` — `systemTasks`, `systemInstances`, `syncableChannels`, `performanceLogs`, `performanceStats` all stored in `setPayload`
- `Diagnostics.tsx` — `recentCalls`, `recentCall` stored in state for display
- `Channels.tsx` — `channelOps`, `tagModels`, `upstreamUpdates` stored in state
- `Users.tsx` — `twoFactorStats`, `oauthBindings` stored in state
- `Keys.tsx` — `addToken`, `updateToken` results trigger list refresh
- `AdminLayout.tsx` — `perfMetricsSummary` stored for display

---

## 6. Summary

### High Priority Issues

1. **No toast feedback for many admin actions** — `Channels.tsx` silently discards results of `testChannel`, `updateChannelBalance`, `fixChannelAbilities`, `batchSetChannelTag`, `applyAllChannelUpstreamUpdates`, `codexChannelResetCredits`, `refreshCodexChannelCredential`, `ollamaPull`, `ollamaDelete`. Users see no confirmation and no error message if the operation fails.

2. **CRUD operations missing state refresh** — `updateChannel`, `createChannel`, `deleteChannel`, `deleteUser`, `deleteModel`, `deleteToken`, `manageUser`, `batchUpdateChannelStatus` do not capture return values. If the backend mutates the entity (e.g., adds fields), the local state goes stale until the next full reload.

3. **Missing API wrapper functions** — `tokenKeysBatch`, `ListGroupMembers`, `AddGroupMembers`, `RemoveGroupMember`, `SetGroupQuota`, `ListChannelKeys`, `DeleteChannelKey`, `ListPermissionGroups`, `ListUserPermissions`, `ListChannelPermissions`, `SetUserPermission`, `SetChannelPermission` have no frontend coverage at all. The admin UI may be missing features that the backend supports.

### Medium Priority Issues

4. **Uncalled `/debug/recent_calls` DELETE** — Backend has `DELETE /logs/history` but frontend calls `api.deleteHistoryLogs()` which resolves to `DELETE /logs/history`. This appears correct, but the frontend parameterization should be verified.

5. **Video router entirely unused** — Three backend routes (`/video/generate`, `/video/task/:id`, `/video/generate/stream`) have no frontend coverage.

### Low Priority / Informational

6. **NoticeBanner uses raw `fetch`** — Intentionally bypasses `api.ts` for a best-effort notice. Functional but inconsistent with the rest of the codebase.

7. **OAuth routes use `window.location.assign`** — OAuth redirects in `Auth.tsx` bypass the API layer entirely, which is the correct approach for browser-side redirects.
