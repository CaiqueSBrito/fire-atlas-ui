import type { Metadata } from "next";
import { Space_Grotesk, Fustat, JetBrains_Mono } from "next/font/google";
import { SkipLink } from "@/components/layout/skip-link";
import { AppProviders } from "@/providers/app-providers";
import { SiteHeader } from "@/components/layout/site-header";
import { AnnualDataGate } from "@/providers/annual-data-gate";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const sans = Fustat({
  variable: "--font-fustat",
  subsets: ["latin", "latin-ext"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fire Atlas — NASA Space Apps 2026",
  description:
    "Explore fire hotspots (NASA FIRMS: MODIS + VIIRS) with an interactive map, calendar, and analytics.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SkipLink />
        <AppProviders>
          <AnnualDataGate showLoading={false}>
            <SiteHeader />
          </AnnualDataGate>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
