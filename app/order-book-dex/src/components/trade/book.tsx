"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Market } from "@/lib/markets";
import { orders } from "@/lib/orders";

export default function Book({ market }: { market: Market }) {
  const sells = orders
    .filter((order) => order.action === "sell")
    .sort((a, b) => b.price - a.price)
    .slice(0, 5);
  const buys = orders
    .filter((order) => order.action === "buy")
    .sort((a, b) => b.price - a.price)
    .slice(0, 5);

  return (
    <>
      <Table>
        <BookHeader market={market} />
        <TableBody>
          {sells.map((sell) => (
            <TableRow key={sell.price}>
              <TableCell className="text-red-500 font-mono">
                {sell.price}
              </TableCell>
              <TableCell className="text-right font-mono">
                {sell.size}
              </TableCell>
              <TableCell className="text-right font-mono">
                {sells
                  .slice(sells.indexOf(sell), sells.length)
                  .reduce((acc, curr) => acc + curr.size, 0)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="text-lg	font-mono font-semibold px-2 py-1 border-t-2 border-b-2 text-green-500">
        {market.price}
      </div>

      <Table>
        <BookHeader market={market} />
        <TableBody>
          {buys.map((buy) => (
            <TableRow key={buy.price}>
              <TableCell className="text-green-500 font-mono">
                {buy.price}
              </TableCell>
              <TableCell className="text-right font-mono">{buy.size}</TableCell>
              <TableCell className="text-right font-mono">
                {buys
                  .slice(0, buys.indexOf(buy) + 1)
                  .reduce((acc, curr) => acc + curr.size, 0)
                  .toFixed(4)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function BookHeader({ market }: { market: Market }) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="font-semibold">Price ({market.tokenB})</TableHead>
        <TableHead className="font-semibold text-right">
          Size ({market.tokenA})
        </TableHead>
        <TableHead className="font-semibold text-right">
          Total ({market.tokenA})
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
