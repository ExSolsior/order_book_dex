import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Order = {
  id: string;
  type: "buy" | "sell";
  market: string;
  amount: number;
  price: number;
  status: "open" | "filled" | "cancelled";
  date: string;
};

export function PortfolioOrders() {

  // fetch this data from backend
  const orders: Order[] = [
    { id: "1", type: "buy", market: "SOL/USDC", amount: 5, price: 200, status: "open", date: "2023-04-01" },
    { id: "2", type: "sell", market: "SOL/USDC", amount: 2, price: 210, status: "filled", date: "2023-03-30" },
    // Add more orders as needed
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Badge variant={order.type === "buy" ? "default" : "secondary"}>
                    {order.type.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{order.market}</TableCell>
                <TableCell>{order.amount}</TableCell>
                <TableCell>${order.price}</TableCell>
                <TableCell>
                  <Badge variant={order.status === "open" ? "outline" : order.status === "filled" ? "default" : "secondary"}>
                    {order.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{order.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}