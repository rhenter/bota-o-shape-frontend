import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { getLocale, getMessages } from "@/i18n/server";
import { SITE_URL } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: messages.meta.siteTitle, template: "%s · Bota o Shape!" },
    description: messages.meta.siteDescription,
    openGraph: { siteName: "Bota o Shape!", type: "website", locale: messages.meta.ogLocale },
    twitter: {
      card: "summary",
      title: messages.meta.siteTitle,
      description: messages.meta.siteDescription,
    },
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html lang={locale}>
      <body>
        <I18nProvider messages={messages}>{children}</I18nProvider>
      </body>
    </html>
  );
}
