import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
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
    cta: "Request early access",
    href: "https://tally.so/r/WOZWLe",
    external: true,
    theme: "lingo",
  },
  {
    name: "OneGoal",
    description: "A daily sports brief for the teams and leagues you follow.",
    status: "Coming soon",
    cta: "Request early access",
    href: "https://tally.so/r/WOZWLe",
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
      <header className="w-full flex justify-center animate-rise">
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
            animate-rise-delayed
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
            animate-rise-delayed-2
          "
        >
          OneRead is a family of calm daily emails for articles, language,
          sports, and more. No app. No feed. No noise.
        </p>

        <div
          className="
            mt-6 sm:mt-7 w-full max-w-[34rem]
            space-y-2
            animate-rise-delayed-3
          "
        >
          {PRODUCTS.map((product) => (
            <ProductRow key={product.name} product={product} />
          ))}
        </div>
      </section>

      <Footer tagline="No feeds. No noise. Just one useful email." />
    </main>
  );
}

function ProductRow({
  product,
}: {
  product: (typeof PRODUCTS)[number];
}) {
  const theme = productThemes[product.theme as ProductThemeKey];

  const content = (
    <>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-serif font-medium text-[1.1rem] leading-tight text-ink">
            {product.name}
          </h2>
          <span
            className="rounded-full border px-2 py-0.5 font-sans text-[11px] leading-none"
            style={{
              borderColor: theme.border,
              color: theme.accent,
              backgroundColor: theme.background,
            }}
          >
            {product.status}
          </span>
        </div>
        <p className="mt-1 font-sans text-[13.5px] leading-[1.55] text-ash">
          {product.description}
        </p>
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
    group flex flex-col items-start gap-2
    sm:flex-row sm:items-center sm:justify-between sm:gap-5
    rounded-lg border px-3 py-3 sm:py-3.5
    transition-[background-color,border-color,transform] duration-200
  `;

  if (!product.href) {
    return (
      <div
        className={className}
        aria-disabled="true"
        style={{
          backgroundColor: theme.background,
          borderColor: theme.border,
        }}
      >
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
        style={{
          backgroundColor: theme.background,
          borderColor: theme.border,
        }}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={product.href}
      className={`${className} focus-ring`}
      style={{
        backgroundColor: theme.background,
        borderColor: theme.border,
      }}
    >
      {content}
    </Link>
  );
}
