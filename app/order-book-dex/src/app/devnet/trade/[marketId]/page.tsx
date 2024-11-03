"use client";

import CandlestickChart from "@/components/CandleStickChart";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { newMarkets, popular, topGainers } from "@/lib/markets";
import { useEffect } from "react";
import { Header } from "./header";
import OrderBook from "./order-book";
import Trade from "./trade";
import { PublicKey } from "@solana/web3.js";
import { useTransaction } from "@/program/utils/useTransaction";

export default function Page({ params }: { params: { marketId: string } }) {
  const allMarkets = newMarkets.concat(topGainers, popular);
  // const market =
  //   allMarkets.find((market) => market.marketId === params.marketId) ||
  //   allMarkets[0];

  const { data: market } = useTransaction(
    new PublicKey("BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK"),
  );

  // useEffect(() => {
  //   if (market !== null && market.marketId) {
  //     document.title = `${market.tokenA}/${market.tokenB} - ${siteConfig.name}`;
  //   }
  // }, [market]);

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
