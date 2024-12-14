"use client"

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";

import {
    eventListner,
    OPEN_LIMIT_ORDER_EVENT,
    CANCEL_LIMIT_ORDER_EVENT,
    MARKET_ORDER_FILL_EVENT,
    // CLOSE_LIMIT_ORDER_EVENT,
    // CREATE_ORDER_POSITION_EVENT,
    MARKET_ORDER_TRIGGER_EVENT,
    MARKET_ORDER_COMPLETE_EVENT,
} from "./events"
import {
    useAnchorWallet,
    useConnection,
} from "@solana/wallet-adapter-react";
import { displayValue } from "./helper";
import { PROGRAM_ID } from "./constants";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;
// const API_SVM = process.env.NEXT_PUBLIC_API_SVM;


// LimitOrderQueue
class Queue {
    current: string;
    orderBook: {
        listA: Payload[],
        listB: Payload[],
    };
    tradeHistory: {
        listA: Payload[],
        listB: Payload[],
    };
    // listA: Payload[];
    // listB: Payload[];
    data: Market | null | undefined;
    setData: Dispatch<SetStateAction<Market | null>> | undefined;

    constructor() {
        this.current = "init";
        this.orderBook = {
            listA: [],
            listB: [],
        };

        this.tradeHistory = {
            listA: [],
            listB: [],
        };
        // this.listA = [];
        // this.listB = [];
    }

    update(setData: Dispatch<SetStateAction<Market | null>>) {
        this.setData = setData;
    }

    // OrderBookPayload | TradeHistoryPayload
    push(method: string, data: Payload) {

        if (method === 'order-book' && (this.current === "init" || this.current === "a")) {
            this.orderBook.listA.push(data);
        }

        if (method === 'order-book' && this.current === "b") {
            this.orderBook.listB.push(data);
        }

        if (method === 'trade-history' && (this.current === "init" || this.current === 'a')) {
            this.tradeHistory.listA.push(data)
        }

        if (method === 'trade-history' && this.current === 'b') {
            this.tradeHistory.listB.push(data)
        }
    }

    get() {
        if (this.current === "init") {
            this.run()
            this.current = "b";
        }

        if (this.current === "a") {
            this.current = "b";

            const orderBook = this.orderBook.listA;
            const tradeHistory = this.tradeHistory.listA;

            this.orderBook.listA = [];
            this.tradeHistory.listA = [];

            return [orderBook, tradeHistory];
        }

        if (this.current === "b") {
            this.current = "a";

            const orderbook = this.orderBook.listB;
            const tradeHistory = this.tradeHistory.listB;

            this.orderBook.listB = [];
            this.tradeHistory.listB = [];

            return [orderbook, tradeHistory];
        }

        return [[], []];
    }

    run() {

        setInterval(() => {
            const [orderBook, tradeHistory] = this.get();


            if (orderBook.length === 0 && tradeHistory.length === 0) {
                return
            }

            this.setData!((prev) => {
                const { asks, bids } = this.setOrderBook(
                    prev!.orderBook!.asks.feedData,
                    prev!.orderBook!.bids.feedData,
                    orderBook
                )


                return {
                    ...prev!,
                    orderBook: {
                        ...prev!.orderBook,
                        bids: {
                            feedData: bids
                        },
                        asks: {
                            feedData: asks,
                        },
                        trades: tradeHistory
                            .map(data => {
                                return {
                                    id: crypto.randomUUID(),
                                    price: BigInt(data.price),
                                    qty: BigInt(data.size),
                                    // need a better way to do this -> timestamp
                                    time: Date.now() / 1000,
                                    action: data.order,
                                } as Trade
                            })
                            // how to properly sort?
                            // .sort()
                            .reverse()
                            .concat(prev!.orderBook.trades),
                    }
                }
            })

        }, 400)
    }

