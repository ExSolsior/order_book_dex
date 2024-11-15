"use client"

import { Markets, OpenOrder, useMarkets, UserBalance } from "@/program/utils/useMarkets";
import { createContext, ReactNode } from "react";

export const MarketContext = createContext<{
    markets: Markets[],
    openLimitOrders: OpenOrder[],
    userBalance: UserBalance[],
}>({
    markets: [],
    openLimitOrders: [],
    userBalance: [],
});

export const MarketContextProvider = ({ children }: { children: ReactNode }) => {
    const data = useMarkets();

    return (
        <MarketContext.Provider value={data}>
            {children}
        </MarketContext.Provider>
    )
}