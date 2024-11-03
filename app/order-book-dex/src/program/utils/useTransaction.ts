"use client"

import { useContext, useEffect, useState } from "react";
import { createContext } from "vm";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
    eventListner,
    OPEN_LIMIT_ORDER_EVENT,
    CANCEL_LIMIT_ORDER_EVENT,
    MARKET_ORDER_FILL_EVENT,
} from "./events"
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { ProgramContext } from "../ProgramProvider";

// const transactionContext = createContext();
// useMarket
// useEvents


class Queue {
    current: string;
    listA: Payload[];
    listB: Payload[];

    constructor() {
        this.current = "init";
        this.listA = [];
        this.listB = [];
    }

    push(data: Payload) {

        if (this.current === "init" || this.current === "a") {
            this.listA.push(data);
        }

        if (this.current === "b") {
            this.listB.push(data);
        }
    }

    get() {
        if (this.current === "init") {
            // set schedular
            this.current = "a";
        }

        if (this.current === "a") {
            this.current = "b";
            const list = this.listA;
            this.listA = [];
            return list;
        }

        if (this.current === "b") {
            this.current = "a";
            const list = this.listA;
            this.listA = [];
            return list;
        }

        return this.listA;
    }
}

// how I can think about preventing double rendering is add a loading state,
// when is fully loaded, then fetch data
// rename to useMarket
// should we fetch the last 100 market orders for trade history?
// need to handle if get no data, could use default empty state instead of null
export const useTransaction = (marketId: PublicKey) => {
    const [data, setData] = useState<Market | null>(null);
    const userWallet = useAnchorWallet();
    const { programId } = useContext(ProgramContext)!;

    const load = async (marketId: PublicKey, queue: Queue) => {

        const base = new URL("http://127.0.0.1:8000")
        const orderBook = new URL(`/api/market_order_book?book_config=${marketId.toString()}`, base);
        const marketData = new URL(`/api/market_history?book_config=${marketId.toString()}&interval=1m&limit=1000&offset=0`, base);


        try {

            // need to handle when don't get the expected data
            const response = await Promise.all([
                fetch(orderBook),
                fetch(marketData)
            ]);

            let book = await response[0].json();
            let candles = await response[1].json();

            console.log(candles)

            let asks = new Map<bigint, Order>();
            let bids = new Map<bigint, Order>();

            // also need display format and real format
            book.book.asks.forEach((element: any) => {

                const price = BigInt(element.price);
                asks.set(price, {
                    price: price,
                    size: asks.has(price)
                        ? asks.get(price)!.size + BigInt(element.size)
                        : BigInt(element.size),
                    depth: BigInt(0),
                });
            });

            book.book.bids.forEach((element: any) => {

                const price = BigInt(element.price);
                bids.set(price, {
                    price: price,
                    size: bids.has(price)
                        ? bids.get(price)!.size + BigInt(element.size)
                        : BigInt(element.size),
                    depth: BigInt(0),
                });
            });

            queue.get().forEach(data => {

                if (data.order === 'ask' && asks.has(data.price)) {

                    const ask = asks.get(data.price)!;

                    asks.set(data.price, {
                        ...ask,
                        size: data.method === 'add'
                            ? ask.size + data.size
                            : ask.size - data.size,
                    });

                    if (ask.size === BigInt(0)) {
                        asks.delete(data.price);
                    } else if (ask.size < BigInt(0)) {
                        // data out of sync, need to resync
                    }


                } else if (data.order === 'ask') {
                    asks.set(data.price, {
                        price: data.price,
                        size: data.size,
                        depth: BigInt(0),
                    });

                } else if (data.order === 'bid' && bids.has(data.price)) {

                    const bid = bids.get(data.price)!;

                    bids.set(data.price, {
                        ...bid,
                        size: data.method === 'add'
                            ? bid.size + data.size
                            : bid.size - data.size,
                    });

                    if (bid.size === BigInt(0)) {
                        bids.delete(data.price);
                    } else if (bid.size < BigInt(0)) {
                        // data out of sync, need to resync
                    }



                } else if (data.order === 'bid') {
                    bids.set(data.price, {
                        price: data.price,
                        size: data.size,
                        depth: BigInt(0),
                    });

                } else if (data.order === 'sell' && bids.has(data.price)) {
                    const bid = bids.get(data.price)!;

                    if (bid.size === data.size) {
                        bids.delete(data.price);
                    } else {
                        bids.set(data.price, {
                            ...bid,
                            size: bid.size - data.size,
                        });
                    }

                } else if (data.order === 'buy' && asks.has(data.price)) {
                    const ask = asks.get(data.price)!;

                    if (ask.size === data.size) {
                        asks.delete(data.price);
                    } else {
                        asks.set(data.price, {
                            ...ask,
                            size: ask.size - data.size,
                        });
                    }

                } else {
                    // data is out of sync and need to resolve it some how
                }
            })

            let askDepth = BigInt(0);
            asks = new Map<bigint, Order>(asks
                .entries()
                .toArray()
                .sort((a, b) => {
                    return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
                }));

            asks
                .values()
                .forEach((data: any) => {
                    askDepth += data.size;
                    data.depth = askDepth;

                    asks.set(data.price, {
                        ...data,
                    });
                });

            let bidDepth = BigInt(0);
            bids = new Map<bigint, Order>(bids
                .entries()
                .toArray()
                .sort((a, b) => {
                    return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
                }));

            bids
                .values()
                .forEach((data: any) => {
                    bidDepth += data.size;
                    data.depth = bidDepth;

                    bids.set(data.price, {
                        ...data,
                    });
                });

            let store = {
                image: "https://dd.dexscreener.com/ds-data/tokens/ethereum/0x28561b8a2360f463011c16b6cc0b0cbef8dbbcad.png?size=lg&key=f7c99e",
                candles: candles.market.map((data: any) => ({
                    time: Number(data.timestamp),
                    open: Number(data.open),
                    high: Number(data.high),
                    low: Number(data.low),
                    close: Number(data.close),

                    // open: BigInt(data.open),
                    // high: BigInt(data.high),
                    // low: BigInt(data.low),
                    // close: BigInt(data.close),
                })).sort((a: Candle, b: Candle) => a.time - b.time),

                orderBook: {
                    accounts: {
                        marketId: new PublicKey(book.pubkeyId),
                        sellMarketPointer: new PublicKey(book.sellMarketPointer),
                        buyMarketPointer: new PublicKey(book.buyMarketPointer),
                        tokenMintA: new PublicKey(book.tokenMintA),
                        tokenMintB: new PublicKey(book.tokenMintB),
                        tokenProgramA: new PublicKey(book.tokenProgramA),
                        tokenProgramB: new PublicKey(book.tokenProgramB),
                        userAddress: userWallet!.publicKey,
                        userPositionConfig: PublicKey.findProgramAddressSync([
                            userWallet!.publicKey!.toBuffer(),
                            new PublicKey(book.pubkeyId).toBuffer(),
                            Buffer.from("order-position-config"),
                        ], programId!)[0],
                        userCapitalA: await getAssociatedTokenAddress(
                            new PublicKey(book.tokenMintA),
                            userWallet!.publicKey!,
                            true,
                            programId,
                        ),
                        userCapitalB: await getAssociatedTokenAddress(
                            new PublicKey(book.tokenMintB),
                            userWallet!.publicKey!,
                            true,
                            programId,
                        ),
                        userVaultA: PublicKey.findProgramAddressSync([
                            new PublicKey(book.pubkeyId).toBuffer(),
                            new PublicKey(book.tokenMintA).toBuffer(),
                            userWallet!.publicKey!.toBuffer(),
                            Buffer.from("vault-account"),
                        ], programId!)[0],
                        userVaultB: PublicKey.findProgramAddressSync([
                            new PublicKey(book.pubkeyId).toBuffer(),
                            new PublicKey(book.tokenMintB).toBuffer(),
                            userWallet!.publicKey!.toBuffer(),
                            Buffer.from("vault-account"),
                        ], programId!)[0],
                    },
                    marketDetails: {
                        isReverse: book.isReverse as boolean,
                        ticker: book.ticker as string,
                        // symbolA: book.symbolA as string,
                        // symbolB: book.symbolB as string,
                        symbolA: "abc",
                        symbolB: "xxyz",
                        decimalsA: 9,
                        decimalsB: 6,
                    },
                    marketData: {
                        lastPrice: BigInt(1000),
                        volume: BigInt(5545760),
                        change: BigInt(-10),
                    },
                    trades: [
                        { price: 2558.08, qty: 0.039, time: 1728929558, action: "buy" } as Trade,
                        { price: 2556.16, qty: 0.2767, time: 1728929548, action: "buy" } as Trade,
                        { price: 2556.16, qty: 0.0438, time: 1728929548, action: "buy" } as Trade,
                        { price: 2556.16, qty: 0.0221, time: 1728929548, action: "buy" } as Trade,
                        { price: 2555.32, qty: 0.3423, time: 1728929548, action: "buy" } as Trade,
                        { price: 2555.15, qty: 3.5, time: 1728929548, action: "buy" } as Trade,
                        { price: 2554.62, qty: 0.6, time: 1728929548, action: "buy" } as Trade,
                        { price: 2554.62, qty: 0.3644, time: 1728929548, action: "buy" } as Trade,
                        { price: 2554.62, qty: 0.0438, time: 1728929548, action: "buy" } as Trade,
                        { price: 2554.61, qty: 0.6, time: 1728929548, action: "buy" } as Trade,
                        { price: 2552.63, qty: 0.0009, time: 1728929521, action: "sell" } as Trade,
                        { price: 2555.95, qty: 0.0054, time: 1728929413, action: "sell" } as Trade,
                        { price: 2560.07, qty: 0.0054, time: 1728929245, action: "buy" } as Trade,
                        { price: 2560.0, qty: 0.0117, time: 1728929245, action: "buy" } as Trade,
                        { price: 2559.57, qty: 0.0106, time: 1728929245, action: "buy" } as Trade,
                        { price: 2559.04, qty: 0.0118, time: 1728929244, action: "buy" } as Trade,
                        { price: 2556.57, qty: 0.3989, time: 1728929216, action: "buy" } as Trade,
                        { price: 2555.95, qty: 0.0054, time: 1728929216, action: "buy" } as Trade,
                        { price: 2555.16, qty: 0.0013, time: 1728929216, action: "buy" } as Trade,
                        { price: 2554.88, qty: 0.3994, time: 1728929216, action: "buy" } as Trade
                    ],
                    asks: {
                        feedData: asks,
                    },
                    bids: {
                        feedData: bids,
                    },
                }
            }

            console.log(store, data);

            setData(store);
        } catch (err) {
            console.log(err)
        }
    }

    const marketData = async (url: URL) => {
        try {
            const response = await fetch(url)
            let data = await response.json();

            // process response
            // set state

        } catch (err) {
            console.log(err)
        }
    }

    const run = () => {

        if (programId === undefined || userWallet === undefined || data !== null) {
            // need to cache and return id
            return
        }

        const queue = new Queue()
        const id = eventListner(
            marketId,
            [
                OPEN_LIMIT_ORDER_EVENT,
                CANCEL_LIMIT_ORDER_EVENT,
                MARKET_ORDER_FILL_EVENT,
            ],
            (method, payload) => {

                switch (method) {
                    case "open-limit-order": {
                        let data = {
                            method: "add",
                            order: payload.orderType!,
                            price: BigInt(payload.price!.toString()),
                            size: BigInt(payload.size!.toString()),
                        }

                        queue.push(data);
                        break;
                    }

                    case "cancel-limit-order": {
                        let data = {
                            method: "sub",
                            order: payload.orderType!,
                            price: BigInt(payload.price!.toString()),
                            size: BigInt(payload.size!.toString()),
                        }

                        queue.push(data);
                        break;
                    }

                    case "fill-market-order": {
                        let data = {
                            method: "sub",
                            order: payload.orderType!,
                            price: BigInt(payload.price!.toString()),
                            size: BigInt(payload.size!.toString()),
                        }

                        queue.push(data);
                        break;
                    }
                }
            });

        // wait 5 seconds?

        load(marketId, queue);

        return id;
    }

    const id = run();

    return {
        data,
        load,
        marketData,
    }
}

