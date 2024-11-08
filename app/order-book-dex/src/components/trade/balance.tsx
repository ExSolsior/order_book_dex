export default function Balance({ token, balance }: { token: string, balance: string }) {

  // need to get userWallet balance of specfied mint
  return (
    <div className="flex justify-between pr-4">
      <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Available Balance
      </span>
      <span className="text-sm font-semibold text-right">{balance} {token}</span>
    </div>
  );
}
