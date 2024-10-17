"use client";

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
import { Input } from "../ui/input";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";

export default function MarketOrder({
  market,
  type
}: {
  market: Market;
  type: "buy" | "sell";
}) {
  const formSchema = z.object({
    quantity: z.number()
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 0
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
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
        <div className="flex justify-between pr-4">
          <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Average Price
          </span>
          <span className="text-sm font-semibold text-right">
            0.00 {market.tokenB}
          </span>
        </div>
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
                      src={
                        type === "buy"
                          ? "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png"
                          : market.image
                      }
                      alt={type === "buy" ? market.tokenB : market.tokenA}
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
