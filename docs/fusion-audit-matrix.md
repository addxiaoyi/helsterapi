# New API 与 Sub2API 139 项融合审计矩阵

更新时间：2026-09-11

本文件是逐项审计基线。每个编号必须对应一个独立功能，不允许以页面存在代替功能完成。状态固定为：complete、partial、frontend_missing、backend_missing、contract_mismatch、blocked_by_dependency、not_applicable。

| ID | Domain | Feature | Reference | Current | Status | Priority | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F001 | 认证 | 密码登录与注册 | new-api-main/web/src/features/auth; sub2api-main/frontend/src | app/web/src/pages/Login.tsx; app/controller | complete | P0 | POST /api/login、/api/register；公开认证；验收：登录、注册、错误提示 |
| F002 | 认证 | OAuth/OIDC 回调 | new-api-main/web/src/features/auth; sub2api-main/frontend/src | app/web/src/App.tsx; app/controller/oauth.go | partial | P0 | GET /api/oauth/*；公开回调；主域链接需回归验证 |
| F003 | 认证 | Passkey 注册登录解绑 | new-api-main/web/src/features/auth; sub2api-main/frontend/src | app/web/src/pages/SecurityCenter.tsx; app/controller/passkey.go | partial | P0 | /api/passkey/*；登录用户；RP ID/Origin 依赖生产配置 |
| F004 | 认证 | 邮箱验证码 | new-api-main/web/src/features/auth; sub2api-main/frontend/src | app/web/src/pages/Otp.tsx; app/controller | partial | P0 | /api/verify/*；公开/登录态；邮件投递需真实 MX 验收 |
| F005 | 认证 | 密码重置 | new-api-main/web/src/features/auth; sub2api-main/frontend/src | app/web/src/pages/ForgotPassword.tsx; app/web/src/pages/ResetPassword.tsx | partial | P0 | /api/user/reset；公开；链接必须使用 ServerAddress |
| F006 | 认证 | Token 刷新与会话恢复 | new-api-main/web/src/lib/api; sub2api-main/frontend/src | app/web/src/lib/api.ts; app/middleware | complete | P0 | cookie/session API；登录用户；刷新后保持会话 |
| F007 | 认证 | 管理员权限守卫 | new-api-main/web/src/routes; sub2api-main/frontend/src | app/web/src/App.tsx; app/web/src/components | complete | P0 | adminOnly 路由；管理员；普通用户访问返回 403 |
| F008 | 认证 | 2FA 设置与校验 | new-api-main/web/src/features/security; sub2api-main/frontend/src | app/web/src/pages/SecurityCenter.tsx; app/controller | partial | P1 | /api/2fa/*；登录用户；需验证启用、禁用和失败态 |
| F009 | 认证 | 敏感配置脱敏 | new-api-main/web/src/features/system-settings; sub2api-main/frontend/src | app/controller; app/web/src/lib/api.ts | complete | P0 | 设置读取接口；管理员；Key/secret 不进入响应或构建产物 |
| F010 | 认证 | 登录限流与异常反馈 | new-api-main/web/src/features/auth; sub2api-main/frontend/src | app/middleware; app/web/src/pages/Login.tsx | partial | P1 | 登录接口；公开；需覆盖超时、限流和服务端错误 |
| F011 | 认证 | 权限目录与角色策略 | new-api-main/web/src/features/permissions; sub2api-main/frontend/src | app/service/authz; app/web/src/pages/Permissions.tsx | partial | P1 | GET /api/authz/catalog；管理员；写权限接口缺失已记录 |
| F012 | 认证 | 注销与账号安全操作 | new-api-main/web/src/features/profile; sub2api-main/frontend/src | app/web/src/pages/Profile.tsx; app/controller | complete | /api/logout、账号操作；登录用户；危险操作需确认 |
| F013 | Key | Key 创建与编辑 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/pages/Keys.tsx; app/controller/token.go | complete | /api/token/*；登录用户；同表单校验和保存反馈 |
| F014 | Key | Key 脱敏与显式复制 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/pages/Keys.tsx | complete | token 列表/复制动作；本人；默认只展示脱敏值 |
| F015 | Key | 分组选择与倍率展示 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/components/ui/GroupCombobox.tsx; app/service/group.go | complete | 用户分组接口；本人；名称、介绍、倍率可搜索选择 |
| F016 | Key | 自动分组路由 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/service/group.go; app/service/channel_select.go | complete | /v1/*；Token；auto 按生效倍率升序 |
| F017 | Key | 模型限制 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/pages/Keys.tsx; app/model/token.go | partial | token 模型字段；本人；需补模型限制端到端测试 |
| F018 | Key | IP 限制 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/pages/Keys.tsx; app/controller/token.go | partial | token IP 字段；本人；需验证 IPv4/IPv6 和拒绝提示 |
| F019 | Key | 批量启用禁用删除 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/pages/Keys.tsx; app/controller/token.go | complete | /api/token/batch；本人；确认弹窗和部分失败提示 |
| F020 | Key | CC Switch 导入 | new-api-main/web/src/features/keys/components/dialogs/cc-switch-dialog.tsx; sub2api-main/frontend/src/utils/ccswitchImport.ts | app/web/src/components/ui/CCSwitchDialog.tsx; app/web/src/pages/Keys.tsx | complete | ccswitch://v1/import；本人；Claude/Codex/Gemini 与移动端验收 |
| F021 | Key | 用量查看与额度摘要 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/pages/Keys.tsx; app/controller/usage.go | complete | /api/token/usage；本人；表格和空态统一 |
| F022 | Key | 跨分组重试开关 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/pages/Keys.tsx; app/service/channel_select.go | complete | Token 配置；本人；显式分组不得被覆盖 |
| F023 | Key | 过期时间与状态 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/pages/Keys.tsx; app/model/token.go | complete | token 字段；本人；过期 Key 不得调用 |
| F024 | Key | Key 操作菜单响应式层级 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/pages/Keys.tsx; app/web/src/index.css | complete | UI 行为；本人；移动端菜单置顶、不遮挡表单 |
| F025 | 渠道 | 渠道 CRUD 与状态 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/controller/channel.go | complete | P0 | /api/channel/*；管理员；启用、禁用、删除和分页已覆盖 |
| F026 | 渠道 | 渠道模型抓取 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/controller/channel-test.go | complete | /api/channel/fetch_models；管理员；失败态需保留 |
| F027 | 渠道 | 渠道连通性测试 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/controller/channel-test.go | complete | /api/channel/test；管理员；超时和错误展示 |
| F028 | 渠道 | 余额查询 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/controller/channel-billing.go | complete | /api/channel/balance；管理员；余额字段脱敏 |
| F029 | 渠道 | 多 Key 轮询 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/model/channel.go; app/web/src/pages/Channels.tsx | complete | ChannelInfo 多 Key；管理员；轮询索引需并发安全 |
| F030 | 渠道 | 渠道标签与备注 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/model/channel.go; app/web/src/pages/Channels.tsx | complete | tag/remark 字段；管理员；列表筛选和保存 |
| F031 | 渠道 | 分组路由配置 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/model/channel.go | complete | group/models；管理员；分组介绍来自服务端 |
| F032 | 渠道 | 模型映射 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/model/channel.go | complete | model_mapping JSON；管理员；非法 JSON 拒绝提交 |
| F033 | 渠道 | 参数与请求头覆盖 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/model/channel.go | complete | param_override/header_override；管理员；字段级 JSON 校验 |
| F034 | 渠道 | 代理与基础地址 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/model/channel.go | complete | base_url/setting；管理员；URL 与敏感信息校验 |
| F035 | 渠道 | 自动封禁与恢复 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/service/channel.go; app/controller/relay.go | complete | status/auto_ban；系统；不可重试错误不重复尝试 |
| F036 | 渠道 | 渠道延迟记录 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/model/channel.go; app/controller/channel-test.go | complete | response_time/test_time；管理员；用于同优先级排序 |
| F037 | 渠道 | 请求路径能力过滤 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/model/channel_cache.go | complete | AdvancedCustom 路径匹配；系统；模型不匹配不尝试 |
| F038 | 渠道 | 渠道优先级 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/model/channel.go; app/model/channel_cache.go | complete | priority；系统；高优先级先选 |
| F039 | 渠道 | 渠道权重 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/model/channel.go; app/model/channel_cache.go | complete | weight；系统；同优先级按权重随机 |
| F040 | 渠道 | 渠道操作批量处理 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/controller/channel.go | partial | 批量接口；管理员；部分失败逐项反馈仍需 E2E |
| F041 | 模型 | 模型目录 CRUD | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/controller/model.go | complete | P1 | /api/models/*；管理员；列表、详情、编辑已覆盖 |
| F042 | 模型 | 模型描述与供应商 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/model/model.go | complete | model metadata；管理员；公共页不暴露内部供应商前缀 |
| F043 | 模型 | 模型输入输出价格 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/service/billing.go | complete | price/ratio 字段；管理员；非负数校验 |
| F044 | 模型 | 模型可用分组 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/service/group.go | partial | enable_groups；用户；需补实际渠道数量展示 |
| F045 | 模型 | 模型接口类型 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/model/model.go | complete | endpoints；管理员；请求路径匹配 |
| F046 | 模型 | 官方模型同步 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/controller/model.go | complete | /api/models/sync；管理员；预览和应用分离 |
| F047 | 模型 | 缺失模型检测 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/model/ability.go | complete | /api/models/missing；管理员；不伪造同步成功 |
| F048 | 模型 | 模型名称匹配规则 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/model/model.go | complete | name_rule；管理员；精确/前缀/包含/后缀 |
| F049 | 模型 | 模型启用状态 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/model/model.go | complete | status；管理员；筛选与批量状态 |
| F050 | 模型 | 模型同步模式 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/model/model.go | complete | sync_official；管理员；官方/手动筛选 |
| F051 | 模型 | 模型批量操作 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/Models.tsx; app/controller/model.go | partial | 批量接口；管理员；需补超时重试反馈 |
| F052 | 模型 | 模型详情公共展示 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/ModelDetails.tsx; app/controller/model.go | partial | /api/pricing、模型详情；公开；价格需与数据库快照校验 |
| F053 | 分组与计费 | 用户可用分组 | new-api-main/web/src/features/groups; sub2api-main/frontend/src | app/service/group.go; app/controller/group.go | complete | P1 | 用户分组接口；登录用户；特殊分组增删规则 |
| F054 | 分组与计费 | 分组介绍展示 | new-api-main/web/src/features/groups; sub2api-main/frontend/src | app/web/src/components/ui/GroupCombobox.tsx | complete | description/desc；登录用户；下拉和公共页一致 |
| F055 | 分组与计费 | 分组倍率解析 | new-api-main/web/src/features/groups; sub2api-main/frontend/src | app/service/group.go; app/setting/ratio_setting | complete | GroupRatio/GroupGroupRatio；系统；用户专属倍率优先 |
| F056 | 分组与计费 | 自动分组成本排序 | new-api-main/web/src/features/groups; sub2api-main/frontend/src | app/service/group.go | complete | auto；Token；倍率升序、名称稳定排序 |
| F057 | 分组与计费 | Token 消费计费 | new-api-main/web/src/features/billing; sub2api-main/frontend/src | app/service/billing.go; app/service/billing_session.go | complete | token quota；系统；预扣、结算、退款 |
| F058 | 分组与计费 | 图片按次计费 | new-api-main/web/src/features/billing; sub2api-main/frontend/src | app/service/billing.go; app/relay | complete | quota type；系统；按次价格读取配置 |
| F059 | 分组与计费 | 音频视频计费 | new-api-main/web/src/features/billing; sub2api-main/frontend/src | app/service/billing.go; app/relay | partial | 多媒体额度；系统；需真实模型端到端校验 |
| F060 | 分组与计费 | 缓存倍率 | new-api-main/web/src/features/billing; sub2api-main/frontend/src | app/service/billing.go; app/setting | partial | cache ratio；系统；需核对公共价格文案 |
| F061 | 分组与计费 | 订阅折扣 | new-api-main/web/src/features/subscriptions; sub2api-main/frontend/src | app/service/billing_session.go; app/web/src/pages/Subscriptions.tsx | complete | subscription quota；用户；管理操作已移出用户页 |
| F062 | 分组与计费 | 配额页分组明细 | new-api-main/web/src/features/quota; sub2api-main/frontend/src | app/web/src/pages/Quota.tsx; app/controller/quota.go | partial | 分组、倍率、余额；用户；需补空数据图表验收 |
| F063 | 分组与计费 | 公共价格页数据 | new-api-main/web/src/features/pricing; sub2api-main/frontend/src | app/web/src/pages/Pricing.tsx; app/controller/pricing.go | complete | GET /api/pricing；公开；服务端数据优先 |
| F064 | 分组与计费 | 模型实际渠道覆盖 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/model/ability.go; app/web/src/pages/ModelDetails.tsx | partial | abilities；用户；缺少独立覆盖摘要接口 |
| F065 | 分组与计费 | 价格货币显示 | new-api-main/web/src/features/pricing; sub2api-main/frontend/src | app/web/src/lib/api.ts; app/setting/billing_setting | partial | currency/exchange；公开；需生产快照核对 |
| F066 | 分组与计费 | 价格公告同步 | new-api-main/web/src/features/dashboard; sub2api-main/frontend/src | app/setting/console_setting; app/web/src/pages/Home.tsx | partial | announcements；公开；旧公告清理需线上验证 |
| F067 | 支付 | EPay 下单 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/web/src/pages/Wallet.tsx; app/controller/pay.go | complete | P1 | /api/pay；用户；支付宝/微信方法读取服务端 |
| F068 | 支付 | 支付回调签名 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/controller/pay.go; app/service | partial | callback；系统；真实商户回调仍需联调 |
| F069 | 支付 | 支付回调幂等 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/model/order.go; app/controller/pay.go | partial | order status；系统；重复回调需集成测试 |
| F070 | 支付 | 支付宝选择 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/web/src/pages/Wallet.tsx; app/setting/billing_setting | complete | PayMethods；用户；支持支付宝 |
| F071 | 支付 | 微信选择 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/web/src/pages/Wallet.tsx; app/setting/billing_setting | complete | PayMethods；用户；支持微信 |
| F072 | 支付 | 余额充值入账 | new-api-main/web/src/features/wallet; sub2api-main/frontend/src | app/service; app/controller/pay.go | partial | wallet delta；用户；订单闭环需线上验证 |
| F073 | 支付 | 订单状态查询 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/web/src/pages/Wallet.tsx; app/controller/pay.go | complete | order status；用户；失败状态可重试 |
| F074 | 支付 | 充值失败反馈 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/web/src/pages/Wallet.tsx | complete | UI error state；用户；错误可读化 |
| F075 | 支付 | Stripe/Creem 扩展 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/controller; app/setting | blocked_by_dependency | 商户配置缺失；系统；不可伪造成功 |
| F076 | 支付 | Waffo 支付 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/web/src/pages/WaffoPancake.tsx; app/controller | partial | Waffo 配置；管理员；需商户联调 |
| F077 | 支付 | 支付返回主域统一 | new-api-main/web/src/features/payment; sub2api-main/frontend/src | app/setting/system_setting; app/controller/pay.go | complete | ServerAddress；系统；回调不使用内部域名 |
| F078 | 支付 | 商户配置脱敏 | new-api-main/web/src/features/system-settings; sub2api-main/frontend/src | app/controller/system_setting.go | complete | merchant secret；管理员；密钥不进入响应 |
| F079 | 监控 | 渠道状态监控 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/web/src/pages/Channels.tsx; app/model/channel.go | complete | P1 | status/auto_ban；管理员；禁用状态可见 |
| F080 | 监控 | 渠道延迟指标 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/model/channel.go; app/web/src/pages/Channels.tsx | complete | response_time；管理员；测试结果持久化 |
| F081 | 监控 | RPM/TPM 统计 | new-api-main/web/src/features/dashboard; sub2api-main/frontend/src | app/web/src/pages/Usage.tsx; app/controller/usage.go | partial | usage metrics；用户；空数据仍显示图表骨架 |
| F082 | 监控 | 错误率统计 | new-api-main/web/src/features/dashboard; sub2api-main/frontend/src | app/service/channel_health.go; app/controller/channel_health.go; app/web/src/pages/admin/Diagnostics.tsx | partial | 已提供按渠道 requests/successes/failures/error_rate；用户/时间窗口聚合接口仍缺失 |
| F083 | 监控 | 审计日志 | new-api-main/web/src/features/logs; sub2api-main/frontend/src | app/web/src/pages/Logs.tsx; app/controller/log.go | partial | usage logs；管理员；用户 Dock 已隐藏入口 |
| F084 | 监控 | 请求失败原因 | new-api-main/web/src/features/logs; sub2api-main/frontend/src | app/service/channel.go; app/controller/relay.go | partial | request/channel error；管理员；路由日志需统一字段 |
| F085 | 监控 | 健康告警 | new-api-main/web/src/features/diagnostics; sub2api-main/frontend/src | app/web/src/pages/admin/Diagnostics.tsx; app/controller/channel_health.go | partial | 前端已根据冷却和错误率显示告警；无持久化告警推送接口 |
| F086 | 监控 | 路由诊断 | new-api-main/web/src/features/diagnostics; sub2api-main/frontend/src | app/web/src/pages/Diagnostics.tsx; app/service/channel_select.go | partial | route candidate；管理员；缺少候选解释接口 |
| F087 | 监控 | 活跃任务监控 | new-api-main/web/src/features/active-tasks; sub2api-main/frontend/src | app/web/src/pages/ActiveTasks.tsx; app/model/active_task_slot.go | complete | /api/active-tasks；管理员；占用与释放可见 |
| F088 | 监控 | 绘图任务历史 | new-api-main/web/src/features/usage-logs; sub2api-main/frontend/src | app/web/src/pages/MidjourneyHistory.tsx | complete | task history；用户；空态和分页 |
| F089 | 监控 | 监控数据导出 | new-api-main/web/src/features/data-reports; sub2api-main/frontend/src | app/web/src/pages/DataReports.tsx; app/controller | partial | report export；管理员；需验证大数据量下载 |
| F090 | 监控 | 运行状态页面 | new-api-main/web/src/features/system-info; sub2api-main/frontend/src | app/web/src/pages/SystemInfo.tsx; app/controller/status.go | complete | /api/status；管理员；健康信息脱敏 |
| F091 | 用户 | 钱包余额 | new-api-main/web/src/features/wallet; sub2api-main/frontend/src | app/web/src/pages/Wallet.tsx; app/controller/wallet.go | complete | P1 | /api/user/quota；登录用户；金额和错误态 |
| F092 | 用户 | 充值记录 | new-api-main/web/src/features/wallet; sub2api-main/frontend/src | app/web/src/pages/Wallet.tsx; app/controller/topup.go | partial | P1 | topup records；登录用户；需订单闭环验证 |
| F093 | 用户 | 兑换码 | new-api-main/web/src/features/redeem; sub2api-main/frontend/src | app/web/src/pages/Redeem.tsx; app/controller/redemption.go | complete | /api/redemption；登录用户；重复兑换拒绝 |
| F094 | 用户 | 用户订阅查看 | new-api-main/web/src/features/subscriptions; sub2api-main/frontend/src | app/web/src/pages/Subscriptions.tsx; app/controller/subscription.go | complete | subscription list；登录用户；不显示管理操作 |
| F095 | 用户 | 用户模型广场 | new-api-main/web/src/features/models; sub2api-main/frontend/src | app/web/src/pages/UserModels.tsx; app/controller/model.go | complete | /api/user/models；登录用户；分组和倍率展示 |
| F096 | 用户 | 用量统计 | new-api-main/web/src/features/usage; sub2api-main/frontend/src | app/web/src/pages/Usage.tsx; app/controller/usage.go | partial | /api/usage；登录用户；空数据图表已补齐 |
| F097 | 用户 | 会话与历史 | new-api-main/web/src/features/chat-history; sub2api-main/frontend/src | app/web/src/pages/ChatHistory.tsx; app/controller | complete | history API；登录用户；分页和删除 |
| F098 | 用户 | 个人资料 | new-api-main/web/src/features/profile; sub2api-main/frontend/src | app/web/src/pages/Profile.tsx; app/controller/user.go | complete | user profile；本人；保存反馈 |
| F099 | 用户 | 安全中心 | new-api-main/web/src/features/security; sub2api-main/frontend/src | app/web/src/pages/SecurityCenter.tsx | partial | passkey/2fa；本人；真实凭据流程需验证 |
| F100 | 用户 | 用户端错误与空态 | new-api-main/web/src/components; sub2api-main/frontend/src | app/web/src/components; app/web/src/pages | complete | UI states；登录用户；加载/空/错误统一 |
| F101 | 用户 | 用户分组权限边界 | new-api-main/web/src/features/groups; sub2api-main/frontend/src | app/service/group.go; app/web/src/pages/UserModels.tsx | complete | group map；登录用户；不可越权查看 |
| F102 | 用户 | 用户级错误率明细 | new-api-main/web/src/features/usage; sub2api-main/frontend/src | app/model/log.go; app/controller/log.go; app/router/api-router.go | partial | GET `/api/log/self/error-stats` 支持时间、模型、Token、渠道和分组筛选；需前端图表接入与真实数据验证 |
| F103 | 用户 | 用户账单导出 | new-api-main/web/src/features/wallet; sub2api-main/frontend/src | app/web/src/pages/user/Wallet.tsx | partial | Wallet 已支持打印下载凭证；结构化 CSV/服务端完整账单导出接口缺失 |
| F104 | 用户 | 设备会话管理 | new-api-main/web/src/features/security; sub2api-main/frontend/src | app/model/user_session.go; app/controller/user_sessions.go; app/web/src/pages/user/SecurityCenter.tsx | partial | Cookie 哈希持久化、会话列表、单条撤销和撤销其他会话已实现；需生产多设备验证 |
| F105 | 用户 | 用户通知中心 | new-api-main/web/src/features/notifications; sub2api-main/frontend/src | app/web/src/components/layout/NotificationCenter.tsx; app/controller/misc.go | partial | `/api/notice`、`/api/status` 和本地已读状态已支持；服务端通知中心/已读同步接口缺失 |
| F106 | 管理 | 用户管理 | new-api-main/web/src/features/users; sub2api-main/frontend/src | app/web/src/pages/Users.tsx; app/controller/user.go | complete | P1 | /api/user/*；管理员；角色和状态操作 |
| F107 | 管理 | 权限策略 | new-api-main/web/src/features/permissions; sub2api-main/frontend/src | app/service/authz; app/web/src/pages/Permissions.tsx | partial | P1 | authz catalog；管理员；写策略接口不足 |
| F108 | 管理 | 系统设置 | new-api-main/web/src/features/system-settings; sub2api-main/frontend/src | app/web/src/pages/SystemSettings.tsx; app/controller/system_setting.go | complete | settings API；管理员；分区保存反馈 |
| F109 | 管理 | 分组管理 | new-api-main/web/src/features/groups; sub2api-main/frontend/src | app/web/src/pages/Groups.tsx; app/controller/group.go | complete | group CRUD；管理员；倍率边界校验 |
| F110 | 管理 | 套餐管理 | new-api-main/web/src/features/subscriptions; sub2api-main/frontend/src | app/web/src/pages/SubscriptionPlans.tsx | complete | plan CRUD；管理员；用户区不展示 |
| F111 | 管理 | 用户订阅管理 | new-api-main/web/src/features/subscriptions; sub2api-main/frontend/src | app/web/src/pages/UserSubscriptions.tsx | complete | subscription admin API；管理员；独立路由守卫 |
| F112 | 管理 | 兑换码批量管理 | new-api-main/web/src/features/redeem; sub2api-main/frontend/src | app/web/src/pages/RedemptionCodes.tsx | complete | redemption CRUD；管理员；批量状态 |
| F113 | 管理 | 备份恢复 | new-api-main/web/src/features/operations; sub2api-main/frontend/src | app/service/backup.go; app/controller/backup.go; app/router/api-router.go; app/web/src/pages/admin/Operations.tsx | partial | 加密白名单快照、列表、创建、下载、恢复和删除已接入；需生产恢复演练 |
| F114 | 管理 | 部署管理 | new-api-main/web/src/features/deployments; sub2api-main/frontend/src | app/web/src/pages/Deployments.tsx | partial | deployment API；管理员；依赖部署服务 |
| F115 | 管理 | 风控配置 | new-api-main/web/src/features/security; sub2api-main/frontend/src | app/web/src/pages/SystemSettings.tsx | partial | security settings；管理员；需补规则测试 |
| F116 | 管理 | 数据报告 | new-api-main/web/src/features/data-reports; sub2api-main/frontend/src | app/web/src/pages/DataReports.tsx | partial | report API；管理员；大数据量未验证 |
| F117 | 管理 | 任务插件 | new-api-main/web/src/features/task-plugins; sub2api-main/frontend/src | app/controller/task_plugins.go; app/router/api-router.go; app/web/src/pages/admin/TaskPlugins.tsx | partial | GET/PATCH/POST `/api/task-plugins` 已提供内置插件目录、启停和测试；不支持任意代码执行 |
| F118 | 管理 | OAuth 提供商 | new-api-main/web/src/features/oauth-providers; sub2api-main/frontend/src | app/web/src/pages/OAuthProviders.tsx | complete | provider CRUD；管理员；敏感字段脱敏 |
| F119 | 管理 | 渠道亲和性 | new-api-main/web/src/features/channel-affinity; sub2api-main/frontend/src | app/web/src/pages/ChannelAffinity.tsx | partial | affinity config；管理员；需并发验证 |
| F120 | 管理 | 运行诊断 | new-api-main/web/src/features/diagnostics; sub2api-main/frontend/src | app/web/src/pages/Diagnostics.tsx | partial | diagnostics API；管理员；缺少健康摘要 |
| F121 | 客户端集成 | CC Switch 导入 | new-api-main/web/src/features/keys/components/dialogs/cc-switch-dialog.tsx; sub2api-main/frontend/src/utils/ccswitchImport.ts | app/web/src/components/ui/CCSwitchDialog.tsx | complete | P1 | ccswitch://v1/import；本人；Claude/Codex/Gemini |
| F122 | 客户端集成 | OpenAI 兼容协议 | new-api-main/web/src/features/playground; sub2api-main/frontend/src | app/relay; app/router | complete | /v1/chat/completions；Token；客户端格式兼容 |
| F123 | 客户端集成 | Claude 协议转换 | new-api-main/web/src/features/chat; sub2api-main/frontend/src | app/service/relayconvert/internal/claude_messages | complete | /v1/messages；Token；转换测试 |
| F124 | 客户端集成 | Gemini 协议转换 | new-api-main/web/src/features/chat; sub2api-main/frontend/src | app/service/relayconvert/internal/gemini_chat | complete | Gemini API；Token；转换测试 |
| F125 | 客户端集成 | Cherry Studio 配置 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/lib/chatLinks.ts; app/web/src/pages/user/Chat2Link.tsx | partial | `{cherryConfig}` 模板已支持 Base64 配置；需 Cherry 客户端实测导入 |
| F126 | 客户端集成 | Lobe Chat 配置 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/lib/chatLinks.ts; app/web/src/pages/user/Chat2Link.tsx | partial | 新增 `{lobeConfig}` JSON 配置编码，兼容旧 `{address}/{key}` 模板；需真实客户端导入验收 |
| F127 | 客户端集成 | AionUI 配置 | new-api-main/web/src/features/keys; sub2api-main/frontend/src | app/web/src/lib/chatLinks.ts; app/web/src/pages/user/Chat2Link.tsx | partial | `{aionuiConfig}` 模板已支持 Base64 配置；需 AionUI 客户端实测导入 |
| F128 | 客户端集成 | Playground 流式重试 | new-api-main/web/src/features/playground; sub2api-main/frontend/src | app/web/src/pages/Chat.tsx; app/relay | partial | stream/retry；登录用户；需浏览器实测 |
| F129 | 运维 | 任务记录 | new-api-main/web/src/features/task-records; sub2api-main/frontend/src | app/web/src/pages/TaskRecords.tsx; app/model | complete | task records；管理员；分页空态 |
| F130 | 运维 | 缓存同步 | new-api-main/web/src/features/operations; sub2api-main/frontend/src | app/model/channel_cache.go | complete | channel cache；系统；同步锁保护 |
| F131 | 运维 | 自动渠道测试 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/controller/channel-test.go | complete | channel test；管理员；失败自动封禁 |
| F132 | 运维 | 清理任务 | new-api-main/web/src/features/operations; sub2api-main/frontend/src | app/web/src/pages/Operations.tsx; app/controller | partial | cleanup API；管理员；需验证回滚 |
| F133 | 运维 | 日志查询 | new-api-main/web/src/features/logs; sub2api-main/frontend/src | app/web/src/pages/Logs.tsx; app/controller | complete | logs API；管理员；敏感字段脱敏 |
| F134 | 运维 | 版本信息 | new-api-main/web/src/features/system-info; sub2api-main/frontend/src | app/web/src/pages/SystemInfo.tsx; app/controller/status.go | complete | /api/status；管理员；版本字段 |
| F135 | 运维 | 健康检查 | new-api-main/web/src/features/system-info; sub2api-main/frontend/src | app/controller/status.go | complete | /api/status；公开；HTTP 200 验证 |
| F136 | 运维 | 路由失败切换 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/controller/relay.go; app/service/channel_select.go | complete | /v1/*；Token；可重试错误切换候选 |
| F137 | 运维 | 同请求去重尝试 | new-api-main/web/src/features/channels; sub2api-main/frontend/src | app/service/channel_select.go; app/middleware/distributor.go | partial | retry context；系统；需补集成测试 |
| F138 | 运维 | 路由解释日志 | new-api-main/web/src/features/diagnostics; sub2api-main/frontend/src | app/service/channel_select.go; app/service/log_info_generate.go | partial | route_reason 已写入管理员 admin_info；需端到端查看日志验证 |
| F139 | 运维 | 发布备份与回滚 | new-api-main/web/src/features/deployments; sub2api-main/frontend/src | deploy/deploy-current-release.py | partial | release backup；管理员；需演练恢复流程 |
## Completion rule

每项完成前必须补充参考文件、当前文件、API 方法和路径、请求响应字段、权限要求、缺失原因及验收测试。当前标记为 partial 或 backend_missing 的条目不得宣称完成。

## Current verification gates

| Gate | Evidence | Result |
| --- | --- | --- |
| Backend unit and integration suites | `go test ./...` from `app/` | pass |
| Frontend production build | `npm run build` from `app/web/` | pass |
| Health routing behavior | `service/channel_health_test.go`, `model/channel_cache_test.go`, `service/channel_select_test.go` | pass |
| Admin health contract | `GET /api/diagnostics/channel-health`, AdminAuth, no channel key in response | implemented; runtime smoke pending |
| Frontend TypeScript lint | `npm run lint` with 24 GB heap and incremental cache | pass (`EXIT=0`) |
| Production model and payment flows | real token/model/payment callback | not run; production publish is out of scope for this local phase |
