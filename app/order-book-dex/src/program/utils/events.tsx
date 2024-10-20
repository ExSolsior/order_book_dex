import { BN } from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";

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
    orderPositionPubkey: PublicKey | undefined,
    orderBookConfigPubkey: PublicKey | undefined,
    sourcePubkey: PublicKey | undefined,
    destinationPubkey: PublicKey | undefined,
    nextPositionPubkey: PublicKey | undefined | null,
    tokenMintAPubkey: PublicKey | undefined,
    tokenMintBPubkey: PublicKey | undefined,
    tokenProgramAPubkey: PublicKey | undefined,
    tokenProgramBPubkey: PublicKey | undefined,
    sellMarketPointerPubkey: PublicKey | undefined,

    buyMarketPointerPubkey: PublicKey | undefined,
    orderPositionConfigPubkey: PublicKey | undefined,
    marketMarkerPubkey: PublicKey | undefined,
    vaultAPubkey: PublicKey | undefined,
    vaultBPubkey: PublicKey | undefined,

    nextPointerPubkey: PublicKey | undefined | null,
    price: BN | undefined,
    size: BN | undefined,
    totalCost: BN | undefined,
    totalAmount: BN | undefined,
    isReverse: boolean | undefined,
    isAvailable: boolean | undefined,
    isExecution: boolean | undefined,
    slot: BigInt | undefined,
    timestamp: BigInt | undefined,


}

const eventListner = (address: PublicKey, listen: Buffer[], callback: (data: ResponseData) => void) => {
    const conn = new Connection("https://rpc.devnet.soo.network/rpc");
    const subscriptionId = conn.onLogs(address, (logs) => {

        const eventData = logs.logs.find((log) => log.startsWith("Program data: "))?.slice("Program data: ".length);
        const decoded = Buffer.from(eventData as string, 'base64');
        const discrimniator = decoded.subarray(0, 8)

        switch (discrimniator) {
            case OPEN_LIMIT_ORDER_EVENT:
                openLimitOrderEvent(OPEN_LIMIT_ORDER_EVENT, listen, decoded, callback);
                break;

            case CANCEL_LIMIT_ORDER_EVENT:
                cancelLimitOrderEvent(CANCEL_LIMIT_ORDER_EVENT, listen, decoded, callback);
                break;

            case CLOSE_LIMIT_ORDER_EVENT:
                closeLimitOrderEvent(CLOSE_LIMIT_ORDER_EVENT, listen, decoded, callback);
                break;

            case CREATE_ORDER_POSITION_EVENT:
                createOrderPositionEvent(CREATE_ORDER_POSITION_EVENT, listen, decoded, callback);
                break;

            case NEW_ORDER_BOOK_CONFIG_EVENT:
                newOrderBookconfigEvent(NEW_ORDER_BOOK_CONFIG_EVENT, listen, decoded, callback);
                break;

            case NEW_ORDER_POSITION_CONFIG_EVENT:
                newOrderPositionConfigEvent(NEW_ORDER_POSITION_CONFIG_EVENT, listen, decoded, callback);
                break;

            case MARKET_ORDER_TRIGGER_EVENT:
                marketOrderTriggerEvent(MARKET_ORDER_TRIGGER_EVENT, listen, decoded, callback);
                break;

            case MARKET_ORDER_FILL_EVENT:
                marketOrderFillEvent(MARKET_ORDER_FILL_EVENT, listen, decoded, callback);
                break;

            case MARKET_ORDER_COMPLETE_EVENT:
                marketOrderCompleteEvent(MARKET_ORDER_COMPLETE_EVENT, listen, decoded, callback);
                break;

            default: console.log("invalid event discriminator");
        }

    }, "processed")

    return subscriptionId
}

const openLimitOrderEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        orderPositionPubkey: getPubkey(decoded, offset),
        orderBookConfigPubkey: getPubkey(decoded, offset),
        orderPositionConfigPubkey: getPubkey(decoded, offset),
        sourcePubkey: getPubkey(decoded, offset),
        destinationPubkey: getPubkey(decoded, offset),
        nextPositionPubkey: getOptionPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        price: getBN(decoded, offset),
        size: getBN(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),
        isAvailable: getIsAvailable(decoded, offset),

        tokenMintAPubkey: undefined,
        tokenMintBPubkey: undefined,
        tokenProgramAPubkey: undefined,
        tokenProgramBPubkey: undefined,
        sellMarketPointerPubkey: undefined,
        buyMarketPointerPubkey: undefined,
        marketMarkerPubkey: undefined,
        vaultAPubkey: undefined,
        vaultBPubkey: undefined,
        nextPointerPubkey: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        isReverse: undefined,
        isExecution: undefined,
    }

    callback(data)
}

const newOrderBookconfigEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        orderBookConfigPubkey: getPubkey(decoded, offset),
        tokenMintAPubkey: getPubkey(decoded, offset),
        tokenMintBPubkey: getPubkey(decoded, offset),
        tokenProgramAPubkey: getPubkey(decoded, offset),
        tokenProgramBPubkey: getPubkey(decoded, offset),
        sellMarketPointerPubkey: getPubkey(decoded, offset),
        buyMarketPointerPubkey: getPubkey(decoded, offset),
        tokenSymbolA: getSymbol(decoded, offset),
        tokenSymboB: getSymbol(decoded, offset),
        tokenDecimalsA: getDecimals(decoded, offset),
        tokenDecimalsB: getDecimals(decoded, offset),
        isReverse: getReverse(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        orderPositionPubkey: undefined,
        sourcePubkey: undefined,
        destinationPubkey: undefined,
        nextPositionPubkey: undefined,
        orderPositionConfigPubkey: undefined,
        marketMarkerPubkey: undefined,
        vaultAPubkey: undefined,
        vaultBPubkey: undefined,
        nextPointerPubkey: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        isAvailable: undefined,
        isExecution: undefined,
    }

    callback(data);
}

const newOrderPositionConfigEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        orderBookConfigPubkey: getPubkey(decoded, offset),
        orderPositionConfigPubkey: getPubkey(decoded, offset),
        marketMarkerPubkey: getPubkey(decoded, offset),
        vaultAPubkey: getPubkey(decoded, offset),
        vaultBPubkey: getPubkey(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        orderPositionPubkey: undefined,
        sourcePubkey: undefined,
        destinationPubkey: undefined,
        nextPositionPubkey: undefined,
        tokenMintAPubkey: undefined,
        tokenMintBPubkey: undefined,
        tokenProgramAPubkey: undefined,
        tokenProgramBPubkey: undefined,
        sellMarketPointerPubkey: undefined,

        buyMarketPointerPubkey: undefined,

        nextPointerPubkey: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        isReverse: undefined,
        isAvailable: undefined,
        isExecution: undefined,
    }

    callback(data);
}

const createOrderPositionEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        orderPositionPubkey: getPubkey(decoded, offset),
        orderBookConfigPubkey: getPubkey(decoded, offset),
        orderPositionConfigPubkey: getPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),

        sourcePubkey: undefined,
        destinationPubkey: undefined,
        nextPositionPubkey: undefined,
        tokenMintAPubkey: undefined,
        tokenMintBPubkey: undefined,
        tokenProgramAPubkey: undefined,
        tokenProgramBPubkey: undefined,
        sellMarketPointerPubkey: undefined,

        buyMarketPointerPubkey: undefined,
        marketMarkerPubkey: undefined,
        vaultAPubkey: undefined,
        vaultBPubkey: undefined,

        nextPointerPubkey: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        isReverse: undefined,
        isAvailable: undefined,
        isExecution: undefined,
        slot: undefined,
        timestamp: undefined,
    }

    callback(data);
}

const cancelLimitOrderEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        orderPositionPubkey: getPubkey(decoded, offset),
        orderBookConfigPubkey: getPubkey(decoded, offset),
        orderPositionConfigPubkey: getPubkey(decoded, offset),
        amount: getBN(decoded, offset),
        isAvailable: getIsAvailable(decoded, offset),

        sourcePubkey: undefined,
        destinationPubkey: undefined,
        nextPositionPubkey: undefined,
        tokenMintAPubkey: undefined,
        tokenMintBPubkey: undefined,
        tokenProgramAPubkey: undefined,
        tokenProgramBPubkey: undefined,
        sellMarketPointerPubkey: undefined,

        buyMarketPointerPubkey: undefined,
        marketMarkerPubkey: undefined,
        vaultAPubkey: undefined,
        vaultBPubkey: undefined,

        nextPointerPubkey: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        isReverse: undefined,
        isExecution: undefined,
        slot: undefined,
        timestamp: undefined,

    }

    callback(data);
}

const closeLimitOrderEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        orderPositionPubkey: getPubkey(decoded, offset),
        orderBookConfigPubkey: getPubkey(decoded, offset),
        orderPositionConfigPubkey: getPubkey(decoded, offset),

        sourcePubkey: undefined,
        destinationPubkey: undefined,
        nextPositionPubkey: undefined,
        tokenMintAPubkey: undefined,
        tokenMintBPubkey: undefined,
        tokenProgramAPubkey: undefined,
        tokenProgramBPubkey: undefined,
        sellMarketPointerPubkey: undefined,

        buyMarketPointerPubkey: undefined,
        marketMarkerPubkey: undefined,
        vaultAPubkey: undefined,
        vaultBPubkey: undefined,

        nextPointerPubkey: undefined,
        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        isReverse: undefined,
        isAvailable: undefined,
        isExecution: undefined,
        slot: undefined,
        timestamp: undefined,
    }

    callback(data);
}

const marketOrderTriggerEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        marketPointerPubkey: getPubkey(decoded, offset),
        orderBookPubkey: getPubkey(decoded, offset),
        nextPointerPubkey: getOptionPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        isExecution: getIsAvailable(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        orderPositionPubkey: undefined,
        orderBookConfigPubkey: undefined,
        sourcePubkey: undefined,
        destinationPubkey: undefined,
        nextPositionPubkey: undefined,
        tokenMintAPubkey: undefined,
        tokenMintBPubkey: undefined,
        tokenProgramAPubkey: undefined,
        tokenProgramBPubkey: undefined,
        sellMarketPointerPubkey: undefined,

        buyMarketPointerPubkey: undefined,
        orderPositionConfigPubkey: undefined,
        marketMarkerPubkey: undefined,
        vaultAPubkey: undefined,
        vaultBPubkey: undefined,

        price: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        isReverse: undefined,
        isAvailable: undefined,
    }

    callback(data);
}

const marketOrderFillEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        marketPointerPubkey: getPubkey(decoded, offset),
        orderBookPubkey: getPubkey(decoded, offset),
        orderPositionPubkey: getPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        price: getBN(decoded, offset),
        total: getBN(decoded, offset),
        amount: getBN(decoded, offset),
        newSize: getBN(decoded, offset),
        isExecution: getIsAvailable(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        orderBookConfigPubkey: undefined,
        sourcePubkey: undefined,
        destinationPubkey: undefined,
        nextPositionPubkey: undefined,
        tokenMintAPubkey: undefined,
        tokenMintBPubkey: undefined,
        tokenProgramAPubkey: undefined,
        tokenProgramBPubkey: undefined,
        sellMarketPointerPubkey: undefined,

        buyMarketPointerPubkey: undefined,
        orderPositionConfigPubkey: undefined,
        marketMarkerPubkey: undefined,
        vaultAPubkey: undefined,
        vaultBPubkey: undefined,

        nextPointerPubkey: undefined,
        size: undefined,
        totalCost: undefined,
        totalAmount: undefined,
        isReverse: undefined,
        isAvailable: undefined,
    }

    callback(data);
}

const marketOrderCompleteEvent = (discriminator: Buffer, listen: Buffer[], decoded: Buffer, callback: (data: ResponseData) => void) => {
    if (!listen.some(item => discriminator.equals(item))) {
        return
    }

    const offset = {
        value: 8,
    }

    const data = {
        marketPointerPubkey: getPubkey(decoded, offset),
        orderBookPubkey: getPubkey(decoded, offset),
        nextPointerPubkey: getOptionPubkey(decoded, offset),
        orderType: getOrderType(decoded, offset),
        totalCost: getBN(decoded, offset),
        totalAmount: getBN(decoded, offset),
        lastPrice: getBN(decoded, offset),
        newSize: getBN(decoded, offset),
        isExecution: getIsAvailable(decoded, offset),
        slot: getSlot(decoded, offset),
        timestamp: getTimestamp(decoded, offset),

        orderPositionPubkey: undefined,
        orderBookConfigPubkey: undefined,
        sourcePubkey: undefined,
        destinationPubkey: undefined,
        nextPositionPubkey: undefined,
        tokenMintAPubkey: undefined,
        tokenMintBPubkey: undefined,
        tokenProgramAPubkey: undefined,
        tokenProgramBPubkey: undefined,
        sellMarketPointerPubkey: undefined,

        buyMarketPointerPubkey: undefined,
        orderPositionConfigPubkey: undefined,
        marketMarkerPubkey: undefined,
        vaultAPubkey: undefined,
        vaultBPubkey: undefined,

        price: undefined,
        size: undefined,
        isReverse: undefined,
        isAvailable: undefined,
    }

    callback(data);
}

const getPubkey = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 32);
    return new PublicKey(data.subarray(start, end));
}

const getOptionPubkey = (data: Buffer, offset: { value: number }) => {
    const optionFlag = (() => {
        const { start, end } = updateOffset(offset, 1);
        return data.subarray(start, end);
    })();

    const { start, end } = updateOffset(offset, 32);
    if (!optionFlag) {
        return null
    }

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

const getReverse = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 1);
    return !!data.subarray(start, end).readUint8(0);
}

const getIsAvailable = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 1);
    return !!data.subarray(start, end).readUint8(0);
}

const getSlot = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 8);
    return data.subarray(start, end).readBigUint64BE(0)
}

const getTimestamp = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 8);
    return data.subarray(start, end).readBigInt64BE(0)

}

const getBN = (data: Buffer, offset: { value: number }) => {
    const { start, end } = updateOffset(offset, 8);
    return new BN(data.subarray(start, end));
}

const updateOffset = (offset: { value: number }, inc: number) => {
    const { value: start } = offset;
    offset.value += inc;
    const { value: end } = offset;

    return { start, end }
}

const listener = {
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
}


export default listener;
