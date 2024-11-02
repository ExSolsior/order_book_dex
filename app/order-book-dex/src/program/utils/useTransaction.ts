import { useContext, useState } from "react";
import { createContext } from "vm";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import {
    eventListner,
    OPEN_LIMIT_ORDER_EVENT,
    CANCEL_LIMIT_ORDER_EVENT,
    MARKET_ORDER_FILL_EVENT,
} from "./events"
import BN from "bn.js";

// const transactionContext = createContext();

interface Payload {
    method: string;
    order: string;
    price: bigint,
    size: bigint,
}

interface Order {
    price: bigint;
    size: bigint;
    depth: bigint;
}

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

const useTransactions = async (wallet: PublicKey, bookConfigId: PublicKey, programId: PublicKey) => {
    const [data, setData] = useState<any>(null);

    // const {wallet} = useWallet();

    const load = async (bookConfigId: PublicKey, queue: Queue) => {
        // http://127.0.0.1:8000/api/market_order_book?pubkey_id=BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK
        // http://127.0.0.1:8000/api/market_history?pubkey_id=BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK&interval=1m&limit=20&offset=0
        const base = new URL("http://127.0.0.1:8000/api")
        const orderBook = new URL(`/market_order_book?pubkey=${bookConfigId.toString()}`, base);
        const marketData = new URL(`/market_history?${bookConfigId.toString()}&interval=1m&limit=1000&offset=0`, base);

        try {
            const response = await Promise.all([
                fetch(orderBook),
                fetch(marketData)
            ]);

            let data = await response[0].json();
            // let data = await response[1].json();

            let asks = new Map<bigint, Order>();
            let bids = new Map<bigint, Order>();

            // also need display format and real format
            data.book.asks.forEach((element: any) => {

                const price = BigInt(element.price);
                asks.set(price, {
                    price: price,
                    size: asks.has(price)
                        ? asks.get(price)!.size + BigInt(element.size)
                        : BigInt(element.size),
                    depth: BigInt(0),
                });
            });

            data.book.bids.forEach((element: any) => {

                const price = BigInt(element.price);
                bids.set(element.price, {
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

            let askDepth = 0;
            asks = new Map<bigint, Order>(asks
                .entries()
                .toArray()
                .sort((a: any, b: any) => a[1].price - b[1].price));

            asks
                .values()
                .forEach((data: any) => {
                    askDepth += data.size;
                    data.depth = askDepth;

                    asks.set(data.price, {
                        ...data,
                    });
                });

            let bidDepth = 0;
            bids = new Map<bigint, Order>(bids
                .entries()
                .toArray()
                .sort((a: any, b: any) => a[1].price - b[1].price)
                .reverse());

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
                orderBook: {
                    accounts: {
                        bookConfigId: new PublicKey(data.pubkeyId),
                        sellMarketPointer: new PublicKey(data.sellMarketPointer),
                        buyMarketPointer: new PublicKey(data.buyMarketPointer),
                        tokenMintA: new PublicKey(data.tokenMintA),
                        tokenMintB: new PublicKey(data.tokenMintB),
                        tokenProgramA: new PublicKey(data.tokenProgramA),
                        tokenProgramB: new PublicKey(data.tokenProgramB),
                        userAddress: new PublicKey(wallet),
                        userPositionConfig: PublicKey.findProgramAddressSync([
                            wallet.toBuffer(),
                            new PublicKey(data.pubkeyId).toBuffer(),
                            Buffer.from("order-position-config"),
                        ], programId),
                        userCapitalA: getAssociatedTokenAddress(
                            new PublicKey(data.tokenMintA),
                            wallet,
                            false,
                            programId,
                        ),
                        userCapitalB: getAssociatedTokenAddress(
                            new PublicKey(data.tokenMintB),
                            wallet,
                            false,
                            programId,
                        ),
                        userVaultA: PublicKey.findProgramAddressSync([
                            new PublicKey(data.pubkeyId).toBuffer(),
                            new PublicKey(data.tokenMintA).toBuffer(),
                            wallet.toBuffer(),
                            Buffer.from("vault-account"),
                        ], programId),
                        userVaultB: PublicKey.findProgramAddressSync([
                            new PublicKey(data.pubkeyId).toBuffer(),
                            new PublicKey(data.tokenMintB).toBuffer(),
                            wallet.toBuffer(),
                            Buffer.from("vault-account"),
                        ], programId),
                    },
                    marketDetails: {
                        isReverse: data.isReverse,
                        ticker: data.ticker,
                        symbolA: data.symbolA,
                        symbolB: data.symbolB,
                    },
                    marketData: {},
                    asks: {
                        feedData: asks,
                    },
                    bids: {
                        feedData: bids,
                    },
                }
            }

            console.log(store);

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

        }
    }

    const run = () => {
        if (data !== null) {
            // need to cache and return id
            return
        }

        const queue = new Queue()
        const id = eventListner(
            bookConfigId,
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

        load(bookConfigId, queue);

        return id;
    }

    const id = run();

    return {
        data,
        load,
        marketData,
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