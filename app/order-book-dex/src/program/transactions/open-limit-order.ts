import { MarketOrderBook } from "@/lib/types";
import { BN, Program, web3 } from "@coral-xyz/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection } from "@solana/web3.js";
import { OrderType } from "../ProgramProvider";
import { OrderBookDex } from "../idl/types/order_book_dex";
import {
  getCreateOrderPositionConfigIx,
  getCreateOrderPositionIx,
  getCreateVaultAccountsIx,
  getOpenOrderPositionIx
} from "../instructions";
import { getOrderPositionConfigPDA, getOrderPositionPDA } from "../pdas";
import { createVersionedTransaction } from "../utils/helper";
import { findPrevNextEntries } from "../utils/prev-next-orders";

export const createOpenLimitOrderTx = async ({
  marketOrderBook,
  connection,
  program,
  userWallet,
  nextPositionPointer,
  orderType,
  price,
  amount,
  nonce
}: {
  marketOrderBook: MarketOrderBook;
  connection: Connection;
  program: Program<OrderBookDex>;
  userWallet: AnchorWallet;
  nextPositionPointer: web3.PublicKey | null;
  orderType: OrderType;
  price: BN;
  amount: BN;
  nonce: BN;
}) => {
  const orderPositionConfigPDA = getOrderPositionConfigPDA(
    userWallet.publicKey,
    marketOrderBook.pubkey_id
  );

  const orderPositionConfig = await connection.getAccountInfo(
    orderPositionConfigPDA
  );

  const ixs = [];
  // User's first interaction with pair
  if (orderPositionConfig) {
    ixs.push(
      await getCreateVaultAccountsIx({
        program,
        userWallet,
        orderBookConfigPDA: marketOrderBook.pubkey_id,
        tokenMintA: marketOrderBook.token_mint_a,
        tokenMintB: marketOrderBook.token_mint_b,
        tokenProgramA: marketOrderBook.token_program_a,
        tokenProgramB: marketOrderBook.token_program_b
      }),
      await getCreateOrderPositionConfigIx({
        program,
        userWallet,
        orderBookConfigPDA: marketOrderBook.pubkey_id
      })
    );
  }

  ixs.push(
    await getCreateOrderPositionIx({
      program,
      userWallet,
      orderBookConfigPDA: marketOrderBook.pubkey_id,
      tokenMintA: marketOrderBook.token_mint_a,
      tokenMintB: marketOrderBook.token_mint_b,
      tokenProgramA: marketOrderBook.token_program_a,
      tokenProgramB: marketOrderBook.token_program_b,
      orderType,
      isReverse: marketOrderBook.is_reverse,
      price,
      amount,
      nonce
    })
  );

  const { prev, next } = findPrevNextEntries(
    orderType,
    price,
    marketOrderBook.order_book
  );
  ixs.push(
    await getOpenOrderPositionIx({
      program,
      userWallet,
      orderBookConfigPDA: marketOrderBook.pubkey_id,
      orderPositionPDA: getOrderPositionPDA(nonce, userWallet.publicKey),
      marketPointerRead: marketOrderBook.buy_market_pointer_pubkey,
      marketPointerWrite: marketOrderBook.sell_market_pointer_pubkey,
      prevOrderPosition: prev?.pubkeyId || null,
      nextOrderPosition: next?.pubkeyId || null,
      nextPositionPointer
    })
  );

  const tx = await createVersionedTransaction(
    connection,
    ixs,
    userWallet.publicKey
  );
  return tx;
};
