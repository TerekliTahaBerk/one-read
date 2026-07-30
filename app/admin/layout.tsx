import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "OneRead Admin",
    template: "%s — OneRead Admin",
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
