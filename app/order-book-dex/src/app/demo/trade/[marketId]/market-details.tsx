import CopyButton from "@/components/copy-button";
import OpenNewWindowButton from "@/components/open-new-window-button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Market } from "@/lib/markets";
import Link from "next/link";

export default function MarketDetails({ market }: { market: Market }) {
  let volume;
  if (market.volume >= 1_000_000) {
    volume = (market.volume / 1_000_000).toFixed(2) + "M";
  } else if (market.volume >= 1_000) {
    volume = (market.volume / 1_000).toFixed(2) + "K";
  } else {
    volume = market.volume.toFixed(2);
  }

  return (
    <div className="flex flex-col w-1/3 p-2 gap-2 border-r-2 border-b-2">
      <h2 className="text-center scroll-m-20 pb-2 text-2xl font-semibold tracking-tight first:mt-0">
        Market Details
      </h2>

      <div className="flex justify-center items-center gap-1 border-b-2 pb-2">
        <h3 className="scroll-m-20 text-xl font-semibold">
          {market.tokenA} / {market.tokenB}
        </h3>
        <Link
          href="https://birdeye.so/token/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs?chain=solana&tab=markets"
          target="_blank"
        >
          <Avatar className="w-6 h-6">
            <AvatarImage src="https://files.readme.io/85d0298-Birdeye_Logo_Black_logomark_w_padding_600x600.png" />
          </Avatar>
        </Link>
        <Link
          href="https://dexscreener.com/solana/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs"
          target="_blank"
        >
          <Avatar className="w-6 h-6">
            <AvatarImage src="https://images.seeklogo.com/logo-png/52/1/dex-screener-logo-png_seeklogo-527276.png" />
          </Avatar>
        </Link>
      </div>

      <div className="flex gap-2 border-b-2 items-center">
        <span className="font-semibold flex-1">{market.tokenA}</span>
        <span className="rounded bg-muted flex items-center gap-1 px-1 mb-1">
          <CopyButton text="7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs" />
          <span className="font-mono text-sm font-semibold">7vfCX...voxs</span>
        </span>
        <OpenNewWindowButton link="https://solscan.io/account/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs" />
      </div>

      <div className="flex gap-2 border-b-2 items-center">
        <span className="font-semibold flex-1">{market.tokenB}</span>
        <span className="rounded bg-muted flex items-center gap-1 px-1 mb-1">
          <CopyButton text="Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" />
          <span className="font-mono text-sm font-semibold">Es9vM...wNYB</span>
        </span>
        <OpenNewWindowButton link="https://solscan.io/account/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" />
      </div>

      <div className="flex gap-2 border-b-2 items-center">
        <span className="font-semibold flex-1">Market</span>
        <span className="rounded bg-muted flex items-center gap-1 px-1 mb-1">
          <CopyButton text="AT1R2jUNb9iTo4EaRfKSTPiNTX4Jb64KSwnVmig6Hu4t" />
          <span className="font-mono text-sm font-semibold">AT1R2...Hu4t</span>
        </span>
        <OpenNewWindowButton link="https://solscan.io/account/AT1R2jUNb9iTo4EaRfKSTPiNTX4Jb64KSwnVmig6Hu4t" />
      </div>

      <div className="flex flex-col items-center border-2 rounded-lg">
        <span className="text-muted-foreground text-sm font-mono">
          PRICE USD
        </span>
        <span className="font-bold font-mono">${market.price}</span>
      </div>

      <div className="flex justify-between gap-2">
        <div className="grow flex flex-col items-center border-2 rounded-lg">
          <span className="text-muted-foreground text-sm font-mono">
            24H VOL
          </span>
          <span className="font-bold font-mono">${volume}</span>
        </div>
        <div className="grow flex flex-col items-center border-2 rounded-lg">
          <span className="text-muted-foreground text-sm font-mono">FDV</span>
          <span className="font-bold font-mono">$314.94B</span>
        </div>
      </div>
    </div>
  );
}
