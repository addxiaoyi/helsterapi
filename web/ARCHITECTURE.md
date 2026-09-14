# 前端架构优化文档

## 概述

本文档描述了新的前端架构设计，旨在解决层级混乱和设计不统一的问题。

## 架构层级

新架构采用清晰的三层结构：

```
src/
├── layers/
│   ├── data/          # 数据层
│   ├── ui/            # UI 层
│   └── shared/        # 共享层
└── pages/             # 页面层
```

### 1. 数据层 (Data Layer)

**职责**：管理所有数据获取、缓存和状态管理

**目录结构**：
```
data/
├── types/            # TypeScript 类型定义
├── queries/          # React Query hooks
├── services/         # API 服务
└── index.ts          # 统一导出
```

**使用示例**：
```typescript
import { useUsers, useDeleteUser } from '../layers/data/queries';

const { data, isLoading } = useUsers({ page: 1 });
```

### 2. UI 层 (UI Layer)

**职责**：提供统一的设计系统和基础组件

**目录结构**：
```
ui/
├── components/       # 基础组件
├── styles/           # CVA 样式变体
└── index.ts          # 统一导出
```

**核心组件**：
- Button - 按钮（多种变体）
- Card - 卡片容器
- Input - 输入框
- Badge - 徽章/标签
- Alert - 警告提示
- Table - 表格系统
- Skeleton - 骨架屏
- Modal - 模态框

**使用示例**：
```typescript
import { Button, Card, Badge } from '../layers/ui';

<Button variant="primary" size="lg">
  提交
</Button>
```

### 3. 共享层 (Shared Layer)

**职责**：提供工具函数、常量和类型工具

**目录结构**：
```
shared/
├── utils/            # 工具函数
├── constants/        # 常量定义
└── types/            # 通用类型
```

### 4. 页面层 (Pages Layer)

**职责**：组合数据层和 UI 层，实现具体业务逻辑

**规则**：
- 只能导入 `layers/*` 中的模块
- 不能直接操作 API
- 不能包含基础组件定义

## 设计系统

### 设计 Token

使用 CSS 自定义属性定义设计 token：

```css
:root {
  /* 色阶 - 从深到浅的表面色 */
  --surface-1: #05070C;
  --surface-2: #0A0D12;
  --surface-3: #0F131C;
  --surface-4: #161D2B;
  --surface-5: #1E2636;
  
  /* 主题色 */
  --accent: #38BDF8;
  --accent-muted: #0891B2;
  
  /* 文本色 */
  --text: #FFFFFF;
  --text-muted: rgba(255, 255, 255, 0.6);
  
  /* 边框 */
  --border: rgba(255, 255, 255, 0.1);
  
  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 999px;
  
  /* 间距 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* 字体 */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'SF Mono', Monaco, monospace;
  --font-display: 'Inter', sans-serif;
}
```

### CVA 样式变体

所有组件使用 CVA (Class Variance Authority) 定义样式变体：

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-[var(--radius-full)]',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--accent)] text-white',
        secondary: 'bg-[var(--surface-3)] text-[var(--text)]',
        outline: 'border border-[var(--border)]',
        ghost: 'hover:bg-[var(--surface-2)]',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);
```

## 迁移指南

### 步骤 1：理解新架构

阅读本文档，理解三层架构的职责分离。

### 步骤 2：创建数据层

为现有页面创建对应的 query hooks：

```typescript
// layers/data/queries/useUsers.ts
export function useUsers(params: UsersParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api.users(params),
  });
}
```

### 步骤 3：使用统一组件

替换页面中的自定义组件为 UI 层组件：

**之前**：
```tsx
<button className="custom-btn">提交</button>
```

**之后**：
```tsx
<Button variant="primary">提交</Button>
```

### 步骤 4：移除直接 API 调用

**之前**：
```tsx
const [users, setUsers] = useState([]);
useEffect(() => {
  api.users().then(setUsers);
}, []);
```

**之后**：
```tsx
const { data: users } = useUsers({ page: 1 });
```

### 步骤 5：使用设计 Token

**之前**：
```css
.card {
  background: #0F131C;
  border: 1px solid rgba(255,255,255,0.1);
}
```

**之后**：
```css
.card {
  background: var(--surface-3);
  border: 1px solid var(--border);
}
```

## 示例对比

### 旧代码
```tsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.users().then(data => {
      setUsers(data.items);
      setLoading(false);
    });
  }, []);
  
  return (
    <div className="custom-container">
      <button className="custom-btn-primary">
        添加用户
      </button>
      {/* 自定义表格 */}
    </div>
  );
}
```

### 新代码
```tsx
import { Button, Table, Card } from '../layers/ui';
import { useUsers } from '../layers/data/queries';

export default function Users() {
  const { data, isLoading } = useUsers({ page: 1 });
  
  return (
    <div className="min-h-screen bg-[var(--surface-1)] p-6">
      <Button variant="primary">
        添加用户
      </Button>
      <Card>
        <Table>
          {/* 统一表格组件 */}
        </Table>
      </Card>
    </div>
  );
}
```

## 优势

### 1. 层级清晰
- 每层职责明确
- 依赖关系单向（Pages → UI/Data → Shared）
- 易于理解和维护

### 2. 设计统一
- 统一的设计 token
- 统一的组件库
- 统一的样式系统

### 3. 可维护性
- 组件复用率高
- 修改影响范围小
- 测试更容易

### 4. 性能优化
- React Query 自动缓存
- 减少重复请求
- 统一的 loading 状态

### 5. 开发效率
- 组件开箱即用
- 减少样式代码
- 类型安全

## 最佳实践

### 1. 导入顺序
```typescript
// 1. React 和第三方库
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. UI 层
import { Button, Card } from '../layers/ui';

// 3. 数据层
import { useUsers } from '../layers/data/queries';

// 4. 共享层
import { cn } from '../layers/shared/utils';

// 5. 相对导入
import { UserForm } from './components/UserForm';
```

### 2. 组件命名
- 页面组件：`UsersPage`, `DashboardPage`
- UI 组件：`Button`, `Card`, `Modal`
- Query hooks：`useUsers`, `useDeleteUser`

### 3. 类型定义
- 数据类型：放在 `layers/data/types`
- UI 组件 props：放在组件文件中
- 共享类型：放在 `layers/shared/types`

### 4. 样式编写
- 优先使用设计 token
- 使用 Tailwind 工具类
- 避免硬编码颜色值

## 下一步

1. 完成 Users 页面的完整重构
2. 逐步迁移其他页面
3. 完善组件库
4. 编写组件文档和 Storybook
5. 建立代码审查规范

## 参考

- [React Query 文档](https://tanstack.com/query/latest)
- [CVA 文档](https://cva.style/docs)
- [Tailwind CSS](https://tailwindcss.com)
