import { NoticeBanner } from "@/components/notice-banner";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description
};

export default function DemoLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <SiteHeader isDemo={true} />
      <NoticeBanner isDemo={true} />
      {children}
    </>
  );
}
