import { useState } from "react"


const useMarkets = () => {
    const [data, setData] = useState();

    // load listener

    const load = async () => {

        const base = new URL("http://127.0.0.1:8000/api/");
        const marketListURL = new URL("./market_list", base);

        try {
            const response = await fetch(marketListURL);
            let data = await response.json();

            const list = data.map((el: any) => {
                return {
                    account: {
                        marketId: el.pubkeyId,
                        tokenMintA: el.tokenMintA,
                        tokenMintB: el.tokenMintB,
                        tokenProgramA: el.tokenProgramA,
                        tokenProgramB: el.tokenProgramB,
                        sellMarketPointer: el.sellMarketPointer,
                        buyMarketPointer: el.buyMarketPointer,
                        tokenDecimalsA: el.tokenDecimalsA,
                        tokenDecimalsB: el.tokenDecimalsB,
                        tokenSymbolA: el.tokenSymbolA,
                        tokenSymbolB: el.tokenSymbolB,
                    },
                    details: {
                        quoteToken: {
                            pubkeyId: !el.isReverse ? el.tokenMintB : el.tokenMintA,
                            decimals: !el.isReverse ? el.tokenDecimalsB : el.tokenDecimalsA,
                            symbol: !el.isReverse ? el.tokenSymbolB : el.tokenSymbolA,
                        },
                        baseToken: {
                            pubkeyId: !el.isReverse ? el.tokenMintA : el.tokenMintB,
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
                        changePercent: BigInt(el.marketData.changeDelta) * BigInt(100_000) / BigInt(el.marketData.prevLastPrice),
                    }
                }
            })

            setData(list)

        } catch (err) {
            console.log(err);
        }
    }

    load()

    // return subscriptionId
    return { data }
}

/*
    accounts: {
        marketId
        tokenMintA
        tokenMintB
        tokenProgramA
        tokenProgramB
        sellMarketPointer
        buyMarketPointer
        tokenDecimalsA
        tokenDecimalsB
        tokenSymbolA
        tokenSymbolB,
    },
    details {
        -- !isReverse
        -- tokenB is the base
        -- tokenA is the quote
        -- isReverse
        -- tokenA is the base
        -- tokenB is the quote
        quoteToken: {
            symbol,
            pubkeyId,
        }
        baseToken: {
            symbol,
            pubkeyId,
        }
        ticker
        isReverse
        image?
    },
    status {
        lastPrice
        volume
        turnover
        changeDelta
        changePercent
    }


*/