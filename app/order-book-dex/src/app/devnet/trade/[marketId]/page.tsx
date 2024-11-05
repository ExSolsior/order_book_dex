"use client";

import CandlestickChart from "@/components/CandleStickChart";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { useContext, useEffect } from "react";
import { Header } from "./header";
import OrderBook from "./order-book";
import Trade from "./trade";
import { PublicKey } from "@solana/web3.js";
import { useTransaction } from "@/program/utils/useTransaction";
import { ProgramContext } from "@/program/ProgramProvider";

export default function Page({ params }: { params: { marketId: string } }) {

  let programContext = useContext(ProgramContext)

  // how to resove this?
  // programContext will be null
  // but can't be null when using useTransaction...
  if (!programContext) {
    return <>{"loading"}</>
  }

  const { data: market, marketOrder } = useTransaction(
    new PublicKey(params.marketId),
  );

  useEffect(() => {
    if (market !== null && market.orderBook.accounts.marketId) {

      document.title = `${market.orderBook.marketDetails.ticker} - ${siteConfig.name}`;
    }
  }, [market]);

  if (market === null) return;
  const { candles } = market;

  return (
    <div className="h-full">
      <div className="py-2">
        <Header market={market} />
      </div>
      <Separator />
      <div className="flex">
        <CandlestickChart data={candles} />
        <OrderBook market={market} />
        <Trade
          market={market}
          marketOrder={marketOrder}
        />
      </div>
    </div>
  );
}
