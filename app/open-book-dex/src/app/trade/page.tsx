import { redirect } from "next/navigation";
import { popular } from "@/lib/markets";

export default function Trade() {
  redirect(`/trade/${popular[0].marketId}`);
}
