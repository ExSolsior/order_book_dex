"use client"

import { useContext, useState } from "react";
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
import { CachedMarket } from "./types";

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

export class MarketOrderState {
    bidNextPointer: PublicKey | undefined | null;
    askNextPointer: PublicKey | undefined | null;
    constructor() {
        // sell side market pointer
        this.bidNextPointer = null;
        // buy side market pointer
        this.askNextPointer = null;
    }

    update(side: string | undefined, value: PublicKey | undefined | null) {
        if (side === "buy") {
            this.askNextPointer = value;
        }

        if (side === "sell") {
            this.bidNextPointer = value;
        }
    }

}

// I wonder if this could cause some issues
const marketOrder = new MarketOrderState();

// rename to useMarket
// need to handle if get no data, could use default empty state instead of null
export const useTransaction = (marketId: PublicKey) => {
    const [data, setData] = useState<Market | null>(null);

    const userWallet = useAnchorWallet();
    const context = useContext(ProgramContext);

    const { programId, program } = (() => {
        if (context === null) {
            return {
                programId: undefined,
                program: undefined,
            }
        }

        const { programId, program } = context;
        return { programId, program }
    })();


    const base = new URL("http://127.0.0.1:8000/api/")

    const load = async (marketId: PublicKey, queue: Queue) => {


        /*
        
            checking if user is cached
            if not the create cache state
            using local storage for now but should use indexedDB
            should derive user data
            state: 
                markets
                    marketId
                    positionConfig
        */

        if (!localStorage.getItem(userWallet!.publicKey.toString())) {

            const [positionConfigId] = PublicKey.findProgramAddressSync([
                userWallet!.publicKey.toBuffer(),
                marketId.toBuffer(),
                Buffer.from("order-position-config"),
            ], programId!)

            const positionConfigNonce = await (async () => {
                const account = await program!.provider.connection.getAccountInfo(positionConfigId)
                if (account !== null) {
                    const offset = 32 * 4;
                    return account.data.readBigInt64BE(offset);
                }

                return BigInt(0);
            })()

            const data = {
                markets: [{
                    marketId: marketId.toString(),
                    positionConfigId: positionConfigId.toString(),
                    positionConfigNonce: positionConfigNonce.toString(),
                }]
            }

            localStorage.setItem(
                userWallet!.publicKey.toString(),
                JSON.stringify(data),
            )
        }

        if (!JSON.parse(localStorage
            .getItem(userWallet!.publicKey.toString())!)
            .markets.find((item: CachedMarket) => marketId.toString() === item.marketId)) {

            const user = JSON.parse(localStorage
                .getItem(userWallet!.publicKey.toString())!);

            const [positionConfigId] = PublicKey.findProgramAddressSync([
                userWallet!.publicKey.toBuffer(),
                marketId.toBuffer(),
                Buffer.from("order-position-config"),
            ], programId!)

            const positionConfigNonce = await (async () => {
                const account = await program!.provider.connection.getAccountInfo(positionConfigId)
                if (account !== null) {
                    const offset = 32 * 4;
                    return account.data.readBigInt64BE(offset);
                }

                return BigInt(0);
            })()

            const data = {
                ...user,
                markets: [
                    ...user.market.filter((list: CachedMarket) => list.positionConfigId !== positionConfigId.toString()),
                    {
                        marketId: marketId.toString(),
                        positionConfigId: positionConfigId.toString(),
                        positionConfigNonce: positionConfigNonce.toString(),
                    }
                ]
            }

            localStorage.setItem(
                userWallet!.publicKey.toString(),
                JSON.stringify(data),
            )
        }

        const orderBookURL = new URL(`./market_order_book?book_config=${marketId.toString()}`, base);
        const candleDataURL = new URL(`./market_history?book_config=${marketId.toString()}&interval=1m&limit=1000&offset=0`, base);

        try {

            const { positionConfigNonce } = JSON.parse(localStorage.getItem(userWallet!.publicKey.toString())!)
                .markets.find((item: CachedMarket) => marketId.toString() === item.marketId);

            const response = await Promise.all([
                fetch(orderBookURL),
                fetch(candleDataURL)
            ]);

            const book = await (async () => {
                if (response[0].status === 200) {
                    return await response[0].json();
                }
                return null;
            })();

            if (book === null) {
                return
            }

            const candles = await (async () => {
                if (response[1].status === 200) {
                    return await response[1].json();
                }
                return { market: [] };
            })();

            let asks = new Map<bigint, Order>();
            let bids = new Map<bigint, Order>();

            // interface Order {
            //     price: string,
            //     size: string,

            // };

            // also need display format and real format
            book.book.asks.forEach((element: Order) => {

                const price = BigInt(element.price);
                asks.set(price, {
                    price: price,
                    size: asks.has(price)
                        ? asks.get(price)!.size + BigInt(element.size)
                        : BigInt(element.size),
                    depth: BigInt(0),
                });
            });

            book.book.bids.forEach((element: Order) => {

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
                .forEach((data: Order) => {
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
                .forEach((data: Order) => {
                    bidDepth += data.size;
                    data.depth = bidDepth;

                    bids.set(data.price, {
                        ...data,
                    });
                });


            const store = {
                // how to handle including image?
                // image: "https://dd.dexscreener.com/ds-data/tokens/ethereum/0x28561b8a2360f463011c16b6cc0b0cbef8dbbcad.png?size=lg&key=f7c99e",
                image: "",
                page: 0,
                candles: updateCandles(candles.market)
                    .sort((a: Candle, b: Candle) => a.time - b.time),

                user: {
                    positionConfigNonce,
                },

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
                        isReverse: book.isReverse,
                        ticker: book.ticker,
                        symbolA: book.tokenSymbolA,
                        symbolB: book.tokenSymbolB,
                        decimalsA: book.tokenDecimalsA,
                        decimalsB: book.tokenDecimalsB,
                    },
                    marketData: {
                        lastPrice: BigInt(book.trades.length === 0 ? 0 : book.trades[0].price),
                        volume: BigInt(book.marketData === undefined ? 0 : book.marketData.volume),
                        turnover: BigInt(book.marketData === undefined ? 0 : book.marketData.volume),
                        change: BigInt(
                            book.marketData === undefined || book.marketData.prevLastPrice === 0
                                ? 0
                                : BigInt(book.marketData.changeDelta) * BigInt(100_000) / BigInt(book.marketData.prevLastPrice)
                        ),
                    },

                    trades: book.trades.map((data: Trade) => {
                        return {
                            price: Number(data.price),
                            qty: Number(data.qty),
                            action: String(data.action),
                            time: Number(data.time),
                        } as Trade
                    }),

                    asks: {
                        feedData: asks,
                    },
                    bids: {
                        feedData: bids,
                    },
                }
            }

            setData(store);
        } catch (err) {
            console.log(err)
        }
    }

    const getCandleData = async () => {
        const offset = data!.page * 1000;

        const params = new URLSearchParams();
        params.append("book_config", marketId.toString());
        params.append("offset", offset.toString());
        params.append("limit", (1000).toString());

        const candleDataURL = new URL(`./market_history?${params.toString()}`, base);

        try {

            const response = await fetch(candleDataURL);
            const candles = await response.json();

            setData({
                ...data!,
                page: data!.page + 1,
                candles: updateCandles(candles.market)
                    .concat(data!.candles)
                    .sort((a: Candle, b: Candle) => a.time - b.time)
            });

        } catch (err) {
            console.log(err)
        }
    }

    const run = () => {

        if (programId === undefined || userWallet === undefined || data !== null) {
            // need to cache and return id
            return
        }

        // edge case: as this data is initialize on first render
        // the actual market order data may not be null
        // so need to come back to this to handle better
        marketOrder.update("buy", null);
        marketOrder.update("sell", null);

        const queue = new Queue();

        // returns id but for now not handling it
        eventListner(
            marketId,
            [
                OPEN_LIMIT_ORDER_EVENT,
                CANCEL_LIMIT_ORDER_EVENT,
                MARKET_ORDER_FILL_EVENT,
            ],
            (method, payload) => {

                switch (method) {
                    case "create-market-order": {
                        marketOrder.update(payload.orderType, payload.nextPointerPubkey);
                        break;
                    }

                    case "fill-market-order": {
                        const data = {
                            method: "sub",
                            order: payload.orderType!,
                            price: BigInt(payload.price!.toString()),
                            size: BigInt(payload.size!.toString()),
                        }

                        queue.push(data);
                        break;
                    }

                    case "complete-market-order": {
                        marketOrder.update(payload.orderType, null);
                        break;
                    }

                    case "create-limit-order": {

                        if (payload.marketMakerPubkey !== userWallet.publicKey) {
                            break;
                        }

                        const user = JSON.parse(localStorage.getItem(userWallet!.publicKey.toString())!);
                        const { positionConfigNonce, market } = (() => {
                            const data = user!.markets
                                .find((id: string) => marketId.toString() === id);

                            return {
                                positionConfigNonce: BigInt(data.positionConfigNonce),
                                market: data,
                            }
                        })();

                        const data = {
                            ...user,
                            markets: [
                                ...user.markets.filter((item: CachedMarket) => item.marketId !== marketId.toString()),
                                {
                                    ...market,
                                    positionConfigNonce: payload.nonce!.toString(),
                                }
                            ]
                        }

                        localStorage.setItem(
                            userWallet!.publicKey.toString(),
                            JSON.parse(data),
                        );

                        setData({
                            ...data!,
                            user: {
                                ...data!.user,
                                positionConfigNonce: positionConfigNonce + BigInt(1),
                            }
                        })

                        break;
                    }

                    case "open-limit-order": {
                        const data = {
                            method: "add",
                            order: payload.orderType!,
                            price: BigInt(payload.price!.toString()),
                            size: BigInt(payload.size!.toString()),
                        }

                        queue.push(data);
                        break;
                    }

                    case "cancel-limit-order": {
                        const data = {
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

        // need to store the id in state
        // on first render data is valid
        // on all subsequent renders data is null
        // return id;
    }

    if (programId === undefined) {
        return {
            data,
            marketOrder,
            getCandleData,
        }
    }

    run();

    return {
        data,
        marketOrder,
        getCandleData,
    }
}

const updateCandles = (candles: Candle[]) => {
    return candles.map((data: Candle) => ({
        time: Number(data.time),
        open: Number(data.open),
        high: Number(data.high),
        low: Number(data.low),
        close: Number(data.close),

        // open: BigInt(data.open),
        // high: BigInt(data.high),
        // low: BigInt(data.low),
        // close: BigInt(data.close),
    }));
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
    page: number,
    user: {
        positionConfigNonce: bigint,
    },
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
            turnover: bigint,
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