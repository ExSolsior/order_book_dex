import { redirect } from "next/navigation";
import { popular } from "@/lib/markets";

// how to handle this correctly.
// state lives on client, but this is a server component
// and all it's parents are server components.
// so there is no path for state to propergate towards this component
// could fetch data from api... but how to fetch data?
export default function Trade() {
  redirect(`/devnet/trade/${popular[0].marketId}`);
}
