import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SaaS Admin", template: "%s · Bota o Shape SaaS" },
  description: "Operação global da plataforma Bota o Shape.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