    setOrderBook(asks: Map<bigint, Order>, bids: Map<bigint, Order>, data: Payload[]) {
        data.forEach(data => {

            if (data.order === 'ask' && asks.has(data.price)) {

                const ask = asks.get(data.price)!;

                asks.set(data.price, {
                    ...ask,
                    size: data.method === 'add'
                        ? ask.size + data.size
                        : ask.size - data.size,
                });

                if (asks.get(data.price)!.size === BigInt(0)) {
                    asks.delete(data.price);
                } else if (ask.size < BigInt(0)) {
                    // data out of sync, need to resync
                }

            } else if (data.order === 'ask') {
                asks.set(data.price, {
                    id: crypto.randomUUID(),
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

                if (bids.get(data.price)!.size === BigInt(0)) {
                    bids.delete(data.price);
                } else if (bid.size < BigInt(0)) {
                    // data out of sync, need to resync
                }

            } else if (data.order === 'bid') {
                bids.set(data.price, {
                    id: crypto.randomUUID(),
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
                return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
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
                return a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0;
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

        return { asks, bids }
    }

}

// MarketOrderQueue
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

const queue = new Queue();

// I wonder if this could cause some issues
const marketOrder = new MarketOrderState();

// rename to useMarket
// need to handle if get no data, could use default empty state instead of null
export const useTransaction = (marketId: PublicKey) => {
    const [data, setData] = useState<Market | null>(null);
    const [subscribeId, setSubscribeId] = useState<number | undefined>()
    const { connection } = useConnection();
    const userWallet = useAnchorWallet();

    const base = new URL("./api/", API_ENDPOINT)

    queue.update(setData);

    useEffect(() => {
        if (subscribeId === undefined || connection === undefined) {
            return
        }

        return () => {
            connection
                .removeOnLogsListener(subscribeId!)
                .then(() => console.log("logs ended"))
                .catch(error => console.log("error", error))
        }

    }, [subscribeId, connection])

    const load = async (marketId: PublicKey, queue: Queue) => {

        const bookParams = new URLSearchParams();
        bookParams.append("book_config", marketId.toString());

        const candleParams = new URLSearchParams();
        candleParams.append("book_config", marketId.toString());
        candleParams.append("interval", '1m');
        candleParams.append("limit", (1000).toString());
        candleParams.append("offset", (0).toString());

        const orderBookURL = new URL("./market_order_book?" + bookParams.toString(), base);
        const candleDataURL = new URL("./market_history?" + candleParams.toString(), base);

        try {

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

            // need to add redirect to home page if  marketId is not found
            if (book === null) {
                return
            }

            const candles = await (async () => {
                if (response[1].status === 200) {
                    const data = await response[1].json();
                    return data === null ? { market: [] } : data;
                }
                return { market: [] };
            })();

            const asks = new Map<bigint, Order>();
            const bids = new Map<bigint, Order>();

            book.book.asks.forEach((element: IncomingOrder) => {

                const price = BigInt(element.price);
                asks.set(price, {
                    id: crypto.randomUUID(),
                    price: price,
                    size: asks.has(price)
                        ? asks.get(price)!.size + (BigInt(element.size) - BigInt(element.fill))
                        : BigInt(element.size) - BigInt(element.fill),
                    depth: BigInt(0),
                });
            });

            book.book.bids.forEach((element: IncomingOrder) => {

                const price = BigInt(element.price);
                bids.set(price, {
                    id: crypto.randomUUID(),
                    price: price,
                    size: bids.has(price)
                        ? bids.get(price)!.size + (BigInt(element.size) - BigInt(element.fill))
                        : BigInt(element.size) - BigInt(element.fill),
                    depth: BigInt(0),
                });
            });

            const feedData = queue.setOrderBook(
                asks,
                bids,
                queue.get()[0],
            )

            const userPositionConfig = PublicKey.findProgramAddressSync([
                userWallet!.publicKey!.toBuffer(),
                new PublicKey(book!.pubkeyId).toBuffer(),
                Buffer.from("order-position-config"),
            ], PROGRAM_ID)[0];

            console.log(response)
            console.log(candles)

            console.log(book)

            const store = {
                // how to handle including image?
                // image: "https://dd.dexscreener.com/ds-data/tokens/ethereum/0x28561b8a2360f463011c16b6cc0b0cbef8dbbcad.png?size=lg&key=f7c99e",
                image: "",
                page: 0,
                candles: updateCandles(candles.market, book.tokenDecimalsA, book.tokenDecimalsB, book.isReverse)
                    .sort((a: Candle, b: Candle) => a.time - b.time),

                user: {
                    // will remove?
                    positionConfigNonce: BigInt(0),
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
                        userAddress: userWallet ? userWallet!.publicKey : undefined,
                        // will remove?
                        userPositionConfig: userPositionConfig,
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
                            book.marketData === undefined || book.marketData.prevLastPrice === "0" || book.marketData.prevLastPrice === 0
                                ? 0
                                : BigInt(book.marketData.changeDelta) * BigInt(100_000) / BigInt(book.marketData.prevLastPrice)
                        ),
                    },

                    trades: book.trades.map((data: Trade) => {
                        return {
                            id: crypto.randomUUID(),
                            price: BigInt(data.price),
                            qty: BigInt(data.qty),
                            action: String(data.action),
                            time: Number(data.time),
                        } as Trade
                    }),

                    asks: {
                        feedData: feedData.asks,
                    },
                    bids: {
                        feedData: feedData.bids,
                    },
                }
            }

            setData(store);
        } catch (err) {
            console.log(err)
        }
    }

    const getCandleData = async () => {
        const offset = data!.page! * 1000;

        const params = new URLSearchParams();
        params.append("book_config", marketId.toString());
        params.append("offset", offset.toString());
        params.append("limit", (1000).toString());
        // need to fetch interval

        const candleDataURL = new URL(`./market_history?${params.toString()}`, base);

        try {

            const response = await fetch(candleDataURL);
            const candles = await response.json();

            console.log(candles)

            const { isReverse, decimalsA, decimalsB } = data!.orderBook.marketDetails;

            setData({
                ...data!,
                page: data!.page! + 1,
                candles: updateCandles(candles.market, decimalsA, decimalsB, isReverse)
                    .concat(data!.candles!)
                    .sort((a: Candle, b: Candle) => a.time - b.time)
            });

        } catch (err) {
            console.log(err)
        }
    }

    const run = () => {
        // so I have a complicated process here
        // on first render userWallet doens't exist
        // but the data is fetched, 2 times
        // once userWallet is avaiable, data is not null
        // and doesn't fetch again... interesting issue
        // how to resolve?... for now the user is forced to have a wallet
        // until I can find some clever way to handle this
        if (userWallet === undefined || connection === undefined || data !== null || subscribeId !== undefined) {
            // need to cache and return id

            return {
                data,
                marketOrder,
                getCandleData,
                subscribeId,
            }
        }

        // edge case: as this data is initialize on first render
        // the actual market order data may not be null
        // so need to come back to this to handle better
        marketOrder.update("buy", null);
        marketOrder.update("sell", null);

        const id = eventListner(
            marketId,
            [
                MARKET_ORDER_TRIGGER_EVENT,
                MARKET_ORDER_FILL_EVENT,
                MARKET_ORDER_COMPLETE_EVENT,
                OPEN_LIMIT_ORDER_EVENT,
                CANCEL_LIMIT_ORDER_EVENT,
            ],
            (method, payload) => {

                switch (method) {
                    case "trigger-market-order": {
                        marketOrder.update(payload.orderType, payload.nextPointer);

                        break;
                    }

                    case "fill-market-order": {
                        console.log("fill payload", payload)
                        queue.push('order-book', {
                            method: "sub",
                            order: payload.orderType!,
                            price: BigInt(payload.price as bigint || 0),
                            size: BigInt(payload.amount as bigint || 0),
                        });

                        queue.push('trade-history', {
                            method: "sub",
                            order: payload.orderType!,
                            price: BigInt(payload.price as bigint || 0),
                            size: BigInt(payload.amount as bigint || 0),
                        });

                        // need to set candles from here?

                        break;
                    }

                    case "complete-market-order": {
                        marketOrder.update(payload.orderType, null);

                        setData((prev: Market | null) => {
                            if (prev === null) {
                                // I don't think this is right?
                                return null
                            }

                            return {
                                ...prev,
                                orderBook: {
                                    ...prev.orderBook,
                                    marketData: {
                                        lastPrice: BigInt(payload.price! as bigint),
                                        volume: prev.orderBook.marketData.volume + BigInt(payload!.totalAmount! as bigint),
                                        change: BigInt(0),
                                        turnover: prev.orderBook.marketData.turnover + BigInt(payload.totalCost! as bigint),
                                    }
                                }

                            }
                        })

                        // need to set candles from here?

                        break;
                    }

                    case "open-limit-order": {
                        queue.push('order-book', {
                            method: "add",
                            order: payload.orderType!,
                            price: BigInt(payload.price as bigint || 0),
                            size: BigInt(payload.size as bigint || 0),
                        });

                        break;
                    }

                    case "cancel-limit-order": {
                        queue.push('order-book', {
                            method: "sub",
                            order: payload.orderType!,
                            price: BigInt(payload.price as bigint || 0),
                            size: BigInt(payload.size as bigint || 0),
                        });

                        break;
                    }
                }
            });

        setSubscribeId(id);
        setTimeout(() => {
            load(marketId, queue);

        }, 4000);

        return {
            data,
            marketOrder,
            getCandleData,
            subscribeId,
        }
    }

    return run();
}

const updateCandles = (candles: DBCandle[], decimalsA: number, decimalsB: number, isReverse: boolean) => {
    // not sure if this is correct deriving the decimals, will come back to this later
    // also need a simple algo to handle tuncation
    const decimal = !isReverse ? decimalsA : decimalsB;
    return candles.map((data: DBCandle) => {

        return {
            time: data.timestamp,
            open: Number(displayValue(BigInt(data.open), decimal)),
            high: Number(displayValue(BigInt(data.high), decimal)),
            low: Number(displayValue(BigInt(data.low), decimal)),
            close: Number(displayValue(BigInt(data.close), decimal)),
        }
    });
}

interface Payload {
    method: string;
    order: string;
    price: bigint,
    size: bigint,
};

interface IncomingOrder {
    id: string,
    price: string;
    size: string;
    fill: string
    depth: string;
}

export interface Order {
    id: string,
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

export type DBCandle = {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
};

export type Trade = {
    id: string,
    price: bigint;
    qty: bigint;
    time: number;
    action: "buy" | "sell";
};

export interface Market {
    image: string | undefined,
    candles: Candle[] | undefined,
    page: number,
    user: {
        positionConfigNonce: bigint | undefined,
    },
    // WIP
    // openPositions: Position[],
    orderBook: {
        accounts: {
            marketId: PublicKey,
            sellMarketPointer: PublicKey,
            buyMarketPointer: PublicKey,
            tokenMintA: PublicKey,
            tokenMintB: PublicKey,
            tokenProgramA: PublicKey,
            tokenProgramB: PublicKey,
            userAddress: PublicKey | undefined,
            userPositionConfig: PublicKey | undefined,
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
    },
}

export interface Position {
    orderType: string,
    price: bigint,
    size: bigint,
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