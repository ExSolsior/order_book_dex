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
                        marketId: new PublicKey(el.pubkeyId as string),
                        mintB: new PublicKey(el.tokenMintB as string),
                        mintA: new PublicKey(el.tokenMintA as string),
                        programA: new PublicKey(el.tokenProgramA as string),
                        programB: new PublicKey(el.tokenProgramB as string),
                        sellMarketPointer: new PublicKey(el.sellMarketPointer as string),
                        buyMarketPointer: new PublicKey(el.buyMarketPointer as string),
                    },

                    details: {
                        symbolA: el.tokenSymbolA,
                        symbolB: el.tokenSymbolB,
                        decimalsA: el.tokenDecimalsA,
                        decimalsB: el.tokenDecimalsB,

                        quoteToken: {
                            pubkeyId: new PublicKey((!el.isReverse ? el.tokenMintA : el.tokenMintB) as string),
                            programId: new PublicKey((!el.isReverse ? el.tokenProgramA : el.tokenProgramB) as string),
                            decimals: !el.isReverse ? el.tokenDecimalsA : el.tokenDecimalsB,
                            symbol: !el.isReverse ? el.tokenSymbolA : el.tokenSymbolB,
                        },

                        baseToken: {
                            pubkeyId: new PublicKey((!el.isReverse ? el.tokenMintB : el.tokenMintA) as string),
                            programId: new PublicKey((!el.isReverse ? el.tokenProgramB : el.tokenProgramA) as string),
                            decimals: !el.isReverse ? el.tokenDecimalsB : el.tokenDecimalsA,
                            symbol: !el.isReverse ? el.tokenSymbolB : el.tokenSymbolA,
                        },

                        ticker: el.ticker,
                        isReverse: el.isReverse,
                        image: "",
                    },

                    status: {
                        lastPrice: BigInt(el.marketData.lastPrice as string),
                        volume: BigInt(el.marketData.volume as string),
                        turnover: BigInt(el.marketData.turnover as string),
                        changeDelta: BigInt(el.marketData.changeDelta as string),
                        // need to display as percentage
                        changePercent: el.marketData.prevLastPrice === 0 ? BigInt(0) :
                            BigInt(el.marketData.changeDelta as string) * BigInt(100_000) / BigInt(el.marketData.prevLastPrice),
                    }
                }
            })

            const balanceList = data.map((el: FetchedMarket) => {
                const marketId = new PublicKey(el.pubkeyId as string);
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
                    marketId: new PublicKey(position.marketId as string),
                    positionConfig: new PublicKey(position.positionConfig as string),
                    positionId: new PublicKey(position.positionId as string),
                    symbolA: position.symbolA,
                    symbolB: position.symbolB,
                    decimalsA: position.decimalsA,
                    decimalsB: position.decimalsB,
                    isReverse: position.isReverse,
                    ticker: position.ticker,
                    orderType: position.orderType,
                    price: BigInt(position.price as string),
                    size: BigInt(position.size as string), // -> change :: amount -> size
                    amount: BigInt(position.size as string) - BigInt(position.fill as string),
                    fill: BigInt(position.fill as string),
                    value: BigInt(position.price as string)
                        * BigInt(position.size as string)
                        / BigInt((10 ** (!position.isReverse ? Number(position.decimalsA) : Number(position.decimalsB)))),
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
            new PublicKey(book!.mintA),
            userWallet!.publicKey!,
            true,
            new PublicKey(book!.programA),
        );

        const userCapitalB = await getAssociatedTokenAddress(
            new PublicKey(book!.mintB),
            userWallet!.publicKey!,
            true,
            new PublicKey(book!.programB),
        );

        const userVaultA = PublicKey.findProgramAddressSync([
            new PublicKey(book!.marketId).toBuffer(),
            new PublicKey(book!.mintA).toBuffer(),
            userWallet!.publicKey!.toBuffer(),
            Buffer.from("vault-account"),
        ], PROGRAM_ID)[0];

        const userVaultB = PublicKey.findProgramAddressSync([
            new PublicKey(book!.marketId).toBuffer(),
            new PublicKey(book!.mintB).toBuffer(),
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
            console.log(eventId)
            return () => {
                connection.removeOnLogsListener(eventId)
            }
        }

        if (userWallet === undefined) {
            return
        }

        const id = eventListner(
            connection,
            userWallet.publicKey, [
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

                        order!.fill = payload.fill!;
                        // size -> newSize
                        order.amount = payload.size!;

                        if (order.amount === BigInt(0)) {
                            return [
                                ...(prev.filter((order: OpenOrder) => order.positionId.toString() !== payload.position!.toString())),
                            ] as OpenOrder[]
                        }

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

                        const update = {
                            capitalAAmount: current!.capitalAAmount,
                            capitalBAmount: current!.capitalBAmount,

                        }

                        if (!current!.isReverse && payload.orderType == 'bid' || current!.isReverse && payload.orderType == 'ask') {
                            update.capitalAAmount = payload.capitalSourceBalance as bigint;
                        } else {
                            update.capitalBAmount = payload.capitalSourceBalance as bigint;
                        }

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

                //  fixed bug, but still is incomplete
                case "open-limit-order": {
                    const market = markets.find((market) => market.accounts.marketId.toString() === payload.bookConfig?.toString())
                    const state = {
                        marketId: payload.bookConfig,
                        positionConfig: payload.positionConfig,
                        tokenA: market!.details.symbolA,
                        tokenB: market!.details.symbolB,
                        decimalsA: market!.details.decimalsA,
                        decimalsB: market!.details.decimalsB,
                        isReverse: market!.details.isReverse,
                        ticker: market!.details.ticker,
                        positionId: payload.position,
                        orderType: payload.orderType,
                        price: payload.price,
                        size: payload.size,
                        amount: payload.size,
                        fill: BigInt(0),
                        value: (payload.price as bigint)
                            * (payload.size as bigint)
                            / BigInt((10 ** (!market!.details.isReverse ? market!.details.decimalsA : market!.details.decimalsB))),
                        // valueUSD: bigint, // need oracle to make this work
                        // need oracle to make this work 
                        valueUSD: BigInt(0),
                        // this could be a bug or mismatch on what exist on the indexer

                        createdAt: Date.now() / 1000,
                    }

                    setOpenLimitOrders((prev: OpenOrder[]) => [state, ...prev] as OpenOrder[])
                    break;
                }

                // there may be a bug with user balance here
                case "close-limit-order": {

                    setOpenLimitOrders((prev: OpenOrder[]) => {
                        console.log(prev)
                        return prev
                            .filter((order: OpenOrder) => order.positionId.toString() !== payload.position!.toString())
                    })

                    setUserBalance((prev: UserBalance[]) => {

                        const current = prev
                            .find((user: UserBalance) => user.marketId.toString() === payload.bookConfig!.toString())

                        const update = {
                            capitalAAmount: current!.capitalAAmount,
                            capitalBAmount: current!.capitalBAmount,

                        }

                        if (!current!.isReverse && payload.orderType == 'bid' || current!.isReverse && payload.orderType == 'ask') {
                            update!.capitalAAmount = payload.capitalSourceBalance as bigint;
                            update!.capitalBAmount = payload.capitalDestBalance as bigint;

                        } else {
                            update!.capitalBAmount = payload.capitalSourceBalance as bigint;
                            update!.capitalAAmount = payload.capitalDestBalance as bigint;
                        }

                        return [
                            {
                                ...current!,
                                capitalAAmount: update.capitalAAmount,
                                capitalBAmount: update.capitalBAmount,

                            },
                            ...prev
                                .filter((user: UserBalance) => user.marketId.toString() !== payload.bookConfig!.toString())
                        ] as UserBalance[]
                    })
                    break;
                }
            }
        })

        setEventId(id)

    }, [eventId, userWallet, connection, connection])

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
    symbolA: string,
    symbolB: string,
    decimalsA: number,
    decimalsB: number,
    isReverse: boolean,
    ticker: string,
    orderType: "bid" | "ask",
    price: bigint,
    size: bigint,
    amount: bigint,
    fill: bigint,
    value: bigint,
    // need oracle to make this work
    valueUSD: bigint,
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
        mintA: PublicKey,
        mintB: PublicKey,
        programA: PublicKey,
        programB: PublicKey,
        sellMarketPointer: PublicKey,
        buyMarketPointer: PublicKey,
    },
    details: {
        symbolA: string,
        symbolB: string,
        decimalsA: number,
        decimalsB: number,
        // !isReverse
        // tokenB is the base
        // tokenA is the quote
        // isReverse
        // tokenA is the base
        // tokenB is the quote
        quoteToken: {
            pubkeyId: PublicKey,
            programId: PublicKey,
            decimals: number,
            symbol: string,
        }
        baseToken: {
            pubkeyId: PublicKey,
            programId: PublicKey,
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
    // should this belong here? or be removed?
    userBalance: UserBalance[],
};

export interface FetchedMarket {
    'pubkeyId': unknown,
    'tokenMintA': unknown,
    'tokenMintB': unknown,
    'tokenProgramA': unknown,
    'tokenProgramB': unknown,
    'sellMarketPointer': unknown,
    'buyMarketPointer': unknown,
    'tokenDecimalsA': unknown,
    'tokenDecimalsB': unknown,
    'tokenSymbolA': unknown,
    'tokenSymbolB': unknown,
    'isReverse': unknown,
    'ticker': unknown,
    'marketData': {
        'lastPrice': unknown,
        'volume': unknown,
        'turnover': unknown,
        'changeDelta': unknown,
        'prevLastPrice': number,
        'time': unknown,
    },


}

interface ReceivedOpenLimitOrder {
    marketId: unknown,
    positionConfig: unknown,
    positionId: unknown,
    symbolA: unknown,
    symbolB: unknown,
    decimalsA: unknown,
    decimalsB: unknown,
    isReverse: boolean,
    ticker: unknown,
    orderType: unknown,
    price: unknown,
    size: unknown,
    fill: unknown,
    timestamp: unknown,
};


// NOTES:
//  -   load balance is currently not relevent for the portfolio dashboard, only works in the context of a trade page
//      would be nice to store the balance for reach user on the db and load them into memory instead of using the rpc