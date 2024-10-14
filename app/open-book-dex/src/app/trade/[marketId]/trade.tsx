import OrderDetails from "@/components/trade/order-details";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Market } from "@/lib/markets";

export default function Trade({ market }: { market: Market }) {
  return (
    <Tabs
      defaultValue="buy"
      className="w-1/3 border-2 border-t-0"
    >
      <TabsList className="bg-transparent w-full py-9 px-0">
        <TabsTrigger
          value="buy"
          className="rounded-none grow data-[state=active]:bg-green-950 border-b-2 data-[state=active]:border-b-green-700 py-5 px-16"
        >
          <span className="text-green-500 text-xl font-semibold tracking-tight">
            Buy
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="sell"
          className="rounded-none grow data-[state=active]:bg-red-950 border-b-2 data-[state=active]:border-b-red-700 py-5 px-16"
        >
          <span className="text-red-500 text-xl font-semibold tracking-tight">
            Sell
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="buy">
        <OrderDetails
          market={market}
          type="buy"
        />
      </TabsContent>
      <TabsContent value="sell">
        <OrderDetails
          market={market}
          type="sell"
        />
      </TabsContent>
    </Tabs>
  );
}
