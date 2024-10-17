export default function Balance({ token }: { token: string }) {
  return (
    <div className="flex justify-between pr-4">
      <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        Available Balance
      </span>
      <span className="text-sm font-semibold text-right">0.00 {token}</span>
    </div>
  );
}
