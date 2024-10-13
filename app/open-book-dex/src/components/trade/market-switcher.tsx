"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Market, newMarkets, popular, topGainers } from "@/lib/markets";
import { CaretDownIcon } from "@radix-ui/react-icons";
import { columns } from "../markets-table/columns";
import { MarketsTable } from "../markets-table/data-table";
import { Avatar, AvatarImage } from "../ui/avatar";

export function MarketSwitcher({ market }: { market: Market }) {
  const markets = newMarkets
    .concat(topGainers, popular)
    .sort((a, b) => b.volume - a.volume);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-1"
        >
          <Avatar className="h-5 w-5">
            <AvatarImage
              src={market.image}
              alt={market.tokenA}
            />
          </Avatar>
          <span className="font-semibold">
            {market.tokenA} / {market.tokenB}
          </span>

          <CaretDownIcon className="h-[1.2rem] w-[1.2rem] scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <MarketsTable
          columns={columns}
          data={markets}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
