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
import { Market } from "@/lib/markets";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Input } from "../ui/input";

export default function LimitOrder({
  market,
  type
}: {
  market: Market;
  type: "buy" | "sell";
}) {
  const formSchema = z.object({
    price: z.number(),
    quantity: z.number(),
    orderValue: z.number()
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      price: market.price,
      quantity: 0,
      orderValue: 0
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    {
      /* TODO: Implement functionality */
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
      >
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
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
                      alt={market.tokenB}
                      className="rounded-full w-6 h-6 self-center"
                    />
                  </Avatar>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
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
                      alt={market.tokenA}
                      className="rounded-full w-6 h-6 self-center"
                    />
                  </Avatar>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="orderValue"
          render={({ field }) => (
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
                      alt={market.tokenB}
                      className="rounded-full w-6 h-6 self-center"
                    />
                  </Avatar>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full font-bold text-lg"
        >
          Swap
        </Button>
      </form>
    </Form>
  );
}
