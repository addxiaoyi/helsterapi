/**
 * Users 页面（重构版本）
 * 使用新的架构层级和设计系统
 */

import React, { useState } from 'react';
import { Shield, User, Wallet, Edit2, Trash2, Plus } from 'lucide-react';
import {
  Button,
  Card,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
  Modal,
} from '../layers/ui';
import { useUsers, useDeleteUser, useUpdateUser } from '../layers/data/queries';
import type { User as UserType } from '../layers/data/types';

const PAGE_SIZE = 10;

function formatUserTime(value?: number) {
  return value && value > 0 ? new Date(value * 1000).toLocaleString() : '-';
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Data hooks
  const { data, isLoading, error } = useUsers({
    page,
    search,
    pageSize: PAGE_SIZE,
  });

  const deleteUserMutation = useDeleteUser();
  const updateUserMutation = useUpdateUser();

  const users = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleDelete = async (user: UserType) => {
    if (
      !window.confirm(
        `确定永久删除 "${user.display_name || user.username}"？此操作不可恢复。`
      )
    ) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync(user.id);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleEdit = (user: UserType) => {
    setSelectedUser(user);
    setIsEditorOpen(true);
  };

  // Loading state
  if (isLoading && !users.length) {
    return (
      <div className="min-h-screen bg-[var(--surface-1)] p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <Skeleton variant="text" className="h-8 w-48" />
          <Skeleton variant="rectangular" className="h-96" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--surface-1)] p-6">
        <Card className="mx-auto max-w-2xl">
          <div className="p-8 text-center">
            <h2 className="mb-2 font-[var(--font-display)] text-2xl">
              加载失败
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {error instanceof Error ? error.message : '无法读取用户列表'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-1)] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-[var(--font-display)] text-4xl tracking-tight">
              用户注册表
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              管理账户、分组、配额和权限
            </p>
          </div>
          <Button
            onClick={() => {
              setSelectedUser(null);
              setIsEditorOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            添加用户
          </Button>
        </header>

        {/* Search */}
        <Card>
          <div className="p-4">
            <Input
              type="search"
              placeholder="按名称或邮箱查找..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>身份</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>分组</TableHead>
                <TableHead>剩余额度</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最后登录</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-3)]">
                        {user.role >= 10 ? (
                          <Shield className="h-4 w-4 text-[var(--accent)]" />
                        ) : (
                          <User className="h-4 w-4 text-[var(--text-muted)]" />
                        )}
                      </div>
                      <span className="font-medium">
                        {user.display_name || user.username}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-[var(--text-muted)]">
                      {user.email || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role >= 10 ? 'accent' : 'default'}>
                      {user.role >= 10 ? '管理员' : '用户'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{user.group || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {user.quota - user.used_quota}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.status === 1 ? 'success' : 'secondary'}
                    >
                      {user.status === 1 ? '活跃' : '已禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-[var(--text-muted)]">
                      {formatUserTime(user.last_login_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-[var(--border)] p-4">
            <p className="text-sm text-[var(--text-muted)]">
              共 {total} 个用户
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm">
                第 {page} 页 / 共 {Math.ceil(total / PAGE_SIZE)} 页
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= Math.ceil(total / PAGE_SIZE)}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Editor Modal */}
      <Modal
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={selectedUser ? '编辑用户' : '添加用户'}
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            用户编辑表单（待实现）
          </p>
        </div>
      </Modal>
    </div>
  );
}
