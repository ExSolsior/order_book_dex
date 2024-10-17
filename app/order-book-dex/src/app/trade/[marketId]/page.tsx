"use client";

import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { newMarkets, popular, topGainers } from "@/lib/markets";
import { useEffect } from "react";
import { Header } from "./header";
import MarketDetails from "./market-details";
import OrderBook from "./order-book";
import Trade from "./trade";

export default function Page({ params }: { params: { marketId: string } }) {
  const allMarkets = newMarkets.concat(topGainers, popular);
  const market =
    allMarkets.find((market) => market.marketId === params.marketId) ||
    allMarkets[0];

  useEffect(() => {
    if (market.marketId) {
      document.title = `${market.tokenA}/${market.tokenB} - ${siteConfig.name}`;
    }
  }, [market]);

  return (
    <>
      <div className="py-2">
        <Header market={market} />
      </div>
      <Separator />
      <div className="flex">
        <OrderBook market={market} />
        <Trade market={market} />
        <MarketDetails market={market} />
      </div>
    </>
  );
}
