/** Tab definitions for the OneArticle section. */
export function oneArticleTabs() {
  return [
    { key: "overview", label: "Overview", href: "/admin/one-article" },
    { key: "subscribers", label: "Subscribers", href: "/admin/one-article/subscribers" },
    { key: "issues", label: "Issues", href: "/admin/one-article/issues" },
    { key: "articles", label: "Articles", href: "/admin/one-article/articles" },
    { key: "sends", label: "Sends", href: "/admin/one-article/sends" },
  ] as const;
}
