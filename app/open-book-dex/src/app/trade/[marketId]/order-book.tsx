import Book from "@/components/trade/book";
import CustomTabsTrigger from "@/components/trade/custom-tabs-trigger";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Market } from "@/lib/markets";

export default function OrderBook({ market }: { market: Market }) {
  return (
    <Tabs
      defaultValue="book"
      className="w-1/3 border-l-2 border-b-2"
    >
      <TabsList className="bg-transparent gap-3">
        <CustomTabsTrigger value="book">Book</CustomTabsTrigger>
        <CustomTabsTrigger value="trades">Trades</CustomTabsTrigger>
      </TabsList>
      <TabsContent value="book">
        <Book market={market} />
      </TabsContent>
      <TabsContent value="trades">Change your password here.</TabsContent>
    </Tabs>
  );
}
