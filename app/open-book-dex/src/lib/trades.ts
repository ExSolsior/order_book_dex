export type Trade = {
  price: number;
  qty: number;
  time: number;
  action: "buy" | "sell";
};

const trades: Trade[] = [
  { price: 2558.08, qty: 0.039, time: 1728929558, action: "buy" },
  { price: 2556.16, qty: 0.2767, time: 1728929548, action: "buy" },
  { price: 2556.16, qty: 0.0438, time: 1728929548, action: "buy" },
  { price: 2556.16, qty: 0.0221, time: 1728929548, action: "buy" },
  { price: 2555.32, qty: 0.3423, time: 1728929548, action: "buy" },
  { price: 2555.15, qty: 3.5, time: 1728929548, action: "buy" },
  { price: 2554.62, qty: 0.6, time: 1728929548, action: "buy" },
  { price: 2554.62, qty: 0.3644, time: 1728929548, action: "buy" },
  { price: 2554.62, qty: 0.0438, time: 1728929548, action: "buy" },
  { price: 2554.61, qty: 0.6, time: 1728929548, action: "buy" },
  { price: 2552.63, qty: 0.0009, time: 1728929521, action: "sell" },
  { price: 2555.95, qty: 0.0054, time: 1728929413, action: "sell" },
  { price: 2560.07, qty: 0.0054, time: 1728929245, action: "buy" },
  { price: 2560.0, qty: 0.0117, time: 1728929245, action: "buy" },
  { price: 2559.57, qty: 0.0106, time: 1728929245, action: "buy" },
  { price: 2559.04, qty: 0.0118, time: 1728929244, action: "buy" },
  { price: 2556.57, qty: 0.3989, time: 1728929216, action: "buy" },
  { price: 2555.95, qty: 0.0054, time: 1728929216, action: "buy" },
  { price: 2555.16, qty: 0.0013, time: 1728929216, action: "buy" },
  { price: 2554.88, qty: 0.3994, time: 1728929216, action: "buy" }
];

export { trades };
