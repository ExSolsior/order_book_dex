import { TabsTrigger } from "../ui/tabs";

export default function CustomTabsTrigger({
  value,
  children
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 hover:text-foreground hover:border-b-2 hover:border-foreground"
    >
      <span className="text-base font-semibold tracking-tight">{children}</span>
    </TabsTrigger>
  );
}
