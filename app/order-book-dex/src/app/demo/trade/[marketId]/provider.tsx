import { createContext, useContext, useEffect } from "react";

const TradePageContext = createContext<null>(null);

export const useTradePageContext = () => {
  return useContext(TradePageContext);
};

export default function TradePageProvider({
  children
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {}, []);
  return <>{children}</>;
}
