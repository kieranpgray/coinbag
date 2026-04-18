import * as React from 'react';
import { cn } from '@/lib/utils';

const DataTableVariantContext = React.createContext<'default' | 'ds'>('default');

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** DS v2 “Table — full” from design-system-v2.html (#data-display-extended) */
  variant?: 'default' | 'ds';
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const isDs = variant === 'ds';
    const table = (
      <table
        ref={ref}
        className={cn(
          'w-full text-body',
          !isDs && 'caption-bottom',
          isDs && 'data-table',
          className
        )}
        {...props}
      />
    );

    if (isDs) {
      return (
        <DataTableVariantContext.Provider value="ds">
          <div className="ds-table-outer relative w-full">{table}</div>
        </DataTableVariantContext.Provider>
      );
    }

    return (
      <div className="relative w-full overflow-auto">
        {table}
      </div>
    );
  }
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const tableVariant = React.useContext(DataTableVariantContext);
  const isDs = tableVariant === 'ds';
  return (
    <thead
      ref={ref}
      className={cn(!isDs && 'bg-[var(--paper-2)] [&_tr]:border-b', className)}
      {...props}
    />
  );
});
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  const tableVariant = React.useContext(DataTableVariantContext);
  const isDs = tableVariant === 'ds';
  return (
    <tbody
      ref={ref}
      className={cn(!isDs && '[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
});
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => {
  const tableVariant = React.useContext(DataTableVariantContext);
  const isDs = tableVariant === 'ds';
  return (
    <tr
      ref={ref}
      className={cn(
        isDs
          ? 'border-0'
          : 'border-b border-border transition-colors hover:bg-[var(--paper)] data-[state=selected]:bg-muted/40',
        className
      )}
      {...props}
    />
  );
});
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const tableVariant = React.useContext(DataTableVariantContext);
  const isDs = tableVariant === 'ds';
  return (
    <th
      ref={ref}
      className={cn(
        !isDs &&
          'h-12 px-4 text-left align-middle text-[12px] font-medium uppercase tracking-[0.04em] text-[color:var(--ink-3)] [&:has([role=checkbox])]:pr-0',
        isDs && 'align-middle [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  );
});
TableHead.displayName = 'TableHead';

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Right-align and use tabular figures for numeric columns (default variant only; DS tables use class `num` on td) */
  numeric?: boolean;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, numeric, ...props }, ref) => {
    const tableVariant = React.useContext(DataTableVariantContext);
    const isDs = tableVariant === 'ds';
    return (
      <td
        ref={ref}
        className={cn(
          !isDs && 'p-4 align-middle [&:has([role=checkbox])]:pr-0',
          isDs && 'align-middle [&:has([role=checkbox])]:pr-0',
          !isDs && numeric && 'text-right tabular-nums',
          className
        )}
        {...props}
      />
    );
  }
);
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('mt-4 text-body text-muted-foreground', className)} {...props} />
));
TableCaption.displayName = 'TableCaption';

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
