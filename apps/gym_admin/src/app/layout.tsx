import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { DemoProvider } from "@/components/app-shell";

export const metadata: Metadata = {
  title: { default: "Bota o Shape!", template: "%s · Bota o Shape!" },
  description: "Painel profissional e administrativo da academia.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body><DemoProvider>{children}</DemoProvider></body></html>;
}
