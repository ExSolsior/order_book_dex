import { MainNav } from "./navbar/main-nav";
import { SearchBar } from "./navbar/search-bar";
import { WalletConnection } from "./wallet-connection";

export function SiteHeader({ isDemo }: { isDemo: boolean }) {
  return (
    <header className="sticky top-0 z-50 w-full border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <MainNav isDemo={isDemo} />

        <div className="flex items-center space-x-2">
          <div className="w-full md:w-auto md:flex-none">
            <SearchBar />
          </div>

          <nav className="flex items-center">
            <WalletConnection />
          </nav>
        </div>
      </div>
    </header>
  );
}
