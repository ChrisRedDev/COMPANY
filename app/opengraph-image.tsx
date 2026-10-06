import { ImageResponse } from "next/og";
/* eslint-disable @next/next/no-img-element -- ImageResponse renders images itself. */
import { readFile } from "node:fs/promises";
import path from "node:path";
export const alt =
  "Local Plumbing Services — enquiries, jobs, growth and company knowledge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function OpenGraphImage() {
  const logo = await readFile(
    path.join(process.cwd(), "public/assets/brand/local-plumbing-services.png"),
  );
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#eef7fc",
        padding: 80,
        color: "#153b58",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 25 }}>
        {/* ImageResponse renders its own image elements. */}
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          width={220}
          height={102}
          alt=""
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 44, fontWeight: 700 }}>
            Local Plumbing Services
          </span>
          <span
            style={{
              fontSize: 19,
              color: "#1671ad",
              letterSpacing: 5,
              marginTop: 12,
            }}
          >
            GROWTH OS
          </span>
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 42, marginTop: 65 }}>
        Every enquiry. Every job. Every pound.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 23,
          color: "#597f98",
          marginTop: 22,
        }}
      >
        Lead Hub · Paid search · SEO · Company Brain · AI
      </div>
    </div>,
    size,
  );
}
