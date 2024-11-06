import { redirect } from "next/navigation";

export default function Trade() {
  // should do this if path is /trade
  // but not if /trade/marketId or /trade?marketId=id

  // so I found out how to use /trade?markeId=id
  // I just need to use this component instead [marketId] component
  // and use usedSearchParams
  redirect(`/devnet`);
}
