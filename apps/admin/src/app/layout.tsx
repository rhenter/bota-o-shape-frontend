import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bota o Shape!", template: "%s · Bota o Shape!" },
  description: "Painel da academia — ambiente de demonstração.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
