import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "OneRead — One useful email at a time";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 82px",
          background: "#F6F1E6",
          color: "#1B1612",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: "0.22em" }}>
          ONE · READ
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 72, lineHeight: 1.05 }}>
            One useful email
            <br />
            at a time.
          </div>
          <div style={{ display: "flex", color: "#6B5F50", fontSize: 28 }}>
            OneArticle + OneFilm · $1 per month
          </div>
        </div>
        <div style={{ display: "flex", color: "#9C8F7E", fontSize: 24 }}>
          No feed. No noise. Just something worth opening.
        </div>
      </div>
    ),
    size,
  );
}
