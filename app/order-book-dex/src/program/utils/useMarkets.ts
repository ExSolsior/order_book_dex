"use client"

import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react"
import {
    eventListner,
    CLOSE_LIMIT_ORDER_EVENT,
    CREATE_ORDER_POSITION_EVENT,
    MARKET_ORDER_FILL_EVENT,
    OPEN_LIMIT_ORDER_EVENT
} from "./events";
import { PROGRAM_ID } from "./constants";
import { CachedMarket } from "./types";
import { useParams } from "next/navigation";


// should place these under constants.ts file
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export const useMarkets = () => {
    const [markets, setMarkets] = useState<Markets[]>([]);
    const [openLimitOrders, setOpenLimitOrders] = useState<OpenOrder[]>([]);
    const [isLoaded, setIsloaded] = useState(false);
    const [userBalance, setUserBalance] = useState<UserBalance>({
        capitalAAmount: BigInt(0),
        capitalBAmount: BigInt(0)
    });
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | undefined>()
    const [isLoading, setLoading] = useState(true);
    const [eventId, setEventId] = useState<number | undefined>();
    const userWallet = useAnchorWallet();
    const { connection } = useConnection();
    const params = useParams<{ marketId: string }>()

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
                setMarkets([])
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

            setMarkets(list)

        } catch (err) {
            console.log(err);
        }
    }

    const loadUser = async () => {
        const base = new URL("./api/", API_ENDPOINT)
        const marketMakerParams = new URLSearchParams();
        marketMakerParams.append("market_maker", userWallet!.publicKey.toString());
        const openPositionsURL = new URL("./get_open_positions?" + marketMakerParams.toString(), base);

        const repsonse = await fetch(openPositionsURL)

        // hack impl, need to fixed on server side but it works
        const positions = repsonse.ok ? await repsonse.json() || [] : [];

        console.log("positions from backend:: ", positions);

        // I wonder if this could cause issues, let's say event listner gets data first
        // then this loads data. data becomes mismatched and doesn't reflect the real state.
        // will come back to this later
        setOpenLimitOrders((prev: OpenOrder[]) => {
            return [
                ...prev,
                ...(positions.map((position: ReceivedOpenLimitOrder) => ({
                    positionId: new PublicKey(position.positionId),
                    ticker: "",
                    OrderType: position.orderType,
                    price: BigInt(position.price),
                    amount: BigInt(position.size),
                    fillAmount: BigInt(0), // how to handle this?
                    value: BigInt(position.price) * BigInt(position.size),
                    valueUSD: BigInt(0), // need oracle to handle this
                    createAt: position.timestamp,
                })))
            ] as OpenOrder[]
        })
    }

    useEffect(() => {

        if (userWallet === undefined || params.marketId === undefined) {
            return
        }

        {
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

        }



    }, [userWallet, params, connection])

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
            MARKET_ORDER_FILL_EVENT,
            CREATE_ORDER_POSITION_EVENT,
            CLOSE_LIMIT_ORDER_EVENT,
            OPEN_LIMIT_ORDER_EVENT,
        ], (method, payload) => {

            switch (method) {

                case "fill-market-order": {
                    setOpenLimitOrders((prev: OpenOrder[]) => {
                        const order = prev.find((order: OpenOrder) => order.positionId === payload.position)

                        order!.fillAmount += payload.amount!;
                        return [
                            order,
                            ...(prev.filter((order: OpenOrder) => order.positionId !== payload.position)),
                        ] as OpenOrder[]
                    })

                    // need to update balance info
                }

                case "complete-market-order": {
                    // update balance info
                }

                case "create-order-position": {
                    const { market, user } = (() => {
                        const user = JSON.parse(localStorage.getItem(userWallet!.publicKey.toString())!);
                        const market = user!.markets
                            .find((item: CachedMarket) => item.positionConfigId === payload.positionConfig!.toString());

                        return { market, user }
                    })();

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

                    break;
                }

                case "open-limit-order": {
                    const state = {
                        positionId: payload.position,
                        ticker: "ticker... need include in event or derive from book config",
                        orderType: payload.orderType,
                        price: payload.price,
                        amount: payload.size, // size
                        fillAmount: BigInt(0),
                        value: (payload.price as bigint) * (payload.size as bigint),
                        valueUSD: BigInt(0), // need oracle to make this work
                        createdAt: Date.now(),
                    }

                    setOpenLimitOrders((prev: OpenOrder[]) => [state, ...prev] as OpenOrder[])
                }

                case "close-limit-order": {
                    setOpenLimitOrders((prev: OpenOrder[]) => prev
                        .filter((order: OpenOrder) => order.positionId !== payload.position))
                }
            }
        })

        setEventId(id)

    }, [eventId, userWallet, connection])

    useEffect(() => {
        if (isLoading == false) {
            return () => clearInterval(intervalId);
        }

        // update every minute
        const id = setInterval(() => load(), 60000)

        setLoading(false);
        setIntervalId(id);
        load();

    }, [isLoading, intervalId])

    if (userWallet !== undefined && !isLoaded) {
        loadUser()
        setIsloaded(true)
    }

    return { markets, openLimitOrders, userBalance, setUserBalance }
}

export type OpenOrder = {
    positionId: PublicKey,
    ticker: string, // pair
    orderType: "bid" | "ask",
    price: bigint,
    amount: bigint, // size
    fillAmount: bigint,
    value: bigint,
    valueUSD: bigint, // need oracle to make this work
    createdAt: number,
}

export type UserBalance = {
    capitalAAmount: bigint,
    capitalBAmount: bigint,
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

type ReceivedOpenLimitOrder = {
    // 'positionId', p.pubkey_id,
    // 'marketId', p.book_config,
    // 'positionConfig', p.position_config,
    // 'orderType', p.order_type,
    // 'price', p.price,
    // 'size', p.size,
    // -- need filled total of size, currently not tracking
    // 'slot', p.slot
    positionId: string,
    ticker: string,
    orderType: string,
    // I think??
    price: string,
    size: string,
    timestamp: number,
};
