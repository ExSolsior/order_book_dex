"use client";

import CandlestickChart from "@/components/CandleStickChart";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { useEffect } from "react";
import { Header } from "./header";
import OrderBook from "./order-book";
import Trade from "./trade";
import { PublicKey } from "@solana/web3.js";
import { useTransaction } from "@/program/utils/useTransaction";

export default function Page({ params }: { params: { marketId: string } }) {

  const { data: market, marketOrder } = useTransaction(
    new PublicKey(params.marketId),
  );

  useEffect(() => {
    if (market !== null && market!.orderBook!.accounts.marketId) {

      document.title = `${market!.orderBook!.marketDetails.ticker} - ${siteConfig.name}`;
    }
  }, [market]);

  if (market === null) return <>{"LOADING"}</>;
  const { candles } = market;

  return (
    <div className="h-full">
      <div className="py-2">
        <Header market={market} />
      </div>
      <Separator />
      <div className="flex">
        <CandlestickChart data={candles!} />
        <OrderBook market={market} />
        <Trade
          market={market}
          marketOrder={marketOrder}
        />
      </div>
    </div>
  );
}
