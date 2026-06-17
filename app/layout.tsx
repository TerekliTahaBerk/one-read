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
  title: "OneRead — Quiet daily emails for what you care about.",
  description:
    "OneRead is a family of quiet daily emails for learning, reading, language, sports, meals, and more. No app. No feed. No noise.",
  openGraph: {
    title: "OneRead",
    description:
      "Everything you care about, delivered to your inbox.",
    type: "website",
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
