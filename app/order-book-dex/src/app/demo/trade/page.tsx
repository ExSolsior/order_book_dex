import { redirect } from "next/navigation";
import { popular } from "@/lib/markets";

export default function Trade() {
  redirect(`/demo/trade/${popular[0].marketId}`);
}
