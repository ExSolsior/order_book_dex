import { Market } from "../../../../program/utils/useTransaction";
import { MarketSwitcher } from "./market-switcher";

// 24H Volume is set to USD but needs to be dynamic to reflect other tokens
// need to include 24H turnover
// need dynamic price format to refelct other tokens
// volume format needs to be dynamic to reflect other tokens decimals values
//    math needs to be updated 
// change % needs to be fixed to refect 0.000% percision
export function Header({ market }: { market: Market }) {
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 10
  }).format(market!.orderBook!.marketData.lastPrice);

  let volume;
  if (market!.orderBook!.marketData.volume >= 1_000_000) {
    volume = (parseInt(market!.orderBook!.marketData.volume.toString()) / 1_000_000).toFixed(2) + "M";
  } else if (parseInt(market!.orderBook!.marketData.volume.toString()) >= 1_000) {
    volume = (parseInt(market!.orderBook!.marketData.volume.toString()) / 1_000).toFixed(2) + "K";
  } else {
    volume = parseInt(market!.orderBook!.marketData.volume.toString()).toFixed(2);
  }

  return (
    <div className="flex items-center gap-7">
      <MarketSwitcher market={market} />
      <span className="text-lg font-semibold font-sans">{price}</span>
      <div className="flex flex-col items-center">
        <span className="text-sm text-muted-foreground">24H Change</span>
        <span
          className={`font-semibold font-sans ${market!.orderBook!.marketData.change < 0 ? "text-red-500" : "text-green-500"
            }`}
        >
          {market!.orderBook!.marketData.change.toLocaleString()}%
        </span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm text-muted-foreground">24H Volume (USD)</span>
        <span className="font-semibold font-sans">{volume}</span>
      </div>
    </div>
  );
}
