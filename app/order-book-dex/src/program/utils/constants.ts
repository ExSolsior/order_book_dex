import { PublicKey } from "@solana/web3.js";
import idl from "../idl/idl.json";

export const PROGRAM_ID = new PublicKey(idl.address);
export const CHRONO_IDL = JSON.parse(JSON.stringify(idl));

export const ORDER_BOOK_CONFIG_SEED = "order-book-config";
export const ORDER_POSITION_CONFIG_SEED = "order-position-config";
export const BUY_SEED = "buy-market-pointer";
export const SELL_SEED = "sell-market-pointer";
export const MARKET_POINTER_SEED = "market-pointer";
export const ORDER_POSITION_SEED = "order-position";
export const VAULT_ACCOUNT_SEED = "vault-account";