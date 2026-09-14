# Frontend Migration Status

This checklist describes the current React frontend against the official New-API route set. A route is only marked complete when it uses the real server contract and exposes loading, empty, and error states.

| Area | Current routes | Status | Evidence / remaining work |
| --- | --- | --- | --- |
| Authentication | `/login`, `/sign-up`, `/oauth/*`, `/security` | Partial | Password, OAuth, Passkey, and 2FA flows exist; browser end-to-end coverage remains. |
| User chat | `/chat`, `/playground`, `/chat-history`, `/chat2link` | Partial | Streaming and history use real APIs; Chat2Link uses `/status.chats` and enabled token keys. Provider-specific browser checks remain. |
| User billing | `/wallet`, `/quota`, `/redeem`, `/subscriptions` | Partial | Real payment and subscription APIs are wired; payment-provider success and failure flows remain to be verified. |
| User telemetry | `/dashboard`, `/usage`, `/usage-logs/*` | Partial | Dashboard scope and numeric guards are implemented; full role matrix and browser smoke remain. |
| User profile | `/profile`, `/settings`, `/security` | Partial | Real self/settings/security APIs are used; complete official parity audit remains. |
| Channel management | `/channels`, `/channel-affinity`, `/ratio-config` | Partial | CRUD, testing, mapping, tags, priority, Codex, and affinity APIs exist; production workflow smoke remains. |
| Model management | `/models`, `/models/metadata`, `/models/deployments` | Partial | Metadata, pricing, sync, and deployment views exist; parity and permission matrix remain. |
| Administration | `/users`, `/vendors`, `/groups`, `/permissions` | Partial | Real management APIs and admin guards exist; role-by-role verification remains. |
| Operations | `/operations`, `/system-info`, `/deployments`, `/diagnostics` | Partial | Real operational endpoints are wired; destructive-action and rollback checks remain. |
| System settings | `/system-settings/*` | Partial | Settings are grouped by real key namespaces; every official field still needs comparison. |
| Task plugins | `/task-plugins` | Blocked by backend | Current backend exposes no task-plugin management API; UI explicitly reports unavailable and never fakes state. |

## Quality Gates

- `npm run build`: passing.
- `go test ./...`: passing.
- TypeScript check: not passing; the project exhausts an 8 GB Node heap before diagnostics are produced.
- Production deployment: pending; local build is not treated as live verification.
- Browser smoke and role matrix: pending.
- Live read-only probe (2026-09-09): `/api/status` returned `chats`, `server_address`, and enabled service flags; the deployed version remains `v0.0.0` and does not include the current local Chat2Link bundle.
