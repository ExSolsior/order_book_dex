import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MarketDetails() {
  return (
    <Tabs
      defaultValue="buy"
      className="w-1/3"
    >
      <TabsList className="bg-transparent">
        <TabsTrigger
          value="buy"
          className="data-[state=active]:bg-green-950"
        >
          <span className="text-green-500 text-xl font-semibold tracking-tight">
            Buy
          </span>
        </TabsTrigger>
        <TabsTrigger
          value="sell"
          className="data-[state=active]:bg-red-950"
        >
          <span className="text-red-500 text-xl font-semibold tracking-tight">
            Sell
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="buy">Make changes to your account here.</TabsContent>
      <TabsContent value="sell">Change your password here.</TabsContent>
    </Tabs>
  );
}
