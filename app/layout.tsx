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
  title: "OneRead — One good article, every morning.",
  description:
    "OneRead sends a short, carefully written brief of one article selected around your interests every morning at 7 AM. No app. No feed. No noise.",
  openGraph: {
    title: "OneRead — One good article, every morning.",
    description:
      "OneRead sends a short, carefully written brief of one article selected around your interests every morning at 7 AM. No app. No feed. No noise.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "OneRead — One good article, every morning.",
    description:
      "OneRead sends a short, carefully written brief of one article selected around your interests every morning at 7 AM. No app. No feed. No noise.",
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
