import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./utils/constants";
import { BN } from "@coral-xyz/anchor";

const ORDER_BOOK_CONFIG_SEED = "order-book-config";
const ORDER_POSITION_CONFIG_SEED = "order-position-config";
const BUY_SEED = "buy-market-pointer";
const SELL_SEED = "sell-market-pointer";
const MARKET_POINTER_SEED = "market-pointer";
const ORDER_POSITION_SEED = "order-position";
const VAULT_ACCOUNT_SEED = "vault-account";

export const getOrderBookConfigPDA = (
  tokenMintA: PublicKey,
  tokenMintB: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      tokenMintA.toBuffer(),
      tokenMintB.toBuffer(),
      Buffer.from(ORDER_BOOK_CONFIG_SEED)
    ],
    PROGRAM_ID
  )[0];
};

export const getBuyMarketPointerPDA = (
  orderBookConfig: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(BUY_SEED),
      orderBookConfig.toBuffer(),
      Buffer.from(MARKET_POINTER_SEED)
    ],
    PROGRAM_ID
  )[0];
};

export const getSellMarketPointerPDA = (
  orderBookConfig: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(SELL_SEED),
      orderBookConfig.toBuffer(),
      Buffer.from(MARKET_POINTER_SEED)
    ],
    PROGRAM_ID
  )[0];
};

export const getVaultAccountPDA = (
  orderBookConfig: PublicKey,
  tokenMint: PublicKey,
  signer: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      orderBookConfig.toBuffer(),
      tokenMint.toBuffer(),
      signer.toBuffer(),
      Buffer.from(VAULT_ACCOUNT_SEED)
    ],
    PROGRAM_ID
  )[0];
};

export const getOrderPositionConfigPDA = (
  signer: PublicKey,
  orderBookConfig: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      signer.toBuffer(),
      orderBookConfig.toBuffer(),
      Buffer.from(ORDER_POSITION_CONFIG_SEED)
    ],
    PROGRAM_ID
  )[0];
};

export const getOrderPositionPDA = (
  nonce: BN,
  signer: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      nonce.toArrayLike(Buffer, "le", 8),
      signer.toBuffer(),
      Buffer.from(ORDER_POSITION_SEED)
    ],
    PROGRAM_ID
  )[0];
};
