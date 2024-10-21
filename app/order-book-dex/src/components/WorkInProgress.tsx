import { HammerIcon } from "lucide-react";

export function WorkInProgress() {
  return (
    <h2 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight text-center mt-10 flex items-center justify-center gap-2">
      Work in Progress
      <HammerIcon className="w-7 h-7" />
    </h2>
  );
}
