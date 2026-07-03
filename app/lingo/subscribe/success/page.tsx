import type { Metadata } from "next";
import { LingoSubscribeSuccessContent } from "@/components/LingoSubscribeSuccessContent";

export const metadata: Metadata = {
  title: "Checkout received - OneLingo",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LingoSubscribeSuccessPage() {
  return <LingoSubscribeSuccessContent />;
}
