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

/** Tab definitions for the OneLingo section. */
export function oneLingoTabs() {
  return [
    { key: "overview", label: "Overview", href: "/admin/one-lingo" },
    { key: "subscribers", label: "Subscribers", href: "/admin/one-lingo/subscribers" },
    { key: "lessons", label: "Lessons", href: "/admin/one-lingo/lessons" },
    { key: "sends", label: "Sends", href: "/admin/one-lingo/sends" },
  ] as const;
}
