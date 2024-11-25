"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Market, MarketOrderState } from "../../program/utils/useTransaction";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { MessageV0, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useContext } from "react";
import { ProgramContext } from "@/program/ProgramProvider";
import { TransactionOrder } from "@/lib/types";
import { CachedMarket } from "@/program/utils/types";
import { displayValue } from "@/program/utils/helper";
import { MarketContext } from "../provider/market-provider";
import { UserBalance } from "@/program/utils/useMarkets";

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT;

// need to add better validations


// structure to get image data is incorrect, currently not handling that
// so using dummy structure
export default function LimitOrder({
  market,
  marketOrder,
  type
}: {
  market: Market;
  marketOrder: MarketOrderState,
  type: "buy" | "sell" | "ask" | "bid";
}) {
  const { marketId } = market!.orderBook!.accounts;
  const { symbolA, symbolB, decimalsA, decimalsB, isReverse } = market!.orderBook!.marketDetails;
  const userWallet = useAnchorWallet();
  const { program } = useContext(ProgramContext)!;

  const { userBalance } = useContext(MarketContext);
  const balance = userBalance.find((user: UserBalance) => user.marketId.toString() === marketId.toString());
  const availableBalance = type === 'buy'
    ? !isReverse ? balance!.capitalAAmount : balance!.capitalBAmount
    : !isReverse ? balance!.capitalBAmount : balance!.capitalAAmount;

  const { lastPrice } = market!.orderBook!.marketData

  // WIP:: need to improve validations. they are jank and don't work
  const formSchema = z.object({
    price: z.string().refine((val) => {
      console.log(val, 'need to come back to fix this lol.')
      return true
    }, {
      message: "Expected number, received a string"
    }),
    quantity: z.string().refine((val) => {
      console.log(val, 'need to come back to fix this lol.')
      return type === 'sell'
        ? true
        : true
    }, {
      message: "Expected number, received a string"
    }),

    orderValue: z.string().refine((val) => {
      return type === 'buy'
        ? BigInt(convertNum(val.split(",").join(""), !isReverse ? decimalsA : decimalsB)) < availableBalance
        : true
    }, {

      message: `Expected value to be less than available balance: ${displayValue(availableBalance,
        type === 'buy'
          ? !isReverse ? decimalsA : decimalsB
          : !isReverse ? decimalsB : decimalsA
      )}`
    })
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: displayValue(lastPrice, !isReverse ? decimalsA : decimalsB).split(",").join(""),
      quantity: '0',
      orderValue: '0'
    },
    mode: "onChange",
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const priceDeicmals = !isReverse ? decimalsA : decimalsB;
    const amountDecimals = !isReverse ? decimalsB : decimalsA;
    const convertNum = (value: string, decimals: number) => {
      const list = value.split(".");

      if (list.length > 2) {
        // throw error
      }

      if (list.length === 1) {
        return list[0].concat("0".repeat(decimals));
      }

      if (list[0] === '0') {
        return list[1].padEnd(decimals, "0").replace(/^0+/, '');
      }

      return [list[0].replace(/^0+/, ''), list[1].padEnd(decimals, "0")].join("");
    }

    const price = convertNum(values.price.split(",").join(""), priceDeicmals);
    const amount = convertNum(values.quantity.split(",").join(""), amountDecimals);
    // const total = BigInt(price) * BigInt(amount);
    // validate total against quote balance

    // this should exist because creating and fetcing this data happens in the useMarkets
    const nonce = JSON.parse(localStorage
      .getItem(userWallet!.publicKey.toString())!)
      .markets.find((item: CachedMarket) => marketId.toString() === item.marketId)
      .positionConfigNonce as string;

    const params = new URLSearchParams({
      "book_config": marketId.toString(),
      "signer": userWallet!.publicKey.toString(),
      "order_type": type,
      "price": price,
      "amount": amount,
      "nonce": nonce,
    });

    if (type === "bid" && marketOrder.bidNextPointer !== null && marketOrder.bidNextPointer !== undefined) {
      params.append("next_position_pointer", marketOrder.bidNextPointer.toString());
    }

    if (type === "ask" && marketOrder.askNextPointer !== null && marketOrder.askNextPointer !== undefined) {
      params.append("next_position_pointer", marketOrder.askNextPointer.toString());
    }

    const base = new URL("./api/", API_ENDPOINT);
    const path = new URL("./open_limit_order?" + params.toString(), base.toString());

    fetch(path)
      .then((data) => {
        // check is okay
        // if not then throw error
        console.log(data);
        return data.json();
      })
      .then((data) => {
        const vMessage = new MessageV0({

          addressTableLookups: data.message[1].addressTableLookups.slice(1).map((data: TransactionOrder) => {
            return {
              accountKey: data.accountKey,
              readonlyIndexes: data.readonlyIndexes,
              writableIndexes: data.writeableIndexes,
            }
          }),

          compiledInstructions: data.message[1].instructions.slice(1).map((data: TransactionOrder) => {
            return {
              accountKeyIndexes: data.accounts.slice(1),
              data: new Uint8Array(data.data.slice(1)),
              programIdIndex: data.programIdIndex,
            }
          }),

          header: data.message[1].header,
          recentBlockhash: new PublicKey(Buffer.from(data.message[1].recentBlockhash)).toString(),
          staticAccountKeys: data.message[1].accountKeys.slice(1).map((data: number[]) => {
            return new PublicKey(Buffer.from(data));
          }),
        })

        const vTransaction = new VersionedTransaction(vMessage);
        return userWallet?.signTransaction(vTransaction);
      })
      .then((signedTransaction) => {

        // why does the wallet provider popup twice?
        return program!.provider!.sendAndConfirm!(signedTransaction as VersionedTransaction)
      })
      .then((data) => {
        // is a txSig, what to do with it?
        console.log(data)
      })
      .catch(err => {
        console.log(err)
      })
  }

  const convertNum = (value: string, decimals: number) => {
    const list = value.split(".");

    if (list.length > 2) {
      return '0'
    }

    if (list.length === 1) {
      return list[0].concat("0".repeat(decimals));
    }

    if (list[0] === '0') {
      return list[1].substring(0, decimals).padEnd(decimals, "0").replace(/^0+/, '');
    }

    return [list[0].replace(/^0+/, ''), list[1].substring(0, decimals).padEnd(decimals, "0")].join("");
  }

  let update = '';

  // when on focus on input, should place the curser after the last value
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
      >
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => {

            const isNumbers = field.value.split('').filter((value: string) => value !== '.')
              .every((value: string) => /^\d+(\.\d+)?$/.test(value))
            const isDecimals = field.value.includes(".")
            const quantity = form.getValues("quantity");

            if (!((isNumbers && isDecimals) || isNumbers)) {
              form.setValue("price", field.value
                .split('')
                .filter((value: string) => /^\d+(\.\d+)?$/.test(value))
                .join('')
                .trim())
            } else {

              if (field.value.length === 0) {
                form.setValue("price", '0')
              }

              if (field.value.length != 1 && field.value[0] === '0' && field.value[1] !== '.') {
                form.setValue("price", field.value.slice(1))
              }


              if (field.value[0] === '.') {
                form.setValue("price", '0' + field.value)

              }

              if (field.value.includes('.')) {
                const list = field.value.split('.')
                if (list.length > 2) {
                  form.setValue("price", field.value.substring(0, field.value.length - 1))
                }

                if (list[1].length > (!isReverse ? decimalsA : decimalsB)) {
                  form.setValue("price", field.value.substring(0, field.value.length - 1))
                }

              }


              if (quantity !== '0') {
                update = 'price';
                const total = BigInt(
                  convertNum(quantity, !isReverse ? decimalsB : decimalsA))
                  * BigInt(convertNum(field.value, !isReverse ? decimalsA : decimalsB))
                  / BigInt(10 ** (!isReverse ? decimalsB : decimalsA));

                form.setValue("orderValue", displayValue(total, !isReverse ? decimalsA : decimalsB))
              }
            }

            return (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <div className="flex gap-1">
                    <Input
                      className="text-right text-xl font-mono font-semibold"
                      {...field}
                    />
                    <Avatar>
                      <AvatarImage
                        src="https://s2.coinmarketcap.com/static/img/coins/64x64/825.png"
                        alt={isReverse ? symbolA : symbolB}
                        className="rounded-full w-6 h-6 self-center"
                      />
                    </Avatar>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => {


            const isNumbers = field.value.split('').filter((value: string) => value !== '.')
              .every((value: string) => /^\d+(\.\d+)?$/.test(value))
            const isDecimals = field.value.includes(".")
            const price = form.getValues("price");

            if (update.includes('orderValue')) {
              // guard!
            } else if (!((isNumbers && isDecimals) || isNumbers)) {
              form.setValue("quantity", field.value
                .split('')
                .filter((value: string) => /^\d+(\.\d+)?$/.test(value))
                .join('')
                .trim())
            } else {

              if (field.value.length === 0) {
                form.setValue("quantity", '0')
              }

              if (field.value.length != 1 && field.value[0] === '0' && field.value[1] !== '.') {
                form.setValue("quantity", field.value.slice(1))
              }

              if (field.value[0] === '.') {
                form.setValue("quantity", '0' + field.value)

              }

              if (field.value.includes('.')) {
                const list = field.value.split('.')
                if (list.length > 2) {
                  form.setValue("quantity", field.value.substring(0, field.value.length - 1))
                }

                if (list[1].length > (!isReverse ? decimalsB : decimalsA)) {
                  form.setValue("quantity", field.value.substring(0, field.value.length - 1))
                }

              }

              if (price !== '0') {
                update = 'quantity';
                const total = BigInt(
                  convertNum(price, !isReverse ? decimalsA : decimalsB))
                  * BigInt(convertNum(field.value, !isReverse ? decimalsB : decimalsA))
                  / BigInt(10 ** (!isReverse ? decimalsB : decimalsA));
                form.setValue("orderValue", displayValue(total, !isReverse ? decimalsA : decimalsB))
              }
            }

            return (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <div className="flex gap-1">
                    <Input
                      className="text-right text-xl font-mono font-semibold"
                      {...field}
                    />
                    <Avatar>
                      <AvatarImage
                        src={market.image}
                        alt={isReverse ? symbolB : symbolA}
                        className="rounded-full w-6 h-6 self-center"
                      />
                    </Avatar>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />

        <FormField
          control={form.control}
          name="orderValue"
          render={({ field }) => {

            const isNumbers = field.value.split('').filter((value: string) => value !== '.')
              .every((value: string) => /^\d+(\.\d+)?$/.test(value))

            const isDecimals = field.value.includes(".")
            // const quantity = form.getValues("quantity");
            // const price = form.getValues("price");

            if (update.includes('quantity')) {
              // guard!
            } else if (!((isNumbers && isDecimals) || isNumbers)) {
              form.setValue("orderValue", field.value
                .split('')
                .filter((value: string) => /^\d+(\.\d+)?$/.test(value))
                .join('')
                .trim())
            } else {

              if (field.value.length === 0) {
                form.setValue("orderValue", '0')
              }

              if (field.value.length != 1 && field.value[0] === '0' && field.value[1] !== '.') {
                form.setValue("orderValue", field.value.slice(1))
              }


              if (field.value[0] === '.') {
                form.setValue("orderValue", '0' + field.value)

              }

              if (field.value.includes('.')) {
                const list = field.value.split('.')
                if (list.length > 2) {
                  form.setValue("orderValue", field.value.substring(0, field.value.length - 1))
                }

                if (list[1].length > (!isReverse ? decimalsA : decimalsB)) {
                  form.setValue("orderValue", field.value.substring(0, field.value.length - 1))
                }

              }

              // if (price !== '0') {
              //   update = 'orderValue';
              //   const value = BigInt(convertNum(field.value, !isReverse ? decimalsA : decimalsB))
              //     * BigInt(10 ** (!isReverse ? decimalsB : decimalsA))
              //     / BigInt(convertNum(price, !isReverse ? decimalsA : decimalsB))
              //   form.setValue("quantity", displayValue(value, !isReverse ? decimalsA : decimalsB));
              // }
            }

            return (
              <FormItem>
                <FormLabel>Order Value</FormLabel>
                <FormControl>
                  <div className="flex gap-1">
                    <Input
                      className="text-right text-xl font-mono font-semibold"
                      {...field}
                    />
                    <Avatar>
                      <AvatarImage
                        src="https://s2.coinmarketcap.com/static/img/coins/64x64/825.png"
                        alt={isReverse ? symbolA : symbolB}
                        className="rounded-full w-6 h-6 self-center"
                      />
                    </Avatar>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }}
        />
        <Button
          type="submit"
          disabled={!userWallet}
          className="w-full font-bold text-lg"
        >
          {/* Swap */}
          Trade
        </Button>
      </form>
    </Form>
  );
}

