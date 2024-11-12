"use client"

import { Markets, OpenOrder, useMarkets, UserBalance } from "@/program/utils/useMarkets";
import { createContext, ReactNode } from "react";

export const MarketContext = createContext<{ markets: Markets[], openLimitOrders: OpenOrder[], userBalance: UserBalance }>({
    markets: [],
    openLimitOrders: [],
    userBalance: {
        capitalAAmount: BigInt(0),
        capitalBAmount: BigInt(0),
    } as UserBalance,
});

export const MarketContextProvider = ({ children }: { children: ReactNode }) => {
    const data = useMarkets();

    return (
        <MarketContext.Provider value={data}>
            {children}
        </MarketContext.Provider>
    )
}