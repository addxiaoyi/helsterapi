/**
 * 通用类型定义
 * 所有跨模块共享的基础类型
 */

/**
 * 分页结果
 */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

/**
 * API 响应包装
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * 排序方向
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 排序配置
 */
export interface SortConfig {
  field: string;
  direction: SortDirection;
}

/**
 * 筛选配置
 */
export interface FilterConfig {
  [key: string]: any;
}

/**
 * 列表查询参数
 */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortDirection;
  filters?: FilterConfig;
}

/**
 * ID 类型（支持数字和字符串）
 */
export type ID = number | string;

/**
 * 时间戳（Unix 秒）
 */
export type Timestamp = number;

/**
 * 状态枚举
 */
export enum Status {
  Active = 1,
  Disabled = 2,
  Deleted = 3,
}

/**
 * 加载状态
 */
export interface LoadingState {
  isLoading: boolean;
  error?: Error | null;
}

/**
 * 可选字段（用于更新操作）
 */
export type Optional<T> = {
  [P in keyof T]?: T[P];
};

/**
 * 必需字段（移除可选标记）
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};
