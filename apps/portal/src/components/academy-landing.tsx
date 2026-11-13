import { fill } from "@/i18n/locale";
import type { Messages } from "@/i18n/pt-BR";
import { ptBR } from "@/i18n/pt-BR";
import type { Academy, PlatformLinks } from "@/lib/api";
import { ADMIN_URL, httpsUrl, whatsappUrl } from "@/lib/api";
import { landingLogoUrl } from "@/lib/landing-logo";
import { offeredServices } from "@/lib/services";
import { AcademyContactForm } from "./academy-contact-form";

/** Public, tenant-branded landing. Profile fields remain the fallback when the plan has no landing page. */
export function AcademyLanding({
  academy,
  messages = ptBR,
  platform,
}: {
  academy: Academy;
  messages?: Messages;
  platform?: PlatformLinks;
}) {
  const copy = messages.academy;
  const landing = academy.landing;
  const { tagline, logo_url: profileLogo } = academy.profile;
  const modalities = offeredServices(academy.profile.services, copy.offeredServices);
  const whatsapp = whatsappUrl(landing?.whatsapp || academy.profile.whatsapp);
  const address = academy.profile.address?.trim();
  const phone = landing?.phone.trim() || academy.profile.phone?.trim() || "";
  const socials = [
    ["Instagram", httpsUrl(landing?.instagram_url)],
    ["Facebook", httpsUrl(landing?.facebook_url)],
    ["YouTube", httpsUrl(landing?.youtube_url)],
    ["WhatsApp", whatsapp],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const title = landing?.title.trim() ?? "";
  const headline = (title && title !== academy.name ? title : "") || tagline || academy.name;
  const lead = tagline && tagline !== headline ? tagline : copy.intro;
  const safeLogo = landingLogoUrl(landing?.logo) ?? httpsUrl(profileLogo);
  const privacyUrl = httpsUrl(platform?.privacyUrl);
  const termsUrl = httpsUrl(platform?.termsUrl);
  const portalUrl = httpsUrl(platform?.portalUrl);
  const themes = ["lime", "graphite", "ocean", "black", "white"] as const;
  const requested = landing?.theme;
  const theme = requested && themes.includes(requested) ? requested : "lime";
  const background = landing?.background ?? "none";
  const photo = background !== "none" ? " bg-photo" : "";
  return (
    <div className={`academy-landing theme-${theme} bg-${background}${photo}`}>
      <div className="academy-screen">
        <header className="academy-top">
          <div className="wrap">
            <span className="academy-brand">
              {safeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeLogo} alt="" />
              ) : <i aria-hidden="true">◫</i>}
            </span>
            <nav aria-label={copy.nav}>
              <a href="#inicio">{copy.home}</a>
              {modalities.length > 0 && <a href="#modalidades">{copy.modalities}</a>}
              <a href="#contato">{copy.contact}</a>
              <a className="btn" href={whatsapp ?? `${ADMIN_URL}/entrar`} rel={whatsapp ? "noopener noreferrer" : undefined}>{whatsapp ? copy.enroll : copy.studentArea}</a>
            </nav>
          </div>
        </header>
        <section className="academy-hero" id="inicio">
          <div className="wrap academy-hero-layout">
            <div className="academy-hero-copy">
              <span>{academy.name}</span>
              <h1>{headline}</h1>
              <p>{lead}</p>
              <div className="actions">
                {whatsapp ? (
                  <>
                    <a className="btn" href={whatsapp} rel="noopener noreferrer">{copy.heroEnroll}</a>
                  </>
                ) : (
                  <a className="btn" href={`${ADMIN_URL}/entrar`}>{copy.studentArea}</a>
                )}
              </div>
            </div>
            {socials.length > 0 && (
              <nav className="academy-socials" aria-label={copy.socials}>
                {socials.map(([label, href]) => (
                  <a className={label === "WhatsApp" ? "is-whatsapp" : undefined} key={label} href={href} rel="noopener noreferrer" aria-label={label}>
                    <SocialIcon name={label} />
                  </a>
                ))}
              </nav>
            )}
            {modalities.length > 0 && (
              <section className="academy-modalities" id="modalidades" aria-labelledby="academy-services-title">
                <h2 id="academy-services-title">{copy.servicesTitle}</h2>
                <div className="academy-modalities-grid">
                  {modalities.map((item, index) => (
                    <article key={`${item.code}-${index}`} data-service-id={item.code}>
                      <ServiceIcon code={item.code} />
                      <h3>{item.title}</h3>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
      <main>
        <section className="academy-content" id="contato">
          <div className="wrap academy-contact-layout">
            <div className="academy-contact-intro">
              <p className="academy-eyebrow">{copy.contactEyebrow}</p>
              <h2>{copy.contactTitle}</h2>
              <p className="academy-contact-lead">{fill(copy.contactInvite, { name: academy.name })}</p>
              {whatsapp && <a className="btn academy-whatsapp" href={whatsapp} rel="noopener noreferrer"><SocialIcon name="WhatsApp" />{copy.whatsapp}</a>}
              {(address || phone) && (
                <address className="academy-contact-facts">
                  {address && <p><ContactIcon name="address" /><span>{address}</span></p>}
                  {phone && <p><ContactIcon name="phone" /><a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></p>}
                </address>
              )}
            </div>
            <AcademyContactForm slug={academy.slug} title={copy.talk} privacyUrl={privacyUrl} />
          </div>
        </section>
      </main>
      <footer className="academy-footer">
        <div className="wrap">
          <div className="academy-footer-row">
            <span className="academy-brand">
              {safeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeLogo} alt="" />
              ) : <i aria-hidden="true">◫</i>}
              {academy.name}
            </span>
            {(privacyUrl || termsUrl) && (
              <nav className="academy-footer-docs" aria-label={copy.platformDocs}>
                {privacyUrl && <a href={privacyUrl} target="_blank" rel="noopener noreferrer">{copy.platformPrivacy}</a>}
                {termsUrl && <a href={termsUrl} target="_blank" rel="noopener noreferrer">{copy.platformTerms}</a>}
              </nav>
            )}
          </div>
          <p className="academy-footer-sign">
            {portalUrl ? <a href={portalUrl} target="_blank" rel="noopener noreferrer">{copy.technology}</a> : copy.technology}
          </p>
        </div>
      </footer>
    </div>
  );
}

function ServiceIcon({ code }: { code: string }) {
  const common = { viewBox: "0 0 24 24", width: 34, height: 34, fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (code === "strength_training") return <svg {...common}><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" /></svg>;
  if (code === "functional_training") return <svg {...common}><path d="M8 6h8l2 4-2 8H8l-2-8 2-4Z" /><path d="M9 10h6M10 14h4" /></svg>;
  if (code === "cardio") return <svg {...common}><path d="M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" /><path d="m4 13 4-1 2 4 3-8 2 5h5" /></svg>;
  if (code === "group_classes") return <svg {...common}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M15 14a5 5 0 0 1 6 5v1" /></svg>;
  if (code === "nutrition") return <svg {...common}><path d="M12 7c-1-3-4-4-6-2-3 2-2 7 0 11 2 4 4 5 6 3 2 2 4 1 6-3 2-4 3-9 0-11-2-2-5-1-6 2Z" /><path d="M12 7c0-3 2-5 5-5" /></svg>;
  if (code === "physical_assessment") return <svg {...common}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2h6v2M9 12l2 2 4-5" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>;
}

function ContactIcon({ name }: { name: "address" | "phone" }) {
  const common = { viewBox: "0 0 24 24", width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  return name === "address"
    ? <svg {...common}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
    : <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" /></svg>;
}

function SocialIcon({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24", width: 28, height: 28, "aria-hidden": true as const };
  if (name === "Instagram") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (name === "Facebook") {
    return (
      <svg {...common}>
        <path fill="currentColor" d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
      </svg>
    );
  }
  if (name === "YouTube") {
    return (
      <svg {...common}>
        <path fill="currentColor" d="M22 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C18.2 5.4 12 5.4 12 5.4s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 9 2 12.2 2 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6zM10 15.5v-6.6l6 3.3-6 3.3z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path fill="currentColor" d="M19.1 4.9A10 10 0 0 0 2.1 15.1L1 21l6-1.6A10 10 0 0 0 19.1 4.9zM12 19.2a8.1 8.1 0 0 1-4.1-1.1l-.3-.2-3.6.9.9-3.5-.2-.3A8.2 8.2 0 1 1 12 19.2zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4.2-.3a.4.4 0 0 0 0-.4c0-.1-.5-1.2-.7-1.6s-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4 15 15 0 0 0 1.5.6 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.1-.4-.2z" />
    </svg>
  );
}

export function AcademyUnavailable({ failed, messages = ptBR }: { failed: boolean; messages?: Messages }) {
  const copy = messages.academy;
  return (
    <main className="block">
      <div className="wrap">
        <h1>{failed ? copy.loadFailed : copy.unavailable}</h1>
        <p role={failed ? "alert" : undefined}>
          {failed ? copy.retry : copy.inactive}
        </p>
      </div>
    </main>
  );
}
