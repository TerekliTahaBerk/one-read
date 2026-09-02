/** Tab definitions for the OneNews editorial section. */
export function oneNewsTabs() {
  return [
    { key: "issues", label: "Editions", href: "/admin/one-news" },
    { key: "new", label: "New edition", href: "/admin/one-news/new" },
  ] as const;
}
