"use client"

import { MainCarousel } from "@/components/home/main-carousel";
import { Markets } from "@/components/home/markets";
import { columns } from "@/components/markets-table/columns";
import { MarketsTable } from "@/components/markets-table/data-table";
import { MarketContext } from "@/components/provider/market-provider";
import { Market } from "@/lib/markets";
import { useContext } from "react";

export default function Home() {
  const allMarkets = useContext(MarketContext)

  return (
    <div className="container space-y-6">
      <MainCarousel />
      <Markets />
      <div className="container">
        <MarketsTable
          columns={columns}
          data={allMarkets!.map(data => {
            return {
              marketId: data.accounts.marketId.toString(),
              // baseToken
              tokenA: data.details.baseToken.symbol,
              tokenB: data.details.quoteToken.symbol,
              price: Number(data.status.lastPrice.toString()),
              change: Number(data.status.changePercent.toString()),
              turnover: Number(data.status.turnover.toString()),
              volume: Number(data.status.volume),
              image: "",
            } as Market
          })}
        />
      </div>
    </div>
  );
}
