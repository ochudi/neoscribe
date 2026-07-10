import { ImageResponse } from "next/og";

export const alt = "NeoScribe · AI clinical scribe";
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
              borderRadius: 14,
              background: "#0F172A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 32 32">
              <path
                d="M10 22.5V9.5L22 22.5V9.5"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#737373",
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            NeoScribe
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
              maxWidth: 940,
            }}
          >
            Record the consult. Get a clean clinical note. On-device
            transcription, your choice of model.
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
          <span>Clinical documentation, on your device</span>
          <span>NeoScribe</span>
        </div>
      </div>
    ),
    size
  );
}
