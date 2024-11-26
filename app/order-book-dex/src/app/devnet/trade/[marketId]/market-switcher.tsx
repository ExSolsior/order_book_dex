"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Market } from "../../../../program/utils/useTransaction";

import { newMarkets, popular, topGainers } from "@/lib/markets";
import { CaretDownIcon } from "@radix-ui/react-icons";
import { columns } from "@/components/markets-table/columns";
import { MarketsTable } from "@/components/markets-table/data-table";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

// need update MarketsTable :: colums, markets -> not handling right now
export function MarketSwitcher({ market }: { market: Market }) {
  const markets = newMarkets
    .concat(topGainers, popular)
    .sort((a, b) => b.volume - a.volume);

  const { symbolA, symbolB, isReverse } = market!.orderBook!.marketDetails;
  const { image } = market;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-1"
        >
          <Avatar className="h-5 w-5">
            <AvatarImage
              src={image}
              alt={!isReverse ? symbolB : symbolA}
            />
          </Avatar>
          <span className="font-semibold">
            {!isReverse ? symbolB : symbolA} / {!isReverse ? symbolA : symbolB}
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
