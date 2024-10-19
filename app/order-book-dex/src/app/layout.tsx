import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { WalletAdapter } from "@/components/wallet-adapter";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900"
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900"
});
const montserrat = localFont({
  src: './fonts/Montserrat-Medium.ttf',
  variable: '--font-montserrat',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning={true}
    >
      <head />

      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} min-h-screen bg-background antialiased`}
      >
        <WalletAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div vaul-drawer-wrapper="">
              <div className="relative flex min-h-screen flex-col bg-background">
                <SiteHeader />
                <main className="flex-1">{children}</main>
              </div>
            </div>
          </ThemeProvider>
        </WalletAdapter>
      </body>
    </html>
  );
}
