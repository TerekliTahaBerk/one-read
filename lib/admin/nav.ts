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

/** Tab definitions for the OneLingo section. */
export function oneLingoTabs() {
  return [
    { key: "overview", label: "Overview", href: "/admin/one-lingo" },
    { key: "subscribers", label: "Subscribers", href: "/admin/one-lingo/subscribers" },
    { key: "lessons", label: "Lessons", href: "/admin/one-lingo/lessons" },
    { key: "sends", label: "Sends", href: "/admin/one-lingo/sends" },
  ] as const;
}

/** Tab definitions for the OneFilm section. */
export function oneFilmTabs() {
  return [
    { key: "overview", label: "Overview", href: "/admin/one-film" },
    { key: "subscribers", label: "Subscribers", href: "/admin/one-film/subscribers" },
    { key: "issues", label: "Issues", href: "/admin/one-film/issues" },
    { key: "catalog", label: "Catalog", href: "/admin/one-film/catalog" },
    { key: "sends", label: "Sends", href: "/admin/one-film/sends" },
  ] as const;
}
