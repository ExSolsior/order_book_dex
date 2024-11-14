import { BN } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";
// import { OrderType } from "../ProgramProvider";

const CANCEL_LIMIT_ORDER_EVENT = Buffer.from([216, 16, 162, 254, 206, 149, 207, 36]);
const CLOSE_LIMIT_ORDER_EVENT = Buffer.from([37, 48, 113, 193, 242, 130, 158, 58]);
const CREATE_ORDER_POSITION_EVENT = Buffer.from([172, 251, 54, 147, 127, 165, 156, 166]);
const MARKET_ORDER_COMPLETE_EVENT = Buffer.from([117, 159, 39, 123, 213, 191, 30, 5]);
const MARKET_ORDER_FILL_EVENT = Buffer.from([154, 188, 223, 75, 178, 109, 84, 46]);
const MARKET_ORDER_TRIGGER_EVENT = Buffer.from([72, 184, 141, 82, 42, 180, 101, 73]);
const NEW_ORDER_BOOK_CONFIG_EVENT = Buffer.from([212, 127, 42, 69, 195, 133, 17, 145]);
const NEW_ORDER_POSITION_CONFIG_EVENT = Buffer.from([135, 248, 180, 220, 179, 224, 202, 103]);
const OPEN_LIMIT_ORDER_EVENT = Buffer.from([106, 24, 71, 85, 57, 169, 158, 216]);

interface ResponseData {
    position: PublicKey | undefined,
    bookConfig: PublicKey | undefined,
    source: PublicKey | undefined,
    destination: PublicKey | undefined,
    nextPosition: PublicKey | undefined | null,
    tokenMintA: PublicKey | undefined,
    tokenMintB: PublicKey | undefined,
    tokenProgramA: PublicKey | undefined,
    tokenProgramB: PublicKey | undefined,
    sellMarketPointer: PublicKey | undefined,

    buyMarketPointer: PublicKey | undefined,
    positionConfig: PublicKey | undefined,
    marketMaker: PublicKey | undefined,
    marketTaker: PublicKey | undefined,
    capitalA: PublicKey | undefined,
    capitalB: PublicKey | undefined,
    vaultA: PublicKey | undefined,
    vaultB: PublicKey | undefined,

    nextPointer: PublicKey | undefined | null,
    capitalSource: PublicKey | undefined,
    capitalDest: PublicKey | undefined,
    capitalSourceMint: PublicKey | undefined,
    capitalDestMint: PublicKey | undefined,

    tokenSymbolA: string | undefined,
    tokenSymbolB: string | undefined,

    orderType: string | undefined,
    price: bigint | BN | undefined,
    size: bigint | BN | undefined,
    amount: bigint | undefined,
    totalCost: bigint | BN | undefined,
    totalAmount: bigint | BN | undefined,

    capitalSourceBalance: bigint | BN | undefined,
    capitalDestBalance: bigint | BN | undefined,


    isReverse: boolean | undefined,
    isAvailable: boolean | undefined,
    isExecution: boolean | undefined,
    nonce: bigint | BN | undefined,
    slot: bigint | BN | undefined,
    timestamp: bigint | BN | undefined,


}

const NEXT_PUBLIC_API_SVM = process.env.NEXT_PUBLIC_API_SVM as string;

