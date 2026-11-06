import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SITE_URL } from "@/lib/api";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Bota o Shape! — Gestão para academias", template: "%s · Bota o Shape!" },
  description: "Treinos, avaliações e nutrição para a sua academia e seus alunos, em uma só plataforma.",
  openGraph: { siteName: "Bota o Shape!", type: "website", locale: "pt_BR" },
  twitter: {
    card: "summary",
    title: "Bota o Shape! — Gestão para academias",
    description: "Treinos, avaliações e nutrição em uma só plataforma.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
