import { CopyIcon } from "lucide-react";
import { Button } from "./ui/button";

export default function CopyButton({ text }: { text: string }) {
  return (
    <Button
      variant="ghost"
      className="p-0 self-center"
    >
      <CopyIcon className="w-3 h-3" />
    </Button>
  );
}
