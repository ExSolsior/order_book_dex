"use client";

import { WalletPrompt } from "@/components/wallet-prompt";
import { useWallet } from "@solana/wallet-adapter-react";
import { PortfolioHeader } from "./header";
import { PortfolioOpenOrders } from "./open-orders";
import { PastOrders } from "./past-orders";
import { PortfolioSummary } from "./summary";
import { MarketContextProvider } from "@/components/provider/market-provider";

export default function PortfolioPage() {
  const wallet = useWallet();

  if (!wallet.publicKey) {
    return <WalletPrompt />;
  }

  return (
    <div className="space-y-6">
      <PortfolioHeader />
      <PortfolioSummary />
      <MarketContextProvider>
        <PortfolioOpenOrders />
      </MarketContextProvider>
      <PastOrders />
    </div>
  );
}
