"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { CaretDownIcon } from "@radix-ui/react-icons";

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 md:flex">
      <Link
        href="/"
        className="flex items-center space-x-2 lg:mr-6"
      >
        <span className="font-bold lg:inline-block">Open Book Dex</span>
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

        <Link
          href="/portfolio"
          className={cn(
            "transition-colors hover:text-foreground/80 font-semibold",
            pathname === "/portfolio" ? "text-foreground" : "text-foreground/60"
          )}
        >
          Portfolio
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
  );
}
