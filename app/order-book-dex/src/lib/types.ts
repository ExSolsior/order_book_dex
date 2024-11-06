import { OrderType } from "@/program/ProgramProvider";
import { BN, web3 } from "@coral-xyz/anchor";

type PublicKey = web3.PublicKey;

export type MarketOrderBook = {
  pubkey_id: PublicKey;
  token_mint_a: PublicKey;
  token_mint_b: PublicKey;
  token_program_a: PublicKey;
  token_program_b: PublicKey;
  sell_market_pointer_pubkey: PublicKey;
  buy_market_pointer_pubkey: PublicKey;
  token_mint_a_symbol: string;
  token_mint_b_symbol: string;
  is_reverse: boolean;
  order_book: OrderBookEntry[];
};

export type OrderBookEntry = {
  pubkeyId: PublicKey;
  orderPosConfig: PublicKey;
  nextOrderPos: PublicKey | null;
  marketMakerPubkey: PublicKey;
  orderType: OrderType;
  price: BN;
  size: BN;
  isAvailable: boolean;
  source: PublicKey | null;
  destination: PublicKey | null;
  slot: number;
  timestamp: number;
};

export interface TransactionOrder {
  accountKey: PublicKey,
  readonlyIndexes: number[],
  writeableIndexes: number[],
  accounts: number[],
  data: number[],
  programIdIndex: number,
  message: TransactionOrder[],
}