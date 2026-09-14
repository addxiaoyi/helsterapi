import { type VariantProps, cva } from 'class-variance-authority';

/**
 * Button 变体定义
 */
export const buttonVariants = cva(
  // 基础样式
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
        success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600',
        outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-100 focus-visible:ring-gray-500 dark:border-gray-600 dark:hover:bg-gray-800',
        ghost: 'bg-transparent hover:bg-gray-100 focus-visible:ring-gray-500 dark:hover:bg-gray-800',
        link: 'bg-transparent underline-offset-4 hover:underline text-blue-600 dark:text-blue-400',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

/**
 * Badge 变体定义
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100',
        primary: 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-300',
        success: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300',
        warning: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300',
        danger: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-300',
        outline: 'border border-gray-300 bg-transparent dark:border-gray-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;

/**
 * Card 变体定义
 */
export const cardVariants = cva(
  'rounded-2xl border transition-all',
  {
    variants: {
      variant: {
        default: 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        elevated: 'bg-white border-gray-200 shadow-lg dark:bg-gray-800 dark:border-gray-700',
        outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600',
        ghost: 'bg-transparent border-transparent',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99]',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export type CardVariants = VariantProps<typeof cardVariants>;

/**
 * Input 变体定义
 */
export const inputVariants = cva(
  'flex w-full rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-300 focus-visible:border-blue-500 focus-visible:ring-blue-500 dark:border-gray-600',
        error: 'border-red-500 focus-visible:ring-red-500',
      },
      size: {
        sm: 'h-8 text-xs',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type InputVariants = VariantProps<typeof inputVariants>;

/**
 * Alert 变体定义
 */
export const alertVariants = cva(
  'relative flex gap-3 rounded-lg border p-4',
  {
    variants: {
      variant: {
        info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
        success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
        error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

export type AlertVariants = VariantProps<typeof alertVariants>;

/**
 * Skeleton 变体定义
 */
export const skeletonVariants = cva(
  'animate-pulse rounded bg-gray-200 dark:bg-gray-700',
  {
    variants: {
      variant: {
        text: 'h-4',
        title: 'h-6',
        button: 'h-10',
        avatar: 'h-10 w-10 rounded-full',
        card: 'h-32',
      },
    },
    defaultVariants: {
      variant: 'text',
    },
  }
);

export type SkeletonVariants = VariantProps<typeof skeletonVariants>;

/**
 * Table 变体定义
 */
export const tableVariants = {
  table: 'w-full border-collapse',
  header: 'bg-gray-50 dark:bg-gray-800',
  headerCell: 'px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-gray-300',
  row: 'border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50 transition-colors',
  cell: 'px-6 py-4 text-sm text-gray-900 dark:text-gray-100',
};

/**
 * Modal 变体定义
 */
export const modalVariants = {
  overlay: 'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
  content: 'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800',
  header: 'mb-4 flex items-start justify-between',
  title: 'text-lg font-semibold text-gray-900 dark:text-gray-100',
  close: 'rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
  body: 'text-sm text-gray-700 dark:text-gray-300',
  footer: 'mt-6 flex justify-end gap-3',
};

/**
 * Tabs 变体定义
 */
export const tabsVariants = {
  root: 'w-full',
  list: 'flex gap-1 border-b border-gray-200 dark:border-gray-700',
  trigger: 'px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 transition-colors',
  content: 'mt-4',
};

/**
 * Dropdown 变体定义
 */
export const dropdownVariants = {
  trigger: 'inline-flex items-center justify-center gap-2',
  content: 'z-50 min-w-[8rem] overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800',
  item: 'relative flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 dark:hover:bg-gray-700 dark:focus:bg-gray-700',
  separator: 'my-1 h-px bg-gray-200 dark:bg-gray-700',
};

/**
 * Tooltip 变体定义
 */
export const tooltipVariants = {
  content: 'z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 dark:bg-gray-700',
  arrow: 'fill-gray-900 dark:fill-gray-700',
};

/**
 * Switch 变体定义
 */
export const switchVariants = cva(
  'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type SwitchVariants = VariantProps<typeof switchVariants>;

/**
 * Checkbox 变体定义
 */
export const checkboxVariants = cva(
  'peer h-5 w-5 shrink-0 rounded border-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 focus-visible:ring-blue-600 dark:border-gray-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type CheckboxVariants = VariantProps<typeof checkboxVariants>;
