"use client";

import { CopyIcon } from "lucide-react";
import { Button } from "./ui/button";

export default function CopyButton({ text }: { text: string }) {
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button
      variant="ghost"
      className="p-0 self-center"
      onClick={handleCopy}
    >
      <CopyIcon className="w-3 h-3" />
    </Button>
  );
}
