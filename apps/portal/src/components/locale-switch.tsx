"use client";

import { useRouter } from "next/navigation";
import { useMessages } from "@/i18n/provider";
import { LOCALE_COOKIE, type Locale } from "@/i18n/locale";

function BrazilFlag() {
  return (
    <svg viewBox="0 0 28 20" aria-hidden="true">
      <rect width="28" height="20" fill="#009b3a" />
      <polygon points="14,1.6 26.2,10 14,18.4 1.8,10" fill="#fedf00" />
      <circle cx="14" cy="10" r="4.1" fill="#002776" />
      <path d="M10.1 11.2c1.6-1.6 5.2-1.8 7.6-.2" fill="none" stroke="#fff" strokeWidth="1.1" />
    </svg>
  );
}

function UnitedStatesFlag() {
  return (
    <svg viewBox="0 0 28 20" aria-hidden="true">
      <rect width="28" height="20" fill="#bf0a30" />
      <rect y="1.54" width="28" height="1.54" fill="#fff" />
      <rect y="4.62" width="28" height="1.54" fill="#fff" />
      <rect y="7.69" width="28" height="1.54" fill="#fff" />
      <rect y="10.77" width="28" height="1.54" fill="#fff" />
      <rect y="13.85" width="28" height="1.54" fill="#fff" />
      <rect y="16.92" width="28" height="1.54" fill="#fff" />
      <rect width="12" height="10.77" fill="#002868" />
      <g fill="#fff">
        <circle cx="2" cy="1.8" r="0.45" />
        <circle cx="4.2" cy="1.8" r="0.45" />
        <circle cx="6.4" cy="1.8" r="0.45" />
        <circle cx="8.6" cy="1.8" r="0.45" />
        <circle cx="10.8" cy="1.8" r="0.45" />
        <circle cx="3.1" cy="3.5" r="0.45" />
        <circle cx="5.3" cy="3.5" r="0.45" />
        <circle cx="7.5" cy="3.5" r="0.45" />
        <circle cx="9.7" cy="3.5" r="0.45" />
        <circle cx="2" cy="5.2" r="0.45" />
        <circle cx="4.2" cy="5.2" r="0.45" />
        <circle cx="6.4" cy="5.2" r="0.45" />
        <circle cx="8.6" cy="5.2" r="0.45" />
        <circle cx="10.8" cy="5.2" r="0.45" />
        <circle cx="3.1" cy="6.9" r="0.45" />
        <circle cx="5.3" cy="6.9" r="0.45" />
        <circle cx="7.5" cy="6.9" r="0.45" />
        <circle cx="9.7" cy="6.9" r="0.45" />
        <circle cx="2" cy="8.6" r="0.45" />
        <circle cx="4.2" cy="8.6" r="0.45" />
        <circle cx="6.4" cy="8.6" r="0.45" />
        <circle cx="8.6" cy="8.6" r="0.45" />
        <circle cx="10.8" cy="8.6" r="0.45" />
      </g>
    </svg>
  );
}

export function LocaleSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const { nav } = useMessages();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.lang = next;
    router.refresh();
  }

  return (
    <div className="locale-switch" role="group" aria-label={nav.language}>
      <button type="button" aria-pressed={locale === "pt-BR"} aria-label={nav.portuguese} onClick={() => choose("pt-BR")}>
        <BrazilFlag />
      </button>
      <button type="button" aria-pressed={locale === "en"} aria-label={nav.english} onClick={() => choose("en")}>
        <UnitedStatesFlag />
      </button>
    </div>
  );
}
