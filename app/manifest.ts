import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OneRead",
    short_name: "OneRead",
    description: "OneArticle on weekday mornings, OneNews on Monday, Wednesday, and Friday.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1E6",
    theme_color: "#FFFFFF",
  };
}
