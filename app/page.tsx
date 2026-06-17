import Link from "next/link";
import { Footer } from "@/components/Footer";
import { HomeReveal } from "@/components/HomeReveal";
import { Logo } from "@/components/Logo";
import { WAITLIST_FORM_URL } from "@/lib/options";
import { productThemes, type ProductThemeKey } from "@/lib/product-themes";

const PRODUCTS = [
  {
    name: "OneArticle",
    description: "One curated article summary every morning.",
    status: "Available",
    cta: "Open OneArticle",
    href: "/article",
    theme: "article",
  },
  {
    name: "OneLingo",
    description: "Language practice and useful words in your inbox.",
    status: "Coming soon",
    cta: "Join waitlist",
    note: "Be first to try it when it launches.",
    href: WAITLIST_FORM_URL,
    external: true,
    theme: "lingo",
  },
  {
    name: "OneGoal",
    description: "A daily sports brief for the teams and leagues you follow.",
    status: "Coming soon",
    cta: "Join waitlist",
    note: "Be first to try it when it launches.",
    href: WAITLIST_FORM_URL,
    external: true,
    theme: "goal",
  },
] as const;

export default function HomePage() {
  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-5 sm:pt-6
        pb-4 sm:pb-5
      "
    >
      <HomeReveal>
        <header className="w-full flex justify-center reveal-item">
          <Logo href="/" />
        </header>

        <section
          className="
            flex-1 w-full
            flex flex-col items-center justify-center
            max-w-[40rem] mx-auto
            py-4 sm:py-5
          "
        >
          <h1
            className="
              font-serif font-medium
              text-[2.45rem] leading-[1.02]
              sm:text-[3.55rem] sm:leading-[0.99]
              tracking-[-0.026em]
              text-ink text-center text-balance
              max-w-[16ch]
              reveal-item reveal-item-2
            "
          >
            The things you care about, delivered quietly to your inbox.
          </h1>

          <p
            className="
              font-sans
              text-[15px] sm:text-[16px] leading-[1.65]
              text-ash text-center text-pretty
              mt-4 sm:mt-5
              max-w-[48ch]
              reveal-item reveal-item-3
            "
          >
            OneRead is a family of calm daily emails for articles, language,
            sports, and more.
          </p>

          <div
            className="
              mt-6 sm:mt-7 w-full max-w-[34rem]
              space-y-2
              reveal-item reveal-item-4
            "
          >
            {PRODUCTS.map((product) => (
              <ProductRow key={product.name} product={product} />
            ))}
          </div>
        </section>
      </HomeReveal>

      <Footer
        tagline="No feeds. No noise. Just one useful email."
        showManifesto
      />
    </main>
  );
}

function ProductRow({
  product,
}: {
  product: (typeof PRODUCTS)[number];
}) {
  const theme = productThemes[product.theme as ProductThemeKey];
  const note = "note" in product ? product.note : undefined;

  const content = (
    <>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-serif font-medium text-[1.1rem] leading-tight text-ink">
            {product.name}
          </h2>
          <span
            className="product-badge rounded-full border px-2 py-0.5 font-sans text-[11px] leading-none transition-colors duration-200"
          >
            {product.status}
          </span>
        </div>
        <p className="mt-1 font-sans text-[13.5px] leading-[1.55] text-ash">
          {product.description}
        </p>
        {note && (
          <p className="mt-1 font-sans text-[12px] leading-[1.5] text-fog">
            {note}
          </p>
        )}
      </div>

      <span
        className={`
          shrink-0 font-sans text-[12.5px]
          ${product.href ? "link-underline" : ""}
        `}
        style={{ color: product.href ? theme.accent : theme.mutedText }}
      >
        {product.cta}
      </span>
    </>
  );

  const className = `
    product-card group flex flex-col items-start gap-2
    sm:flex-row sm:items-center sm:justify-between sm:gap-5
    rounded-lg border px-3 py-3 sm:py-3.5
  `;

  // Per-card theme tokens drive the hover tint/border (see .product-card in
  // globals.css). Kept as CSS variables so :hover can swap them — inline
  // background/border would otherwise win over the hover rule.
  const themeVars = {
    "--card-bg": theme.background,
    "--card-surface": theme.surface,
    "--card-border": theme.border,
    "--card-accent": theme.accent,
  } as React.CSSProperties;

  if (!product.href) {
    return (
      <div className={className} aria-disabled="true" style={themeVars}>
        {content}
      </div>
    );
  }

  if ("external" in product && product.external) {
    return (
      <a
        href={product.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} focus-ring`}
        style={themeVars}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={product.href} className={`${className} focus-ring`} style={themeVars}>
      {content}
    </Link>
  );
}
