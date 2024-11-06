import { NoticeBanner } from "@/components/notice-banner";
import { MarketContextProvider } from "@/components/provider/market-provider";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description
};

export default function DevnetLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <>
      <MarketContextProvider>
        <SiteHeader isDemo={false} />
        <NoticeBanner isDemo={false} />
        {children}
      </MarketContextProvider>
    </>
  );
}
