import { BN, type Program, web3 } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { type AnchorWallet } from "@solana/wallet-adapter-react";
import { OrderBookDex } from "./idl/types/order_book_dex";
import {
  getOrderPositionConfigPDA,
  getOrderPositionPDA,
  getVaultAccountPDA
} from "./pdas";
import { OrderType } from "./ProgramProvider";

export const getCreateVaultAccountsIx = async ({
  program,
  userWallet,
  orderBookConfigPDA,
  tokenMintA,
  tokenMintB,
  tokenProgramA,
  tokenProgramB
}: {
  program: Program<OrderBookDex>;
  userWallet: AnchorWallet;
  orderBookConfigPDA: web3.PublicKey;
  tokenMintA: web3.PublicKey;
  tokenMintB: web3.PublicKey;
  tokenProgramA: web3.PublicKey;
  tokenProgramB: web3.PublicKey;
}) =>
  await program.methods
    .createVaultAccounts()
    .accountsStrict({
      signer: userWallet.publicKey,
      orderBookConfig: orderBookConfigPDA,
      systemProgram: web3.SystemProgram.programId,
      tokenMintA,
      tokenMintB,
      tokenProgramA,
      tokenProgramB,
      vaultA: getVaultAccountPDA(
        orderBookConfigPDA,
        tokenMintA,
        userWallet.publicKey
      ),
      vaultB: getVaultAccountPDA(
        orderBookConfigPDA,
        tokenMintB,
        userWallet.publicKey
      )
    })
    .instruction();

export const getCreateOrderPositionConfigIx = async ({
  program,
  userWallet,
  orderBookConfigPDA
}: {
  program: Program<OrderBookDex>;
  userWallet: AnchorWallet;
  orderBookConfigPDA: web3.PublicKey;
}) =>
  await program.methods
    .createOrderPositionConfig()
    .accountsStrict({
      signer: userWallet.publicKey,
      orderBookConfig: orderBookConfigPDA,
      orderPositionConfig: getOrderPositionConfigPDA(
        userWallet.publicKey,
        orderBookConfigPDA
      ),
      systemProgram: web3.SystemProgram.programId
    })
    .instruction();

export const getCreateOrderPositionIx = async ({
  program,
  userWallet,
  orderBookConfigPDA,
  tokenMintA,
  tokenMintB,
  tokenProgramA,
  tokenProgramB,
  orderType,
  isReverse,
  price,
  amount,
  nonce
}: {
  program: Program<OrderBookDex>;
  userWallet: AnchorWallet;
  orderBookConfigPDA: web3.PublicKey;
  tokenMintA: web3.PublicKey;
  tokenMintB: web3.PublicKey;
  tokenProgramA: web3.PublicKey;
  tokenProgramB: web3.PublicKey;
  orderType: OrderType;
  isReverse: boolean;
  price: BN;
  amount: BN;
  nonce: BN;
}) => {
  // Determine source, destination and capital source based on is_reverse and orderType
  let resolvedSource: web3.PublicKey;
  let resolvedDest: web3.PublicKey;
  let capitalSource: web3.PublicKey;

  if (
    (!isReverse && orderType === OrderType.Bid) ||
    (isReverse && orderType === OrderType.Ask)
  ) {
    // Capital Source derived with mint A
    capitalSource = getAssociatedTokenAddressSync(
      tokenMintA,
      userWallet!.publicKey
    );

    // Source derived with mintA, destination derived with mintB
    resolvedSource = getVaultAccountPDA(
      orderBookConfigPDA,
      tokenMintA,
      userWallet!.publicKey
    );
    resolvedDest = getVaultAccountPDA(
      orderBookConfigPDA,
      tokenMintB,
      userWallet!.publicKey
    );
  } else {
    // Capital Source derived with mint B
    capitalSource = getAssociatedTokenAddressSync(
      tokenMintB,
      userWallet!.publicKey
    );

    // Source derived with mintB, destination derived with mintA
    resolvedSource = getVaultAccountPDA(
      orderBookConfigPDA,
      tokenMintB,
      userWallet!.publicKey
    );
    resolvedDest = getVaultAccountPDA(
      orderBookConfigPDA,
      tokenMintA,
      userWallet!.publicKey
    );
  }

  return await program.methods
    .createOrderPosition(orderType, new BN(price), new BN(amount))
    .accountsStrict({
      signer: userWallet.publicKey,
      orderBookConfig: orderBookConfigPDA,
      orderPosition: getOrderPositionPDA(nonce, userWallet.publicKey),
      orderPositionConfig: getOrderPositionConfigPDA(
        userWallet.publicKey,
        orderBookConfigPDA
      ),
      tokenMintA,
      tokenMintB,
      capitalSource,
      source: resolvedSource,
      destination: resolvedDest,
      tokenProgramA,
      tokenProgramB,
      systemProgram: web3.SystemProgram.programId
    })
    .instruction();
};

export const getOpenOrderPositionIx = async ({
  program,
  userWallet,
  orderBookConfigPDA,
  orderPositionPDA,
  marketPointerRead,
  marketPointerWrite,
  prevOrderPosition,
  nextOrderPosition,
  nextPositionPointer
}: {
  program: Program<OrderBookDex>;
  userWallet: AnchorWallet;
  orderBookConfigPDA: web3.PublicKey;
  orderPositionPDA: web3.PublicKey;
  marketPointerRead: web3.PublicKey;
  marketPointerWrite: web3.PublicKey;
  prevOrderPosition: web3.PublicKey | null;
  nextOrderPosition: web3.PublicKey | null;
  nextPositionPointer: web3.PublicKey | null;
}) =>
  await program.methods
    .openOrderPosition()
    .accountsStrict({
      signer: userWallet.publicKey,
      orderBookConfig: orderBookConfigPDA,
      orderPosition: orderPositionPDA,
      orderPositionConfig: getOrderPositionConfigPDA(
        userWallet.publicKey,
        orderBookConfigPDA
      ),
      marketPointerRead,
      marketPointerWrite,
      nextPositionPointer,
      nextOrderPosition,
      prevOrderPosition
    })
    .instruction();
