import { siteConfig } from "@/config/site";
import { OrderType } from "@/program/ProgramProvider";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const endpoint = `${siteConfig.backendUrl}/market_order_book`;

export type OrderBookEntry = {
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

export type MarketOrderBook = {
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
  order_book: OrderBookEntry[];
};

export const getMarketOrderBook = async (
  order_book_config_pubkey: PublicKey,
  limit: number = 20,
  offset: number = 0
): Promise<MarketOrderBook> => {
  try {
    const response = await fetch(
      `${endpoint}?pubkey_id=${order_book_config_pubkey.toBase58()}&limit=${limit}&offset=${offset}`
    );
    if (!response.ok) {
      console.log(response);
      throw new Error("Response status was not ok");
    }

    const response_data = await response.json();
    // TODO: Remove double parsing once backend is fixed
    const order_book_entries: OrderBookEntry[] = JSON.parse(
      response_data.order_book
    );

    return { ...response_data, order_book: order_book_entries };
  } catch (error) {
    console.error("Failed to fetch market order book data:", error);
    throw error;
  }
};

// For testing

// (async () => {
//   const data = await getMarketOrderBook(
//     new PublicKey("BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK")
//   );
//   console.log(JSON.stringify(data, null, 2));
// })();
