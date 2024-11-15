import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Market, MarketOrderState } from "../../program/utils/useTransaction";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletPrompt } from "../wallet-prompt";
import Balance from "./balance";
import CustomTabsTrigger from "./custom-tabs-trigger";
import LimitOrder from "./limit-order";
import MarketOrder from "./market-order";
import { displayValue } from "@/program/utils/helper";
import { useContext } from "react";
import { MarketContext } from "../provider/market-provider";
import { UserBalance } from "@/program/utils/useMarkets";

export default function OrderDetails({
  market,
  marketOrder,
  type
}: {
  market: Market;
  marketOrder: MarketOrderState
  type: "buy" | "sell" | "ask" | "bid";
}) {

  const userWallet = useAnchorWallet();

  const { marketId } = market!.orderBook.accounts;
  const data = useContext(MarketContext)
  const userBalance = data.userBalance
    .find((user: UserBalance) => user.marketId.toString() === marketId.toString());

  const { symbolA, symbolB, decimalsA, decimalsB, isReverse } = market!.orderBook!.marketDetails;
  const { capitalABalance, capitalBBalance } = userBalance! ? {
    // issue happening here, userBalance is undefined?
    capitalABalance: userBalance.capitalAAmount || BigInt(0),
    capitalBBalance: userBalance.capitalBAmount || BigInt(0),
  } : {
    capitalABalance: BigInt(0),
    capitalBBalance: BigInt(0),
  };

  const displayABalance = displayValue(capitalABalance, decimalsA);
  const displayBBalance = displayValue(capitalBBalance, decimalsB);

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
        <Balance
          // type is a bid or buy
          token={type === "buy" ? !isReverse ? symbolA : symbolB : !isReverse ? symbolB : symbolA}
          balance={(type === "buy" ? !isReverse
            ? displayABalance : displayBBalance : !isReverse
            ? displayBBalance : displayABalance).toString()}
        />
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
        <Balance
          // type is a bid or buy
          token={type === "buy" ? !isReverse ? symbolA : symbolB : !isReverse ? symbolB : symbolA}
          balance={(type === "buy" ? !isReverse
            ? displayABalance : displayBBalance : !isReverse
            ? displayBBalance : displayABalance).toString()}
        />
        <MarketOrder
          market={market}
          type={type}
        />
      </TabsContent>
    </Tabs>
  );
}


