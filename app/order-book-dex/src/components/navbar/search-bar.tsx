"use client";

import { newMarkets, popular, topGainers } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import React from "react";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "../ui/command";

export function SearchBar() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const allMarkets = newMarkets
    .concat(topGainers, popular)
    .sort((a, b) => b.volume - a.volume);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }

        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runSearch = React.useCallback((search: () => unknown) => {
    setOpen(false);
    search();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-8 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        )}
        onClick={() => setOpen(true)}
      >
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
        <span className="hidden lg:inline-flex">Search markets</span>
        <span className="inline-flex lg:hidden">Search...</span>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
      >
        <CommandInput placeholder="Type a market name..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {allMarkets.map((market) => (
              <CommandItem
                key={market.marketId}
                value={`${market.tokenA} / ${market.tokenB}`}
                onSelect={() => {
                  runSearch(() => router.push(`/trade/${market.marketId}`));
                }}
              >
                <Avatar className="w-5 h-5 rounded-full mr-2">
                  <AvatarImage
                    src={market.image}
                    alt={market.tokenA}
                  />
                </Avatar>
                <span className="font-semibold">
                  {market.tokenA} / {market.tokenB}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
