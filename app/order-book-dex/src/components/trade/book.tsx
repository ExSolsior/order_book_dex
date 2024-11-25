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
import { displayValue } from "@/program/utils/helper";

// need to set to correct locale string for bids and asks
// last price needs to be updated to reflect token currency correctly
// decimlas need to correctly factored based on reverse and other conditions
// need to implement better number formatting with the most cost effective way.
export default function Book({ market }: { market: Market | null }) {

  if (market === null || market.orderBook === undefined) {
    return <>{"LOADING"}</>
  }

  const {
    decimalsA,
    decimalsB,
    symbolA,
    symbolB,
    isReverse,
  } = market!.orderBook!.marketDetails;
  const { lastPrice } = market!.orderBook!.marketData;
  const { feedData: asks } = market!.orderBook!.asks;
  const { feedData: bids } = market!.orderBook!.bids;

  // not sure if this is correct, will know when there is a difference in decimals
  const ticerPrice = displayValue(lastPrice, (isReverse ? decimalsB : decimalsA));
  const tickerSymbol = isReverse ? symbolB : symbolA

  return (
    <>
      <Table>
        <BookHeader market={market} />
        <TableBody>
          {asks.values().toArray().reverse().map((ask: Order) => (
            <TableRow
              key={ask.id}
              className="text-xs"
            >
              <TableCell className="text-red-500 font-mono">
                {displayValue(ask.price, !isReverse ? decimalsA : decimalsB)}

              </TableCell>
              <TableCell className="text-right font-mono">
                {displayValue(ask.size, !isReverse ? decimalsB : decimalsA)}

              </TableCell>
              <TableCell className="text-right font-mono">
                {displayValue(ask.depth, !isReverse ? decimalsB : decimalsA)}

              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="font-mono font-semibold px-2 py-1 border-t-2 border-b-2 text-green-500">
        {/* should include currency symbol some how*/}
        {tickerSymbol === "USDC" ? "$" : ""} {ticerPrice}
      </div>

      <Table>
        <BookHeader market={market} />
        <TableBody>
          {bids.values().toArray().map((bid: Order) => (
            <TableRow
              key={bid.id}
              className="text-xs"
            >
              <TableCell className="text-green-500 font-mono">
                {displayValue(bid.price, !isReverse ? decimalsA : decimalsB)}

              </TableCell>
              <TableCell className="text-right font-mono">
                {displayValue(bid.size, !isReverse ? decimalsB : decimalsA)}


              </TableCell>
              <TableCell className="text-right font-mono">
                {displayValue(bid.depth, !isReverse ? decimalsB : decimalsA)}

              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

function BookHeader({ market }: { market: Market }) {
  const { symbolA, symbolB, isReverse } = market!.orderBook!.marketDetails;

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="text-xs">Price ({!isReverse ? symbolA : symbolB})</TableHead>
        <TableHead className="text-xs text-right">
          Size ({!isReverse ? symbolB : symbolA})
        </TableHead>
        <TableHead className="text-xs text-right">
          Total ({!isReverse ? symbolB : symbolA})
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
