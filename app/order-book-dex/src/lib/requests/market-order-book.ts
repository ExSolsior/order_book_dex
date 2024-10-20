import { siteConfig } from "@/config/site";
import { OrderType } from "@/program/ProgramProvider";
import { BN, web3 } from "@coral-xyz/anchor";
import { MarketOrderBook } from "../types";

const PublicKey = web3.PublicKey;

const endpoint = `${siteConfig.backendUrl}/market_order_book`;

type OrderBookEntryResponse = {
  pubkeyId: string;
  orderPosConfig: string;
  nextOrderPos: string | null;
  marketMakerPubkey: string;
  orderType: OrderType;
  price: BN;
  size: BN;
  isAvailable: boolean;
  source: string | null;
  destination: string | null;
  slot: number;
  timestamp: number;
};

type MarketOrderBookResponse = {
  pubkey_id: string;
  token_mint_a: string;
  token_mint_b: string;
  token_program_a: string;
  token_program_b: string;
  sell_market_pointer_pubkey: string;
  buy_market_pointer_pubkey: string;
  token_mint_a_symbol: string;
  token_mint_b_symbol: string;
  is_reverse: boolean;
  // TODO: Remove double parsing once backend is fixed
  order_book: string;
};

export const getMarketOrderBook = async (
  order_book_config_pubkey: web3.PublicKey,
  limit: number = 20,
  offset: number = 0
): Promise<MarketOrderBook> => {
  const response = await fetch(
    `${endpoint}?pubkey_id=${order_book_config_pubkey.toBase58()}&limit=${limit}&offset=${offset}`
  );
  if (!response.ok) {
    console.log(response);
    throw new Error("Response status was not ok");
  }

  const response_data: MarketOrderBookResponse = await response.json();
  // TODO: Remove double parsing once backend is fixed
  const order_book_entries_response: OrderBookEntryResponse[] = JSON.parse(
    response_data.order_book
  );

  // Convert response to MarketOrderBook
  const marketOrderBook: MarketOrderBook = {
    pubkey_id: new PublicKey(response_data.pubkey_id),
    token_mint_a: new PublicKey(response_data.token_mint_a),
    token_mint_b: new PublicKey(response_data.token_mint_b),
    token_program_a: new PublicKey(response_data.token_program_a),
    token_program_b: new PublicKey(response_data.token_program_b),
    sell_market_pointer_pubkey: new PublicKey(
      response_data.sell_market_pointer_pubkey
    ),
    buy_market_pointer_pubkey: new PublicKey(
      response_data.buy_market_pointer_pubkey
    ),
    token_mint_a_symbol: response_data.token_mint_a_symbol,
    token_mint_b_symbol: response_data.token_mint_b_symbol,
    is_reverse: response_data.is_reverse,
    order_book: order_book_entries_response.map((entry) => ({
      pubkeyId: new PublicKey(entry.pubkeyId),
      orderPosConfig: new PublicKey(entry.orderPosConfig),
      nextOrderPos: entry.nextOrderPos
        ? new PublicKey(entry.nextOrderPos)
        : null,
      marketMakerPubkey: new PublicKey(entry.marketMakerPubkey),
      orderType: entry.orderType,
      price: new BN(entry.price),
      size: new BN(entry.size),
      isAvailable: entry.isAvailable,
      source: entry.source ? new PublicKey(entry.source) : null,
      destination: entry.destination ? new PublicKey(entry.destination) : null,
      slot: entry.slot,
      timestamp: entry.timestamp
    }))
  };

  return marketOrderBook;
};

// For testing

(async () => {
  try {
    const data = await getMarketOrderBook(
      new PublicKey("BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK")
    );
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
  }
})();
