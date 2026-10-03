import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { BUSINESS_NAME } from "@/features/site/contact";
import { getSiteUrl } from "@/features/site/url";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const description =
  "Wholesale automotive lubricants, fluids, filters and shop supplies for mechanics, auto shops and dealerships across the GTA. Mobil, Castrol, Liqui Moly, Lucas and more at mechanic pricing.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${BUSINESS_NAME} — Wholesale Automotive Lubricants & Fluids in the GTA`,
    template: `%s | ${BUSINESS_NAME}`,
  },
  description,
  applicationName: BUSINESS_NAME,
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: BUSINESS_NAME,
    description,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#111d29",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${barlow.variable} ${barlowCondensed.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
