"use client"
import { OrderData } from "./data-table";
// import { AvatarImage } from "@/components/ui/avatar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Column, ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { displayValue } from "@/program/utils/helper";

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

export const columns: ColumnDef<OrderData>[] = [
  {
    accessorKey: "tokenA",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Pair"
      />
    ),
    cell: ({ row }) => {
      return (
        <Link href={`/trade/${row.original.positionId}`}>
          <div className="text-left font-semibold flex items-center gap-2">
            <Avatar className="h-5 w-5">
              {/* <AvatarImage
                src={row.original.tokenAImage}
                alt={row.original.tokenA}

                TOKEN IMAGE: Will have to be handled properly
              /> */} 
            </Avatar>
            <span>{row.original.ticker}</span>
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
          className={`text-center font-mono font-bold ${row.original.orderType === "bid" ? "text-green-500" : "text-red-500"}`}
        >
          {row.original.orderType === "bid" ? "BID" : "ASK"}
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
          <span className="ml-auto">{displayValue(row.original.amount, !row.original.isReverse ? row.original.decimalsB : row.original.decimalsA)}</span>
          <Avatar className="h-5 w-5">
            {/* <AvatarImage
              src={row.original.tokenAImage}
              alt={row.original.tokenA}

              TOKEN IMAGE: Will have to be handled properly
            /> */}
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
          <span className="ml-auto">{displayValue(row.original.price, !row.original.isReverse ? row.original.decimalsA : row.original.decimalsB)}</span>
          <Avatar className="h-5 w-5">
            {/* <AvatarImage
              src={row.original.tokenBImage}
              alt={row.original.tokenB}

              TOKEN IMAGE: Will have to be handled properly
            /> */}
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
        <div className="text-right font-semibold font-mono">{displayValue(row.original.valueUSD, 2)}</div>
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

      const time = new Date(row.original.createdAt * 1000).toLocaleString(
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
