import { ImageResponse } from "next/og";

export const alt = "NeoScribe — Plural Health";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background: "#FFFFFF",
          padding: "72px",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#0F172A",
              color: "#fff",
              fontSize: 32,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            P
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#737373",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            Plural Health
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 120,
              fontWeight: 600,
              color: "#0F172A",
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            NeoScribe
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#525252",
              lineHeight: 1.3,
              maxWidth: 900,
            }}
          >
            AI clinical documentation playground. Compare models, inspect
            extractions, ship faster.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#A3A3A3",
            fontSize: 20,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          <span>v1.0.0 · INTERNAL</span>
          <span>neoscribe.app</span>
        </div>
      </div>
    ),
    size
  );
}
