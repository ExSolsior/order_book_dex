import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { OrderBookDex } from "../target/types/order_book_dex";

import fs from 'node:fs';

import {
    getOrCreateAssociatedTokenAccount,
    TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createMint,
    createAccount,
    mintToChecked,
    getMinimumBalanceForRentExemptAccount,
    getAccount,
} from "@solana/spl-token";
import { publicKey } from "@coral-xyz/anchor/dist/cjs/utils";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";


// anchor.setProvider(anchor.AnchorProvider.env());

// const {
//     Keypair,
//     PublicKey,
//     Transaction,
//     TransactionInstruction,
//     SystemProgram,
//     sendAndConfirmTransaction,
// } = anchor.web3

// const provider = <AnchorProvider>anchor.getProvider();
// const program = anchor.workspace.OrderBookDex as Program<OrderBookDex>;
// const wallet = provider.wallet as Wallet;

// const run = async (
//     tokenMintA,
//     tokenMintB,
//     tokenSymbolA: string,
//     tokenSymbolB: string,
//     isReverse: boolean
// ) => {

//     const [orderBookConfig] = PublicKey.findProgramAddressSync([
//         tokenMintA.toBuffer(),
//         tokenMintB.toBuffer(),
//         Buffer.from('order-book-config'),
//     ], program.programId);

//     const [buyMarketPointer] = PublicKey.findProgramAddressSync([
//         Buffer.from('buy-market-pointer'),
//         orderBookConfig.toBuffer(),
//         Buffer.from('market-pointer'),
//     ], program.programId);

//     const [sellMarketPointer] = PublicKey.findProgramAddressSync([
//         Buffer.from('sell-market-pointer'),
//         orderBookConfig.toBuffer(),
//         Buffer.from('market-pointer'),
//     ], program.programId);

//     const tx = await program.methods
//         .createTradePair(tokenSymbolA, tokenSymbolB, isReverse)
//         .accountsStrict({
//             authority: wallet.publicKey,
//             orderBookConfig: orderBookConfig,
//             buyMarketPointer,
//             sellMarketPointer,
//             tokenMintA,
//             tokenMintB,
//             tokenProgramA: TOKEN_PROGRAM_ID,
//             tokenProgramB: TOKEN_PROGRAM_ID,
//             systemProgram: SYSTEM_PROGRAM_ID,
//         })
//         .signers([wallet.payer])
//         .rpc();

//     const latestBlockHash = await provider.connection.getLatestBlockhash()
//     await provider.connection.confirmTransaction({
//         blockhash: latestBlockHash.blockhash,
//         lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
//         signature: tx,
//     });

//     // console.log(`https://explorer.devnet.soo.network/tx/${tx}`)
//     console.log(`https://explorer.solana.com/tx//${tx}`)
//     console.log('')

// }



// const list =
//     [
//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: 'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf', symbol: 'BTC' },
//             { isReverse: false },
//         ],
//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: 'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c', symbol: '' },
//             { isReverse: false },

//         ],

//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP', symbol: '' },
//             { isReverse: false },

//         ],

//         [
//             { mint: '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4', symbol: '' },
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { isReverse: false },

//         ],

//         [
//             { mint: '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG', symbol: '' },
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { isReverse: false },

//         ],

//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: 'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej', symbol: '' },
//             { isReverse: false },

//         ],

//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW', symbol: '' },
//             { isReverse: false },

//         ],
//     ];

// list.forEach(data => {
//     run(
//         new PublicKey(data[0].mint),
//         new PublicKey(data[1].mint),
//         data[0].symbol,
//         data[1].symbol,
//         data[2].isReverse,
//     );
// })

// const run = async (
//     tokenMintA,
//     tokenMintB,
//     tokenSymbolA: string,
//     tokenSymbolB: string,
//     isReverse: boolean
// ) => {

//     // console.log("here", tokenMintA, tokenMintB)

//     const [orderBookConfig] = PublicKey.findProgramAddressSync([
//         tokenMintA.toBuffer(),
//         tokenMintB.toBuffer(),
//         Buffer.from('order-book-config'),
//     ], program.programId);


//     const [buyMarketPointer] = PublicKey.findProgramAddressSync([
//         Buffer.from('buy-market-pointer'),
//         orderBookConfig.toBuffer(),
//         Buffer.from('market-pointer'),
//     ], program.programId);


//     const [sellMarketPointer] = PublicKey.findProgramAddressSync([
//         Buffer.from('sell-market-pointer'),
//         orderBookConfig.toBuffer(),
//         Buffer.from('market-pointer'),
//     ], program.programId);

