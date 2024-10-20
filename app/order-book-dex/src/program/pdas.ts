import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./utils/constants";
import { BN } from "@coral-xyz/anchor";
import * as constant from "./utils/constants";

export const getOrderBookConfigPDA = (
  tokenMintA: PublicKey,
  tokenMintB: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      tokenMintA.toBuffer(),
      tokenMintB.toBuffer(),
      Buffer.from(constant.ORDER_BOOK_CONFIG_SEED)
    ],
    PROGRAM_ID
  )[0];
};

export const getBuyMarketPointerPDA = (
  orderBookConfig: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(constant.BUY_SEED),
      orderBookConfig.toBuffer(),
      Buffer.from(constant.MARKET_POINTER_SEED)
    ],
    PROGRAM_ID
  )[0];
};

export const getSellMarketPointerPDA = (
  orderBookConfig: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(constant.SELL_SEED),
      orderBookConfig.toBuffer(),
      Buffer.from(constant.MARKET_POINTER_SEED)
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
      Buffer.from(constant.VAULT_ACCOUNT_SEED)
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
      Buffer.from(constant.ORDER_POSITION_CONFIG_SEED)
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
      Buffer.from(constant.ORDER_POSITION_SEED)
    ],
    PROGRAM_ID
  )[0];
};
