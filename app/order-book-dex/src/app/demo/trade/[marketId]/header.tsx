import { Market } from "@/lib/markets";
import { MarketSwitcher } from "./market-switcher";

export function Header({ market }: { market: Market }) {
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 10
  }).format(market.price);
  let volume;
  if (market.volume >= 1_000_000) {
    volume = (market.volume / 1_000_000).toFixed(2) + "M";
  } else if (market.volume >= 1_000) {
    volume = (market.volume / 1_000).toFixed(2) + "K";
  } else {
    volume = market.volume.toFixed(2);
  }

  return (
    <div className="flex items-center gap-7">
      <MarketSwitcher market={market} />
      <span className="text-lg font-semibold font-sans">{price}</span>
      <div className="flex flex-col items-center">
        <span className="text-sm text-muted-foreground">24H Change</span>
        <span
          className={`font-semibold font-sans ${
            market.change < 0 ? "text-red-500" : "text-green-500"
          }`}
        >
          {market.change}%
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm text-muted-foreground">24H Volume (USD)</span>
        <span className="font-semibold font-sans">{volume}</span>
      </div>
    </div>
  );
}
