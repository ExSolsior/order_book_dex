// it("connection", async () => {


//     const conn = new Connection("https://rpc.devnet.soo.network/rpc");

//     const run = async (token) => {

//         const [tokenMintA, tokenMintB, symbolA, symbolB, isReverse] = token[0].pubkey._bn.lt(token[1].pubkey._bn)
//             ? [
//                 token[0].pubkey, token[1].pubkey,
//                 token[0].symbol, token[1].symbol,
//                 token[0].isBase && !token[1].isBase
//             ]

//             : [
//                 token[1].pubkey, token[0].pubkey,
//                 token[1].symbol, token[0].symbol,
//                 !token[0].isBase && token[1].isBase
//             ]

//         console.log(token[0].pubkey._bn.lt(token[1].pubkey._bn), tokenMintA, tokenMintB, isReverse)

//         const [orderBookConfig] = PublicKey.findProgramAddressSync([
//             tokenMintA.toBuffer(),
//             tokenMintB.toBuffer(),
//             Buffer.from('order-book-config'),
//         ], program.programId);

//         const [buyMarketPointer] = PublicKey.findProgramAddressSync([
//             Buffer.from('buy-market-pointer'),
//             orderBookConfig.toBuffer(),
//             Buffer.from('market-pointer'),
//         ], program.programId);

//         const [sellMarketPointer] = PublicKey.findProgramAddressSync([
//             Buffer.from('sell-market-pointer'),
//             orderBookConfig.toBuffer(),
//             Buffer.from('market-pointer'),
//         ], program.programId);

//         console.log()
//         console.log(orderBookConfig.toString())
//         try {

//             let instr = await program.methods.createTradePair(symbolA, symbolB, isReverse)
//                 .accountsStrict({
//                     authority: wallet.publicKey,
//                     orderBookConfig: orderBookConfig,
//                     buyMarketPointer,
//                     sellMarketPointer,
//                     tokenMintA,
//                     tokenMintB,
//                     tokenProgramA: TOKEN_PROGRAM_ID,
//                     tokenProgramB: TOKEN_PROGRAM_ID,
//                     systemProgram: SYSTEM_PROGRAM_ID,
//                 }).prepare()
//             // .signers([wallet.payer])
//             // .rpc();

//             instr.instruction.programId = new PublicKey("4z84hS8fsVpBgZvNwPtH82uUrjuoGP5GkRrTKkAaFDc9")
//             // console.log(instr.instruction)

//             const transaction = new Transaction();
//             transaction.add(instr.instruction)

//             let tx = await sendAndConfirmTransaction(conn, transaction, [wallet.payer])

//             console.log(`https://explorer.devnet.soo.network/tx/${tx}`)
//             console.log()
//         } catch (err) {
//             console.log(err)
//         }

//     }

//     // BTC / USDC   --  BTC -> mintA    --   USDC -> mintB   --   isReverse
//     // await run(
//     //   [
//     //     // BTC
//     //     { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: true },
//     //     // USDC
//     //     { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
//     //   ]
//     // )

//     const list = [
//         [

//             // BTC
//             { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: true },
//             // USDC
//             { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
//         ],

//         [
//             { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: true },
//             { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
//         ],

//         [
//             { pubkey: new PublicKey("9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP"), symbol: "SAM", isBase: true },
//             { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
//         ],

//         [
//             { pubkey: new PublicKey("4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4"), symbol: "RINSE", isBase: true },
//             { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
//         ],

//         [
//             { pubkey: new PublicKey("5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG"), symbol: "MISTY", isBase: true },
//             { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
//         ],

//         [
//             { pubkey: new PublicKey("ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej"), symbol: "MUTINY", isBase: true },
//             { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
//         ],

//         [
//             { pubkey: new PublicKey("9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW"), symbol: "SOON", isBase: true },
//             { pubkey: new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun"), symbol: "USDC", isBase: false },
//         ],



//         // [
//         //   { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: true },
//         //   { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
//         // ],

//         // [
//         //   { pubkey: new PublicKey("9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP"), symbol: "SAM", isBase: true },
//         //   { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
//         // ],

