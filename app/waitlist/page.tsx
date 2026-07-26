import type { Metadata } from "next";
import { WaitlistForm } from "@/components/WaitlistForm";

export const metadata: Metadata = {
  title: "Join the OneRead Waitlist",
  description: "Register your interest in upcoming OneRead products.",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WaitlistPage(props: Props) {
  const searchParams = await props.searchParams;
  const raw = searchParams?.product;
  const product = (Array.isArray(raw) ? raw[0] : raw)?.toLowerCase() || "onegoal";
  return <WaitlistForm product={product} />;
}
