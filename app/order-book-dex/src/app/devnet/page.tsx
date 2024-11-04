"use client"

import { MainCarousel } from "@/components/home/main-carousel";
import { Markets } from "@/components/home/markets";
import { columns } from "@/components/markets-table/columns";
import { MarketsTable } from "@/components/markets-table/data-table";
import { Market, newMarkets, popular, topGainers } from "@/lib/markets";
import { useMarkets } from "@/program/utils/useMarkets";
import { string } from "zod";

export default function Home() {
  // const allMarkets = newMarkets
  //   .concat(topGainers, popular)
  //   .sort((a, b) => b.volume - a.volume);

  let { data: allMarkets } = useMarkets()

  if (!allMarkets) return <>{"LOADING..."}</>

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
              volume: Number(data.status.volume),
              image: "",
            } as Market
          })}
        />
      </div>
    </div>
  );
}