//         // [
//         //   { pubkey: new PublicKey("4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4"), symbol: "RINSE", isBase: true },
//         //   { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
//         // ],

//         // [
//         //   { pubkey: new PublicKey("5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG"), symbol: "MISTY", isBase: true },
//         //   { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
//         // ],

//         // [
//         //   { pubkey: new PublicKey("ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej"), symbol: "MUTINY", isBase: true },
//         //   { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
//         // ],

//         // [
//         //   { pubkey: new PublicKey("9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW"), symbol: "SOON", isBase: true },
//         //   { pubkey: new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz"), symbol: "BTC", isBase: false },
//         // ],


//         // [
//         //   { pubkey: new PublicKey("9mR2ij7R6eZgf8GFs9SmCycuLpSMLzkt52qmGqiDn9qP"), symbol: "SAM", isBase: true },
//         //   { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
//         // ],

//         // [
//         //   { pubkey: new PublicKey("4rHKMSrDnZEwFa9fV2xzgjMGyj5oNDrX9Njwc32Kghc4"), symbol: "RINSE", isBase: true },
//         //   { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
//         // ],

//         // [
//         //   { pubkey: new PublicKey("5yVazF5qf35Y4ppeeKP9D74L3mLWSEJJXhcTweF4uaGG"), symbol: "MISTY", isBase: true },
//         //   { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
//         // ],

//         // [
//         //   { pubkey: new PublicKey("ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej"), symbol: "MUTINY", isBase: true },
//         //   { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
//         // ],

//         // [
//         //   { pubkey: new PublicKey("9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW"), symbol: "SOON", isBase: true },
//         //   { pubkey: new PublicKey("FJnoYmBuTkgsbXpNKCLm4WwnPCZv7BfdKw5QrdtsNq9c"), symbol: "CHRONO", isBase: false },
//         // ],


//         // not htis
//         // [
//         //   { pubkey: new PublicKey("9GUVRmud5UeAwtrg9V3bVsXpKoxu6gKfHjnWoKWX5wKW"), symbol: "SOON", isBase: true },
//         //   { pubkey: new PublicKey("ErT9aiLJauBvRBb8Epf3mgAuGVmCqKmNdRWPwscLp7ej"), symbol: "CHRONO", isBase: false },
//         // ],
//     ].forEach(data => run(data))

// })


// const fn = () => {
//     const [orderPositionConfig] = PublicKey.findProgramAddressSync([
//         (new PublicKey("Day5aAzdktXLdReX7ud7gD5TGX9BtKQhtw6SbzC44Y1N")).toBuffer(),   //  signer

//         (new PublicKey("BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK")).toBuffer(),   //  config
//         Buffer.from('order-position-config'),
//     ], program.programId);

//     const [vaultA] = PublicKey.findProgramAddressSync([
//         (new PublicKey("BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK")).toBuffer(),   //  config
//         (new PublicKey("84zTKsj5fWTMne3ejVrVU2W6GXswyRKioMA4iSrtPtun")).toBuffer(),   //  mintA

//         (new PublicKey("Day5aAzdktXLdReX7ud7gD5TGX9BtKQhtw6SbzC44Y1N")).toBuffer(),   //  signer
//         Buffer.from('vault-account'),
//     ], program.programId);

//     const [vaultB] = PublicKey.findProgramAddressSync([
//         (new PublicKey("BqN7dPo4LheezCRC2kSX5PEyXBRNswvBzLzH7P5w2PWK")).toBuffer(),   //  config
//         (new PublicKey("HTAbX8zePCdDJJoPf2tf95RvExJ99wtqgGwnnXiLZUtz")).toBuffer(),   //  mintB

//         (new PublicKey("Day5aAzdktXLdReX7ud7gD5TGX9BtKQhtw6SbzC44Y1N")).toBuffer(),   //  signer
//         Buffer.from('vault-account'),
//     ], program.programId);

//     console.log("pos config", orderPositionConfig.toString())
//     console.log("vaultA", vaultA.toString())
//     console.log("vaultB", vaultB.toString())

// }

// // fn()

// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log("")
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log("")

// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log("")

// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log("")

// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log("")

// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log("")

// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())
// console.log(" :: ", Keypair.generate().publicKey.toString())