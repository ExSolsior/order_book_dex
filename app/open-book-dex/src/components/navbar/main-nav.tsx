"use client";

import { cn } from "@/lib/utils";
import { CaretDownIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";

export function MainNav() {
  const pathname = usePathname();
  const { connected } = useWallet();

  return (
    <div className="mr-4 flex flex-1 items-center justify-between">
      <div className="flex items-center">
        <Link
          href="/"
          className="flex items-center space-x-2 lg:mr-6"
        >
          <span className="font-bold lg:inline-block tracking-widest">OBDEX</span>
        </Link>

        <nav className="flex items-center gap-4 text-sm lg:gap-6">
          <Link
            href="/"
            className={cn(
              "transition-colors hover:text-foreground/80 font-semibold",
              pathname === "/" ? "text-foreground" : "text-foreground/60"
            )}
          >
            Markets
          </Link>

          <Link
            href="/trade"
            className={cn(
              "transition-colors hover:text-foreground/80 font-semibold",
              pathname.includes("/trade")
                ? "text-foreground"
                : "text-foreground/60"
            )}
          >
            Trade
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex transition-colors hover:text-foreground/80 font-semibold text-foreground/60"
              )}
            >
              <span>More</span>
              <CaretDownIcon className="h-[1.2rem] w-[1.2rem] scale-100" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <Link
                href="/api"
                className={cn(
                  "transition-colors hover:text-foreground/80 font-semibold",
                  pathname === "/api" ? "text-foreground" : "text-foreground/60"
                )}
              >
                <DropdownMenuItem>API</DropdownMenuItem>
              </Link>

              <Link href="/docs">
                <DropdownMenuItem
                  className={cn(
                    "transition-colors hover:text-foreground/80 font-semibold",
                    pathname === "/docs"
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  Docs
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>

      {connected && (
        <Link
          href="/portfolio"
          className={cn(
            "transition-colors hover:text-foreground/80 font-semibold text-sm",
            pathname === "/portfolio" ? "text-foreground" : "text-foreground/60"
          )}
        >
          Portfolio
        </Link>
      )}
    </div>
  );
}
