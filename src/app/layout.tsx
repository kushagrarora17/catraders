import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CA Traders — Automotive",
    template: "%s | CA Traders",
  },
  description: "Engine oils, coolants and automotive fluids. Request a quote online.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