//     console.log(
//         "'", orderBookConfig.toString(), "'\n",
//         "'", tokenMintA.toString(), "'\n",
//         "'", tokenMintB.toString(), "'\n",
//         "'", TOKEN_PROGRAM_ID.toString(), "'\n",
//         "'", TOKEN_PROGRAM_ID.toString(), "'\n",
//         "'", buyMarketPointer.toString(), "'\n",
//         "'", sellMarketPointer.toString(), "'\n",
//         "'", tokenSymbolA, "'\n",
//         "'", tokenSymbolB, "'\n",
//         "'", isReverse ? `${tokenSymbolA}/${tokenSymbolB}` : `${tokenSymbolB}/${tokenSymbolA}`, "'\n",
//         "'", isReverse, "'\n",
//     )


//     const tx = await program.methods
//         .createTradePair(tokenSymbolA, tokenSymbolB, isReverse)
//         .accountsStrict({
//             authority: wallet.publicKey,
//             orderBookConfig: orderBookConfig,
//             buyMarketPointer,
//             sellMarketPointer,
//             tokenMintA,
//             tokenMintB,
//             tokenProgramA: TOKEN_PROGRAM_ID,
//             tokenProgramB: TOKEN_PROGRAM_ID,
//             systemProgram: SYSTEM_PROGRAM_ID,
//         })
//         .signers([wallet.payer])
//         .rpc();

//     console.log("fail")

//     const latestBlockHash = await provider.connection.getLatestBlockhash()
//     await provider.connection.confirmTransaction({
//         blockhash: latestBlockHash.blockhash,
//         lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
//         signature: tx,
//     });

//     // console.log(`https://explorer.devnet.soo.network/tx/${tx}`)
//     console.log(`https://explorer.solana.com/tx//${tx}`)
//     console.log('')

// }


// const list =
//     [
//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: 'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf', symbol: 'BTC' },
//             { isReverse: false },
//         ],

//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: 'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c', symbol: 'CHRONO' },
//             { isReverse: false },
//         ],

//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP', symbol: 'SAM' },
//             { isReverse: false },
//         ],

//         [
//             { mint: '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4', symbol: 'RINSE' },
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { isReverse: true },
//         ],

//         [
//             { mint: '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG', symbol: 'MISTY' },
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { isReverse: true },
//         ],

//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: 'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej', symbol: 'MUTINY' },
//             { isReverse: false },
//         ],

//         [
//             { mint: '84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun', symbol: 'USDC' },
//             { mint: '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW', symbol: 'SOON' },
//             { isReverse: false },
//         ],



//         [
//             { mint: 'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c', symbol: 'CHRONO' },
//             { mint: 'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf', symbol: 'BTC' },
//             { isReverse: true },
//         ],

//         [
//             { mint: '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP', symbol: 'SAM' },
//             { mint: 'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf', symbol: 'BTC' },
//             { isReverse: true },
//         ],

//         [
//             { mint: '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4', symbol: 'RINSE' },
//             { mint: 'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf', symbol: 'BTC' },
//             { isReverse: true },
//         ],

//         [
//             { mint: '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG', symbol: 'MISTY' },
//             { mint: 'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf', symbol: 'BTC' },
//             { isReverse: true },
//         ],

//         [
//             { mint: 'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej', symbol: 'MUTINY' },
//             { mint: 'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf', symbol: 'BTC' },
//             { isReverse: true },
//         ],

//         [
//             { mint: '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW', symbol: 'SOON' },
//             { mint: 'YSMcxbaK3SXax6CRCYpsDhGhPRdaBgrAtFoCY7QFovf', symbol: 'BTC' },
//             { isReverse: true },
//         ],



//         [
//             { mint: '9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP', symbol: 'SAM' },
//             { mint: 'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c', symbol: 'CHRONO' },
//             { isReverse: true },
//         ],

//         [
//             { mint: '4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4', symbol: 'RINSE' },
//             { mint: 'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c', symbol: 'CHRONO' },
//             { isReverse: true },
//         ],

//         [
//             { mint: '5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG', symbol: 'MISTY' },
//             { mint: 'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c', symbol: 'CHRONO' },
//             { isReverse: true },
//         ],

//         [
//             { mint: 'ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej', symbol: 'MUTINY' },
//             { mint: 'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c', symbol: 'CHRONO' },
//             { isReverse: true },
//         ],

//         [
//             { mint: '9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW', symbol: 'SOON' },
//             { mint: 'FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c', symbol: 'CHRONO' },
//             { isReverse: true },
//         ],
//     ];

// console.log(list.length)
// list.forEach(data => {
//     console.log("")
//     run(
//         new PublicKey(data[0].mint),
//         new PublicKey(data[1].mint),
//         data[0].symbol,
//         data[1].symbol,
//         data[2].isReverse,
//     );
// })



console.log('sanity check')




