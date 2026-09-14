/**
 * Table 组件
 * 统一的表格组件
 */

import React from 'react';
import { tableVariants } from '../../styles';
import { cn } from '../../../shared/utils';

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="w-full overflow-auto">
        <table
          className={cn(tableVariants.table, className)}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

Table.displayName = 'Table';

/**
 * TableHeader 组件
 */
export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, ...props }, ref) => {
  return (
    <thead
      className={cn(tableVariants.header, className)}
      ref={ref}
      {...props}
    />
  );
});

TableHeader.displayName = 'TableHeader';

/**
 * TableBody 组件
 */
export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(({ className, ...props }, ref) => {
  return <tbody className={cn(className)} ref={ref} {...props} />;
});

TableBody.displayName = 'TableBody';

/**
 * TableRow 组件
 */
export interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, ...props }, ref) => {
    return (
      <tr
        className={cn(tableVariants.row, className)}
        ref={ref}
        {...props}
      />
    );
  }
);

TableRow.displayName = 'TableRow';

/**
 * TableHead 组件
 */
export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  TableHeadProps
>(({ className, ...props }, ref) => {
  return (
    <th
      className={cn(tableVariants.headerCell, className)}
      ref={ref}
      {...props}
    />
  );
});

TableHead.displayName = 'TableHead';

/**
 * TableCell 组件
 */
export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  TableCellProps
>(({ className, ...props }, ref) => {
  return (
    <td
      className={cn(tableVariants.cell, className)}
      ref={ref}
      {...props}
    />
  );
});

TableCell.displayName = 'TableCell';
