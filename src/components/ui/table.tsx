import * as React from "react"

import { cn } from "@/lib/utils"

/** When a table lives inside StickyTableScroll, the inner container must NOT
 *  create its own scroll context — an `overflow-x-auto` div computes
 *  overflow-y to auto too, which traps the sticky header inside a container
 *  that never scrolls vertically. StickyTableScroll provides this context so
 *  the outer wrapper is the single scroll container and the thead freezes. */
const TableOverflowVisibleContext = React.createContext(false)

/** Autofit mode: switch the <table> to `table-layout: auto` so columns size
 *  to their content (no fixed equal widths) — used by the facility trackers
 *  so the Facility column fits its longest name instead of a hard-coded 14rem. */
const AutoFitTableContext = React.createContext(false)

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const overflowVisible = React.useContext(TableOverflowVisibleContext)
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full",
        overflowVisible ? "overflow-visible" : "overflow-x-auto",
      )}
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-sm",
          React.useContext(AutoFitTableContext) ? "table-auto" : undefined,
          className,
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "sticky top-0 z-10 border-b bg-muted/60 backdrop-blur [&_tr]:border-b",
        className,
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/60 transition-colors hover:bg-primary/[0.045] data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  )
}

/** Wrapper that makes a table's header freeze while its body scrolls.
 *  Use instead of a bare `overflow-auto` div around a Table. */
export function StickyTableScroll({
  className,
  maxHeight = "70vh",
  minHeight,
  children,
}: {
  className?: string;
  maxHeight?: string;
  minHeight?: string;
  children: React.ReactNode;
}) {
  return (
    <TableOverflowVisibleContext.Provider value={true}>
      <div
        className={cn("overflow-auto rounded-xl border bg-background/60", className)}
        style={{ maxHeight, minHeight }}
      >
        {children}
      </div>
    </TableOverflowVisibleContext.Provider>
  )
}

/** Autofit scroll wrapper: same sticky header/scroll behavior as
 *  StickyTableScroll, but the table uses content-based (auto) column widths. */
export function AutoFitTableScroll({
  className,
  maxHeight = "70vh",
  minHeight,
  children,
}: {
  className?: string;
  maxHeight?: string;
  minHeight?: string;
  children: React.ReactNode;
}) {
  return (
    <AutoFitTableContext.Provider value={true}>
      <StickyTableScroll className={className} maxHeight={maxHeight} minHeight={minHeight}>
        {children}
      </StickyTableScroll>
    </AutoFitTableContext.Provider>
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-11 px-3 text-left align-middle text-xs font-semibold tracking-wide whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
