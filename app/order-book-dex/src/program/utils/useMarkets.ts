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
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";


// should place these under constants.ts file
const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

export const useMarkets = () => {
    const [markets, setMarkets] = useState<Markets[]>([]);
    const [openLimitOrders, setOpenLimitOrders] = useState<OpenOrder[]>([]);
    const [isLoaded, setIsloaded] = useState(false);
    const [userBalance, setUserBalance] = useState<UserBalance[]>([]);
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | undefined>()
    const [isLoading, setLoading] = useState(true);
    const [eventId, setEventId] = useState<number | undefined>();
    const userWallet = useAnchorWallet();
    const { connection } = useConnection();
    const params = useParams<{ marketId: string }>()

    const load = async (isSet: boolean) => {

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
                            decimals: !el.isReverse ? el.tokenDecimalsA : el.tokenDecimalsB,
                            symbol: !el.isReverse ? el.tokenSymbolA : el.tokenSymbolB,
                        },
                        baseToken: {
                            pubkeyId: new PublicKey(!el.isReverse ? el.tokenMintA : el.tokenMintB),
                            decimals: !el.isReverse ? el.tokenDecimalsB : el.tokenDecimalsA,
                            symbol: !el.isReverse ? el.tokenSymbolB : el.tokenSymbolA,
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

            const balanceList = data.map((el: FetchedMarket) => {
                const marketId = new PublicKey(el.pubkeyId);
                return {
                    marketId: marketId,
                    isSet: false,
                    isReverse: el.isReverse,
                    capitalAAmount: BigInt(0),
                    capitalBAmount: BigInt(0),
                    vaultAAmount: BigInt(0),
                    vaultBAmount: BigInt(0),
                }
            })

            setMarkets(list)

            if (!isSet) {
                setUserBalance(balanceList)
            }

        } catch (err) {
            console.log(err);
        }
    }

    const loadUser = async () => {
        const base = new URL("./api/", API_ENDPOINT)
        const marketMakerParams = new URLSearchParams();
        marketMakerParams.append("market_maker", userWallet!.publicKey.toString());
        const openPositionsURL = new URL("./get_open_positions?" + marketMakerParams.toString(), base);

        const response = await fetch(openPositionsURL)

        // hack impl, need to fixed on server side but it works
        const positions = response.ok ? await response.json() || [] : [];

        // I wonder if this could cause issues, let's say event listner gets data first
        // then this loads data. data becomes mismatched and doesn't reflect the real state.
        // will come back to this later
        setOpenLimitOrders((prev: OpenOrder[]) => {
            return [
                ...prev,
                ...(positions.map((position: ReceivedOpenLimitOrder) => ({
                    marketId: new PublicKey(position.marketId),
                    positionConfig: new PublicKey(position.positionConfig),
                    positionId: new PublicKey(position.positionId),
                    tokenA: position.symbolA,
                    tokenB: position.symbolB,
                    decimalsA: position.decimalsA,
                    decimalsB: position.decimalsB,
                    isReverse: position.isReverse,
                    ticker: position.ticker,
                    orderType: position.orderType,
                    price: BigInt(position.price),
                    amount: BigInt(position.size),
                    fillAmount: BigInt(0), // how to handle this?
                    value: BigInt(position.price) * BigInt(position.size) / BigInt((10 ** (!position.isReverse ? Number(position.decimalsA) : Number(position.decimalsB)))),
                    valueUSD: BigInt(0), // need oracle to handle this
                    createdAt: position.timestamp,
                })))
            ] as OpenOrder[]
        })
    }

    // this is being loaded 4 times. how to load only once?
    const loadBalance = async () => {
        if (params.marketId === undefined) {
            return
        }

        const marketId = new PublicKey(params.marketId);
        const market = markets.find((market: Markets) => market.accounts.marketId.toString() === marketId.toString());

        if (userWallet === undefined ||
            market === undefined ||
            !!userBalance.find((user: UserBalance) => user.marketId.toString() === marketId.toString() && user.isSet)
        ) {
            return
        }

        const book = market?.accounts

        const userCapitalA = await getAssociatedTokenAddress(
            new PublicKey(book!.tokenMintA),
            userWallet!.publicKey!,
            true,
            new PublicKey(book!.tokenProgramA),
        );

        const userCapitalB = await getAssociatedTokenAddress(
            new PublicKey(book!.tokenMintB),
            userWallet!.publicKey!,
            true,
            new PublicKey(book!.tokenProgramB),
        );

        const userVaultA = PublicKey.findProgramAddressSync([
            new PublicKey(book!.marketId).toBuffer(),
            new PublicKey(book!.tokenMintA).toBuffer(),
            userWallet!.publicKey!.toBuffer(),
            Buffer.from("vault-account"),
        ], PROGRAM_ID)[0];

        const userVaultB = PublicKey.findProgramAddressSync([
            new PublicKey(book!.marketId).toBuffer(),
            new PublicKey(book!.tokenMintB).toBuffer(),
            userWallet!.publicKey!.toBuffer(),
            Buffer.from("vault-account"),
        ], PROGRAM_ID)[0];

        const data = await Promise.allSettled([
            getAccount(connection, userCapitalA),
            getAccount(connection, userCapitalB),
            getAccount(connection, userVaultA),
            getAccount(connection, userVaultB),
        ]).then((results) => {
            return results.map(data => {
                return BigInt(data.status === "fulfilled" ? data.value.amount : 0);
            })
        })

        // it double loads on first render... no idea why
        setUserBalance((prev: UserBalance[]) => {

            const current = prev.find((market: UserBalance) => market.marketId.toString() === marketId.toString());

            return [
                {
                    ...current,
                    isSet: true,
                    capitalAAmount: data[0],
                    capitalBAmount: data[1],
                    vaultAAmount: data[2],
                    vaultBAmount: data[3],
                },
                ...prev.filter((market: UserBalance) => market.marketId.toString() !== marketId.toString()),
            ] as UserBalance[]
        })

    }

    useEffect(() => {

        if (userWallet === undefined || params.marketId === undefined) {
            return
        }

        const marketId = new PublicKey(params.marketId);

        if (!localStorage.getItem(userWallet.publicKey.toString())) {
            const data = {
                markets: []
            }

            localStorage.setItem(
                userWallet!.publicKey.toString(),
                JSON.stringify(data),
            )
        }


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
                    console.log("fetching account...")
                    const account = await connection.getAccountInfo(positionConfigId)
                    console.log(account);
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

    }, [userWallet, params, connection, markets])

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
                        const order = prev.find((order: OpenOrder) => order.positionId.toString() === payload.position!.toString())

                        if (order === undefined) {
                            return prev

                        }

                        order!.fillAmount += payload.amount!;
                        return [
                            order,
                            ...(prev.filter((order: OpenOrder) => order.positionId.toString() !== payload.position!.toString())),
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

                    setUserBalance((prev: UserBalance[]) => {

                        const current = prev
                            .find((user: UserBalance) => user.marketId.toString() === payload.bookConfig!.toString())

                        console.log(current)

                        const update = {
                            capitalAAmount: current!.capitalBAmount,
                            capitalBAmount: current!.capitalBAmount,

                        }

                        if (!current!.isReverse && payload.orderType == 'bid' || current!.isReverse && payload.orderType == 'ask') {
                            update.capitalAAmount = payload.capitalSourceBalance as bigint;
                        } else {
                            update.capitalBAmount = payload.capitalSourceBalance as bigint;
                        }

                        console.log(update)

                        return [
                            {
                                ...current,
                                capitalAAmount: update.capitalAAmount,
                                capitalBAmount: update.capitalBAmount,
                            },
                            ...prev
                                .filter((user: UserBalance) => user.marketId.toString() !== payload.bookConfig!.toString())
                        ] as UserBalance[]
                    })

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
                    break;
                }

                case "close-limit-order": {
                    console.log("close-limit-order???")
                    console.log("payload :: ", payload)
                    console.log("payload :: ", payload.position!.toString())


                    setOpenLimitOrders((prev: OpenOrder[]) => {
                        console.log(prev)
                        return prev
                            .filter((order: OpenOrder) => order.positionId.toString() !== payload.position!.toString())
                    })

                    setUserBalance((prev: UserBalance[]) => {

                        const current = prev
                            .find((user: UserBalance) => user.marketId.toString() === payload.bookConfig!.toString())

                        if (!current!.isReverse && payload.orderType == 'bid' || current!.isReverse && payload.orderType == 'ask') {
                            current!.capitalAAmount = payload.capitalSourceBalance as bigint;
                            current!.capitalBAmount = payload.capitalDestBalance as bigint;

                        } else {
                            current!.capitalBAmount = payload.capitalSourceBalance as bigint;
                            current!.capitalAAmount = payload.capitalDestBalance as bigint;
                        }

                        return [
                            { ...current! },
                            ...prev
                                .filter((user: UserBalance) => user.marketId.toString() !== payload.bookConfig!.toString())
                        ] as UserBalance[]
                    })
                    break;
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
        const id = setInterval(() => load(true), 60000)

        setLoading(false);
        setIntervalId(id);
        load(false);

    }, [isLoading, intervalId])

    if (userWallet !== undefined && !isLoaded) {
        loadUser()
        setIsloaded(true)
    }

    loadBalance()

    return { markets, openLimitOrders, userBalance }
}

export type OpenOrder = {
    marketId: PublicKey,
    positionConfig: PublicKey,
    positionId: PublicKey,
    tokenA: string,
    tokenB: string,
    decimalsA: number,
    decimalsB: number,
    isReverse: boolean,
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
    marketId: PublicKey,
    isSet: boolean,
    isReverse: boolean,
    capitalAAmount: bigint,
    capitalBAmount: bigint,
    vaultAAmount: bigint,
    vaultBAmount: bigint,
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
    userBalance: UserBalance[],
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
    marketId: string,
    positionConfig: string,
    positionId: string,
    symbolA: string,
    symbolB: string,
    decimalsA: string,
    decimalsB: string,
    isReverse: boolean,
    ticker: string,
    orderType: string,
    // I think??
    price: string,
    size: string,
    timestamp: number,
};