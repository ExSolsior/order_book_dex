import { OrderBookEntry } from "@/lib/types";
import { OrderType } from "../ProgramProvider";
import { BN } from "@coral-xyz/anchor";

export const findPrevNextEntries = (
  orderType: OrderType,
  orderPrice: BN,
  orderBookEntries: OrderBookEntry[]
) => {
  // Filter based on the provided order type (Bid or Ask)
  const filteredOrders = orderBookEntries.filter(
    (order) => order.orderType === orderType
  );

  // Ensure the array is sorted by price based on the order type
  const sortedOrderBook = filteredOrders.slice().sort((a, b) => {
    // For Bid, we want descending order (higher prices first)
    // For Ask, we want ascending order (lower prices first)
    if (orderType === OrderType.Bid) {
      return b.price.cmp(a.price); // descending order for bids
    } else {
      return a.price.cmp(b.price); // ascending order for asks
    }
  });

  // Use binary search to find the position where the entry fits
  const position = findPosition(sortedOrderBook, orderType, orderPrice);

  // Get the previous and next entries based on the binary search result
  const prev = position > 0 ? sortedOrderBook[position - 1] : null;
  const next =
    position < sortedOrderBook.length ? sortedOrderBook[position] : null;

  return { prev, next };
};

// Binary search function to find the position where the current entry fits
function findPosition(
  orderBook: OrderBookEntry[],
  orderType: OrderType,
  targetPrice: BN
): number {
  let low = 0;
  let high = orderBook.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (orderType === OrderType.Bid) {
      // For bid orders: we want higher prices first, so reverse comparison
      if (orderBook[mid].price.eq(targetPrice)) {
        return mid;
      } else if (orderBook[mid].price.gt(targetPrice)) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    } else {
      // For ask orders: we want lower prices first
      if (orderBook[mid].price.eq(targetPrice)) {
        return mid;
      } else if (orderBook[mid].price.lt(targetPrice)) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
  }
  // Return the position where the current entry fits
  return low;
}
