"use client";

import { OpenInNewWindowIcon } from "@radix-ui/react-icons";
import { Button } from "./ui/button";

export default function OpenNewWindowButton({ link }: { link: string }) {
  return (
    <Button
      variant="ghost"
      className="p-0 self-center"
      onClick={() => window.open(link, "_blank")}
    >
      <OpenInNewWindowIcon className="w-4 h-4" />
    </Button>
  );
}
