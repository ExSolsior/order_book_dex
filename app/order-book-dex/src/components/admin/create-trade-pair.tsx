'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useProgramContext } from "@/program//ProgramProvider"
import * as web3 from "@solana/web3.js"


// need to improve and add better error handling
export default function TradePairCreator() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const programContext = useProgramContext();

  if (!programContext) {
    return null;
  }

  const { createTradePair } = programContext;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget);

    // Get values for Token A
    let tokenSymbolA = formData.get('tokenASymbol') as string;
    let tokenMintA = formData.get('tokenAMint') as string;

    // Get values for Token B
    let tokenSymbolB = formData.get('tokenBSymbol') as string;
    let tokenMintB = formData.get('tokenBMint') as string;

    const isReversed = formData.get('isReversed') !== null; // Checkbox value

    try {
      // Calculate the byte sizes of the strings
      const encoder = new TextEncoder();
      const tokenMintABytes = encoder.encode(tokenMintA).length; // Get byte size of tokenMintA
      const tokenMintBBytes = encoder.encode(tokenMintB).length; // Get byte size of tokenMintB

      // Compare the byte sizes
      if (tokenMintABytes > tokenMintBBytes) {
        // Swap the values if tokenMintA has more bytes

        // Swap token mints
        const tempMint = tokenMintA;
        tokenMintA = tokenMintB;
        tokenMintB = tempMint;

        const tempSymbol = tokenSymbolA;
        tokenSymbolA = tokenSymbolB;
        tokenSymbolB = tempSymbol;
      }

      // TokenMintA is guaranteed to have less or equal bytes than tokenMintB
      await createTradePair(tokenSymbolA, tokenSymbolB, new web3.PublicKey(tokenMintA), new web3.PublicKey(tokenMintB), isReversed);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create trade pair.",
      });
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  }

  return (
    <div className="p-8 flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="rounded-md px-6 py-3 text-lg font-semibold bg-white text-gray-700 hover:bg-gray-100 hover:text-primary-dark transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Create New Trade Pair
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] rounded-lg max-h-[80vh] flex flex-col overflow-hidden bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-4 text-gray-800">Create New Trade Pair</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto pr-4 -mr-4 custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-6 p-4">
              {['A', 'B'].map((token) => (
                <div key={token} className="space-y-4 p-4 bg-gray-50 rounded-md shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800">Token {token}</h3>
                  {['Symbol', 'Mint'].map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`token${token}${field}`} className="text-sm font-medium text-gray-700">
                        {field}
                      </Label>
                      <Input
                        id={`token${token}${field}`}
                        name={`token${token}${field}`} // Added name attribute for form data
                        className="rounded-md border-gray-300 focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 transition-all duration-200 text-black"
                        required
                      />
                    </div>
                  ))}
                </div>
              ))}

              <div className="flex items-center space-x-2">
                <div className="flex items-center border border-gray-300 rounded-md">
                  <Checkbox id="isReversed" name="isReversed" /> {/* Added name attribute */}
                </div>
                <Label htmlFor="isReversed" className="text-sm font-medium text-gray-700">Is reversed</Label>
              </div>

              <Button
                type="submit"
                className="w-full rounded-md bg-black hover:bg-primary-dark text-white font-semibold py-2 transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Trade Pair"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}