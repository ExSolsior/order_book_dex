"use client"

import { MainCarousel } from "@/components/home/main-carousel";
// not using, will probably remove, needs review, but is not significant now
// import { Markets } from "@/components/home/markets";
import { columns } from "@/components/markets-table/columns";
import { MarketsTable } from "@/components/markets-table/data-table";
import { MarketContext } from "@/components/provider/market-provider";
import { Market } from "@/lib/markets";
import { useContext } from "react";

export default function Home() {
  const { markets } = useContext(MarketContext)

  return (
    <div className="container space-y-6">
      <MainCarousel />
      {/* <Markets /> */}
      <div className="container">
        <MarketsTable
          columns={columns}
          data={markets!.map(data => {

            // // testing | review, to see how to compute the change
            // console.log("need to understand")
            // console.log("changeDelta", data.status.changePercent)
            // // change percent is already computed, needs to formated correctly
            // console.log("changePercent", data.status.changePercent)

            return {
              marketId: data.accounts.marketId.toString(),
              symbolA: data.details.symbolA,
              symbolB: data.details.symbolB,
              quoteSymbol: data.details.quoteToken.symbol,
              baseSymbol: data.details.baseToken.symbol,
              quoteDecimals: data.details.quoteToken.decimals,
              baseDecimals: data.details.baseToken.decimals,
              isReverse: data.details.isReverse,
              // need to format correctly in columns.tsx file
              price: data.status.lastPrice,
              // using number should be okay because the percision doesn't need to be percise
              // reference line 97, 98 -> useMarkets.ts
              change: parseInt(data.status.changePercent.toString()) / 100_000,

              turnover: data.status.turnover / BigInt(10 ** data.details.quoteToken.decimals) > BigInt(0) ?
                parseInt((data.status.turnover / BigInt(10 ** (data.details.quoteToken.decimals - 2))).toString()) / 100
                : parseInt(data.status.turnover.toString()) / 10 ** data.details.quoteToken.decimals,

              volume: data.status.volume / BigInt(10 ** data.details.baseToken.decimals) > BigInt(0) ?
                parseInt((data.status.volume / BigInt(10 ** (data.details.baseToken.decimals - 2))).toString()) / 100
                : parseInt(data.status.volume.toString()) / 10 ** data.details.baseToken.decimals,

              image: "",
            } as Market
          })}
        />
      </div>
    </div>
  );
}