const eventListner = (address: PublicKey, listen: Buffer[], callback: (method: string, data: ResponseData) => void) => {

    console.log("NEXT_PUBLIC_API_SVM", NEXT_PUBLIC_API_SVM);

    const conn = new Connection(NEXT_PUBLIC_API_SVM);
    const subscriptionId = conn.onLogs(address, (logs) => {

        for (const event of logs.logs.filter((log) => log.startsWith("Program data: "))) {

            const eventData = event.slice("Program data: ".length);
            const decoded = Buffer.from(eventData as string, 'base64');
            const discrimniator = decoded.subarray(0, 8)

            switch (discrimniator.toString()) {
                case OPEN_LIMIT_ORDER_EVENT.toString():
                    openLimitOrderEvent(OPEN_LIMIT_ORDER_EVENT, listen, decoded, callback);
                    break;

                case CANCEL_LIMIT_ORDER_EVENT.toString():
                    cancelLimitOrderEvent(CANCEL_LIMIT_ORDER_EVENT, listen, decoded, callback);
                    break;

                case CLOSE_LIMIT_ORDER_EVENT.toString():
                    closeLimitOrderEvent(CLOSE_LIMIT_ORDER_EVENT, listen, decoded, callback);
                    break;

                case CREATE_ORDER_POSITION_EVENT.toString():
                    createOrderPositionEvent(CREATE_ORDER_POSITION_EVENT, listen, decoded, callback);
                    break;

                case NEW_ORDER_BOOK_CONFIG_EVENT.toString():
                    newOrderBookconfigEvent(NEW_ORDER_BOOK_CONFIG_EVENT, listen, decoded, callback);
                    break;

                case NEW_ORDER_POSITION_CONFIG_EVENT.toString():
                    newOrderPositionConfigEvent(NEW_ORDER_POSITION_CONFIG_EVENT, listen, decoded, callback);
                    break;

                case MARKET_ORDER_TRIGGER_EVENT.toString():
                    marketOrderTriggerEvent(MARKET_ORDER_TRIGGER_EVENT, listen, decoded, callback);
                    break;

                case MARKET_ORDER_FILL_EVENT.toString():
                    marketOrderFillEvent(MARKET_ORDER_FILL_EVENT, listen, decoded, callback);
                    break;

                case MARKET_ORDER_COMPLETE_EVENT.toString():
                    marketOrderCompleteEvent(MARKET_ORDER_COMPLETE_EVENT, listen, decoded, callback);
                    break;

                default: console.log("invalid event discriminator");
            }
        }

    }, "processed")

    return subscriptionId
}

const openLimitOrderEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (method: string, data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        position: getPubkey(decoded, offset),
        bookConfig: getPubkey(decoded, offset),
        positionConfig: getPubkey(decoded, offset),
        source: getPubkey(decoded, offset),
        destination: getPubkey(decoded, offset),
        // this is not being processed on client, it's okay, so the state is not in the interface
        parentPosition: getOptionPubkey(decoded, offset),
        nextPosition: getOptionPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        price: getBN(decoded, offset),
        size: getBN(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),
        isAvailable: getIsAvailable(decoded, offset),
        // this is not being processed on client
        isHead: getIsHead(decoded, offset),

        tokenMintA: undefined,
        tokenMintB: undefined,
        tokenProgramA: undefined,
        tokenProgramB: undefined,
        sellMarketPointer: undefined,
        buyMarketPointer: undefined,
        marketMaker: undefined,
        capitalA: undefined,
        capitalB: undefined,
        vaultA: undefined,
        vaultB: undefined,
        nextPointer: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        nonce: undefined,
        isReverse: undefined,
        isExecution: undefined,
        capitalSourceBalance: undefined,
        capitalSourceMint: undefined,
        capitalDestBalance: undefined,
        capitalDestMint: undefined,

        tokenSymbolA: undefined,
        tokenSymbolB: undefined,
        capitalSource: undefined,
        capitalDest: undefined,
        marketTaker: undefined,
        amount: undefined,
    }

    callback("open-limit-order", data)
}

const newOrderBookconfigEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (method: string, data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        bookConfig: getPubkey(decoded, offset),
        tokenMintA: getPubkey(decoded, offset),
        tokenMintB: getPubkey(decoded, offset),
        tokenProgramA: getPubkey(decoded, offset),
        tokenProgramB: getPubkey(decoded, offset),
        sellMarketPointer: getPubkey(decoded, offset),
        buyMarketPointer: getPubkey(decoded, offset),
        tokenSymbolA: getSymbol(decoded, offset),
        tokenSymbolB: getSymbol(decoded, offset),
        tokenDecimalsA: getDecimals(decoded, offset),
        tokenDecimalsB: getDecimals(decoded, offset),
        isReverse: getReverse(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        orderType: undefined,
        position: undefined,
        source: undefined,
        destination: undefined,
        nextPosition: undefined,
        positionConfig: undefined,
        marketMaker: undefined,
        capitalA: undefined,
        capitalB: undefined,
        vaultA: undefined,
        vaultB: undefined,
        nextPointer: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        nonce: undefined,
        isAvailable: undefined,
        isExecution: undefined,
        capitalSourceBalance: undefined,
        capitalSourceMint: undefined,
        capitalDestBalance: undefined,
        capitalDestMint: undefined,

        capitalSource: undefined,
        capitalDest: undefined,
        marketTaker: undefined,
        amount: undefined,
    }

    callback("new-order-book", data);
}

const newOrderPositionConfigEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (method: string, data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        bookConfig: getPubkey(decoded, offset),
        positionConfig: getPubkey(decoded, offset),
        marketMaker: getPubkey(decoded, offset),
        capitalA: getPubkey(decoded, offset),
        capitalB: getPubkey(decoded, offset),
        vaultA: getPubkey(decoded, offset),
        vaultB: getPubkey(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        orderType: undefined,
        position: undefined,
        source: undefined,
        destination: undefined,
        nextPosition: undefined,
        tokenMintA: undefined,
        tokenMintB: undefined,
        tokenProgramA: undefined,
        tokenProgramB: undefined,
        sellMarketPointer: undefined,
        buyMarketPointer: undefined,
        nextPointer: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        nonce: undefined,
        isReverse: undefined,
        isAvailable: undefined,
        isExecution: undefined,
        capitalSourceBalance: undefined,
        capitalSourceMint: undefined,
        capitalDestBalance: undefined,
        capitalDestMint: undefined,

        tokenSymbolA: undefined,
        tokenSymbolB: undefined,
        capitalSource: undefined,
        capitalDest: undefined,
        marketTaker: undefined,
        amount: undefined,

    }

    callback("new-position-config", data);
}

const createOrderPositionEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (method: string, data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        marketMaker: getPubkey(decoded, offset),
        position: getPubkey(decoded, offset),
        bookConfig: getPubkey(decoded, offset),
        positionConfig: getPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        nonce: BigInt(getBN(decoded, offset).toString()),
        capitalSourceBalance: getBN(decoded, offset),
        capitalSourceMint: getPubkey(decoded, offset),


        source: undefined,
        destination: undefined,
        nextPosition: undefined,
        tokenMintA: undefined,
        tokenMintB: undefined,
        tokenProgramA: undefined,
        tokenProgramB: undefined,
        sellMarketPointer: undefined,
        buyMarketPointer: undefined,
        capitalA: undefined,
        capitalB: undefined,
        vaultA: undefined,
        vaultB: undefined,
        nextPointer: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        isReverse: undefined,
        isAvailable: undefined,
        isExecution: undefined,
        slot: undefined,
        timestamp: undefined,
        capitalDestBalance: undefined,
        capitalDestMint: undefined,

        tokenSymbolA: undefined,
        tokenSymbolB: undefined,
        capitalSource: undefined,
        capitalDest: undefined,
        marketTaker: undefined,
        amount: undefined,

    }

    callback("create-order-position", data);
}

const cancelLimitOrderEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (method: string, data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        position: getPubkey(decoded, offset),
        bookConfig: getPubkey(decoded, offset),
        positionConfig: getPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        price: getBN(decoded, offset),
        size: getBN(decoded, offset),
        isAvailable: getIsAvailable(decoded, offset),

        source: undefined,
        destination: undefined,
        nextPosition: undefined,
        tokenMintA: undefined,
        tokenMintB: undefined,
        tokenProgramA: undefined,
        tokenProgramB: undefined,
        sellMarketPointer: undefined,
        buyMarketPointer: undefined,
        marketMaker: undefined,
        capitalA: undefined,
        capitalB: undefined,
        vaultA: undefined,
        vaultB: undefined,
        nextPointer: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        nonce: undefined,
        isReverse: undefined,
        isExecution: undefined,
        slot: undefined,
        timestamp: undefined,
        capitalSourceBalance: undefined,
        capitalSourceMint: undefined,
        capitalDestBalance: undefined,
        capitalDestMint: undefined,

        tokenSymbolA: undefined,
        tokenSymbolB: undefined,
        capitalSource: undefined,
        capitalDest: undefined,
        marketTaker: undefined,
        amount: undefined
    }

    callback("cancel-limit-order", data);
}

const closeLimitOrderEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (method: string, data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        marketMaker: getPubkey(decoded, offset),
        position: getPubkey(decoded, offset),
        bookConfig: getPubkey(decoded, offset),
        positionConfig: getPubkey(decoded, offset),
        capitalSourceBalance: getBN(decoded, offset),
        capitalSourceMint: getPubkey(decoded, offset),
        capitalDestBalance: getBN(decoded, offset),
        capitalDestMint: getPubkey(decoded, offset),

        orderType: undefined,
        source: undefined,
        destination: undefined,
        nextPosition: undefined,
        tokenMintA: undefined,
        tokenMintB: undefined,
        tokenProgramA: undefined,
        tokenProgramB: undefined,
        sellMarketPointer: undefined,
        buyMarketPointer: undefined,
        capitalA: undefined,
        capitalB: undefined,
        vaultA: undefined,
        vaultB: undefined,
        nextPointer: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        nonce: undefined,
        isReverse: undefined,
        isAvailable: undefined,
        isExecution: undefined,
        slot: undefined,
        timestamp: undefined,

        tokenSymbolA: undefined,
        tokenSymbolB: undefined,
        capitalSource: undefined,
        capitalDest: undefined,
        marketTaker: undefined,
        amount: undefined,

    }

    callback("close-limit-order", data);
}

const marketOrderTriggerEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (method: string, data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        marketPointer: getPubkey(decoded, offset),
        bookConfig: getPubkey(decoded, offset),
        capitalSource: getPubkey(decoded, offset),
        capitalDest: getPubkey(decoded, offset),
        source: getPubkey(decoded, offset),
        destination: getPubkey(decoded, offset),
        nextPointer: getOptionPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        isExecution: getIsAvailable(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        position: undefined,
        nextPosition: undefined,
        tokenMintA: undefined,
        tokenMintB: undefined,
        tokenProgramA: undefined,
        tokenProgramB: undefined,
        sellMarketPointer: undefined,
        buyMarketPointer: undefined,
        positionConfig: undefined,
        marketMaker: undefined,
        capitalA: undefined,
        capitalB: undefined,
        vaultA: undefined,
        vaultB: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        nonce: undefined,
        isReverse: undefined,
        isAvailable: undefined,
        capitalSourceBalance: undefined,
        capitalSourceMint: undefined,
        capitalDestBalance: undefined,
        capitalDestMint: undefined,

        tokenSymbolA: undefined,
        tokenSymbolB: undefined,
        marketTaker: undefined,
        amount: undefined,

    }

    callback("trigger-market-order", data);
}

const marketOrderFillEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (method: string, data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        marketPointer: getPubkey(decoded, offset),
        bookConfig: getPubkey(decoded, offset),
        position: getPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        price: getBN(decoded, offset),
        total: getBN(decoded, offset),
        amount: getBN(decoded, offset),
        newSize: getBN(decoded, offset),
        isExecution: getIsAvailable(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        source: undefined,
        destination: undefined,
        nextPosition: undefined,
        tokenMintA: undefined,
        tokenMintB: undefined,
        tokenProgramA: undefined,
        tokenProgramB: undefined,
        sellMarketPointer: undefined,
        buyMarketPointer: undefined,
        positionConfig: undefined,
        marketMaker: undefined,
        capitalA: undefined,
        capitalB: undefined,
        vaultA: undefined,
        vaultB: undefined,
        nextPointer: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        nonce: undefined,
        isReverse: undefined,
        isAvailable: undefined,

        capitalSourceBalance: undefined,
        capitalSourceMint: undefined,
        capitalDestBalance: undefined,
        capitalDestMint: undefined,

        tokenSymbolA: undefined,
        tokenSymbolB: undefined,
        capitalSource: undefined,
        capitalDest: undefined,
        marketTaker: undefined,
    }

    callback("fill-market-order", data);
}

const marketOrderCompleteEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (method: string, data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        marketTaker: getPubkey(decoded, offset),
        marketPointer: getPubkey(decoded, offset),
        bookConfig: getPubkey(decoded, offset),
        nextPointer: getOptionPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        totalCost: getBN(decoded, offset),
        totalAmount: getBN(decoded, offset),
        lastPrice: getBN(decoded, offset),
        newSize: getBN(decoded, offset),
        isExecution: getIsAvailable(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        capitalSourceBalance: getBN(decoded, offset),
        capitalSourceMint: getPubkey(decoded, offset),
        capitalDestBalance: getBN(decoded, offset),
        capitalDestMint: getPubkey(decoded, offset),

        position: undefined,
        source: undefined,
        destination: undefined,
        nextPosition: undefined,
        tokenMintA: undefined,
        tokenMintB: undefined,
        tokenProgramA: undefined,
        tokenProgramB: undefined,
        sellMarketPointer: undefined,
        buyMarketPointer: undefined,
        positionConfig: undefined,
        marketMaker: undefined,
        capitalA: undefined,
        capitalB: undefined,
        vaultA: undefined,
        vaultB: undefined,
        price: undefined,
        size: undefined,
        nonce: undefined,
        isReverse: undefined,
        isAvailable: undefined,

        tokenSymbolA: undefined,
        tokenSymbolB: undefined,
        capitalSource: undefined,
        capitalDest: undefined,
        amount: undefined,

    }

    callback("complete-market-order", data);
}

const getPubkey = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 32);
    return new PublicKey(data.subarray(start, end));
}

const getOptionPubkey = (data: Buffer, offset: { value: number }) => {
    if (!getbool(data, offset)) {
        return null
    }

    const { start, end } = updateOffset(offset, 32);
    return new PublicKey(data.subarray(start, end));
}

const getOrderType = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 1);
    const num = data.subarray(start, end).readUint8(0);

    switch (num) {
        case 0: return 'buy';
        case 1: return 'sell';
        case 2: return 'bid';
        case 3: return 'ask';
    };
}

const getSymbol = (data: Buffer, offset: { value: number }) => {
    const size = (() => {
        const { start, end } = updateOffset(offset, 4);
        return data.subarray(start, end).readInt32BE(0);
    })();

    const { start, end } = updateOffset(offset, size);
    return data.subarray(start, end).toString();
}

const getDecimals = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 1);
    return data.subarray(start, end).readUint8(0);
}

const getbool = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 1);
    return data.subarray(start, end).readInt8(0) !== 0;
}

const getReverse = (data: Buffer, offset: { value: number }) => {
    return getbool(data, offset);
}

const getIsAvailable = (data: Buffer, offset: { value: number }) => {
    return getbool(data, offset);
}

const getIsHead = (data: Buffer, offset: { value: number }) => {
    return getbool(data, offset);
}

const getSlot = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 8);
    return data.subarray(start, end).readBigInt64LE(0)
}

const getTimestamp = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 8);
    return data.subarray(start, end).readBigInt64LE(0)
}

const getBN = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 8);
    return data.subarray(start, end).readBigInt64LE(0);
}

const updateOffset = (offset: { value: number }, inc: number) => {
    const { value: start } = offset;
    offset.value += inc;
    const { value: end } = offset;

    return { start, end }
}

// const listener = {
//     eventListner,
//     CANCEL_LIMIT_ORDER_EVENT,
//     CLOSE_LIMIT_ORDER_EVENT,
//     CREATE_ORDER_POSITION_EVENT,
//     MARKET_ORDER_COMPLETE_EVENT,
//     MARKET_ORDER_FILL_EVENT,
//     MARKET_ORDER_TRIGGER_EVENT,
//     NEW_ORDER_BOOK_CONFIG_EVENT,
//     NEW_ORDER_POSITION_CONFIG_EVENT,
//     OPEN_LIMIT_ORDER_EVENT,
// }


// export default listener;

export {
    eventListner,
    CANCEL_LIMIT_ORDER_EVENT,
    CLOSE_LIMIT_ORDER_EVENT,
    CREATE_ORDER_POSITION_EVENT,
    MARKET_ORDER_COMPLETE_EVENT,
    MARKET_ORDER_FILL_EVENT,
    MARKET_ORDER_TRIGGER_EVENT,
    NEW_ORDER_BOOK_CONFIG_EVENT,
    NEW_ORDER_POSITION_CONFIG_EVENT,
    OPEN_LIMIT_ORDER_EVENT,
};