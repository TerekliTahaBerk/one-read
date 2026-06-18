/** Tab definitions for the OneArticle section, token-preserving. */
export function oneArticleTabs(token: string) {
  const q = `?token=${encodeURIComponent(token)}`;
  return [
    { key: "overview", label: "Overview", href: `/admin/one-article${q}` },
    { key: "subscribers", label: "Subscribers", href: `/admin/one-article/subscribers${q}` },
    { key: "issues", label: "Issues", href: `/admin/one-article/issues${q}` },
    { key: "articles", label: "Articles", href: `/admin/one-article/articles${q}` },
    { key: "sends", label: "Sends", href: `/admin/one-article/sends${q}` },
  ] as const;
}
