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
import BN from "bn.js";
import { string } from "zod";
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
export const useTransaction = (marketId: PublicKey,) => {
    const [data, setData] = useState<Market | null>(null);
    const userWallet = useAnchorWallet();
    const { programId } = useContext(ProgramContext)!;

    const load = async (marketId: PublicKey, queue: Queue) => {

        const base = new URL("http://127.0.0.1:8000")
        const orderBook = new URL(`/api/market_order_book?book_config=${marketId.toString()}`, base);
        const marketData = new URL(`/api/market_history?book_config=${marketId.toString()}&interval=1m&limit=1000&offset=0`, base);


        try {

            const response = await Promise.all([
                fetch(orderBook),
                fetch(marketData)
            ]);

            console.log("response:", response);
            let data = await response[0].json();
            let market = await response[1].json();


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
                candles: [
                    {
                        time: 1537574400,
                        open: 29.630237296336794,
                        high: 35.36950035097501,
                        low: 26.21522501353531,
                        close: 30.734997177569916
                    },
                    {
                        time: 1537660800,
                        open: 32.267626500691215,
                        high: 34.452661663723774,
                        low: 26.096868360824704,
                        close: 29.573918833457004
                    },
                    {
                        time: 1537747200,
                        open: 27.33996760497746,
                        high: 35.8060364835531,
                        low: 27.33996760497746,
                        close: 33.06283432964511
                    },
                    {
                        time: 1537833600,
                        open: 31.1654368745013,
                        high: 31.97284477478497,
                        low: 26.766743287285593,
                        close: 27.364979322283386
                    },
                    {
                        time: 1537920000,
                        open: 29.5901452337888,
                        high: 32.147919593347474,
                        low: 27.53289219709677,
                        close: 29.202912415085272
                    },
                    {
                        time: 1538006400,
                        open: 27.561741523265923,
                        high: 35.11649043301526,
                        low: 25.20035866163233,
                        close: 31.14520649627546
                    },
                    {
                        time: 1538092800,
                        open: 31.925975006823798,
                        high: 31.925975006823798,
                        low: 28.998500720406675,
                        close: 29.87723790403876
                    },
                    {
                        time: 1538179200,
                        open: 30.826956088992475,
                        high: 34.79463130873015,
                        low: 25.291546123273097,
                        close: 28.994812708315987
                    },
                    {
                        time: 1538265600,
                        open: 31.202920145287838,
                        high: 33.19178819590413,
                        low: 23.94419012923956,
                        close: 31.47253745770869
                    },
                    {
                        time: 1538352000,
                        open: 26.927794164758666,
                        high: 34.6744456778885,
                        low: 26.927794164758666,
                        close: 31.091122539737423
                    },
                    {
                        time: 1538438400,
                        open: 26.452041173938298,
                        high: 34.527917622572154,
                        low: 26.452041173938298,
                        close: 27.65703395829094
                    },
                    {
                        time: 1538524800,
                        open: 27.74629982387605,
                        high: 29.300441707649835,
                        low: 23.761300216231263,
                        close: 29.182874625005628
                    },
                    {
                        time: 1538611200,
                        open: 30.41599722290526,
                        high: 31.942643078777103,
                        low: 27.09925359459428,
                        close: 30.918477883682872
                    },
                    {
                        time: 1538697600,
                        open: 25.76549797105683,
                        high: 33.4650523853759,
                        low: 25.76549797105683,
                        close: 28.15984801386293
                    },
                    {
                        time: 1538784000,
                        open: 27.543404135965382,
                        high: 30.7227783000902,
                        low: 25.749951838020884,
                        close: 29.150903848724184
                    },
                    {
                        time: 1538870400,
                        open: 29.34759861812077,
                        high: 31.08503530472835,
                        low: 23.395022079647823,
                        close: 25.00923131079722
                    },
                    {
                        time: 1538956800,
                        open: 27.00266154335036,
                        high: 29.51599687178633,
                        low: 23.46749249241176,
                        close: 28.702932483799707
                    },
                    {
                        time: 1539043200,
                        open: 25.569958099853594,
                        high: 27.669071502065417,
                        low: 25.569958099853594,
                        close: 25.626920473922613
                    },
                    {
                        time: 1539129600,
                        open: 24.886919828178304,
                        high: 27.167620185117006,
                        low: 23.71595991386752,
                        close: 23.71595991386752
                    },
                    {
                        time: 1539216000,
                        open: 26.14124249813686,
                        high: 29.5638477987916,
                        low: 20.82341105699825,
                        close: 25.563138238511257
                    },
                    {
                        time: 1539302400,
                        open: 22.26412127509447,
                        high: 27.637685003390743,
                        low: 20.838507431464958,
                        close: 22.450517792778047
                    },
                    {
                        time: 1539388800,
                        open: 25.75099239090953,
                        high: 28.12000626118839,
                        low: 21.929748303510852,
                        close: 22.63015682488669
                    },
                    {
                        time: 1539475200,
                        open: 25.428132591291497,
                        high: 25.999229490809693,
                        low: 22.266121337091555,
                        close: 23.51047528528147
                    },
                    {
                        time: 1539561600,
                        open: 25.07416967939059,
                        high: 25.50535192500713,
                        low: 21.96666570325133,
                        close: 21.96666570325133
                    },
                    {
                        time: 1539648000,
                        open: 24.957206161449307,
                        high: 26.679727314857256,
                        low: 20.196753994637245,
                        close: 21.523347810451863
                    },
                    {
                        time: 1539734400,
                        open: 23.705184745772733,
                        high: 26.754094837621004,
                        low: 18.724184302695104,
                        close: 20.160857555541725
                    },
                    {
                        time: 1539820800,
                        open: 21.95610851644136,
                        high: 22.914889536420105,
                        low: 19.567733140100472,
                        close: 22.914889536420105
                    },
                    {
                        time: 1539907200,
                        open: 23.216357873687972,
                        high: 25.44815512734246,
                        low: 19.54787451276509,
                        close: 20.76851802225937
                    },
                    {
                        time: 1539993600,
                        open: 19.6289025950405,
                        high: 24.290702755740412,
                        low: 19.041541929894358,
                        close: 22.48608548162324
                    },
                    {
                        time: 1540080000,
                        open: 23.599000037544915,
                        high: 26.839019853462844,
                        low: 20.884129956680898,
                        close: 22.01878871761756
                    },
                    {
                        time: 1540166400,
                        open: 24.618502768742008,
                        high: 28.00099352255492,
                        low: 23.061935629399088,
                        close: 23.061935629399088
                    },
                    {
                        time: 1540252800,
                        open: 23.840701995876866,
                        high: 28.494382608429564,
                        low: 23.840701995876866,
                        close: 25.321841131665526
                    },
                    {
                        time: 1540339200,
                        open: 27.764925733189372,
                        high: 31.05550601484776,
                        low: 22.810929726970702,
                        close: 30.02406259204889
                    },
                    {
                        time: 1540425600,
                        open: 29.703149280184604,
                        high: 34.0185175501095,
                        low: 26.82967654698301,
                        close: 32.06834171351323
                    },
                    {
                        time: 1540512000,
                        open: 29.0251492427822,
                        high: 36.89478162439007,
                        low: 28.3502671011196,
                        close: 32.822663125409356
                    },
                    {
                        time: 1540598400,
                        open: 35.040777462643284,
                        high: 35.12524316379231,
                        low: 26.805156020579663,
                        close: 34.23626219571325
                    },
                    {
                        time: 1540684800,
                        open: 31.21349419519032,
                        high: 35.73068910379853,
                        low: 31.064101813812698,
                        close: 34.75020857236565
                    },
                    {
                        time: 1540771200,
                        open: 32.34914826794689,
                        high: 42.381605482695505,
                        low: 30.176750284055878,
                        close: 39.24138147444552
                    },
                    {
                        time: 1540857600,
                        open: 38.84583808993371,
                        high: 41.75165839362154,
                        low: 33.37106955991806,
                        close: 35.93904098275507
                    },
                    {
                        time: 1540944000,
                        open: 37.070183005323564,
                        high: 44.84460203857022,
                        low: 35.23671284121251,
                        close: 36.329972003600034
                    },
                    {
                        time: 1541030400,
                        open: 43.31997309164893,
                        high: 48.43216497187469,
                        low: 38.30881963355285,
                        close: 41.554948540677586
                    },
                    {
                        time: 1541116800,
                        open: 41.33946811092929,
                        high: 46.65347243834853,
                        low: 37.472215586661335,
                        close: 39.26832265482503
                    },
                    {
                        time: 1541203200,
                        open: 44.76468593661226,
                        high: 44.76468593661226,
                        low: 40.039672147314235,
                        close: 43.42106786288436
                    },
                    {
                        time: 1541289600,
                        open: 49.13160326887013,
                        high: 49.13160326887013,
                        low: 40.93648693038296,
                        close: 42.17817698294767
                    },
                    {
                        time: 1541376000,
                        open: 50.46706012970579,
                        high: 54.38104598422352,
                        low: 38.159930155343616,
                        close: 47.5899156640143
                    },
                    {
                        time: 1541462400,
                        open: 48.25899506613569,
                        high: 48.25899506613569,
                        low: 45.63208604138365,
                        close: 45.63208604138365
                    },
                    {
                        time: 1541548800,
                        open: 52.45484210527629,
                        high: 57.55979771849961,
                        low: 45.23447676016779,
                        close: 46.01127464234881
                    },
                    {
                        time: 1541635200,
                        open: 53.228216675179624,
                        high: 54.07804814570622,
                        low: 40.61161433961706,
                        close: 47.689867390699014
                    },
                    {
                        time: 1541721600,
                        open: 46.193099316212816,
                        high: 56.190537353078824,
                        low: 45.01246323828753,
                        close: 49.14012661656766
                    },
                    {
                        time: 1541808000,
                        open: 50.409245396927986,
                        high: 52.3082002787041,
                        low: 41.764144138886394,
                        close: 52.3082002787041
                    },
                    {
                        time: 1541894400,
                        open: 48.58146178816203,
                        high: 52.653922195022126,
                        low: 47.34031788474959,
                        close: 47.34031788474959
                    },
                    {
                        time: 1541980800,
                        open: 46.80040325283692,
                        high: 56.709349494076804,
                        low: 45.81605691554122,
                        close: 45.81605691554122
                    },
                    {
                        time: 1542067200,
                        open: 46.042722425788355,
                        high: 58.476056411825695,
                        low: 46.042722425788355,
                        close: 51.2300776481609
                    },
                    {
                        time: 1542153600,
                        open: 53.909068487588385,
                        high: 60.240990154306715,
                        low: 45.230741063278664,
                        close: 51.34529637385427
                    },
                    {
                        time: 1542240000,
                        open: 53.739609857086606,
                        high: 53.739609857086606,
                        low: 44.38017019990068,
                        close: 47.595960698697894
                    }
                ],

                orderBook: {
                    accounts: {
                        marketId: new PublicKey(data.pubkeyId),
                        sellMarketPointer: new PublicKey(data.sellMarketPointer),
                        buyMarketPointer: new PublicKey(data.buyMarketPointer),
                        tokenMintA: new PublicKey(data.tokenMintA),
                        tokenMintB: new PublicKey(data.tokenMintB),
                        tokenProgramA: new PublicKey(data.tokenProgramA),
                        tokenProgramB: new PublicKey(data.tokenProgramB),
                        userAddress: userWallet!.publicKey,
                        userPositionConfig: PublicKey.findProgramAddressSync([
                            userWallet!.publicKey!.toBuffer(),
                            new PublicKey(data.pubkeyId).toBuffer(),
                            Buffer.from("order-position-config"),
                        ], programId!)[0],
                        userCapitalA: await getAssociatedTokenAddress(
                            new PublicKey(data.tokenMintA),
                            userWallet!.publicKey!,
                            true,
                            programId,
                        ),
                        userCapitalB: await getAssociatedTokenAddress(
                            new PublicKey(data.tokenMintB),
                            userWallet!.publicKey!,
                            true,
                            programId,
                        ),
                        userVaultA: PublicKey.findProgramAddressSync([
                            new PublicKey(data.pubkeyId).toBuffer(),
                            new PublicKey(data.tokenMintA).toBuffer(),
                            userWallet!.publicKey!.toBuffer(),
                            Buffer.from("vault-account"),
                        ], programId!)[0],
                        userVaultB: PublicKey.findProgramAddressSync([
                            new PublicKey(data.pubkeyId).toBuffer(),
                            new PublicKey(data.tokenMintB).toBuffer(),
                            userWallet!.publicKey!.toBuffer(),
                            Buffer.from("vault-account"),
                        ], programId!)[0],
                    },
                    marketDetails: {
                        isReverse: data.isReverse as boolean,
                        ticker: data.ticker as string,
                        // symbolA: data.symbolA as string,
                        // symbolB: data.symbolB as string,
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

        console.log("WALLET:", userWallet, data)


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