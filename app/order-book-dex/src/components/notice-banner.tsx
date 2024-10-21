import { ArrowLeftCircleIcon, ArrowRightCircleIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

const demoText = "You are currently viewing Chrono in demo mode.";
const devnetText = "You are currently viewing Chrono in devnet mode.";

export function NoticeBanner({ isDemo }: { isDemo: boolean }) {
  return (
    <div className="bg-amber-900 p-1 flex flex-col justify-center items-center text-center">
      {isDemo ? (
        <>
          <span>{demoText}</span>
          <Button
            className="text-base italic"
            variant="link"
            asChild
          >
            <Link
              href="/devnet"
              className="flex items-center gap-1"
            >
              Click here to switch to devnet mode
              <ArrowRightCircleIcon className="w-4 h-4" />
            </Link>
          </Button>
        </>
      ) : (
        <>
          <span>{devnetText}</span>
          <Button
            className="text-base italic"
            variant="link"
            asChild
          >
            <Link
              href="/demo"
              className="flex items-center gap-1"
            >
              Click here to switch back to demo mode
              <ArrowLeftCircleIcon className="w-4 h-4" />
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
