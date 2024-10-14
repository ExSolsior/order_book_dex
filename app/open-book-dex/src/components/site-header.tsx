import { MainNav } from "./navbar/main-nav";
import { SearchBar } from "./navbar/search-bar";
import { WalletConnection } from "./wallet-connection";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <MainNav />

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <SearchBar />
          </div>

          <nav className="flex items-center">
            {/* <ThemeToggle /> */}
            <div>
              <WalletConnection />
              {/* <WalletDisconnectButtonDynamic /> */}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
