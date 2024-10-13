import { MarketDetails } from "@/components/trade/market-details";
import { MarketSwitcher } from "@/components/trade/market-switcher";
import { Market, newMarkets, popular, topGainers } from "@/lib/markets";

export default function MarketPage({
  params
}: {
  params: { marketId: string };
}) {
  const allMarkets = newMarkets.concat(topGainers, popular);
  const market =
    allMarkets.find((market) => market.marketId === params.marketId) ||
    allMarkets[0];

  return (
    <div className="container space-y-6">
      <div className="flex">
        <MarketDetails market={market} />
      </div>
    </div>
  );
}
