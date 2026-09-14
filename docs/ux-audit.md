# Frontend UX Audit

This is a source- and screenshot-based first-pass audit. Each page has three concrete issues. Mobile layout, keyboard focus, and authenticated error flows still require browser verification.

## User Pages

| Page | Issue 1 | Issue 2 | Issue 3 |
| --- | --- | --- | --- |
| Home | Hero dominates the first viewport | Public status is configuration, not availability | Long content lacks hierarchy/collapse |
| Login | Auth methods compete for attention | Turnstile errors are far from the form action | Authentication states lack clear progress |
| Sign-up | Registration is not staged | Verification retry state is easy to miss | Password risk feedback is weak |
| Forgot/Reset/OTP | Multi-step progress is not visible | Expiry and resend states are scattered | Return-to-login action is inconsistent |
| OAuth callback | Timeout recovery is unclear | Failure lacks a retry action | Bound-account and state errors look too similar |
| Dashboard | Metrics lack fixed source/time labels | Model, channel, and performance sections compete | Bottom Dock can cover lower content |
| Chat / Playground | Model, group, parameters, and messages are crowded | Stream errors are distant from the composer | Text and image capabilities are not clearly separated |
| Chat2Link | Link creation depends on hidden server configuration | Token availability is only reported after navigation | External-app handoff has no confirmation state |
| Chat history | No strong time/model filter | Item actions are easy to miss | Empty, failed, and no-result states need stronger distinction |
| Usage | Summary cards lack refresh/source context | Zero, empty, and failed states are too similar | Charts and detail rows are not linked |
| Usage logs | Log categories are difficult to scan | Many filters are dense on narrow screens | Request details need a dedicated drawer |
| Wallet | Balance, top-up, and bills compete in one view | Payment failure recovery is unclear | Currency-to-quota conversion is not persistent |
| Redeem | Success depends on refreshed user data | History lacks useful filtering | Toast and inline failure messages duplicate each other |
| Quota | Used/remaining/subscription values lack one visual relation | Missing values can resemble 0% | Units and currency meaning are easy to confuse |
| User models | Capability/provider/group filters are limited | Long model names hide important information | Routing availability source is unclear |
| Midjourney/task history | Status and result are mixed | Task output lacks strong detail linkage | Long IDs reduce scanability |
| Security | Many high-risk settings form one long page | Destructive actions are not strongly separated | Consequences of unbinding/resetting are easy to miss |
| Profile | Identity, quota, and activity lack grouping | Save feedback is not field-specific | Empty values are hard to distinguish from failed loading |
| Settings | Technical keys expose implementation details | Large sections need stronger navigation | Failed saves can leave stale values looking current |
| Subscriptions | Plans and current subscription compete | Purchase status lacks a clear lifecycle | Quota, duration, and price need a compact comparison |
| Pricing | Wide table requires horizontal scanning | Multiple filters lack a clear active summary | Ratio-to-final-price relationship is not immediate |
| Rankings | View changes also change filter semantics | Timestamp/statistical scope is easy to miss | Empty and failed states need different treatment |
| About/Docs/Legal | Long content lacks a local table of contents | Loading failure recovery is weak | Reading hierarchy varies across content types |

## Admin Pages

| Page | Issue 1 | Issue 2 | Issue 3 |
| --- | --- | --- | --- |
| Channels | Edit actions were hidden at the far right of a wide table | Too many icon actions are ungrouped | Fixed Dock can cover table actions |
| Models | Metadata, pricing, sync, and deployment are mixed | Raw sync JSON is hard to interpret | Batch sync impact needs stronger confirmation |
| Users | Search, role, status, and group filters lack a summary | Row actions make risky operations easy to trigger | Role/permission changes need stronger confirmation |
| Vendors | Vendor metadata and channel relationships are separated | Table density is poorly balanced | Delete lacks an associated-channel count |
| Groups | Ratio and model scope are not easy to compare | Change impact is unclear | Empty and failed states need distinction |
| Redemption codes | Generation, search, status, and deletion are crowded | Sensitive code visibility is ambiguous | Bulk deletion lacks an impact preview |
| Fingerprints | Fingerprint/user/IP views lack hierarchy | Technical identifiers dominate summaries | Risk actions need clearer consequences |
| Active tasks | Current and historical tasks lack a timeline | Failure causes are buried | Filter state is not summarized |
| Task records | Task type/action filters are dense | Long task IDs dominate rows | Artifacts lack a direct preview/detail path |
| Top-ups | Order and payment filters are fragmented | Payment lifecycle is not visible | Reconciliation actions need stronger warning |
| Diagnostics | Request/model/channel/error fields are too dense | Raw JSON slows diagnosis | No direct jump to related logs/channel |
| Deployments | Creation form is too large for one step | Container/log/hardware/pricing layers mix | Scale/delete impact is under-explained |
| Deployment details | Runtime data and edit controls compete | Logs need stronger time/context framing | Connection failures lack a guided recovery path |
| Operations | Technical metrics lack an action-oriented summary | Cache/GC/log controls are mixed | Destructive actions are too close to refresh actions |
| System info | Instance health lacks concise operational meaning | Stale-instance cleanup is high risk | Refresh and cleanup feedback are not unified |
| Permissions | Resource/role hierarchy is difficult to understand | Search does not show affected routes | Permission changes lack effective-scope feedback |
| OAuth providers | Provider setup is long and technical | Discovery errors lack field-level guidance | Enabled state and callback impact are easy to miss |
| System settings | Technical fields are presented too flatly | Sections need stronger navigation/search | Save failures can be mistaken for success |
| Channel affinity | Global rules and cache state compete | Regex/template fields are hard for nontechnical admins | Clearing cache needs stronger impact context |
| Ratio config | Multiple ratios lack final-price preview | Sync differences are not obvious | Validation errors need field-level placement |
| Two-factor admin | User status and security actions are mixed | Reset/disable actions need stronger warnings | Backup-code risk is not prominent |
| Subscription plans | Plan editing lacks live preview | Enabled state and visibility are ambiguous | Price/duration/quota comparison is weak |
| User subscriptions | User and plan data are repetitive | Reset/invalidate actions are easy to mis-trigger | Combined filtering is limited |
| Waffo-Pancake | Merchant/product/callback settings form one long page | Secrets lack a distinct security section | Test and production states are too similar |
| Task plugins | Backend-unavailable state lacks a next action | Unavailable and empty states look alike | Navigation does not show backend capability status |

## Verification Limits

- Confirmed visually: `/channels` screenshot and post-deployment resource responses.
- Confirmed from source: route structure, API calls, loading/error branches, and data formatting paths.
- Still required: per-page desktop/mobile screenshots, keyboard traversal, authenticated role matrix, and real payment/chat/image/OAuth flows.
