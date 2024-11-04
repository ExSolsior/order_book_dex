import { PublicKey } from "@solana/web3.js";
import { useState } from "react"


export const useMarkets = () => {
    const [data, setData] = useState<Markets[] | null>(null);

    // load listener

    const load = async () => {

        const base = new URL("http://127.0.0.1:8000/api/");
        const marketListURL = new URL("./market_list?offset=0&limit=10", base);

        console.log(marketListURL);

        try {
            const response = await fetch(marketListURL);
            let data = await response.json();

            const list = data.map((el: any) => {
                return {
                    accounts: {
                        marketId: new PublicKey(el.pubkeyId),
                        tokenMintA: new PublicKey(el.tokenMintA),
                        tokenMintB: new PublicKey(el.tokenMintB),
                        tokenProgramA: new PublicKey(el.tokenProgramA),
                        tokenProgramB: new PublicKey(el.tokenProgramB),
                        sellMarketPointer: new PublicKey(el.sellMarketPointer),
                        buyMarketPointer: new PublicKey(el.buyMarketPointer),
                        tokenDecimalsA: new PublicKey(el.tokenDecimalsA),
                        tokenDecimalsB: new PublicKey(el.tokenDecimalsB),
                    },
                    details: {
                        tokenSymbolA: el.tokenSymbolA,
                        tokenSymbolB: el.tokenSymbolB,
                        quoteToken: {
                            pubkeyId: new PublicKey(!el.isReverse ? el.tokenMintB : el.tokenMintA),
                            decimals: !el.isReverse ? el.tokenDecimalsB : el.tokenDecimalsA,
                            symbol: !el.isReverse ? el.tokenSymbolB : el.tokenSymbolA,
                        },
                        baseToken: {
                            pubkeyId: new PublicKey(!el.isReverse ? el.tokenMintA : el.tokenMintB),
                            decimals: !el.isReverse ? el.tokenDecimalsA : el.tokenDecimalsB,
                            symbol: !el.isReverse ? el.tokenSymbolA : el.tokenSymbolB,
                        },
                        ticker: el.ticker,
                        isReverse: el.isReverse,
                        image: "",
                    },
                    status: {
                        lastPrice: BigInt(el.marketData.lastPrice),
                        volume: BigInt(el.marketData.volume),
                        turnover: BigInt(el.marketData.turnover),
                        changeDelta: BigInt(el.marketData.changeDelta),
                        // need to display as percentage
                        changePercent: el.marketData.prevLastPrice === 0 ? BigInt(0) :
                            BigInt(el.marketData.changeDelta) * BigInt(100_000) / BigInt(el.marketData.prevLastPrice),
                    }
                }
            })

            console.log(list)
            setData(list)

        } catch (err) {
            console.log(err);
        }
    }

    if (!data) {
        load()
    }

    // return subscriptionId
    return { data }
}

export type Markets = {
    accounts: {
        marketId: PublicKey,
        tokenMintA: PublicKey,
        tokenMintB: PublicKey,
        tokenProgramA: PublicKey,
        tokenProgramB: PublicKey,
        sellMarketPointer: PublicKey,
        buyMarketPointer: PublicKey,
        tokenDecimalsA: PublicKey,
        tokenDecimalsB: PublicKey,
    },
    details: {
        tokenSymbolA: string,
        tokenSymbolB: string,
        // !isReverse
        // tokenB is the base
        // tokenA is the quote
        // isReverse
        // tokenA is the base
        // tokenB is the quote
        quoteToken: {
            pubkeyId: PublicKey,
            decimals: number,
            symbol: string,
        }
        baseToken: {
            pubkeyId: PublicKey,
            decimals: number,
            symbol: string,
        }
        ticker: string,
        isReverse: boolean,
        image: string,
    },
    status: {
        lastPrice: bigint,
        volume: bigint,
        turnover: bigint,
        changeDelta: bigint,
        changePercent: bigint,
    },
};
