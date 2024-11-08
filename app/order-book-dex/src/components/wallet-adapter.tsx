"use client";

import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ReactNode, useMemo } from "react";

// should place this in the constants.ts file
const NEXT_PUBLIC_API_SVM = process.env.NEXT_PUBLIC_API_SVM as string;

export const WalletAdapter = ({ children }: { children: ReactNode }) => {
  const endpoint = NEXT_PUBLIC_API_SVM;
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
