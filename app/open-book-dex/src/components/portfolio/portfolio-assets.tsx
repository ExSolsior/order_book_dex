import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

type Asset = {
  token: string;
  symbol: string;
  balance: number;
  value: number;
  image: string;
};

export function PortfolioAssets() {
  // fetch this data from backend
  const assets: Asset[] = [
    { token: "Solana", symbol: "SOL", balance: 10, value: 2000, image: "/assets/images/sol.png" },
    { token: "USD Coin", symbol: "USDC", balance: 5000, value: 5000, image: "/assets/images/usdc.png" },
    // Add more assets as needed
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Assets</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.symbol}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={asset.image} alt={asset.token} />
                    </Avatar>
                    <span>{asset.token}</span>
                    <span className="text-muted-foreground">({asset.symbol})</span>
                  </div>
                </TableCell>
                <TableCell>{asset.balance}</TableCell>
                <TableCell className="text-right">${asset.value.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}