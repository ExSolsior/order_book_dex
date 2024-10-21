"use client";

import { cn } from "@/lib/utils";
import { CaretDownIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../ui/dropdown-menu";

export function MainNav({ isDemo }: { isDemo: boolean }) {
  const pathname = usePathname();

  return (
    <div className="mr-4 flex flex-1 items-center justify-between">
      <div className="flex items-center">
        <Link
          href={isDemo ? "/demo" : "/devnet"}
          className="flex items-center space-x-2 lg:mr-6"
        >
          <span className="font-bold lg:inline-block tracking-widest">
            CHRONO
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm lg:gap-6">
          <Link
            href={isDemo ? "/demo" : "/devnet"}
            className={cn(
              "transition-colors hover:text-foreground font-semibold",
              pathname === (isDemo ? "/demo" : "/devnet")
                ? "text-foreground"
                : "text-foreground/60"
            )}
          >
            Markets
          </Link>

          <Link
            href={`${isDemo ? "/demo" : "/devnet"}/trade`}
            className={cn(
              "transition-colors hover:text-foreground font-semibold",
              pathname.includes((isDemo ? "/demo" : "/devnet") + "/trade")
                ? "text-foreground"
                : "text-foreground/60"
            )}
          >
            Trade
          </Link>

          <Link
            href={`${isDemo ? "/demo" : "/devnet"}/portfolio`}
            className={cn(
              "transition-colors hover:text-foreground/80 font-semibold text-sm",
              pathname === (isDemo ? "/demo" : "/devnet") + "/portfolio"
                ? "text-foreground"
                : "text-foreground/60"
            )}
          >
            Portfolio
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex transition-colors hover:text-foreground font-semibold text-foreground/60"
              )}
            >
              <span>More</span>
              <CaretDownIcon className="h-[1.2rem] w-[1.2rem] scale-100" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <Link href={`${isDemo ? "/demo" : "/devnet"}/api`}>
                <DropdownMenuItem
                  className={cn(
                    "transition-colors hover:text-foreground font-semibold",
                    pathname === (isDemo ? "/demo" : "/devnet") + "/api"
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  API
                </DropdownMenuItem>
              </Link>

              <Link href={`${isDemo ? "/demo" : "/devnet"}/docs`}>
                <DropdownMenuItem
                  className={cn(
                    "transition-colors hover:text-foreground font-semibold",
                    pathname === (isDemo ? "/demo" : "/devnet") + "/docs"
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
    </div>
  );
}
