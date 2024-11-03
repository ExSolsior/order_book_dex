import Book from "@/components/trade/book";
import CustomTabsTrigger from "@/components/trade/custom-tabs-trigger";
import Trades from "@/components/trade/trades";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Market } from "../../../../program/utils/useTransaction";


export default function OrderBook({ market }: { market: Market }) {
  return (
    <Tabs
      defaultValue="book"
      className="w-1/5 border-l-2 border-b-2"
    >
      <TabsList className="bg-transparent gap-3">
        <CustomTabsTrigger value="book">Book</CustomTabsTrigger>
        <CustomTabsTrigger value="trades">Trades</CustomTabsTrigger>
      </TabsList>
      <TabsContent value="book">
        <Book market={market} />
      </TabsContent>
      <TabsContent value="trades">
        <Trades market={market} />
      </TabsContent>
    </Tabs>
  );
}
