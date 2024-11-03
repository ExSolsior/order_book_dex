export type Order = {
  price: number;
  size: number;
  action: "ask" | "bid" | "buy" | "sell";
};

const orders: Order[] = [
  { price: 2547.91, size: 0.3939, action: "ask" },
  { price: 2547.83, size: 3.5, action: "ask" },
  { price: 2547.73, size: 0.5272, action: "ask" },
  { price: 2547.67, size: 7.8503, action: "ask" },
  { price: 2547.4, size: 0.3939, action: "ask" },
  { price: 2547.36, size: 7.8512, action: "ask" },
  { price: 2546.95, size: 7.8525, action: "ask" },
  { price: 2546.66, size: 0.6, action: "ask" },
  { price: 2546.58, size: 0.0404, action: "ask" },
  { price: 2546.11, size: 1.2368, action: "bid" },
  { price: 2546.07, size: 7.8552, action: "bid" },
  { price: 2545.96, size: 1.1559, action: "bid" },
  { price: 2545.88, size: 0.3939, action: "bid" },
  { price: 2545.69, size: 3.5, action: "bid" },
  { price: 2545.66, size: 0.1178, action: "bid" },
  { price: 2545.42, size: 7.8572, action: "bid" },
  { price: 2545.12, size: 5, action: "bid" },
  { price: 2545.02, size: 7.8584, action: "bid" }
];

export { orders };
