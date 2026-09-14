/**
 * Skeleton 组件
 * 统一的骨架屏组件
 */

import React from 'react';
import { skeletonVariants, type SkeletonVariants } from '../../styles';
import { cn } from '../../../shared/utils';

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    SkeletonVariants {
  count?: number;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, count = 1, ...props }, ref) => {
    if (count > 1) {
      return (
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className={cn(skeletonVariants({ variant }), className)}
              {...props}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        className={cn(skeletonVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';