it("connection", async () => {


    const conn = new Connection("https://rpc.devnet.soo.network/rpc");

    const run = async (token) => {

        const [tokenMintA, tokenMintB, symbolA, symbolB, isReverse] = token[0].pubkey._bn.lt(token[1].pubkey._bn)
            ? [
                token[0].pubkey, token[1].pubkey,
                token[0].symbol, token[1].symbol,
                token[0].isBase && !token[1].isBase
            ]

            : [
                token[1].pubkey, token[0].pubkey,
                token[1].symbol, token[0].symbol,
                !token[0].isBase && token[1].isBase
            ]

        console.log(token[0].pubkey._bn.lt(token[1].pubkey._bn), tokenMintA, tokenMintB, isReverse)

        const [orderBookConfig] = PublicKey.findProgramAddressSync([
            tokenMintA.toBuffer(),
            tokenMintB.toBuffer(),
            Buffer.from('order-book-config'),
        ], program.programId);

        const [buyMarketPointer] = PublicKey.findProgramAddressSync([
            Buffer.from('buy-market-pointer'),
            orderBookConfig.toBuffer(),
            Buffer.from('market-pointer'),
        ], program.programId);

        const [sellMarketPointer] = PublicKey.findProgramAddressSync([
            Buffer.from('sell-market-pointer'),
            orderBookConfig.toBuffer(),
            Buffer.from('market-pointer'),
        ], program.programId);

        console.log()
        console.log(orderBookConfig.toString())

        let instr = await program.methods.createTradePair(symbolA, symbolB, isReverse)
            .accountsStrict({
                authority: wallet.publicKey,
                orderBookConfig: orderBookConfig,
                buyMarketPointer,
                sellMarketPointer,
                tokenMintA,
                tokenMintB,
                tokenProgramA: TOKEN_PROGRAM_ID,
                tokenProgramB: TOKEN_PROGRAM_ID,
                systemProgram: SYSTEM_PROGRAM_ID,
            }).prepare()
        // .signers([wallet.payer])
        // .rpc();

        instr.instruction.programId = new PublicKey("4z84hS8fsVpBgZvNwPtH82uUrjuoGP5GkRrTKkAaFDc9")
        // console.log(instr.instruction)

        const transaction = new Transaction();
        transaction.add(instr.instruction)

        let tx = await sendAndConfirmTransaction(conn, transaction, [wallet.payer])

        console.log(`https://explorer.devnet.soo.network/tx/${tx}`)
        console.log()

    }

    // BTC / USDC   --  BTC -> mintA    --   USDC -> mintB   --   isReverse
    // await run(
    //   [
    //     // BTC
    //     { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: true },
    //     // USDC
    //     { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
    //   ]
    // )

    const list = [
        // [

        //   // BTC
        //   { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
        //   // USDC
        //   { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: true },
        // ],

        // [
        //   { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: true },
        //   { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
        // ],

        // [
        //   { pubkey: new PublicKey("9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP"), symbol: "SAM", isBase: true },
        //   { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
        // ],

        // [
        //   { pubkey: new PublicKey("4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4"), symbol: "RINSE", isBase: true },
        //   { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
        // ],

        // [
        //   { pubkey: new PublicKey("5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG"), symbol: "MISTY", isBase: true },
        //   { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
        // ],

        // [
        //   { pubkey: new PublicKey("ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej"), symbol: "MUTINY", isBase: true },
        //   { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
        // ],

        // [
        //   { pubkey: new PublicKey("9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW"), symbol: "SOON", isBase: true },
        //   { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
        // ],

        [

            // BTC
            { pubkey: new PublicKey("2wL176N3bMHVXMSauMUd2hzZ4NvqXxUnM8FkUdgvwyEJ"), symbol: "BTC", isBase: true },
            // USDC
            { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
        ],

        [
            { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: true },
            { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
        ],

        [
            { pubkey: new PublicKey("9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP"), symbol: "SAM", isBase: true },
            { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
        ],

        [
            { pubkey: new PublicKey("4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4"), symbol: "RINSE", isBase: true },
            { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
        ],

        [
            { pubkey: new PublicKey("5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG"), symbol: "MISTY", isBase: true },
            { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
        ],

        [
            { pubkey: new PublicKey("ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej"), symbol: "MUTINY", isBase: true },
            { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
        ],

        [
            { pubkey: new PublicKey("9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW"), symbol: "SOON", isBase: true },
            { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
        ],


        [
            { pubkey: new PublicKey("9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP"), symbol: "SAM", isBase: true },
            { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
        ],

        [
            { pubkey: new PublicKey("4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4"), symbol: "RINSE", isBase: true },
            { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
        ],

        [
            { pubkey: new PublicKey("5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG"), symbol: "MISTY", isBase: true },
            { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
        ],

        [
            { pubkey: new PublicKey("ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej"), symbol: "MUTINY", isBase: true },
            { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
        ],

        [
            { pubkey: new PublicKey("9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW"), symbol: "SOON", isBase: true },
            { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
        ],
    ].forEach(data => run(data))

})