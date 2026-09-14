import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type { PagedResult, ApiResponse, ListQueryParams } from '../types';

/**
 * 标准化的查询 Hook 选项
 */
export interface StandardQueryOptions<TData, TError = Error>
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

/**
 * 标准化的 Mutation Hook 选项
 */
export interface StandardMutationOptions<TData, TVariables, TError = Error>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {}

/**
 * 列表查询结果
 */
export interface ListQueryResult<T> {
  data: PagedResult<T> | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * 详情查询结果
 */
export interface DetailQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Mutation 结果
 */
export interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * 创建标准列表查询 Hook
 */
export function createListQuery<T>(
  queryKey: string,
  fetchFn: (params: ListQueryParams) => Promise<PagedResult<T>>
) {
  return function useListQuery(
    params: ListQueryParams,
    options?: StandardQueryOptions<PagedResult<T>>
  ): ListQueryResult<T> {
    const { data, isLoading, isError, error, refetch } = useQuery({
      queryKey: [queryKey, params],
      queryFn: () => fetchFn(params),
      staleTime: 30000, // 30秒
      ...options,
    });

    return {
      data,
      isLoading,
      isError,
      error,
      refetch,
    };
  };
}

/**
 * 创建标准详情查询 Hook
 */
export function createDetailQuery<T>(
  queryKey: string,
  fetchFn: (id: number | string) => Promise<T>
) {
  return function useDetailQuery(
    id: number | string,
    options?: StandardQueryOptions<T>
  ): DetailQueryResult<T> {
    const { data, isLoading, isError, error, refetch } = useQuery({
      queryKey: [queryKey, id],
      queryFn: () => fetchFn(id),
      enabled: options?.enabled !== false && !!id,
      staleTime: 30000,
      ...options,
    });

    return {
      data,
      isLoading,
      isError,
      error,
      refetch,
    };
  };
}

/**
 * 创建标准创建 Mutation Hook
 */
export function createCreateMutation<TData, TVariables>(
  queryKey: string,
  createFn: (data: TVariables) => Promise<TData>,
  options?: {
    invalidateKeys?: string[];
  }
) {
  return function useCreateMutation(
    mutationOptions?: StandardMutationOptions<TData, TVariables>
  ): MutationResult<TData, TVariables> {
    const queryClient = useQueryClient();

    const mutation = useMutation({
      mutationFn: createFn,
      onSuccess: (data, variables, context) => {
        // 自动失效相关查询
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        options?.invalidateKeys?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });

        mutationOptions?.onSuccess?.(data, variables, context);
      },
      ...mutationOptions,
    });

    return {
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      isLoading: mutation.isPending,
      isError: mutation.isError,
      isSuccess: mutation.isSuccess,
      error: mutation.error,
      reset: mutation.reset,
    };
  };
}

/**
 * 创建标准更新 Mutation Hook
 */
export function createUpdateMutation<TData, TVariables>(
  queryKey: string,
  updateFn: (data: TVariables) => Promise<TData>,
  options?: {
    invalidateKeys?: string[];
  }
) {
  return function useUpdateMutation(
    mutationOptions?: StandardMutationOptions<TData, TVariables>
  ): MutationResult<TData, TVariables> {
    const queryClient = useQueryClient();

    const mutation = useMutation({
      mutationFn: updateFn,
      onSuccess: (data, variables, context) => {
        // 自动失效相关查询
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        options?.invalidateKeys?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });

        mutationOptions?.onSuccess?.(data, variables, context);
      },
      ...mutationOptions,
    });

    return {
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      isLoading: mutation.isPending,
      isError: mutation.isError,
      isSuccess: mutation.isSuccess,
      error: mutation.error,
      reset: mutation.reset,
    };
  };
}

/**
 * 创建标准删除 Mutation Hook
 */
export function createDeleteMutation<TData = void>(
  queryKey: string,
  deleteFn: (id: number | string) => Promise<TData>,
  options?: {
    invalidateKeys?: string[];
  }
) {
  return function useDeleteMutation(
    mutationOptions?: StandardMutationOptions<TData, number | string>
  ): MutationResult<TData, number | string> {
    const queryClient = useQueryClient();

    const mutation = useMutation({
      mutationFn: deleteFn,
      onSuccess: (data, variables, context) => {
        // 自动失效相关查询
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        options?.invalidateKeys?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });

        mutationOptions?.onSuccess?.(data, variables, context);
      },
      ...mutationOptions,
    });

    return {
      mutate: mutation.mutate,
      mutateAsync: mutation.mutateAsync,
      isLoading: mutation.isPending,
      isError: mutation.isError,
      isSuccess: mutation.isSuccess,
      error: mutation.error,
      reset: mutation.reset,
    };
  };
}
