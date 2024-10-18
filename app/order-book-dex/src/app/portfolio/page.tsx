"use client";

import { WalletPrompt } from "@/components/portfolio/wallet-prompt";
import { useWallet } from "@solana/wallet-adapter-react";
import { PortfolioHeader } from "./header";
import { PortfolioOpenOrders } from "./open-orders";
import { PastOrders } from "./past-orders";
import { PortfolioSummary } from "./summary";

export default function PortfolioPage() {
  const wallet = useWallet();

  if (!wallet.publicKey) {
    return <WalletPrompt />;
  }

  return (
    <div className="space-y-6">
      <PortfolioHeader />
      <PortfolioSummary />
      <PortfolioOpenOrders />
      <PastOrders />
    </div>
  );
}
