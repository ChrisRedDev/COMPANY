import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
export const alt =
  "Evolution CRM od AI Evolution Polska — mniej chaosu, więcej dobrych relacji";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function OpenGraphImage() {
  const logo = await readFile(
    path.join(process.cwd(), "public/assets/brand/evolution-mark.png"),
  );
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#f7f5ff",
        padding: 80,
        color: "#30223e",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 25 }}>
        {/* ImageResponse renders its own image elements. */}
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          width={110}
          height={110}
          alt=""
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 58, fontWeight: 700 }}>Evolution CRM</span>
          <span
            style={{
              fontSize: 19,
              color: "#6842ff",
              letterSpacing: 5,
              marginTop: 12,
            }}
          >
            AI EVOLUTION POLSKA
          </span>
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 42, marginTop: 65 }}>
        Mniej chaosu. Więcej dobrych relacji.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 23,
          color: "#8f7aa0",
          marginTop: 22,
        }}
      >
        Firmy · Kontakty · Szanse · Poczta · Agent follow-up
      </div>
    </div>,
    size,
  );
}
