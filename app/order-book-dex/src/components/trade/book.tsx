"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Market, Order } from "../../program/utils/useTransaction";

// need to set to correct locale string for bids and asks
// last price needs to be updated to reflect token currency correctly
// decimlas need to correctly factored based on reverse and other conditions
// need to implement better number formatting with the most cost effective way.
export default function Book({ market }: { market: Market }) {

  const {
    decimalsA,
    // decimalsB 
  } = market.orderBook.marketDetails;
  const { lastPrice } = market.orderBook.marketData;
  const { feedData: asks } = market.orderBook.asks;
  const { feedData: bids } = market.orderBook.bids;

  return (
    <>
      <Table>
        <BookHeader market={market} />
        <TableBody>
          {asks.values().toArray().reverse().map((ask: Order) => (
            <TableRow
              key={ask.price}
              className="text-xs"
            >
              <TableCell className="text-red-500 font-mono">
                {/* {ask.price.toLocaleString()} */}
                {(Number(ask.price.toString()) / 10 ** decimalsA).toFixed(decimalsA)}

              </TableCell>
              <TableCell className="text-right font-mono">
                {/* {ask.size.toLocaleString()} */}
                {(Number(ask.size.toString()) / 10 ** decimalsA).toFixed(decimalsA)}

              </TableCell>
              <TableCell className="text-right font-mono">
                {/* {ask.depth.toLocaleString()} */}
                {/* {(ask.depth * ask.price).toLocaleString()} */}
                {(Number((ask.depth * ask.price).toString()) / 10 ** decimalsA).toFixed(decimalsA)}

              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="font-mono font-semibold px-2 py-1 border-t-2 border-b-2 text-green-500">
        {lastPrice.toLocaleString('en-US', {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 2,
          maximumFractionDigits: 10
        })}
      </div>

      <Table>
        <BookHeader market={market} />
        <TableBody>
          {bids.values().toArray().map((bid: Order) => (
            <TableRow
              key={bid.price.toLocaleString()}
              className="text-xs"
            >
              <TableCell className="text-green-500 font-mono">
                {/* {bid.price.toLocaleString()} */}
                {(Number(bid.price.toString()) / 10 ** decimalsA).toFixed(decimalsA)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {/* {bid.size.toLocaleString()} */}
                {(Number(bid.size.toString()) / 10 ** decimalsA).toFixed(decimalsA)}

              </TableCell>
              <TableCell className="text-right font-mono">
                {/* {bid.depth.toLocaleString()} */}
                {/* {(bid.depth * bid.price).toLocaleString()} */}
                {(Number((bid.depth * bid.price).toString()) / 10 ** decimalsA).toFixed(decimalsA)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function BookHeader({ market }: { market: Market }) {
  const { symbolA, symbolB, isReverse } = market.orderBook.marketDetails;

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="text-xs">Price ({isReverse ? symbolA : symbolB})</TableHead>
        <TableHead className="text-xs text-right">
          Size ({isReverse ? symbolB : symbolA})
        </TableHead>
        <TableHead className="text-xs text-right">
          Total ({isReverse ? symbolA : symbolB})
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
