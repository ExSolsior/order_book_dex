"use client"

import { Markets, useMarkets } from "@/program/utils/useMarkets";
import { createContext, ReactNode } from "react";

export const MarketContext = createContext<Markets[]>([]);

export const MarketContextProvider = ({ children }: { children: ReactNode }) => {
    const { data } = useMarkets();

    return (
        <MarketContext.Provider value={data}>
            {children}
        </MarketContext.Provider>
    )
}