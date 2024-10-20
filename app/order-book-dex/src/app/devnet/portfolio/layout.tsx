import { siteConfig } from "@/config/site";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Portfolio - ${siteConfig.name}`
};

export default function PortfolioLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="container py-8">{children}</div>;
}
