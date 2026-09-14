/**
 * Design Tokens - 设计系统变量定义
 * 定义颜色、间距、字体等设计 token，通过 CSS 变量暴露
 */

/**
 * 颜色系统
 */
export const colors = {
  // 主色调
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  // 中性色
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  // 成功色
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  // 警告色
  warning: {
    50: '#fefce8',
    100: '#fef9c3',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
  },
  // 错误色
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  // 信息色
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
  },
};

/**
 * 间距系统（基于 4px 网格）
 */
export const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
  32: '8rem',    // 128px
};

/**
 * 圆角系统
 */
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
};

/**
 * 字体系统
 */
export const fonts = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
};

/**
 * 字体大小
 */
export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
  sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
  base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
  xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
};

/**
 * 字重
 */
export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

/**
 * 阴影系统
 */
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  none: 'none',
};

/**
 * Z-index 层级
 */
export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

/**
 * 断点系统
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

/**
 * 过渡动画
 */
export const transitions = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
};

/**
 * 生成 CSS 变量
 */
export function generateCSSVariables(): string {
  return `
    :root {
      /* 颜色 */
      --color-primary-50: ${colors.primary[50]};
      --color-primary-100: ${colors.primary[100]};
      --color-primary-500: ${colors.primary[500]};
      --color-primary-600: ${colors.primary[600]};
      --color-primary-700: ${colors.primary[700]};

      --color-gray-50: ${colors.gray[50]};
      --color-gray-100: ${colors.gray[100]};
      --color-gray-200: ${colors.gray[200]};
      --color-gray-300: ${colors.gray[300]};
      --color-gray-500: ${colors.gray[500]};
      --color-gray-600: ${colors.gray[600]};
      --color-gray-700: ${colors.gray[700]};
      --color-gray-800: ${colors.gray[800]};
      --color-gray-900: ${colors.gray[900]};

      --color-success-500: ${colors.success[500]};
      --color-warning-500: ${colors.warning[500]};
      --color-danger-500: ${colors.danger[500]};
      --color-info-500: ${colors.info[500]};

      /* 间距 */
      --spacing-1: ${spacing[1]};
      --spacing-2: ${spacing[2]};
      --spacing-3: ${spacing[3]};
      --spacing-4: ${spacing[4]};
      --spacing-6: ${spacing[6]};
      --spacing-8: ${spacing[8]};

      /* 圆角 */
      --radius-sm: ${borderRadius.sm};
      --radius-md: ${borderRadius.md};
      --radius-lg: ${borderRadius.lg};
      --radius-xl: ${borderRadius.xl};
      --radius-2xl: ${borderRadius['2xl']};
      --radius-full: ${borderRadius.full};

      /* 字体 */
      --font-sans: ${fonts.sans};
      --font-mono: ${fonts.mono};

      /* 阴影 */
      --shadow-sm: ${shadows.sm};
      --shadow-md: ${shadows.md};
      --shadow-lg: ${shadows.lg};
      --shadow-xl: ${shadows.xl};

      /* 过渡 */
      --transition-fast: ${transitions.fast};
      --transition-base: ${transitions.base};
      --transition-slow: ${transitions.slow};
    }
  `;
}

/**
 * 导出所有 tokens
 */
export const tokens = {
  colors,
  spacing,
  borderRadius,
  fonts,
  fontSize,
  fontWeight,
  shadows,
  zIndex,
  breakpoints,
  transitions,
  generateCSSVariables,
};
