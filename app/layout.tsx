import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { OpeningLoader } from "@/components/OpeningLoader";
import { SiteLanguageProvider } from "@/components/SiteLanguageProvider";
import { cookies } from "next/headers";
import { normalizeSiteLocale, SITE_LOCALE_COOKIE } from "@/lib/site-i18n";
import { getSiteOrigin } from "@/lib/site-url";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  metadataBase: new URL(getSiteOrigin()),
  title: "OneRead — OneArticle and OneNews",
  description:
    "OneArticle and OneNews are calm, human-reviewed editorial emails with clear sources. Choose one, or get both with OneRead.",
  openGraph: {
    title: "OneRead — OneArticle and OneNews",
    description:
      "OneArticle and OneNews are calm, human-reviewed editorial emails with clear sources. Choose one, or get both with OneRead.",
    type: "website",
    siteName: "OneRead",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "OneRead" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OneRead — OneArticle and OneNews",
    description:
      "OneArticle and OneNews are calm, human-reviewed editorial emails with clear sources. Choose one, or get both with OneRead.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout(
  {
    children,
  }: {
    children: React.ReactNode;
  }
) {
  const locale = normalizeSiteLocale((await cookies()).get(SITE_LOCALE_COOKIE)?.value);

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable}`}
    >
      <body className="min-h-svh">
        <SiteLanguageProvider initialLocale={locale}>
          {children}
          <OpeningLoader />
        </SiteLanguageProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
