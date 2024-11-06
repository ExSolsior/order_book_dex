import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Market, MarketOrderState } from "../../program/utils/useTransaction";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletPrompt } from "../wallet-prompt";
import Balance from "./balance";
import CustomTabsTrigger from "./custom-tabs-trigger";
import LimitOrder from "./limit-order";
import MarketOrder from "./market-order";

export default function OrderDetails({
  market,
  marketOrder,
  type
}: {
  market: Market;
  marketOrder: MarketOrderState
  type: "buy" | "sell" | "ask" | "bid";
}) {

  const { symbolA, symbolB, isReverse } = market!.orderBook!.marketDetails;
  const userWallet = useAnchorWallet();

  if (!userWallet) {
    return <WalletPrompt />;
  }

  return (
    <Tabs
      defaultValue="limit"
      className="flex-1"
    >
      <TabsList className="bg-transparent gap-3">
        <CustomTabsTrigger value="limit">Limit</CustomTabsTrigger>
        <CustomTabsTrigger value="market">Market</CustomTabsTrigger>
      </TabsList>
      <TabsContent
        value="limit"
        className="space-y-3 px-2 pt-2"
      >
        <Balance token={type === "buy" ? !isReverse ? symbolB : symbolA : !isReverse ? symbolA : symbolB} />
        <LimitOrder
          market={market}
          marketOrder={marketOrder}
          type={type === "buy" ? "bid" : "ask"}
        />
      </TabsContent>
      <TabsContent
        value="market"
        className="space-y-3 px-2 pt-2"
      >
        <Balance token={type === "buy" ? !isReverse ? symbolB : symbolA : !isReverse ? symbolA : symbolB} />
        <MarketOrder
          market={market}
          type={type}
        />
      </TabsContent>
    </Tabs>
  );
}
