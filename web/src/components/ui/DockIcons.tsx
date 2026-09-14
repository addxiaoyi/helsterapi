/**
 * Dock navigation icons — hand-crafted SVG with sub-element animations.
 *
 * Design rules:
 *  - No whole-icon rotation.
 *  - No duplicate silhouettes.
 *  - Animations target small parts (dot, needle, path) via CSS classes
 *    defined in `DockIconAnimations.css`.
 *
 * Two exports:
 *  - `DOCK_ICONS` — map of legacy keys used by `AdminLayout`.
 *  - `DockIconComponents` — strongly-typed map keyed by `DockIconId`.
 */
import React from "react";

/* ---------- helpers ---------- */

const baseProps = (className?: string) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true as const,
});

/* ---------- icon components ---------- */

export function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
      <line className="anim-bob" x1="9" y1="9" x2="14" y2="14" />
    </svg>
  );
}

export function ChatIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line className="anim-bob" x1="8" y1="9" x2="16" y2="9" />
      <line className="anim-bob" x1="8" y1="13" x2="13" y2="13" />
    </svg>
  );
}

export function KeysIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="8" cy="15" r="4" />
      <line x1="10.85" y1="12.15" x2="19" y2="4" />
      <line x1="18" y1="5" x2="20" y2="7" />
      <line x1="15" y1="8" x2="17" y2="10" />
    </svg>
  );
}

export function LogsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line className="anim-bob" x1="8" y1="13" x2="16" y2="13" />
      <line className="anim-bob" x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

export function UsageIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line className="anim-bob" x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

export function WalletIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" />
      <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

export function QuotaIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 22a10 10 0 1 0-10-10" />
      <path className="anim-needle" style={{ transformOrigin: "12px 12px" }} d="M12 12 6 12" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function SubscriptionsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line className="anim-bob" x1="6" y1="15" x2="9" y2="15" />
      <line x1="13" y1="15" x2="18" y2="15" />
      <polyline points="19 4 22 2 22 5" />
    </svg>
  );
}

export function RedeemIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

export function UserModelsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line className="anim-bob" x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function ChatHistoryIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="10" r="3" />
      <polyline className="anim-needle" style={{ transformOrigin: "12px 10px" }} points="12 8.5 12 10 13 11" />
    </svg>
  );
}

export function SecurityIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle className="anim-breathe" cx="18" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ---------- Admin ---------- */

export function UsersIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
      <circle cx="17" cy="6" r="2" />
      <path d="M14 14a4 4 0 0 1 4-4h1a3 3 0 0 1 3 3v2" />
    </svg>
  );
}

export function ChannelsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <line x1="12" y1="12" x2="12" y2="8" />
    </svg>
  );
}

export function ModelsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect className="anim-breathe" x="9" y="9" width="6" height="6" fill="currentColor" stroke="none" />
      <line x1="9" y1="2" x2="9" y2="4" />
      <line x1="15" y1="2" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="22" />
      <line x1="15" y1="20" x2="15" y2="22" />
      <line x1="20" y1="9" x2="22" y2="9" />
      <line x1="20" y1="14" x2="22" y2="14" />
      <line x1="2" y1="9" x2="4" y2="9" />
      <line x1="2" y1="14" x2="4" y2="14" />
    </svg>
  );
}

export function VendorsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="9" y1="6" x2="9" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" />
      <line x1="9" y1="18" x2="9" y2="18.01" />
      <path d="M15 6h2M15 10h2M15 14h2M15 18h2" />
    </svg>
  );
}

export function RedemptionIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 3v18" />
      <line className="anim-bob" x1="13" y1="9" x2="15" y2="9" />
      <line className="anim-bob" x1="13" y1="15" x2="15" y2="15" />
    </svg>
  );
}

export function FingerprintsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M2 12C3 5 10 5 12 5s9 0 10 7" />
      <path d="M5 12c0-3 3-5 7-5s7 2 7 5" />
      <path d="M8 12c0-1.5 1.5-3 4-3s4 1.5 4 3" />
      <path d="M12 12v3" />
    </svg>
  );
}

export function TasksIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

export function ActiveTasksIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      <circle className="anim-bob" cx="20" cy="5" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TaskHistoryIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="12" cy="12" r="10" />
      <polyline className="anim-needle" style={{ transformOrigin: "12px 12px" }} points="12 6 12 12 16 14" />
    </svg>
  );
}

export function TaskRecordsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M9 2h6a2 2 0 0 1 2 2v2H7V4a2 2 0 0 1 2-2z" />
      <path d="M7 6H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" />
      <line className="anim-bob" x1="9" y1="12" x2="15" y2="12" />
      <line className="anim-bob" x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

export function MidjourneyTasksIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
      <circle className="anim-breathe" cx="15" cy="15" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SystemInfoIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <line x1="2" y1="20" x2="22" y2="20" />
      <circle className="anim-breathe" cx="7" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle className="anim-breathe" cx="11" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle className="anim-breathe" cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function OperationsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function DeploymentsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

