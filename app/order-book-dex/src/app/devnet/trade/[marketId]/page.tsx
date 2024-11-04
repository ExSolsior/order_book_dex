"use client";

import CandlestickChart from "@/components/CandleStickChart";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { newMarkets, popular, topGainers } from "@/lib/markets";
import { useContext, useEffect } from "react";
import { Header } from "./header";
import OrderBook from "./order-book";
import Trade from "./trade";
import { PublicKey } from "@solana/web3.js";
import { useTransaction } from "@/program/utils/useTransaction";
import { ProgramContext } from "@/program/ProgramProvider";

export default function Page({ params }: { params: { marketId: string } }) {

  let programContext = useContext(ProgramContext)
  if (!programContext) {
    return <>{"loading"}</>
  }

  console.log(params)

  const { data: market } = useTransaction(
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
        <Trade market={market} />
      </div>
    </div>
  );
}