interface Payload {
    method: string;
    order: string;
    price: bigint,
    size: bigint,
};

export interface Order {
    price: bigint;
    size: bigint;
    depth: bigint;
};

export type Candle = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
};

export type Trade = {
    price: number;
    qty: number;
    time: number;
    action: "buy" | "sell";
};

export type Market = {
    image: string,
    candles: Candle[],
    orderBook: {
        accounts: {
            marketId: PublicKey,
            sellMarketPointer: PublicKey,
            buyMarketPointer: PublicKey,
            tokenMintA: PublicKey,
            tokenMintB: PublicKey,
            tokenProgramA: PublicKey,
            tokenProgramB: PublicKey,
            userAddress: PublicKey,
            userPositionConfig: PublicKey,
            userCapitalA: PublicKey,
            userCapitalB: PublicKey,
            userVaultA: PublicKey,
            userVaultB: PublicKey,
        },
        marketDetails: {
            isReverse: boolean,
            ticker: string,
            symbolA: string,
            symbolB: string,
            decimalsA: number,
            decimalsB: number,
        },
        marketData: {
            lastPrice: bigint,
            volume: bigint,
            change: bigint,
        },
        trades: Trade[],
        asks: {
            feedData: Map<bigint, Order>,
        },
        bids: {
            feedData: Map<bigint, Order>,
        }
    }
}



