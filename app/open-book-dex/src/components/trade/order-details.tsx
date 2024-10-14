import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Market } from "@/lib/markets";

export default function OrderDetails({ market }: { market: Market }) {
  return (
    <Tabs
      defaultValue="limit"
      className="flex-1"
    >
      <TabsList>
        <TabsTrigger value="limit">
          <span className=" text-xl font-semibold tracking-tight">Limit</span>
        </TabsTrigger>
        <TabsTrigger value="market">
          <span className=" text-xl font-semibold tracking-tight">Market</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="buy">Make changes to your account here.</TabsContent>
      <TabsContent value="sell">Change your password here.</TabsContent>
    </Tabs>
  );
}
