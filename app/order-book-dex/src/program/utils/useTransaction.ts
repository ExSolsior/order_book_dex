import { useContext, useState } from "react";
import { createContext } from "vm";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { addAbortListener } from "events";

const transactionContext = createContext();

const useTransactions = async (wallet: PublicKey, programId: PublicKey) => {
    const [data, setData] = useState<any>();
    // const {wallet} = useWallet();
    // load listener
    // fetch book config data

    const load = async (url: URL) => {
        try {
            const response = await Promise.all([
                fetch(url),
                fetch(url)
            ]);

            let data = await (response[0].json());
            // let data = await response[0].json();

            const asks = new Map();
            const bids = new Map();

            // using Number but need to look into using BigInt or BN
            // also need display format and real format
            data.book.asks.forEach((element: any) => {
                asks.set(element.price, {
                    index: asks.values().reduce((acc) => acc + 1, 0),
                    price: element.price,
                    size: asks.has(element.price)
                        ? asks.get(element.price).size + element.size
                        : element.size,
                    depth: 0,
                });
            });

            data.book.bids.forEach((element: any) => {
                bids.set(element.price, {
                    index: bids.values().reduce((acc) => acc + 1, 0),
                    price: element.price,
                    size: bids.has(element.price)
                        ? bids.get(element.price).size + element.size
                        : element.size,
                    depth: 0,
                });
            });

            // websocket data
            let queue = [
                { method: 'add', order: 'bid', price: 0, size: 0 },
                { method: 'sub', order: 'bid', price: 0, size: 0 },
                { method: 'add', order: 'ask', price: 0, size: 0 },
                { method: 'sub', order: 'ask', price: 0, size: 0 },

                { method: 'sub', order: 'buy', price: 0, size: 0 },
                { method: 'sub', order: 'sell', price: 0, size: 0 },
            ];

            queue.forEach(data => {

                if (data.order === 'ask' && asks.has(data.price)) {

                    const ask = asks.get(data.price);
                    if (data.method === 'sub') {

                        ask.size -= data.size;
                    } else {

                        ask.size += data.size;
                    }

                    if (ask.size === 0) {

                        asks.delete(data.price);
                    } else {

                        asks.set(data.price, {
                            ...ask,
                        });
                    }



                } else if (data.order === 'ask') {
                    // binary search
                    Array.from(asks.values());

                } else if (data.order === 'bid' && bids.has(data.price)) {

                    const bid = bids.get(data.price);
                    if (data.method === 'sub') {

                        bid.size -= data.size;
                    } else {

                        bid.size += data.size;
                    }

                    if (bid.size === 0) {

                        bids.delete(data.price);
                    } else {

                        bids.set(data.price, {
                            ...bid,
                        });
                    }

                } else if (data.order === 'bid') {

                    // binary search
                    Array.from(asks.values());

                } else if (data.order === 'sell' && bids.has(data.price)) {
                    const bid = bids.get(data.price);

                    if (bid.size === data.size) {
                        bids.delete(data.price);
                    } else {
                        bids.set(data.price, {
                            ...bid,
                            size: bid.size - data.size,
                        });
                    }

                } else if (data.order === 'buy' && asks.has(data.price)) {
                    const ask = asks.get(data.price);

                    if (ask.size === data.size) {
                        asks.delete(data.price);
                    } else {
                        asks.set(data.price, {
                            ...ask,
                            size: ask.size - data.size,
                        });
                    }

                }
            })

            let askDepth = 0;
            asks.values().forEach((data: any) => {

                askDepth += data.size;
                data.depth = askDepth;

                asks.set(data.price, {
                    ...data,
                })

            });

            let bidDepth = 0;
            bids.values().forEach((data: any) => {
                bidDepth += data.size;
                data.depth = bidDepth;

                bids.set(data.price, {
                    ...data,
                })
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
                    marketDetails: {},
                    marketData: {},
                    asks: {
                        feedData: asks,
                    },
                    bids: {
                        feedData: bids,
                    },

                }


            }


            // process response
            setData(store);
        } catch (err) {

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