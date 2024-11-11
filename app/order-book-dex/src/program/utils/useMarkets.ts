"use client"

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react"
import { CANCEL_LIMIT_ORDER_EVENT, CLOSE_LIMIT_ORDER_EVENT, CREATE_ORDER_POSITION_EVENT, eventListner, OPEN_LIMIT_ORDER_EVENT } from "./events";
import { PROGRAM_ID } from "./constants";
import { CachedMarket } from "./types";
import { useParams } from "next/navigation";
import { Item } from "@radix-ui/react-dropdown-menu";

// should place these under constants.ts file
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;
// const API_SVM = process.env.NEXT_PUBLIC_API_SVM;

export const useMarkets = () => {
    const [data, setData] = useState<Markets[]>([]);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | undefined>()
    const [isLoading, setLoading] = useState(true);
    const [eventId, setEventId] = useState<number | undefined>();
    const userWallet = useAnchorWallet();
    const { connection } = useConnection();
    const params = useParams<{ marketId: string }>()

    console.log(eventId)

    const load = async () => {

        const params = new URLSearchParams();
        params.append("limit", (1000).toString());
        params.append("offset", (0).toString());

        const base = new URL("./api/", API_ENDPOINT);
        const marketListURL = new URL("./market_list?" + params.toString(), base);

        try {
            const response = await fetch(marketListURL);
            const data = await response.json();

            // set empty state
            if (data === null) {
                setData([])
                return
            }

            const list = data.map((el: FetchedMarket) => {
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

            setData(list)

        } catch (err) {
            console.log(err);
        }
    }

    useEffect(() => {

        if (userWallet === undefined || params.marketId === undefined) {
            return
        }

        if (!localStorage.getItem(userWallet.publicKey.toString())) {
            const data = {
                markets: []
            }

            localStorage.setItem(
                userWallet!.publicKey.toString(),
                JSON.stringify(data),
            )
        }

        const marketId = new PublicKey(params.marketId);

        const expire = Date.now() / 1000 + (60 * 60 * 6);
        if (!JSON.parse(localStorage
            // fetch nonce if not in local storage

            .getItem(userWallet.publicKey.toString())!)
            .markets.find((item: CachedMarket) => marketId.toString() === item.marketId)) {

            const user = JSON.parse(localStorage
                .getItem(userWallet!.publicKey.toString())!);

            const [positionConfigId] = PublicKey.findProgramAddressSync([
                userWallet!.publicKey.toBuffer(),
                marketId.toBuffer(),
                Buffer.from("order-position-config"),
            ], PROGRAM_ID);

            (async () => {
                const positionConfigNonce = await (async () => {
                    const account = await connection.getAccountInfo(positionConfigId)
                    if (account !== null) {
                        const offset = 32 * 4 + 8;
                        return account.data.readBigUInt64LE(offset);
                    }

                    return BigInt(0);
                })()

                const data = {
                    ...user,
                    markets: [
                        ...user.markets.filter((list: CachedMarket) => list.positionConfigId !== positionConfigId.toString()),
                        {
                            marketId: marketId.toString(),
                            positionConfigId: positionConfigId.toString(),
                            positionConfigNonce: positionConfigNonce.toString(),
                            expire,
                        }
                    ]
                }

                localStorage.setItem(
                    userWallet!.publicKey.toString(),
                    JSON.stringify(data),
                )

            })()


        } else if (JSON.parse(localStorage
            // need to fetch nonce if data in local storage is expired

            .getItem(userWallet.publicKey.toString())!)
            .markets.find((item: CachedMarket) => marketId.toString() === item.marketId).expire < expire) {
            const user = JSON.parse(localStorage
                .getItem(userWallet!.publicKey.toString())!);

            const [positionConfigId] = PublicKey.findProgramAddressSync([
                userWallet!.publicKey.toBuffer(),
                marketId.toBuffer(),
                Buffer.from("order-position-config"),
            ], PROGRAM_ID);

            (async () => {
                const positionConfigNonce = await (async () => {
                    const account = await connection.getAccountInfo(positionConfigId)
                    if (account !== null) {
                        const offset = 32 * 4 + 8;
                        return account.data.readBigUInt64LE(offset);
                    }

                    return BigInt(0);
                })()

                const data = {
                    ...user,
                    markets: [
                        ...user.markets.filter((list: CachedMarket) => list.positionConfigId !== positionConfigId.toString()),
                        {
                            marketId: marketId.toString(),
                            positionConfigId: positionConfigId.toString(),
                            positionConfigNonce: positionConfigNonce.toString(),
                            expire,
                        }
                    ]
                }

                localStorage.setItem(
                    userWallet!.publicKey.toString(),
                    JSON.stringify(data),
                )

            })()
        }

    }, [userWallet, params])

    useEffect(() => {
        if (eventId !== undefined) {
            return () => {
                connection.removeOnLogsListener(eventId)
            }
        }

        if (userWallet === undefined) {
            return
        }

        const id = eventListner(userWallet.publicKey, [
            CREATE_ORDER_POSITION_EVENT,
            CLOSE_LIMIT_ORDER_EVENT,
            CANCEL_LIMIT_ORDER_EVENT,
            OPEN_LIMIT_ORDER_EVENT,
        ], (method, payload) => {

            console.log(method, payload)

            switch (method) {
                case "create-order-position": {
                    console.log("method", method)

                    const { market, user } = (() => {
                        const user = JSON.parse(localStorage.getItem(userWallet!.publicKey.toString())!);


                        const market = user!.markets
                            .find((item: CachedMarket) => item.positionConfigId === payload.positionConfig!.toString());

                        return { market, user }
                    })();

                    console.log("it worked :::::")

                    console.log(user)

                    console.log(market)

                    const state = {
                        ...user,
                        markets: [
                            {
                                ...market,
                                positionConfigNonce: payload.nonce!.toString(),
                            },
                            ...(user.markets.filter((item: CachedMarket) => item.positionConfigId !== payload.positionConfig!.toString()) || []),
                        ]
                    }


                    localStorage.setItem(
                        userWallet!.publicKey.toString(),
                        JSON.stringify(state),
                    );

                    console.log(state)
                    console.log(JSON.parse(localStorage.getItem(userWallet!.publicKey.toString())!));
                    console.log("FIXNISHED :::::")


                    break;
                }

            }
        })

        setEventId(id)

    }, [eventId, userWallet])

    useEffect(() => {
        if (isLoading == false) {
            return () => clearInterval(intervalId);
        }

        const id = setInterval(() => load(), 60000)

        setLoading(false);
        setIntervalId(id);
        load();

    }, [isLoading, intervalId])

    return { data }
}

const event = () => {
    // signer event listner
    // eventListner(
    //     userWallet.publicKey,
    //     [
    //         // MARKET_ORDER_COMPLETE_EVENT,
    //         CREATE_ORDER_POSITION_EVENT,
    //         CLOSE_LIMIT_ORDER_EVENT,
    //         // OPEN_LIMIT_ORDER_EVENT,
    //     ],
    //     async (method, payload) => {

    //         switch (method) {

    //             case "complete-market-order": {
    //                 marketOrder.update(payload.orderType, null);

    //                 (async () => {


    //                     if (userWallet === undefined || payload.marketTaker !== userWallet.publicKey) {
    //                         return;
    //                     }

    //                     setData({
    //                         ...queue.data!,
    //                         user: {
    //                             ...queue.data!.user,
    //                             capitalABalance: payload.capitalSourceMint === queue.data!.orderBook.accounts.tokenMintA ?
    //                                 BigInt(payload.capitalSourceBalance!.toString()) : queue.data!.user.capitalABalance,
    //                             capitalBBalance: payload.capitalSourceMint === queue.data!.orderBook.accounts.tokenMintB ?
    //                                 BigInt(payload.capitalSourceBalance!.toString()) : queue.data!.user.capitalBBalance,
    //                         }
    //                     })

    //                 })();

    //                 break;
    //             }

    //             case "create-limit-order": {

    //                 (async () => {

    //                     if (userWallet === undefined || payload.marketMaker !== userWallet.publicKey) {
    //                         return;
    //                     }

    //                     const { market, user } = (() => {
    //                         const user = JSON.parse(localStorage.getItem(userWallet!.publicKey.toString())!);
    //                         const market = user!.markets
    //                             .find((id: string) => marketId.toString() === id);

    //                         return { market, user }
    //                     })();

    //                     const state = {
    //                         ...user,
    //                         markets: [
    //                             {
    //                                 ...market,
    //                                 positionConfigNonce: payload.nonce!.toString(),
    //                             },
    //                             ...user.markets.filter((item: CachedMarket) => item.marketId !== marketId.toString()),
    //                         ]
    //                     }

    //                     localStorage.setItem(
    //                         userWallet!.publicKey.toString(),
    //                         JSON.parse(state),
    //                     );

    //                     setData({
    //                         ...queue.data!,
    //                         user: {
    //                             ...queue.data!.user,
    //                             positionConfigNonce: payload.nonce!,
    //                             capitalABalance: payload.capitalSourceMint === queue.data!.orderBook.accounts.tokenMintA ?
    //                                 BigInt(payload.capitalSourceBalance!.toString()) : queue.data!.user.capitalABalance,
    //                             capitalBBalance: payload.capitalSourceMint === queue.data!.orderBook.accounts.tokenMintB ?
    //                                 BigInt(payload.capitalSourceBalance!.toString()) : queue.data!.user.capitalBBalance,
    //                         }
    //                     })

    //                 })();

    //                 break;
    //             }

    //             case "open-limit-order": {


    //                 // not going to process this here
    //                 (() => {

    //                     if (userWallet === undefined || payload.marketMaker !== userWallet.publicKey) {
    //                         return;
    //                     }

    //                     const user = JSON.parse(localStorage.getItem(userWallet!.publicKey.toString())!);

    //                     const state = {
    //                         ...user,
    //                         positions: [
    //                             {
    //                                 marketId: payload.bookConfig,
    //                                 positionConfigId: payload.positionConfig,
    //                                 positionId: payload.position,
    //                                 price: payload.price?.toString(),
    //                                 size: payload.size?.toString(),
    //                             },
    //                             ...user.positions,
    //                         ]
    //                     }

    //                     localStorage.setItem(
    //                         userWallet!.publicKey.toString(),
    //                         JSON.parse(state),
    //                     );
    //                 })

    //                 break;
    //             }

    //             case "close-limit-order": {

    //                 // not correct, need to use a user State hook
    //                 setData({
    //                     ...queue.data!,
    //                     user: {
    //                         ...queue.data!.user,
    //                         capitalABalance: payload.capitalSourceMint === queue.data!.orderBook.accounts.tokenMintA ?
    //                             BigInt(payload.capitalSourceBalance!.toString())
    //                             : BigInt(payload.capitalDestBalance!.toString()),
    //                         capitalBBalance: payload.capitalSourceMint === queue.data!.orderBook.accounts.tokenMintB ?
    //                             BigInt(payload.capitalSourceBalance!.toString())
    //                             : BigInt(payload.capitalDestBalance!.toString()),
    //                     }
    //                 })
    //             }
    //         }
    //     })
}

export type Markets = {
    accounts: {
        marketId: PublicKey,
        // maybe I don't need this data?
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

export interface FetchedMarket {
    'pubkeyId': string,
    'tokenMintA': string,
    'tokenMintB': string,
    'tokenProgramA': string,
    'tokenProgramB': string,
    'sellMarketPointer': string,
    'buyMarketPointer': string,
    'tokenDecimalsA': string,
    'tokenDecimalsB': string,
    'tokenSymbolA': string,
    'tokenSymbolB': string,
    'isReverse': string,
    'ticker': string | undefined,
    'marketData': {
        'lastPrice': string,
        'volume': string,
        'turnover': string,
        'changeDelta': string,
        'prevLastPrice': number,
        'time': string,
    },


}
