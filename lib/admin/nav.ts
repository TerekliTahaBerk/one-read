/** Tab definitions for the OneArticle section. */
export function oneArticleTabs() {
  return [
    { key: "overview", label: "Overview", href: "/admin/one-article" },
    { key: "new", label: "New edition", href: "/admin/one-article/new" },
    { key: "subscribers", label: "Subscribers", href: "/admin/one-article/subscribers" },
    { key: "issues", label: "Editions", href: "/admin/one-article/issues" },
    { key: "sends", label: "Deliveries", href: "/admin/one-article/sends" },
  ] as const;
}