export function PrefillIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3" y="3" width="18" height="5" rx="1" />
      <rect x="3" y="10" width="18" height="5" rx="1" />
      <rect x="3" y="17" width="18" height="4" rx="1" />
      <line x1="6" y1="5.5" x2="9" y2="5.5" />
      <line x1="6" y1="12.5" x2="9" y2="12.5" />
      <line x1="6" y1="19" x2="9" y2="19" />
      <line className="anim-bob" x1="12" y1="5.5" x2="18" y2="5.5" />
      <line className="anim-bob" x1="12" y1="12.5" x2="18" y2="12.5" />
      <line className="anim-bob" x1="12" y1="19" x2="18" y2="19" />
    </svg>
  );
}

export function PermissionsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle className="anim-breathe" cx="12" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function OAuthIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

export function TopupsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="2" y="7" width="20" height="12" rx="2" />
      <line x1="2" y1="11" x2="22" y2="11" />
      <line className="anim-bob" x1="8" y1="15" x2="11" y2="15" />
      <line className="anim-bob" x1="15" y1="15" x2="20" y2="15" />
      <polyline className="anim-bob" points="21 4 23 6 21 8" />
    </svg>
  );
}

export function DiagnosticsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function GroupsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="12" cy="7" r="3" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
      <path d="M19 4a3 3 0 0 1 0 6" />
      <path d="M21 19v-1a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

export function SubscriptionPlansIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function UserSubscriptionsIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="9" cy="7" r="3.5" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" />
      <rect x="13" y="3" width="8" height="5" rx="1" />
      <line x1="15" y1="5.5" x2="19" y2="5.5" />
    </svg>
  );
}

export function ChannelAffinityIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <line x1="8.5" y1="10.5" x2="15.5" y2="6.5" />
      <line x1="8.5" y1="13.5" x2="15.5" y2="17.5" />
    </svg>
  );
}

export function RatioConfigIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="6" y1="9" x2="18" y2="9" />
      <line x1="6" y1="15" x2="18" y2="15" />
    </svg>
  );
}

export function TwoFactorIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
      <circle className="anim-breathe" cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function WaffoPancakeIcon({ className }: { className?: string }) {
  return (
    <svg {...baseProps(className)}>
      <path d="M12 2a10 10 0 1 0 10 10" />
      <path d="M12 2v10h10" />
      <path d="M12 2L2 12" />
    </svg>
  );
}

/* ---------- Maps ---------- */

/** Legacy map keyed by snake_case ids used in `AdminLayout.tsx`. */
export const DOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: DashboardIcon,
  chat: ChatIcon,
  keys: KeysIcon,
  logs: LogsIcon,
  usage: UsageIcon,
  wallet: WalletIcon,
  quota: QuotaIcon,
  subscriptions: SubscriptionsIcon,
  redeem: RedeemIcon,
  "user-models": UserModelsIcon,
  "chat-history": ChatHistoryIcon,
  security: SecurityIcon,
  profile: ProfileIcon,
  users: UsersIcon,
  channels: ChannelsIcon,
  models: ModelsIcon,
  vendors: VendorsIcon,
  redemption: RedemptionIcon,
  fingerprints: FingerprintsIcon,
  tasks: TasksIcon,
  "active-tasks": ActiveTasksIcon,
  "task-history": TaskHistoryIcon,
  "task-records": TaskRecordsIcon,
  "midjourney-tasks": MidjourneyTasksIcon,
  "sys-info": SystemInfoIcon,
  settings: SettingsIcon,
  operations: OperationsIcon,
  deployments: DeploymentsIcon,
  prefill: PrefillIcon,
  permissions: PermissionsIcon,
  oauth: OAuthIcon,
  reports: ReportsIcon,
  topups: TopupsIcon,
  diagnostics: DiagnosticsIcon,
  groups: GroupsIcon,
  "subscription-plans": SubscriptionPlansIcon,
  "user-subscriptions": UserSubscriptionsIcon,
  "channel-affinity": ChannelAffinityIcon,
  "ratio-config": RatioConfigIcon,
  "two-factor": TwoFactorIcon,
  "waffo-pancake": WaffoPancakeIcon,
};

/** Strongly-typed map of icon ids. */
export type DockIconId =
  | "dashboard"
  | "chat"
  | "keys"
  | "logs"
  | "usage"
  | "wallet"
  | "quota"
  | "subscriptions"
  | "redeem"
  | "userModels"
  | "chatHistory"
  | "security"
  | "profile"
  | "users"
  | "channels"
  | "models"
  | "vendors"
  | "redemption"
  | "fingerprints"
  | "tasks"
  | "activeTasks"
  | "taskHistory"
  | "taskRecords"
  | "midjourneyTasks"
  | "systemInfo"
  | "settings"
  | "operations"
  | "deployments"
  | "prefill"
  | "permissions"
  | "oauth"
  | "reports"
  | "topups"
  | "diagnostics"
  | "groups"
  | "subscriptionPlans"
  | "userSubscriptions"
  | "channelAffinity"
  | "ratioConfig"
  | "twoFactor"
  | "waffoPancake";

export const DockIconComponents: Record<DockIconId, React.ComponentType<{ className?: string }>> = DOCK_ICONS as Record<DockIconId, React.ComponentType<{ className?: string }>>;
