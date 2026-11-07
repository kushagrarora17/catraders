import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { NavigationProgress } from "@/features/site/components/NavigationProgress";
import { PRODUCT_NAME } from "@/features/site/contact";
import { getSiteUrl } from "@/features/site/url";
import { GA_INITIALIZATION_SCRIPT } from "@/lib/analytics";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

const description =
  "Wholesale automotive lubricants, fluids, filters and shop supplies for mechanics, auto shops and dealerships across Southwestern Ontario — Windsor, London, Kitchener-Waterloo and everywhere between. Mobil, Castrol, Liqui Moly, Lucas and more at mechanic pricing.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${PRODUCT_NAME} — Wholesale Automotive Lubricants & Fluids | Windsor to Kitchener, ON`,
    template: `%s | ${PRODUCT_NAME}`,
  },
  description,
  applicationName: PRODUCT_NAME,
  openGraph: {
    type: "website",
    locale: "en_CA",
    siteName: PRODUCT_NAME,
    description,
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: PRODUCT_NAME, statusBarStyle: "black" },
};

// Matches --brand-navy-dark. Drives Chrome/Android toolbar + Safari iOS toolbar tint.
export const viewport: Viewport = {
  themeColor: "#111d29",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${barlow.variable} ${barlowCondensed.variable} h-full`}>
      <body className="min-h-full">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
        <Script id="google-tag" strategy="afterInteractive">
          {GA_INITIALIZATION_SCRIPT}
        </Script>
      </body>
    </html>
  );
}
