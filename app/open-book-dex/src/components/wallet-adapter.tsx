"use client";

import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ReactNode, useMemo } from "react";

require("@solana/wallet-adapter-react-ui/styles.css");

export const WalletAdapter = ({ children }: { children: ReactNode }) => {
  const endpoint = "https://rpc.devnet.soo.network/rpc";
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
