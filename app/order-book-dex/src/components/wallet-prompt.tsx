"use client";

import { WalletConnection } from "./wallet-connection";

export function WalletPrompt() {
  return (
    <div className="container flex flex-col items-center justify-center gap-4">
      <h2 className="scroll-m-20 text-xl font-bold tracking-tight lg:text-2xl text-center">
        Please connect your wallet
      </h2>
      <WalletConnection />
    </div>
  );
}
