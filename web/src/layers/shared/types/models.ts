/**
 * API 模型类型定义
 * 从 lib/api.ts 提取并标准化
 */

import { ID, Timestamp, Status } from './common';

/**
 * 用户类型
 */
export interface User {
  id: number;
  username: string;
  display_name?: string;
  email?: string;
  role: number;
  status: Status;
  quota: number;
  used_quota: number;
  request_count: number;
  group: string;
  github_id?: string;
  discord_id?: string;
  oidc_id?: string;
  wechat_id?: string;
  telegram_id?: string;
  linux_do_id?: string;
  aff_code?: string;
  aff_count?: number;
  aff_quota?: number;
  aff_history_quota?: number;
  inviter_id?: number;
  setting?: string;
  stripe_customer?: string;
  sidebar_modules?: string;
  leak_protection_balanced_forced?: boolean;
  permissions?: Record<string, unknown>;
  created_at?: Timestamp;
  last_login_at?: Timestamp;
}

/**
 * 用户会话
 */
export interface UserSession {
  id: number;
  device_name: string;
  user_agent: string;
  ip: string;
  created_at: Timestamp;
  last_seen_at: Timestamp;
  expires_at: Timestamp;
  current: boolean;
}

/**
 * Token 类型
 */
export interface Token {
  id: number;
  name: string;
  key: string;
  status: Status;
  remain_quota: number;
  used_quota: number;
  unlimited_quota?: boolean;
  expired_time: Timestamp;
  created_time: Timestamp;
  accessed_time?: Timestamp;
  group?: string;
  model_limits_enabled?: boolean;
  model_limits?: string;
  allow_ips?: string;
  cross_group_retry?: boolean;
}

/**
 * 渠道类型
 */
export interface Channel {
  id: number;
  key?: string;
  name: string;
  type: number;
  status: Status;
  group: string;
  models: string;
  priority: number;
  weight: number;
  response_time?: number;
  base_url?: string;
  balance?: number;
  created_time?: Timestamp;
  test_time?: Timestamp;
  balance_updated_time?: Timestamp;
  used_quota?: number;
  auto_ban?: number;
  tag?: string;
  remark?: string;
  channel_info?: Record<string, unknown>;
  openai_organization?: string;
  test_model?: string;
  model_mapping?: string;
  param_override?: string;
  header_override?: string;
  settings?: string;
}

/**
 * 模型类型
 */
export interface Model {
  id: number;
  model_name: string;
  description?: string;
  vendor_id?: number;
  icon?: string;
  tags?: string;
  endpoints?: string;
  bound_channels?: Array<{ name: string; type: number }>;
  enable_groups?: string[];
  quota_types?: number[];
}

/**
 * 日志类型
 */
export interface Log {
  id: number;
  user_id?: number;
  created_at: Timestamp;
  username?: string;
  content?: string;
  model_name: string;
  token_name?: string;
  channel_name?: string;
  channel?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  quota: number;
  use_time?: number;
  ip?: string;
  request_id?: string;
  upstream_request_id?: string;
  group?: string;
  is_stream?: boolean;
  type: number;
  other?: string;
}

/**
 * 审计日志类型
 */
export interface AuditLog {
  event_id: string;
  user_id: number;
  username?: string;
  actor_role?: number;
  created_at: Timestamp;
  category?: string;
  action?: string;
  token_ref?: string;
  auth_method?: string;
  ip?: string;
  user_agent?: string;
  method?: string;
  route?: string;
  status?: number;
  success?: boolean;
  request_id?: string;
  content?: string;
  other?: Record<string, unknown> | null;
}

/**
 * 用户查询选项
 */
export interface UserQueryOptions {
  group?: string;
  role?: number;
  status?: number;
}

/**
 * 渠道查询选项
 */
export interface ChannelQueryOptions {
  group?: string;
  status?: string;
  type?: number;
  sort_by?: string;
  sort_order?: string;
  id_sort?: boolean;
  tag_mode?: boolean;
}

/**
 * 用户更新输入
 */
export interface UpdateUserInput {
  id: number;
  username?: string;
  display_name?: string;
  email?: string;
  role?: number;
  status?: Status;
  quota?: number;
  group?: string;
}

/**
 * Token 创建输入
 */
export interface CreateTokenInput {
  name: string;
  remain_quota?: number;
  expired_time?: Timestamp;
  unlimited_quota?: boolean;
  group?: string;
}

/**
 * Token 更新输入
 */
export interface UpdateTokenInput {
  id: number;
  name?: string;
  status?: Status;
  remain_quota?: number;
  expired_time?: Timestamp;
  unlimited_quota?: boolean;
  group?: string;
}

/**
 * 渠道创建输入
 */
export interface CreateChannelInput {
  name: string;
  type: number;
  key?: string;
  base_url?: string;
  models: string;
  group?: string;
  priority?: number;
  weight?: number;
}

/**
 * 渠道更新输入
 */
export interface UpdateChannelInput {
  id: number;
  name?: string;
  type?: number;
  key?: string;
  base_url?: string;
  models?: string;
  status?: Status;
  group?: string;
  priority?: number;
  weight?: number;
}
