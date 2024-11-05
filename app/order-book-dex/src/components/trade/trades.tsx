import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Market } from "../../program/utils/useTransaction";

// time correct locale time string? I need to research
// need to include more trades and allow it to be scrollable
export default function Trades({ market }: { market: Market }) {
  const { symbolA, symbolB, isReverse } = market!.orderBook!.marketDetails;
  const { trades } = market!.orderBook!;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-semibold">
            Price ({isReverse ? symbolA : symbolB})
          </TableHead>
          <TableHead className="font-semibold text-right">
            Qty ({isReverse ? symbolB : symbolA})
          </TableHead>
          <TableHead className="font-semibold text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.slice(0, 12).map((trade) => (
          <TableRow key={trade.price}>
            <TableCell
              className={`font-mono ${trade.action === "buy" ? "text-green-500" : "text-red-500"
                }`}
            >
              {trade.price}
            </TableCell>
            <TableCell className="text-right font-mono">
              {trade.qty}
            </TableCell>
            <TableCell className="text-right font-mono ">
              {new Date(trade.time * 1000).toLocaleTimeString("en-GB", {
                hour12: false
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
