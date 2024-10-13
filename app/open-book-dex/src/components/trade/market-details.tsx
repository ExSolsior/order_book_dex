import { Market } from "@/lib/markets";
import { MarketSwitcher } from "./market-switcher";

export function MarketDetails({ market }: { market: Market }) {
  return (
    <div className="flex">
      <MarketSwitcher market={market} />
    </div>
  );
}
