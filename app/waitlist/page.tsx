import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the OneRead Waitlist",
  description: "Register your interest in upcoming OneRead products.",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function getTallyUrl(searchParams: Props["searchParams"]): string {
  const url = new URL("https://tally.so/r/WOZWLe");
  url.searchParams.set("transparentBackground", "1");

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
    } else if (value !== undefined) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export default function WaitlistPage({ searchParams }: Props) {
  const tallyUrl = getTallyUrl(searchParams);

  return (
    <main className="fixed inset-0 bg-white">
      <iframe
        src={tallyUrl}
        data-tally-src={tallyUrl}
        title="Join the OneRead Waitlist"
        className="h-full w-full border-0"
        width="100%"
        height="100%"
      />
    </main>
  );
}
