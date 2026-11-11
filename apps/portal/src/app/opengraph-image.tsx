import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ptBR } from "@/i18n/pt-BR";

export const alt = "Bota o Shape! — Gestão completa para academias";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/logo-dark.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  const { meta } = ptBR;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0b223c",
          padding: "72px 80px",
        }}
      >
        <img src={src} width={280} height={187} alt="" />
        <div style={{ display: "flex", marginTop: 36, fontSize: 64, fontWeight: 700, color: "#ffffff", lineHeight: 1.1, maxWidth: 980 }}>
          {meta.homeTitle}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 30, color: "#d5deea", lineHeight: 1.35, maxWidth: 920 }}>
          {meta.siteDescription}
        </div>
      </div>
    ),
    { ...size },
  );
}
