import { headers } from "next/headers";
import { en } from "./en";
import { negotiateLocale, type Locale } from "./locale";
import { ptBR, type Messages } from "./pt-BR";

export type { Messages };

export function messagesFor(locale: Locale): Messages {
  return locale === "en" ? en : ptBR;
}

export async function getLocale(): Promise<Locale> {
  try {
    const list = await headers();
    return negotiateLocale(list.get("accept-language"));
  } catch {
    return "pt-BR";
  }
}

export async function getMessages(): Promise<Messages> {
  return messagesFor(await getLocale());
}
