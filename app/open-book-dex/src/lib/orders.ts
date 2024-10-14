export type Order = {
  price: number;
  size: number;
  action: "buy" | "sell";
};

const orders: Order[] = [
  { price: 2547.91, size: 0.3939, action: "sell" },
  { price: 2547.83, size: 3.5, action: "sell" },
  { price: 2547.73, size: 0.5272, action: "sell" },
  { price: 2547.67, size: 7.8503, action: "sell" },
  { price: 2547.4, size: 0.3939, action: "sell" },
  { price: 2547.36, size: 7.8512, action: "sell" },
  { price: 2546.95, size: 7.8525, action: "sell" },
  { price: 2546.66, size: 0.6, action: "sell" },
  { price: 2546.58, size: 0.0404, action: "sell" },
  { price: 2546.11, size: 1.2368, action: "buy" },
  { price: 2546.07, size: 7.8552, action: "buy" },
  { price: 2545.96, size: 1.1559, action: "buy" },
  { price: 2545.88, size: 0.3939, action: "buy" },
  { price: 2545.69, size: 3.5, action: "buy" },
  { price: 2545.66, size: 0.1178, action: "buy" },
  { price: 2545.42, size: 7.8572, action: "buy" },
  { price: 2545.12, size: 5, action: "buy" },
  { price: 2545.02, size: 7.8584, action: "buy" }
];

export { orders };
