"use client";

import { MainNav } from "./navbar/main-nav";
import { SearchBar } from "./navbar/search-bar";
import { WalletConnection } from "./wallet-connection";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const { connected } = useWallet();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <MainNav />

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          {connected && (
            <Link
              href="/portfolio"
              className={cn(
                "transition-colors hover:text-foreground/80 font-semibold mr-4 text-sm",
                pathname === "/portfolio" ? "text-foreground" : "text-foreground/60"
              )}
            >
              Portfolio
            </Link>
          )}
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <SearchBar />
          </div>

          <nav className="flex items-center">
            <div>
              <WalletConnection />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
