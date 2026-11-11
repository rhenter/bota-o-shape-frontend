import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { I18nProvider } from "@/i18n/provider";
import { getLocale, getMessages } from "@/i18n/server";
import { SITE_URL } from "@/lib/api";
import { portugueseSocial } from "@/lib/social-metadata";

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: messages.meta.siteTitle, template: "%s · Bota o Shape!" },
    description: messages.meta.siteDescription,
    ...portugueseSocial("site"),
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html lang={locale}>
      <body suppressHydrationWarning>
        <I18nProvider messages={messages}>{children}</I18nProvider>
      </body>
    </html>
  );
}
