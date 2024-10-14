"use client";

import { Market } from "@/lib/markets";
import { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage } from "../ui/avatar";
import Link from "next/link";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }
  return (
    <Button
      variant="ghost"
      className="text-right font-semibold"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

export const columns: ColumnDef<Market>[] = [
  {
    accessorKey: "tokenA",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Market"
      />
    ),
    cell: ({ row }) => {
      const name = `${row.original.tokenA} / ${row.original.tokenB}`;
      return (
        <Link href={`/trade/${row.original.marketId}`}>
          <div className="text-left font-semibold flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={row.original.image}
                alt={row.original.tokenA}
              />
            </Avatar>
            <span>{name}</span>
          </div>
        </Link>
      );
    }
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Price"
      />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 10
      }).format(amount);

      return <div className="text-right font-semibold">{formatted}</div>;
    }
  },
  {
    accessorKey: "change",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="24h Change"
      />
    ),
    cell: ({ row }) => {
      return (
        <div
          className={`text-right font-semibold ${
            row.original.change < 0 ? "text-red-500" : "text-green-500"
          }`}
        >
          {row.original.change}%
        </div>
      );
    }
  },
  {
    accessorKey: "volume",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="24h Volume"
      />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("volume"));
      let formatted;
      if (amount >= 1_000_000) {
        formatted = (amount / 1_000_000).toFixed(2) + "M";
      } else if (amount >= 1_000) {
        formatted = (amount / 1_000).toFixed(2) + "K";
      } else {
        formatted = amount.toFixed(2);
      }

      return <div className="text-right font-semibold">{formatted}</div>;
    }
  }
];