/*
state
    - order book
        - accounts
            - book config
            - sell market pointer
            - buy market pointer
            - token mint a
            - token mint b
            - token program a
            - token program b
            - user keypair pubkey
            - user position config
            - user capital source
            - user capital destination
            - user vault source
            - user vault destination
        - market details
            - is reverse
            - ticker
            - symbols
        - market data
            - 24 hour volume
            - 24 hour turnover
            - 24 hour change by %
            - last price (red -> sell, green -> buy)
        - asks {}
            - total positions
            - total amount
            - feed data [{}]
                - price
                - size
                - account data [{}] -> for now wont be using this
                    - position config
                    - position
                    - next position
                    - market maker
                    - source vault
                    - destination vault
                    - source capital
                    - source destination
                    - price
                    - amount
        - bids {}
            - total positions
            - total amount
            - feed data [{}]
                - price
                - size
                - account data [{}] -> for now wont be using this
                    - position config
                    - position
                    - next position
                    - market maker
                    - source vault
                    - destination vault
                    - source capital
                    - source destination
                    - price
                    - amount
                    - slot
    - trade history
        - price
        - amount
        - order type
        - slot
        - timestamp
    - candle
        - interval
        - open
        - high
        - low
        - close
        - volume
        - turnover
        - change by %
        - timestamp

events
 - open limit order (tracking active book config)
    - udpate -> (add) state.orderBook.
        - asks.feedData.
            - price
            - size
        - bids.feedData.
            - price
            - size
        - asks.accountData.
            - position config
            - position
            - next position
            - market maker
            - source vault
            - destination vault
            - source capital
            - source destination
            - price
            - amount
        - bids.accountData.
            - position config
            - position
            - next position
            - market maker
            - source vault
            - destination vault
            - source capital
            - source destination
            - price
            - amount

 - close limit order (tracking active book config)
     - udpate -> (remove) state.orderBook.
        - asks.feedData.
            - price
            - size
        - bids.feedData.
            - price
            - size
        - asks.accountData.
            - position config
            - position
            - next position
            - market maker
            - source vault
            - destination vault
            - source capital
            - source destination
            - price
            - amount
        - bids.accountData.
            - position config
            - position
            - next position
            - market maker
            - source vault
            - destination vault
            - source capital
            - source destination
            - price
            - amount

 - cancel limit order (tracking active book config)
      - udpate -> (remove) state.orderBook.
        - asks.feedData.
            - price
            - size
        - bids.feedData.
            - price
            - size
        - asks.accountData.
            - position config
            - position
            - next position
            - market maker
            - source vault
            - destination vault
            - source capital
            - source destination
            - price
            - amount
        - bids.accountData.
            - position config
            - position
            - next position
            - market maker
            - source vault
            - destination vault
            - source capital
            - source destination
            - price
            - amount

 - fill market order (tracking active book config)
     - update -> (add) trade history
        - price
        - amount
        - order type
        - slot
        - timestamp
    - update -> market data
        - 24 hour volume
        - 24 hour turnover
        - 24 hour change by %
        - last price (red -> sell, green -> buy)
    - update current interval frame
        - open
        - high
        - low
        - close
        - volume
        - turnover
        - change by %
        - timestamp

 - fill market order (tracking all book configs)
    - update -> market data
        - 24 hour volume
        - 24 hour turnover
        - 24 hour change by %
        - last price (red -> sell, green -> buy)

 - create market order?
    - update market pointer
        - set flag to executing status
        - next position pointer

 - complete market order?
    - update market pointer
        - set flag to available status
        - clear next position pointer

- minute tick
    - update candle
        - interval
        - open
        - high
        - low
        - close
        - volume
        - turnover
        - change by %
        - timestamp
*/