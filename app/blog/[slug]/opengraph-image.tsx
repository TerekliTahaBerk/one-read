import { ImageResponse } from "next/og";
import { getBlogPost } from "@/lib/blog";

export const runtime = "edge";
export const alt = "OneRead Journal article";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const { slug } = await props.params;
  const post = getBlogPost(slug);
  const title = post?.title ?? "The OneRead Journal";
  const category = post?.category ?? "OneRead";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f9f8f4",
          color: "#1c1c1a",
          padding: "72px 82px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 25,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#77756f",
          }}
        >
          <span>OneRead Journal</span>
          <span>{category}</span>
        </div>

        <div
          style={{
            display: "flex",
            maxWidth: 1000,
            fontFamily: "Georgia, serif",
            fontSize: title.length > 48 ? 66 : 78,
            lineHeight: 1.08,
            letterSpacing: "-0.035em",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 24,
            color: "#5d5b56",
          }}
        >
          <span>One useful email at a time.</span>
          <span style={{ color: "#aaa69d" }}>•</span>
          <span>oneread.email</span>
        </div>
      </div>
    ),
    size
  );
}

