/**
 * Badge 组件
 * 统一的徽章组件
 */

import React from 'react';
import { badgeVariants, type BadgeVariants } from '../../styles';
import { cn } from '../../../shared/utils';

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    BadgeVariants {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { className, variant, leftIcon, rightIcon, children, ...props },
    ref
  ) => {
    return (
      <span
        className={cn(badgeVariants({ variant }), className)}
        ref={ref}
        {...props}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
