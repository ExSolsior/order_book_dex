import { Separator } from "@/components/ui/separator";
import { newMarkets, popular, topGainers } from "@/lib/markets";
import { Header } from "./header";
import OrderBook from "./order-book";
import Trade from "./trade";
import MarketDetails from "./market-details";

export default function Page({ params }: { params: { marketId: string } }) {
  const allMarkets = newMarkets.concat(topGainers, popular);
  const market =
    allMarkets.find((market) => market.marketId === params.marketId) ||
    allMarkets[0];

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
