"use client";

import { Market } from "@/lib/markets";
import { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { OpenOrder } from "@/app/portfolio/open-orders";

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
      className={cn("font-semibold flex", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

export const columns: ColumnDef<OpenOrder>[] = [
  {
    accessorKey: "tokenA",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Pair"
      />
    ),
    cell: ({ row }) => {
      const name = `${row.original.tokenA} / ${row.original.tokenB}`;
      return (
        <Link href={`/trade/${row.original.marketId}`}>
          <div className="text-left font-semibold flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={row.original.tokenAImage}
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
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Type"
        className="mx-auto"
      />
    ),
    cell: ({ row }) => {
      return (
        <div
          className={`text-center font-mono font-bold ${row.original.type === "buy" ? "text-green-500" : "text-red-500"}`}
        >
          {row.original.type === "buy" ? "BUY" : "SELL"}
        </div>
      );
    }
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Amount"
        className="ml-auto"
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-right font-semibold font-mono flex items-center gap-1">
          <span className="ml-auto">{row.original.amount}</span>
          <Avatar className="h-5 w-5">
            <AvatarImage
              src={row.original.tokenAImage}
              alt={row.original.tokenA}
            />
          </Avatar>
        </div>
      );
    }
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Price"
        className="ml-auto"
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="text-right font-semibold font-mono flex items-center gap-1">
          <span className="ml-auto">{row.original.price}</span>
          <Avatar className="h-5 w-5">
            <AvatarImage
              src={row.original.tokenBImage}
              alt={row.original.tokenB}
            />
          </Avatar>
        </div>
      );
    }
  },
  {
    accessorKey: "usd_value",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Value USD"
        className="ml-auto"
      />
    ),
    cell: ({ row }) => {
      const usd_value = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 10
      }).format(parseFloat(row.getValue("usd_value")));

      return (
        <div className="text-right font-semibold font-mono">{usd_value}</div>
      );
    }
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Created"
        className="ml-auto"
      />
    ),
    cell: ({ row }) => {
      //   const amount = parseFloat(row.getValue("createdAt"));
      //   let formatted;
      //   if (amount >= 1_000_000) {
      //     formatted = (amount / 1_000_000).toFixed(2) + "M";
      //   } else if (amount >= 1_000) {
      //     formatted = (amount / 1_000).toFixed(2) + "K";
      //   } else {
      //     formatted = amount.toFixed(2);
      //   }

      let time = new Date(row.original.createdAt * 1000).toLocaleString(
        "en-US",
        {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }
      );

      return <div className="text-right font-semibold">{time}</div>;
    }
  }
];
