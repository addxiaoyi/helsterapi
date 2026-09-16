const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.startsWith("http")
    ? import.meta.env.VITE_API_BASE_URL
    : `${window.location.origin}${import.meta.env.VITE_API_BASE_URL}`
  : `${window.location.origin}/api`;

export class ApiError extends Error {
  public readonly code: string | undefined;
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
    code?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  code?: string;
  data?: T;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

export type ApiUser = {
  id: number;
  username: string;
  display_name?: string;
  email?: string;
  role: number;
  status: number;
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
};

export type ApiUserSession = {
  id: number;
  device_name: string;
  user_agent: string;
  ip: string;
  created_at: number;
  last_seen_at: number;
  expires_at: number;
  current: boolean;
};

export type AdminUser = ApiUser & {
  aff_count?: number;
  aff_code?: string;
  created_at?: number;
  last_login_at?: number;
};

type UserQueryOptions = {
  group?: string;
  role?: number;
  status?: number;
};

export type ApiToken = {
  id: number;
  name: string;
  key: string;
  status: number;
  remain_quota: number;
  used_quota: number;
  unlimited_quota?: boolean;
  expired_time: number;
  created_time: number;
  accessed_time?: number;
  group?: string;
  model_limits_enabled?: boolean;
  model_limits?: string;
  allow_ips?: string;
  cross_group_retry?: boolean;
};

export type ApiLog = {
  id: number;
  user_id?: number;
  created_at: number;
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
};

export type ApiAuditLog = {
  event_id: string;
  user_id: number;
  username?: string;
  actor_role?: number;
  created_at: number;
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
};

export type ApiChannel = {
  id: number;
  key?: string;
  name: string;
  type: number;
  status: number;
  group: string;
  models: string;
  priority: number;
  weight: number;
  response_time?: number;
  base_url?: string;
  balance?: number;
  created_time?: number;
  test_time?: number;
  balance_updated_time?: number;
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
};

export type ChannelQueryOptions = {
  group?: string;
  status?: string;
  type?: number;
  sort_by?: string;
  sort_order?: string;
  id_sort?: boolean;
  tag_mode?: boolean;
};

export type ApiModel = {
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
  name_rule?: number;
  sync_official?: number;
  matched_models?: string[];
  matched_count?: number;
  created_time?: number;
  updated_time?: number;
  model_price?: number;
  model_ratio?: number;
  completion_ratio?: number;
  status?: number;
  enabled?: boolean;
};

export type ModelQueryOptions = {
  vendor?: string;
  status?: string;
  sync_official?: string;
};

export type ApiModelPage = Page<ApiModel> & {
  vendor_counts?: Record<string, number>;
};

export type ApiVendor = {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  status: number;
};

export type ApiRedemption = {
  id: number;
  key: string;
  status: number;
  name: string;
  quota: number;
  created_time: number;
  redeemed_time: number;
  expired_time: number;
  used_user_id: number;
};

export type ApiFingerprint = {
  id: number;
  username: string;
  display_name: string;
  email: string;
  visitor_id: string;
  ip: string;
  record_time: string;
};

export type ApiSelfFingerprint = {
  id: number;
  visitor_id: string;
  ip: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
};

export type ApiPricing = {
  model_name: string;
  owner_by: string;
  model_price: number;
  model_ratio: number;
  completion_ratio: number;
  cache_ratio?: number;
  create_cache_ratio?: number;
  image_ratio?: number;
  audio_ratio?: number;
  audio_completion_ratio?: number;
  billing_mode?: string;
  billing_expr?: string;
  pricing_version?: string;
  enable_groups?: string[];
  supported_endpoint_types?: string[];
  description?: string;
};

export type ApiPricingResponse = {
  models: ApiPricing[];
  vendors?: ApiVendor[];
  group_ratio?: Record<string, number>;
  usable_group?: Record<string, string>;
  supported_endpoint?: Record<string, string>;
  auto_groups?: Record<string, string>;
  pricing_version?: string;
};

export type ApiStatus = {
  system_name?: string;
  logo?: string;
  footer_html?: string;
  api_info?: Array<Record<string, unknown>>;
  announcements?: Array<Record<string, unknown>>;
  faq?: Array<Record<string, unknown>>;
  HeaderNavModules?: string;
  SidebarModulesAdmin?: string;
  version?: string;
  start_time?: number;
  server_address?: string;
  docs_link?: string;
  setup?: boolean;
  github_oauth?: boolean;
  github_client_id?: string;
  email_verification?: boolean;
  discord_oauth?: boolean;
  discord_client_id?: string;
  linuxdo_oauth?: boolean;
  linuxdo_client_id?: string;
  linuxdo_minimum_trust_level?: number;
  telegram_oauth?: boolean;
  telegram_bot_name?: string;
  wechat_login?: boolean;
  wechat_qrcode?: string;
  oidc_enabled?: boolean;
  oidc_client_id?: string;
  oidc_authorization_endpoint?: string;
  passkey_login?: boolean;
  password_login_enabled?: boolean;
  register_enabled?: boolean;
  password_register_enabled?: boolean;
  turnstile_check?: boolean;
  turnstile_site_key?: string;
  quota_display_type?: string;
  custom_currency_symbol?: string;
  display_in_currency?: boolean;
  custom_currency_exchange_rate?: number;
  quota_per_unit?: number;
  enable_task?: boolean;
  enable_drawing?: boolean;
  enable_data_export?: boolean;
  enable_batch_update?: boolean;
  data_export_default_time?: string;
  default_collapse_sidebar?: boolean;
  mj_notify_enabled?: boolean;
  chats?: Array<Record<string, string>>;
  demo_site_enabled?: boolean;
  self_use_mode_enabled?: boolean;
  default_use_auto_group?: boolean;
  usd_exchange_rate?: number;
  price?: number;
  stripe_unit_price?: number;
  api_info_enabled?: boolean;
  uptime_kuma_enabled?: boolean;
  announcements_enabled?: boolean;
  faq_enabled?: boolean;
};

export type ApiPerfMetricSummary = {
  model_name: string;
  request_count: number;
  success_count: number;
  total_latency_ms: number;
  output_tokens: number;
  generation_ms: number;
};

export type ApiPerfMetricPoint = {
  ts: number;
  avg_ttft_ms: number;
  avg_latency_ms: number;
  success_rate: number;
  avg_tps: number;
};

export type ApiPerfMetricGroup = {
  group: string;
  avg_ttft_ms: number;
  avg_latency_ms: number;
  success_rate: number;
  avg_tps: number;
  series: ApiPerfMetricPoint[];
};

export type ApiPerfMetrics = {
  model_name: string;
  series_schema?: string;
  groups: ApiPerfMetricGroup[];
};

type ApiPerfMetricSummaryResponse = {
  models?: ApiPerfMetricSummary[];
};

type TaskQueryOptions = {
  status?: string;
  platform?: string;
  task_id?: string;
  action?: string;
  start_timestamp?: number;
  end_timestamp?: number;
};

export type ApiRankingSnapshot = {
  models?: Array<{
    rank: number;
    previous_rank?: number;
    model_name: string;
    vendor: string;
    vendor_icon?: string;
    category?: string;
    total_tokens: number;
    share: number;
    growth_pct: number;
  }>;
  vendors?: Array<{
    rank: number;
    vendor: string;
    vendor_icon?: string;
    total_tokens: number;
    share: number;
    growth_pct: number;
    models_count: number;
    top_model: string;
  }>;
  top_movers?: Array<{
    model_name: string;
    vendor: string;
    rank_delta: number;
    current_rank: number;
    growth_pct: number;
  }>;
  top_droppers?: Array<{
    model_name: string;
    vendor: string;
    rank_delta: number;
    current_rank: number;
    growth_pct: number;
  }>;
  models_history?: unknown;
  vendor_share_history?: unknown;
};

export type OAuthBinding = {
  provider_id: number;
  provider_name: string;
  provider_slug: string;
  provider_icon?: string;
  provider_user_id: string;
};

export type OAuthProviderApi = {
  id: number;
  provider: string;
  client_id?: string;
  auth_url?: string;
  scopes?: string[];
  enabled: boolean;
  allow_signup: boolean;
  auto_link?: string[];
  created_at?: number;
  updated_at?: number;
};

export type CheckinStats = {
  total_quota: number;
  total_checkins: number;
  checkin_count: number;
  checked_in_today: boolean;
  records: Array<{ checkin_date: string; quota_awarded: number }>;
};

export type ActiveTaskUser = {
  user_id: number;
  username: string;
  active_slots: number;
};

export type ActiveTaskStats = {
  global_active_slots: number;
  global_limit: number;
  user_limit: number;
  window_seconds: number;
  active_users: number;
  rank: ActiveTaskUser[];
};

export type ActiveTaskRecord = {
  id: number;
  created_at: number;
  user_id: number;
  username: string;
  active_slots: number;
  global_active_slots: number;
  global_limit: number;
  user_limit: number;
};

export type UserGroups = Record<
  string,
  { ratio: number | string; desc?: string }
>;

export type ApiGroupConfig = {
  name: string;
  description: string;
  ratio: number;
  enabled: boolean;
  models: string[];
  channels: number;
};

function withQuery(
  path: string,
  params?: Record<string, string | number | undefined>,
) {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  unwrap = true,
  retried = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  const userId = localStorage.getItem("new-api-user-id");
  if (userId && !headers.has("New-Api-User"))
    headers.set("New-Api-User", userId);
  if (init.body !== undefined && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const method = (init.method ?? "GET").toUpperCase();
  const mutatesSession = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (mutatesSession && !headers.has("X-CSRF-Token")) {
    const csrf = sessionStorage.getItem("helstare-csrf-token");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  let response: Response;
  try {
    const apiRoot = API_BASE_URL.replace(/\/api\/?$/, "");
    const endpoint = path.startsWith("/pg")
      ? `${apiRoot}${path}`
      : `${API_BASE_URL}${path}`;
    response = await fetch(endpoint, {
      ...init,
      credentials: "include",
      headers,
    });
  } catch (cause) {
    throw new ApiError(0, "无法连接到服务，请检查网络或服务状态。", cause);
  }

  const payload = (await response.json().catch(() => undefined)) as
    ApiEnvelope<T> | undefined;
  if (!payload && response.status !== 204)
    throw new ApiError(response.status, "服务返回了无法识别的响应。", response);
  if (!response.ok) {
    const csrfMissing = response.status === 403 && /csrf token missing in (session|request header)/i.test(payload?.message ?? "");
    if (csrfMissing && !retried && mutatesSession) {
      const fresh = await request<{ csrf_token?: string; token?: string }>("/csrf-token", {}, true, true);
      const token = fresh.csrf_token ?? fresh.token;
      if (token) sessionStorage.setItem("helstare-csrf-token", token);
      return request<T>(path, init, unwrap, true);
    }
    throw new ApiError(
      response.status,
      payload?.message || `请求失败 (${response.status})`,
      payload,
      payload?.code,
    );
  }
  if (payload?.success === false)
    throw new ApiError(
      response.status,
      payload.message || "请求未完成。",
      payload,
      payload?.code,
    );
  return (unwrap ? (payload?.data ?? payload) : payload) as T;
}

function json<T = unknown>(
  method: "POST" | "PUT" | "PATCH",
  path: string,
  body: unknown,
  unwrap = true,
) {
  return request<T>(path, { method, body: JSON.stringify(body) }, unwrap);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  post: <T>(path: string, body: unknown) => json<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => json<T>("PUT", path, body),
  self: () => request<ApiUser>("/user/self"),
  csrfToken: async () => {
    const payload = await request<{ csrf_token?: string; token?: string }>("/csrf-token");
    const token = payload.csrf_token ?? payload.token ?? "";
    if (token) sessionStorage.setItem("helstare-csrf-token", token);
    return token;
  },
  updateSelf: (body: {
    display_name?: string;
    language?: "en" | "zh";
    sidebar_modules?: string;
  }) => json("PUT", "/user/self", body),
  deleteSelf: () => request<void>("/user/self", { method: "DELETE" }),
  updateUserSetting: (body: Record<string, unknown>) =>
    json<Record<string, unknown>>("PUT", "/user/setting", body),
  status: () => request<ApiStatus>("/status"),
  options: () => request<Array<{ key: string; value: string }>>("/option/"),
  recentCalls: (limit = 50, beforeId?: number) =>
    request<unknown>(
      withQuery("/debug/recent_calls", { limit, before_id: beforeId }),
    ),
  recentCall: (id: number) => request<unknown>(`/debug/recent_calls/${id}`),
  channelHealth: () => request<unknown>("/diagnostics/channel-health"),
  taskPlugins: () => request<unknown>("/task-plugins"),
  updateTaskPlugin: (id: string, enabled: boolean) =>
    json<unknown>("PATCH", `/task-plugins/${encodeURIComponent(id)}`, { enabled }),
  testTaskPlugin: (id: string) =>
    json<unknown>("POST", `/task-plugins/${encodeURIComponent(id)}/test`, {}),
  backups: () => request<unknown>("/backup"),
  createBackup: () => json<unknown>("POST", "/backup", {}),
  restoreBackup: (id: string) => json<unknown>("POST", `/backup/${encodeURIComponent(id)}/restore`, {}),
  deleteBackup: (id: string) => request<void>(`/backup/${encodeURIComponent(id)}`, { method: "DELETE" }),
  notice: () => request<unknown>("/notice"),
  homePageContent: () => request<unknown>("/home_page_content"),
  iframeJwt: () =>
    request<{ token: string; expires_in: number }>("/iframe-jwt"),
  perfMetricsSummary: async (hours = 24): Promise<ApiPerfMetricSummary[]> => {
    const payload = await request<
      ApiPerfMetricSummaryResponse | ApiPerfMetricSummary[]
    >(withQuery("/perf-metrics/summary", { hours }));
    return Array.isArray(payload) ? payload : payload.models ?? [];
  },
  perfMetrics: (model: string, group?: string, hours = 24) =>
    request<ApiPerfMetrics>(withQuery("/perf-metrics", { model, group, hours })),
  oauthState: (provider?: string, origin?: string, aff?: string) =>
    request<string>(withQuery("/oauth/state", { provider, origin, aff })),
  bindEmailOAuth: (payload: Record<string, unknown>) =>
    json<unknown>("POST", "/oauth/email/bind", payload),
  bindWechatOAuth: (payload: Record<string, unknown>) =>
    json<unknown>("POST", "/oauth/wechat/bind", payload),
  userAgreement: () => request<string>("/user-agreement"),
  privacyPolicy: () => request<string>("/privacy-policy"),
  about: () => request<string>("/about"),
  uptimeStatus: () => request<unknown>("/uptime/status"),
  statusTest: () => request<unknown>("/status/test"),
  setupState: () =>
    request<{ status: boolean; root_init: boolean; database_type: string }>(
      "/setup",
    ),
  initializeSetup: (body: Record<string, unknown>) =>
    json<void>("POST", "/setup", body),
  userQuotaDates: (start: number, end: number) =>
    request<
      Array<{
        created_at: number;
        quota: number;
        token_used: number;
        count: number;
      }>
    >(withQuery("/data/self", { start_timestamp: start, end_timestamp: end })),
  userFlowQuotaDates: (start: number, end: number) =>
    request<
      Array<{
        created_at: number;
        quota: number;
        token_used: number;
        count: number;
      }>
    >(
      withQuery("/data/flow/self", {
        start_timestamp: start,
        end_timestamp: end,
      }),
    ),
  quotaDates: (start: number, end: number, username?: string) =>
    request<unknown>(
      withQuery("/data/", {
        start_timestamp: start,
        end_timestamp: end,
        username,
      }),
    ),
  quotaDatesByUser: (start: number, end: number) =>
    request<unknown>(
      withQuery("/data/users", { start_timestamp: start, end_timestamp: end }),
    ),
  flowQuotaDates: (start: number, end: number, username?: string) =>
    request<unknown>(
      withQuery("/data/flow", {
        start_timestamp: start,
        end_timestamp: end,
        username,
      }),
    ),
  login: (
    username: string,
    password: string,
    cfTurnstile?: string,
  ) => json("POST", "/user/login", {
    username,
    password,
    ...(cfTurnstile ? { cf_turnstile_response: cfTurnstile } : {}),
  }),
  verifyTwoFactorLogin: (code: string) =>
    json<ApiUser>("POST", "/user/login/2fa", { code }),
  universalVerify: (method: "2fa" | "passkey", code?: string) =>
    json<{ verified: boolean; expires_at?: number }>("POST", "/verify", {
      method,
      ...(code ? { code } : {}),
    }),
  passkeyLoginBegin: () =>
    json<{
      options: PublicKeyCredentialRequestOptions & { challenge: string };
    }>("POST", "/user/passkey/login/begin", {}),
  passkeyLoginFinish: (credential: unknown) =>
    json<void>("POST", "/user/passkey/login/finish", credential),
  register: (
    username: string,
    password: string,
    email: string,
    verificationCode: string,
    turnstile?: string,
  ) =>
    json("POST", withQuery("/user/register", { turnstile }), {
      username,
      password,
      email,
      verification_code: verificationCode,
    }),
  sendEmailVerification: (email: string, turnstile?: string) =>
    request<void>(withQuery("/verification", { email, turnstile })),
  requestPasswordReset: (email: string, turnstile?: string) =>
    request<void>(withQuery("/reset_password", { email, turnstile })),
  resetPassword: (email: string, token: string) =>
    json<string>("POST", "/user/reset", { email, token }),
  logout: () => request<void>("/user/logout"),
  userSessions: () => request<ApiUserSession[]>("/user/sessions"),
  revokeUserSession: (id: number) =>
    request<void>(`/user/sessions/${id}`, { method: "DELETE" }),
  revokeOtherUserSessions: () =>
    json<void>("POST", "/user/sessions/revoke-others", {}),
  generateAccessToken: () => request<string>("/user/token"),
  setupTwoFactor: () =>
    json<{ secret: string; qr_code_data: string; backup_codes: string[] }>(
      "POST",
      "/user/2fa/setup",
      {},
    ),
  enableTwoFactor: (code: string) => json("POST", "/user/2fa/enable", { code }),
  disableTwoFactor: (code: string) =>
    json("POST", "/user/2fa/disable", { code }),
  twoFactorStatus: () =>
    request<{
      enabled: boolean;
      locked: boolean;
      backup_codes_remaining?: number;
    }>("/user/2fa/status"),
  adminTwoFactorStats: () => request<unknown>("/user/2fa/stats"),
  regenerateBackupCodes: (code: string) =>
    json<{ backup_codes: string[] }>("POST", "/user/2fa/backup_codes", {
      code,
    }),
  passkeyStatus: () =>
    request<{ enabled: boolean; last_used_at?: number }>("/user/passkey"),
  passkeyRegisterBegin: () =>
    json<{ options: PublicKeyCredentialCreationOptions }>(
      "POST",
      "/user/passkey/register/begin",
      {},
    ),
  passkeyRegisterFinish: (credential: unknown) =>
    json<void>("POST", "/user/passkey/register/finish", credential),
  passkeyVerifyBegin: () =>
    json<{
      options: PublicKeyCredentialRequestOptions & { challenge: string };
    }>("POST", "/user/passkey/verify/begin", {}),
  passkeyVerifyFinish: (credential: unknown) =>
    json<void>("POST", "/user/passkey/verify/finish", credential),
  deletePasskey: () => request<void>("/user/passkey", { method: "DELETE" }),
  oauthBindings: () => request<OAuthBinding[]>("/user/oauth/bindings"),
  unbindOAuth: (providerId: number) =>
    request<void>(`/user/oauth/bindings/${providerId}`, { method: "DELETE" }),
  checkinStatus: (month: string) =>
    request<{
      enabled: boolean;
      min_quota: number;
      max_quota: number;
      stats: CheckinStats;
    }>(withQuery("/user/checkin", { month })),
  checkin: (turnstile?: string) =>
    json<{ quota_awarded: number; checkin_date: string }>(
      "POST",
      withQuery("/user/checkin", { turnstile }),
      {},
    ),
  affCode: () => request<string>("/user/aff"),
  transferAffQuota: (quota: number) =>
    json("POST", "/user/aff_transfer", { quota }),
  confirmPaymentCompliance: () =>
    json("POST", "/option/payment_compliance", { confirmed: true }),
  channelAffinityCache: () =>
    request<unknown>("/option/channel_affinity_cache"),
  clearChannelAffinityCache: () =>
    request<void>("/option/channel_affinity_cache", { method: "DELETE" }),
  getChannelAffinitySetting: () =>
    request<Record<string, unknown>>(
      withQuery("/option/", { key: "channel_affinity_setting" }),
    ),
  updateChannelAffinitySetting: (setting: Record<string, unknown>) =>
    json("PUT", "/option/", {
      key: "channel_affinity_setting",
      value: setting,
    }),
  updateOption: (key: string, value: unknown) =>
    json<void>("PUT", "/option/", { key, value }),
  getRatioConfig: () => request<Record<string, unknown>>("/ratio_config"),
  resetModelRatio: () => json("POST", "/option/rest_model_ratio", {}),
  migrateConsoleSetting: () =>
    json<unknown>("POST", "/option/migrate_console_setting", {}),
  waffoPancakeCatalog: () => request<unknown>("/option/waffo-pancake/catalog"),
  waffoPancakePair: (payload: Record<string, unknown>) =>
    json<unknown>("POST", "/option/waffo-pancake/pair", payload),
  waffoPancakeSave: (payload: Record<string, unknown>) =>
    json<unknown>("POST", "/option/waffo-pancake/save", payload),
  waffoPancakeSubscriptionProduct: (payload: Record<string, unknown>) =>
    json<unknown>(
      "POST",
      "/option/waffo-pancake/subscription-product",
      payload,
    ),
  waffoPancakeSubscriptionProductOptions: () =>
    request<unknown>("/option/waffo-pancake/subscription-product-options"),
  topupInfo: () =>
    request<{
      amount_options?: number[];
      pay_methods?: Array<{
        type: string;
        name?: string;
        min_topup?: string | number;
      }>;
      min_topup?: number;
      creem_products?: string;
      waffo_pay_methods?: Array<{
        name?: string;
        icon?: string;
        payMethodType?: string;
        payMethodName?: string;
      }>;
      payment_compliance_confirmed?: boolean;
      payment_compliance_terms_version?: string;
    }>("/user/topup/info"),
  requestPayment: (amount: number, paymentMethod: string) =>
    json<{ message?: string; url?: string; data?: Record<string, string> | string }>(
      "POST",
      "/user/pay",
      { amount, payment_method: paymentMethod },
      false,
    ),
  requestPaymentAmount: (amount: number) =>
    json<{ data?: string; message?: string }>(
      "POST",
      "/user/amount",
      { amount },
      false,
    ),
  requestStripePayment: (amount: number) =>
    json<{
      url?: string;
      pay_link?: string;
      data?: { pay_link?: string } | string;
      message?: string;
    }>("POST", "/user/stripe/pay", { amount }, false),
  requestStripeAmount: (amount: number) =>
    json<{ data?: string; message?: string }>(
      "POST",
      "/user/stripe/amount",
      { amount },
      false,
    ),
  requestCreemPayment: (productId: string) =>
    json<{
      url?: string;
      checkout_url?: string;
      data?: { checkout_url?: string } | string;
      message?: string;
    }>(
      "POST",
      "/user/creem/pay",
      { product_id: productId, payment_method: "creem" },
      false,
    ),
  requestWaffoPayment: (amount: number, payMethodIndex?: number) =>
    json<{
      url?: string;
      payment_url?: string;
      data?: { payment_url?: string } | string;
      message?: string;
    }>(
      "POST",
      "/user/waffo/pay",
      { amount, pay_method_index: payMethodIndex },
      false,
    ),
  requestWaffoAmount: (amount: number) =>
    json<{ data?: string; message?: string }>(
      "POST",
      "/user/waffo/amount",
      { amount },
      false,
    ),
  requestWaffoPancakePayment: (amount: number) =>
    json<{
      url?: string;
      checkout_url?: string;
      data?: { checkout_url?: string } | string;
      message?: string;
    }>("POST", "/user/waffo-pancake/pay", { amount }, false),
  requestWaffoPancakeAmount: (amount: number) =>
    json<{ data?: string; message?: string }>(
      "POST",
      "/user/waffo-pancake/amount",
      { amount },
      false,
    ),
  topupRecords: (page = 1, keyword?: string) =>
    request<Page<Record<string, unknown>>>(
      withQuery("/user/topup/self", { p: page, keyword }),
    ),
  redeemTopup: (code: string) => json<void>("POST", "/user/topup", { code }),
  subscriptionPlans: () =>
    request<Array<{ plan: Record<string, unknown> }>>("/subscription/plans"),
  mySubscription: () => request<unknown>("/subscription/self"),
  updateSubscriptionPreference: (preference: Record<string, unknown>) =>
    json("PUT", "/subscription/self/preference", preference),
  purchaseSubscription: (planId: number) =>
    json("POST", "/subscription/balance/pay", { plan_id: planId }),
  purchaseSubscriptionEpay: (planId: number, paymentMethod: string) =>
    json<{ url?: string; data?: Record<string, string> | string; message?: string }>(
      "POST",
      "/subscription/epay/pay",
      { plan_id: planId, payment_method: paymentMethod },
      false,
    ),
  purchaseSubscriptionStripe: (planId: number) =>
    json<{
      url?: string;
      pay_link?: string;
      data?: { pay_link?: string } | string;
      message?: string;
    }>("POST", "/subscription/stripe/pay", { plan_id: planId }, false),
  purchaseSubscriptionCreem: (planId: number) =>
    json<{
      url?: string;
      checkout_url?: string;
      data?: { checkout_url?: string } | string;
      message?: string;
    }>("POST", "/subscription/creem/pay", { plan_id: planId }, false),
  purchaseSubscriptionWaffo: (planId: number) =>
    json<{
      url?: string;
      checkout_url?: string;
      data?: { checkout_url?: string } | string;
      message?: string;
    }>("POST", "/subscription/waffo-pancake/pay", { plan_id: planId }, false),
  adminSubscriptionPlans: () =>
    request<Array<{ plan: Record<string, unknown> }>>(
      "/subscription/admin/plans",
    ),
  updateSubscriptionPlanStatus: (id: number, enabled: boolean) =>
    json("PATCH", `/subscription/admin/plans/${id}`, { enabled }),
  createSubscriptionPlan: (plan: Record<string, unknown>) =>
    json("POST", "/subscription/admin/plans", { plan }),
  updateSubscriptionPlan: (id: number, plan: Record<string, unknown>) =>
    json("PUT", `/subscription/admin/plans/${id}`, { plan }),
  bindSubscription: (userId: number, planId: number) =>
    json("POST", "/subscription/admin/bind", {
      user_id: userId,
      plan_id: planId,
    }),
  listUserSubscriptions: (userId: number) =>
    request<unknown>(`/subscription/admin/users/${userId}/subscriptions`),
  createUserSubscription: (userId: number, planId: number) =>
    json("POST", `/subscription/admin/users/${userId}/subscriptions`, {
      plan_id: planId,
    }),
  resetUserSubscriptions: (
    userId: number,
    planId: number,
    advanceResetTime = true,
  ) =>
    json("POST", `/subscription/admin/users/${userId}/subscriptions/reset`, {
      plan_id: planId,
      advance_reset_time: advanceResetTime,
    }),
  resetPlanSubscriptions: (planId: number, advanceResetTime = true) =>
    json("POST", `/subscription/admin/plans/${planId}/subscriptions/reset`, {
      plan_id: planId,
      advance_reset_time: advanceResetTime,
    }),
  invalidateUserSubscription: (subscriptionId: number) =>
    json(
      "POST",
      `/subscription/admin/user_subscriptions/${subscriptionId}/invalidate`,
      {},
    ),
  deleteUserSubscription: (subscriptionId: number) =>
    request<void>(`/subscription/admin/user_subscriptions/${subscriptionId}`, {
      method: "DELETE",
    }),
  tokens: (page: number, keyword?: string) =>
    request<Page<ApiToken>>(
      withQuery(keyword ? "/token/search" : "/token/", { p: page, keyword }),
    ),
  tokenUsage: (tokenKey: string) =>
    request<{
      object: string;
      name: string;
      total_granted: number;
      total_used: number;
      total_available: number;
      unlimited_quota: boolean;
      model_limits?: Record<string, unknown>;
      model_limits_enabled?: boolean;
      expires_at: number;
    }>("/usage/token/", {
      headers: { Authorization: `Bearer ${tokenKey}` },
    }),
  token: (id: number) => request<ApiToken>(`/token/${id}`),
  tokenKey: (id: number) => json<string>("POST", `/token/${id}/key`, {}),
  addToken: (body: {
    name: string;
    remain_quota: number;
    unlimited_quota: boolean;
    expired_time: number;
    group?: string;
    model_limits_enabled?: boolean;
    model_limits?: string;
    allow_ips?: string;
    cross_group_retry?: boolean;
  }) => json<void>("POST", "/token/", body),
  updateToken: (body: {
    id: number;
    name: string;
    remain_quota: number;
    unlimited_quota: boolean;
    expired_time: number;
    status: number;
    group?: string;
    model_limits_enabled?: boolean;
    model_limits?: string;
    allow_ips?: string;
    cross_group_retry?: boolean;
  }) => json<ApiToken>("PUT", "/token/", body),
  deleteTokenBatch: (ids: number[]) => json("POST", "/token/batch", { ids }),
  deleteToken: (id: number) =>
    request<void>(`/token/${id}`, { method: "DELETE" }),
  tokenKeysBatch: (ids: number[]) =>
    json<Array<{ id: number; key: string }>>("POST", "/token/batch/keys", {
      ids,
    }),
  manageUser: (body: {
    id: number;
    action:
      "disable" | "enable" | "delete" | "promote" | "demote" | "add_quota";
    mode?: "add" | "subtract" | "override";
    value?: number;
  }) => json("POST", "/user/manage", body),
  adminTopups: (page: number, keyword?: string) =>
    request<Page<Record<string, unknown>>>(
      withQuery("/user/topup", { p: page, keyword }),
    ),
  completeTopup: (tradeNo: string) =>
    json<void>("POST", "/user/topup/complete", { trade_no: tradeNo }),
  reconcileEpay: (dryRun = true) =>
    json<unknown>("POST", "/user/topup/epay/reconcile", { dry_run: dryRun }),
  logs: (
    page: number,
    admin: boolean,
    modelName?: string,
    options?: {
      username?: string;
      channelId?: number;
      startTimestamp?: number;
      endTimestamp?: number;
      requestId?: string;
      tokenName?: string;
      group?: string;
      upstreamRequestId?: string;
      pageSize?: number;
    },
  ) =>
    request<Page<ApiLog>>(
      withQuery(admin ? "/log/" : "/log/self", {
        p: page,
        model_name: modelName,
        username: options?.username,
        channel_id: options?.channelId,
        start_timestamp: options?.startTimestamp,
        end_timestamp: options?.endTimestamp,
        request_id: options?.requestId,
        token_name: options?.tokenName,
        group: options?.group,
        upstream_request_id: options?.upstreamRequestId,
        page_size: options?.pageSize,
      }),
    ),
  auditLogs: (
    scope: "all" | "self",
    page: number,
    options?: { username?: string; requestId?: string; startTimestamp?: number; endTimestamp?: number },
  ) =>
    request<Page<ApiAuditLog>>(
      withQuery(scope === "all" ? "/audit" : "/audit/self", {
        p: page,
        page_size: 20,
        username: options?.username,
        request_id: options?.requestId,
        start_timestamp: options?.startTimestamp,
        end_timestamp: options?.endTimestamp,
      }),
    ),
  searchUserLogs: (
    page: number,
    keyword?: string,
    options?: {
      startTimestamp?: number;
      endTimestamp?: number;
      requestId?: string;
    },
  ) =>
    request<Page<ApiLog>>(
      withQuery("/log/self/search", {
        p: page,
        keyword,
        start_timestamp: options?.startTimestamp,
        end_timestamp: options?.endTimestamp,
        request_id: options?.requestId,
      }),
    ),
  logStats: (startTimestamp = 0, endTimestamp = 0) =>
    request<{ quota: number; rpm: number; tpm: number }>(
      withQuery("/log/stat", {
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
      }),
    ),
  deleteHistoryLogs: () => request<void>("/log/", { method: "DELETE" }),
  logAffinityUsageCache: (
    ruleName: string,
    keyFp: string,
    usingGroup?: string,
  ) =>
    request<unknown>(
      withQuery("/log/channel_affinity_usage_cache", {
        rule_name: ruleName,
        key_fp: keyFp,
        using_group: usingGroup,
      }),
    ),
  channels: (
    page: number,
    keyword?: string,
    options?: ChannelQueryOptions | number,
  ) =>
    request<Page<ApiChannel>>(
      withQuery(keyword ? "/channel/search" : "/channel/", {
        p: page,
        keyword,
        page_size: typeof options === "number" ? options : undefined,
        group: typeof options === "object" ? options?.group : undefined,
        status: typeof options === "object" ? options?.status : undefined,
        type: typeof options === "object" ? options?.type : undefined,
        sort_by: typeof options === "object" ? options?.sort_by : undefined,
        sort_order:
          typeof options === "object" ? options?.sort_order : undefined,
        id_sort:
          typeof options === "object" && options?.id_sort !== undefined
            ? String(options.id_sort)
            : undefined,
        tag_mode:
          typeof options === "object" && options?.tag_mode !== undefined
            ? String(options.tag_mode)
            : undefined,
      }),
    ),
  models: (page: number, keyword?: string, options?: ModelQueryOptions) =>
    request<ApiModelPage>(
      withQuery(keyword ? "/models/search" : "/models/", {
        p: page,
        keyword,
        vendor: options?.vendor,
        status: options?.status,
        sync_official: options?.sync_official,
      }),
    ),
  modelDetails: (id: number) => request<ApiModel>(`/models/${id}`),
  createModel: (body: Record<string, unknown>) =>
    json<ApiModel>("POST", "/models/", body),
  updateModel: (body: Record<string, unknown>) =>
    json<ApiModel>("PUT", "/models/", body),
  deleteModel: (id: number) =>
    request<void>(`/models/${id}`, { method: "DELETE" }),
  previewModelSync: (locale = "") =>
    request<unknown>(withQuery("/models/sync_upstream/preview", { locale })),
  syncUpstreamModels: (
    locale = "",
    overwrite: Array<{ model_name: string; fields: string[] }> = [],
  ) => json<unknown>("POST", "/models/sync_upstream", { locale, overwrite }),
  missingModels: () => request<unknown>("/models/missing"),
  vendors: (page: number, keyword?: string) =>
    request<Page<ApiVendor>>(
      withQuery(keyword ? "/vendors/search" : "/vendors/", {
        p: page,
        keyword,
      }),
    ),
  vendorDetails: (id: number) => request<ApiVendor>(`/vendors/${id}`),
  addVendor: (name: string) => json<ApiVendor>("POST", "/vendors/", { name }),
  updateVendor: (
    id: number,
    payload: Partial<
      Pick<ApiVendor, "name" | "description" | "icon" | "status">
    >,
  ) => json<ApiVendor>("PUT", `/vendors/${id}`, { id, ...payload }),
  deleteVendor: (id: number) =>
    request<void>(`/vendors/${id}`, { method: "DELETE" }),
  updateChannelStatus: (id: number, status: number) =>
    json("POST", `/channel/${id}/status`, { status }),
  createChannel: (body: Record<string, unknown>) =>
    json<ApiChannel>("POST", "/channel/", body),
  updateChannel: (body: Record<string, unknown>) =>
    json<ApiChannel>("PUT", "/channel/", body),
  deleteChannel: (id: number) =>
    request<void>(`/channel/${id}`, { method: "DELETE" }),
  deleteChannelBatch: (ids: number[]) =>
    json<void>("POST", "/channel/batch", { ids }),
  channelKey: (id: number) => json<string>("POST", `/channel/${id}/key`, {}),
  channelDetails: (id: number) => request<ApiChannel>(`/channel/${id}`),
  channelOps: () => request<unknown>("/channel/ops"),
  channelModels: () => request<string[]>("/channel/models"),
  enabledChannelModels: () => request<string[]>("/channel/models_enabled"),
  testChannel: (id?: number) =>
    request<unknown>(id == null ? "/channel/test" : `/channel/test/${id}`),
  updateChannelBalance: (id?: number) =>
    request<unknown>(
      id == null ? "/channel/update_balance" : `/channel/update_balance/${id}`,
    ),
  fetchChannelModels: (id: number) =>
    request<unknown>(`/channel/fetch_models/${id}`),
  copyChannel: (id: number) => json<unknown>("POST", `/channel/copy/${id}`, {}),
  batchUpdateChannelStatus: (ids: number[], status: number) =>
    json<void>("POST", "/channel/status/batch", { ids, status }),
  fetchChannelModelsAll: (payload: Record<string, unknown>) =>
    json<unknown>("POST", "/channel/fetch_models", payload),
  deleteDisabledChannels: () =>
    request<void>("/channel/disabled", { method: "DELETE" }),
  disableTagChannels: (tag: string) =>
    json<void>("POST", "/channel/tag/disabled", { tag }),
  enableTagChannels: (tag: string) =>
    json<void>("POST", "/channel/tag/enabled", { tag }),
  editChannelTag: (payload: {
    tag: string;
    new_tag?: string;
    priority?: number;
    weight?: number;
    model_mapping?: string;
    models?: string;
    groups?: string;
    param_override?: string;
    header_override?: string;
  }) => json<void>("PUT", "/channel/tag", payload),
  codexChannelUsage: (id: number) =>
    request<unknown>(`/channel/${id}/codex/usage`),
  codexChannelResetCredits: (id: number) =>
    request<unknown>(`/channel/${id}/codex/usage/reset-credits`),
  resetCodexChannelUsage: (id: number) =>
    json<void>("POST", `/channel/${id}/codex/usage/reset`, {}),
  refreshCodexChannelCredential: (id: number) =>
    json<unknown>("POST", `/channel/${id}/codex/refresh`, {}),
  channelTagModels: () => request<unknown>("/channel/tag/models"),
  manageChannelKeys: (payload: Record<string, unknown>) =>
    json<unknown>("POST", "/channel/multi_key/manage", payload),
  ollamaPull: (payload: Record<string, unknown>) =>
    json<unknown>("POST", "/channel/ollama/pull", payload),
  ollamaPullStream: (payload: Record<string, unknown>) =>
    json<unknown>("POST", "/channel/ollama/pull/stream", payload),
  ollamaDelete: (payload: Record<string, unknown>) =>
    request<unknown>("/channel/ollama/delete", {
      method: "DELETE",
      body: JSON.stringify(payload),
    }),
  ollamaVersion: (id: number) =>
    request<unknown>(`/channel/ollama/version/${id}`),
  detectChannelUpstreamUpdates: (payload: Record<string, unknown> = {}) =>
    json<{
      channel_id?: number;
      channel_name?: string;
      add_models?: string[];
      remove_models?: string[];
      last_check_time?: number;
      auto_added_models?: number;
      has_update?: boolean;
      current_version?: string;
      latest_version?: string;
      models_to_add?: string[];
      models_to_remove?: string[];
    }>("POST", "/channel/upstream_updates/detect", payload),
  detectAllChannelUpstreamUpdates: () =>
    json<unknown>("POST", "/channel/upstream_updates/detect_all", {}),
  applyChannelUpstreamUpdates: (payload: Record<string, unknown> = {}) =>
    json<void>("POST", "/channel/upstream_updates/apply", payload),
  applyAllChannelUpstreamUpdates: () =>
    json<void>("POST", "/channel/upstream_updates/apply_all", {}),
  fixChannelAbilities: () => json<unknown>("POST", "/channel/fix", {}),
  batchSetChannelTag: (payload: Record<string, unknown>) =>
    json<void>("POST", "/channel/batch/tag", payload),
  redemptions: (page: number, keyword?: string, status?: string) =>
    request<Page<ApiRedemption>>(
      withQuery(keyword || status ? "/redemption/search" : "/redemption/", {
        p: page,
        keyword,
        status,
      }),
    ),
  createRedemptions: (payload: {
    name: string;
    quota: number;
    count: number;
  }) => json<unknown>("POST", "/redemption/", payload),
  getRedemption: (id: number) =>
    request<ApiRedemption>(`/redemption/${id}`),
  updateRedemption: (
    payload: Partial<ApiRedemption> & { id: number; status_only?: boolean },
  ) =>
    json<ApiRedemption>(
      "PUT",
      withQuery("/redemption/", { status_only: payload.status_only ? "true" : undefined }),
      payload,
    ),
  deleteRedemption: (id: number) =>
    request<void>(`/redemption/${id}`, { method: "DELETE" }),
  deleteInvalidRedemptions: () =>
    request<void>("/redemption/invalid", { method: "DELETE" }),
  fingerprints: (page: number, keyword?: string) =>
    request<Page<ApiFingerprint>>(
      withQuery("/fingerprint/", { p: page, keyword }),
    ),
  userFingerprints: () => request<ApiSelfFingerprint[]>("/fingerprint/self"),
  recordFingerprint: (visitorId: string) =>
    json<void>("POST", "/fingerprint/record", { visitor_id: visitorId }),
  fingerprintUsers: (page: number, visitorId?: string, ip?: string) =>
    request<Page<Record<string, unknown>>>(
      withQuery("/fingerprint/users", { p: page, visitor_id: visitorId, ip }),
    ),
  duplicateFingerprints: (page: number) =>
    request<Page<Record<string, unknown>>>(
      withQuery("/fingerprint/duplicates", { p: page }),
    ),
  pricing: async (): Promise<ApiPricingResponse> => {
    const payload = await request<{
      data?: ApiPricing[];
      vendors?: ApiVendor[];
      group_ratio?: Record<string, number>;
      usable_group?: Record<string, string>;
      supported_endpoint?: Record<string, string>;
      auto_groups?: Record<string, string>;
      pricing_version?: string;
    }>("/pricing", {}, false);
    return {
      models: payload.data ?? [],
      vendors: payload.vendors,
      group_ratio: payload.group_ratio,
      usable_group: payload.usable_group,
      supported_endpoint: payload.supported_endpoint,
      auto_groups: payload.auto_groups,
      pricing_version: payload.pricing_version,
    };
  },
  dashboardModels: () => request<Record<string, string[]>>("/models"),
  dashboardBillingSubscription: () =>
    request<{
      object: string;
      has_payment_method: boolean;
      soft_limit_usd: number;
      hard_limit_usd: number;
      system_hard_limit_usd: number;
      access_until: number;
    }>("/dashboard/billing/subscription"),
  dashboardBillingUsage: () =>
    request<{ object: string; total_usage: number }>(
      "/dashboard/billing/usage",
    ),
  rankings: (period?: string) =>
    request<ApiRankingSnapshot>(withQuery("/rankings", { period })),
  userModels: (group?: string) =>
    request<string[]>(withQuery("/user/models", { group })),
  tasks: (page = 1, options?: TaskQueryOptions) =>
    request<Page<Record<string, unknown>>>(
      withQuery("/task/", { p: page, ...options }),
    ),
  userTasks: (page = 1, options?: TaskQueryOptions) =>
    request<Page<Record<string, unknown>>>(
      withQuery("/task/self", { p: page, ...options }),
    ),
  midjourneyTasks: (page = 1) =>
    request<Page<Record<string, unknown>>>(withQuery("/mj/", { p: page })),
  userMidjourneyTasks: (
    page = 1,
    options?: {
      mj_id?: string;
      start_timestamp?: number;
      end_timestamp?: number;
    },
  ) =>
    request<Page<Record<string, unknown>>>(
      withQuery("/mj/self", { p: page, ...options }),
    ),
  tokenLogs: (page = 1) =>
    request<Page<ApiLog>>(withQuery("/log/token", { p: page })),
  userLogStats: () =>
    request<{ quota: number; rpm: number; tpm: number }>("/log/self/stat"),
  userLogErrorStats: (startTimestamp?: number, endTimestamp?: number) =>
    request<{ requests: number; errors: number; error_rate: number }>(
      withQuery("/log/self/error-stats", {
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
      }),
    ),
  playground: (body: unknown, signal?: AbortSignal) =>
    request<{ choices?: Array<{ message?: { content?: string } }> }>(
      "/pg/chat/completions",
      { method: "POST", body: JSON.stringify(body), signal },
    ),
  /**
   * Streaming playground: parses Server-Sent Events (or non-streaming JSON
   * fallback) and yields assistant content deltas.
   */
  playgroundStream: async function* (
    body: unknown,
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, void> {
    const apiRoot = API_BASE_URL.replace(/\/api\/?$/, "");
    const headers = new Headers({ "Content-Type": "application/json" });
    const userId = localStorage.getItem("new-api-user-id");
    if (userId) headers.set("New-Api-User", userId);
    const response = await fetch(`${apiRoot}/pg/chat/completions`, {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify({ ...(body as object), stream: true }),
      signal,
    });
    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new ApiError(
        response.status,
        text || `请求失败 (${response.status})`,
        text,
      );
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line || !line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const obj = JSON.parse(payload);
          const delta =
            obj.choices?.[0]?.delta?.content ??
            obj.choices?.[0]?.message?.content ??
            "";
          if (delta) yield delta;
        } catch {
          // ignore malformed lines
        }
      }
    }
    // Servers may close the stream without a trailing newline; process the
    // final complete SSE record instead of silently dropping its delta.
    const line = buffer.trim();
    if (line.startsWith("data:")) {
      const payload = line.slice(5).trim();
      if (payload !== "[DONE]") {
        try {
          const obj = JSON.parse(payload);
          const delta =
            obj.choices?.[0]?.delta?.content ??
            obj.choices?.[0]?.message?.content ??
            "";
          if (delta) yield delta;
        } catch {
          // Ignore an incomplete terminal record; preceding deltas are safe.
        }
      }
    }
  },
  userRanking: (
    period: "today" | "week" | "month" | "year" | "all" = "week",
    limit = 20,
  ) =>
    request<
      Array<{ rank: number; username: string; quota: number; requests: number }>
    >(withQuery("/user-ranking", { period, limit })),
  activeTaskStats: (windowSeconds = 30, limit = 50) =>
    request<ActiveTaskStats>(
      withQuery("/active-task/stats", { window: windowSeconds, limit }),
    ),
  activeTaskHistory: (page: number, pageSize = 10) =>
    request<Page<ActiveTaskRecord>>(
      withQuery("/active-task/history", { p: page, page_size: pageSize }),
    ),
  users: (page: number, keyword?: string, options?: UserQueryOptions) =>
    request<Page<AdminUser>>(
      withQuery(
        keyword ||
          options?.group ||
          options?.role !== undefined ||
          options?.status !== undefined
          ? "/user/search"
          : "/user/",
        {
          p: page,
          keyword,
          ...options,
        },
      ),
    ),
  userDetails: (id: number) => request<AdminUser>(`/user/${id}`),
  adminUserOAuthBindings: (id: number) =>
    request<OAuthBinding[]>(`/user/${id}/oauth/bindings`),
  adminUnbindOAuth: (userId: number, providerId: number) =>
    request<void>(`/user/${userId}/oauth/bindings/${providerId}`, {
      method: "DELETE",
    }),
  clearUserBinding: (userId: number, bindingType: string) =>
    request<void>(
      `/user/${userId}/bindings/${encodeURIComponent(bindingType)}`,
      { method: "DELETE" },
    ),
  adminResetPasskey: (userId: number) =>
    request<void>(`/user/${userId}/reset_passkey`, { method: "DELETE" }),
  adminDisableTwoFactor: (userId: number) =>
    request<void>(`/user/${userId}/2fa`, { method: "DELETE" }),
  createUser: (body: Record<string, unknown>) =>
    json<AdminUser>("POST", "/user/", body),
  updateUser: (body: Record<string, unknown>) =>
    json<AdminUser>("PUT", "/user/", body),
  deleteUser: (id: number) =>
    request<void>(`/user/${id}`, { method: "DELETE" }),
  userGroups: () => request<UserGroups>("/user/self/groups"),
  groups: () => request<string[]>("/group/"),
  groupConfigs: () => request<ApiGroupConfig[]>("/group"),
  createGroupConfig: (body: Omit<ApiGroupConfig, "models" | "channels">) =>
    json<ApiGroupConfig>("POST", "/group", body),
  updateGroupConfig: (name: string, body: Omit<ApiGroupConfig, "models" | "channels">) =>
    json<ApiGroupConfig>("PUT", "/group", { ...body, name }),
  deleteGroupConfig: (name: string) =>
    request<{ channels?: number; models?: string[] }>(`/group/${encodeURIComponent(name)}`, { method: "DELETE" }),
  systemTasks: () => request<unknown[]>("/system-task/list"),
  currentSystemTask: (type: string) =>
    request<unknown>(withQuery("/system-task/current", { type })),
  createLogCleanupTask: (targetTimestamp: number) =>
    request<unknown>(
      withQuery("/system-task/log-cleanup", {
        target_timestamp: targetTimestamp,
      }),
      { method: "POST" },
    ),
  systemTask: (taskId: string) =>
    request<unknown>(`/system-task/${encodeURIComponent(taskId)}`),
  systemInstances: () =>
    request<
      Array<{
        node_name: string;
        status?: string;
        stale_after_seconds?: number;
        last_seen_at?: number;
      }>
    >("/system-info/instances"),
  clearStaleInstances: () =>
    request<void>("/system-info/stale-instances", { method: "DELETE" }),
  clearStaleInstance: (nodeName: string) =>
    request<void>(`/system-info/instances/${encodeURIComponent(nodeName)}`, {
      method: "DELETE",
    }),
  performanceStats: () =>
    request<Record<string, unknown>>("/performance/stats"),
  clearDiskCache: () =>
    request<void>("/performance/disk_cache", { method: "DELETE" }),
  resetPerformanceStats: () =>
    json<void>("POST", "/performance/reset_stats", {}),
  forceGc: () => json<void>("POST", "/performance/gc", {}),
  cleanupLogs: () => request<void>("/performance/logs", { method: "DELETE" }),
  performanceLogs: () => request<unknown>("/performance/logs"),
  syncableChannels: () => request<unknown[]>("/ratio_sync/channels"),
  fetchUpstreamRatios: (channelIds: number[], timeout = 10) =>
    json<void>("POST", "/ratio_sync/fetch", {
      channel_ids: channelIds,
      timeout,
    }),
  deploymentSettings: () =>
    request<Record<string, unknown>>("/deployments/settings"),
  deployments: (page = 1) =>
    request<Page<Record<string, unknown>>>(
      withQuery("/deployments/", { p: page }),
    ),
  searchDeployments: (page = 1, keyword?: string) =>
    request<Page<Record<string, unknown>>>(
      withQuery("/deployments/search", { p: page, keyword }),
    ),
  testDeploymentConnection: (apiKey?: string) =>
    json<Record<string, unknown>>(
      "POST",
      "/deployments/test-connection",
      apiKey ? { api_key: apiKey } : {},
    ),
  createDeployment: (body: Record<string, unknown>) =>
    json<Record<string, unknown>>("POST", "/deployments/", body),
  deploymentHardware: () =>
    request<{ hardware_types?: unknown[] }>("/deployments/hardware-types"),
  deploymentLocations: () =>
    request<{ locations?: unknown[] }>("/deployments/locations"),
  availableReplicas: (hardwareId: number, gpuCount = 1) =>
    request<unknown>(
      withQuery("/deployments/available-replicas", {
        hardware_id: hardwareId,
        gpu_count: gpuCount,
      }),
    ),
  estimateDeploymentPrice: (payload: Record<string, unknown>) =>
    json<unknown>("POST", "/deployments/price-estimation", payload),
  updateDeployment: (id: string, payload: Record<string, unknown>) =>
    json<Record<string, unknown>>(
      "PUT",
      `/deployments/${encodeURIComponent(id)}`,
      payload,
    ),
  checkDeploymentName: (name: string) =>
    request<unknown>(withQuery("/deployments/check-name", { name })),
  deleteDeployment: (id: string) =>
    request<void>(`/deployments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  deploymentContainers: (id: string) =>
    request<unknown>(`/deployments/${encodeURIComponent(id)}/containers`),
  deploymentDetails: (id: string) =>
    request<unknown>(`/deployments/${encodeURIComponent(id)}`),
  containerDetails: (id: string, containerId: string) =>
    request<unknown>(
      `/deployments/${encodeURIComponent(id)}/containers/${encodeURIComponent(containerId)}`,
    ),
  deploymentLogs: (id: string, containerId: string) =>
    request<unknown>(
      withQuery(`/deployments/${encodeURIComponent(id)}/logs`, {
        container_id: containerId,
        limit: 200,
      }),
    ),
  renameDeployment: (id: string, name: string) =>
    json("PUT", `/deployments/${encodeURIComponent(id)}/name`, { name }),
  extendDeployment: (id: string, durationHours: number) =>
    json("POST", `/deployments/${encodeURIComponent(id)}/extend`, {
      duration_hours: durationHours,
    }),
  prefillGroups: () =>
    request<Array<{ id: number; name: string; type: string; items: unknown }>>(
      "/prefill_group/",
    ),
  createPrefillGroup: (body: { name: string; type: string; items: unknown }) =>
    json("POST", "/prefill_group/", body),
  updatePrefillGroup: (body: {
    id: number;
    name: string;
    type: string;
    items: unknown;
  }) => json("PUT", "/prefill_group/", body),
  deletePrefillGroup: (id: number) =>
    request<void>(`/prefill_group/${id}`, { method: "DELETE" }),
  permissionCatalog: () =>
    request<{ resources: unknown[]; roles: unknown[] }>("/authz/catalog"),
  oauthProviders: () => request<OAuthProviderApi[]>("/custom-oauth-provider/"),
  getOAuthProvider: (id: number) =>
    request<OAuthProviderApi>(`/custom-oauth-provider/${id}`),
  createOAuthProvider: (body: Record<string, unknown>) =>
    json<OAuthProviderApi>("POST", "/custom-oauth-provider/", body),
  updateOAuthProvider: (body: Record<string, unknown> & { id: number }) =>
    json<OAuthProviderApi>("PUT", `/custom-oauth-provider/${body.id}`, body),
  deleteOAuthProvider: (id: number) =>
    request<void>(`/custom-oauth-provider/${id}`, { method: "DELETE" }),
  discoverOAuth: (url: string) =>
    json<Record<string, unknown>>("POST", "/custom-oauth-provider/discovery", {
      well_known_url: url,
    }),
};
