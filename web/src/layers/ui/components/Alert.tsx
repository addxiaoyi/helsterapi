/**
 * Alert 组件
 * 统一的警告/提示组件
 */

import React from 'react';
import { alertVariants, type AlertVariants } from '../../styles';
import { cn } from '../../../shared/utils';

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    AlertVariants {
  title?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant, title, icon, onClose, children, ...props },
    ref
  ) => {
    return (
      <div
        className={cn(alertVariants({ variant }), className)}
        ref={ref}
        role="alert"
        {...props}
      >
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1">
          {title && (
            <h5 className="mb-1 font-medium">{title}</h5>
          )}
          <div className="text-sm">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
