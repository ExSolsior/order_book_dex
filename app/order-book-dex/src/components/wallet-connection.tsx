"use client";

import { WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { HelpCircleIcon } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./ui/tooltip";
import Link from "next/link";

const SOON_DEVNET_DOCS =
  "https://docs.soo.network/using-soon/getting-started/wallet#backpack-wallet-recommended";

export function WalletConnection() {
  const { select, wallet, wallets, publicKey, disconnect, connecting } =
    useWallet();

  const [open, setOpen] = useState<boolean>(false);

  const handleWalletSelect = async (walletName: WalletName) => {
    if (walletName) {
      try {
        select(walletName);
        setOpen(false);
      } catch (error) {
        console.log("wallet connection err : ", error);
      }
    }
  };

  const handleDisconnect = async () => {
    disconnect();
  };

  return (
    <div className="flex items-center">
      <div className="text-white">
        <Dialog
          open={open}
          onOpenChange={setOpen}
        >
          <div className="flex gap-2 items-center">
            {!publicKey ? (
              <DialogTrigger asChild>
                <Button>
                  {connecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              </DialogTrigger>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant={"secondary"}>
                    <Avatar className="w-7 h-7 rounded-full mr-2">
                      <AvatarImage
                        src={wallet?.adapter.icon}
                        alt={wallet?.adapter.name}
                      />
                    </Avatar>
                    <span className="font-mono">
                      {`${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-3)}`}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Button
                      variant="ghost"
                      className="font-semibold"
                      onClick={handleDisconnect}
                    >
                      Disconnect
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DialogContent className="w-1/4">
              <DialogHeader>
                <DialogTitle className="text-center">Wallets</DialogTitle>
                <DialogDescription className="text-center">
                  Choose your desired wallet to connect.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col justify-start items-center overflow-auto">
                {wallets.map((wallet) => (
                  <Button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                    variant="ghost"
                    className="w-full py-6"
                  >
                    <Avatar className="w-8 h-8 rounded-full mr-2">
                      <AvatarImage
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                      />
                    </Avatar>
                    <div className="text-lg">{wallet.adapter.name}</div>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </div>
        </Dialog>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="link"
              onClick={() => window.open(SOON_DEVNET_DOCS, "_blank")}
            >
              <HelpCircleIcon className="w-4 h-4 hover:cursor-pointer" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-gray-700 text-foreground">
            <p>
              Connect to the SOON Devnet by adding a custom RPC in the Backpack
              wallet.
            </p>
            <Link
              href={SOON_DEVNET_DOCS}
              target="_blank"
              className="text-blue-400 hover:text-blue-500"
            >
              Learn more
            </Link>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
