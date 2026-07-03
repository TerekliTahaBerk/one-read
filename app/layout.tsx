import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { OpeningLoader } from "@/components/OpeningLoader";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OneRead — One useful email at a time.",
  description:
    "OneRead brings small, single-purpose notes to your inbox — an article for the morning, a film for the weekend, and more quiet tools as they join the family.",
  openGraph: {
    title: "OneRead — One useful email at a time.",
    description:
      "OneRead brings small, single-purpose notes to your inbox — an article for the morning, a film for the weekend, and more quiet tools as they join the family.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "OneRead — One useful email at a time.",
    description:
      "OneRead brings small, single-purpose notes to your inbox — an article for the morning, a film for the weekend, and more quiet tools as they join the family.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable}`}
    >
      <body className="min-h-svh">
        {children}
        <OpeningLoader />
      </body>
    </html>
  );
}
