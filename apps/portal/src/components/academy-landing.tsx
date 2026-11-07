import { fill } from "@/i18n/locale";
import type { Messages } from "@/i18n/pt-BR";
import { ptBR } from "@/i18n/pt-BR";
import type { Academy } from "@/lib/api";
import { ADMIN_URL, modalitiesOf, whatsappUrl } from "@/lib/api";

/** Public, tenant-branded landing. Only fields the public API exposes (name, tagline, logo) are rendered. */
export function AcademyLanding({ academy, messages = ptBR }: { academy: Academy; messages?: Messages }) {
  const copy = messages.academy;
  const { tagline, logo_url: logo } = academy.profile;
  const modalities = modalitiesOf(academy.profile);
  const whatsapp = whatsappUrl(academy.profile.whatsapp);
  const address = academy.profile.address?.trim();
  const hasContact = Boolean(whatsapp || address);
  const safeLogo = logo && /^https:\/\//.test(logo) ? logo : null;
  return (
    <>
      <header className="academy-top">
        <div className="wrap">
          <span className="academy-brand">
            {safeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeLogo} alt="" />
            ) : <i aria-hidden="true">◫</i>}
            {academy.name}
          </span>
          <nav aria-label={copy.nav}>
            <a href="#inicio">{copy.home}</a>
            {modalities.length > 0 && <a href="#modalidades">{copy.modalities}</a>}
            {hasContact && <a href="#contato">{copy.contact}</a>}
            <a className="btn" href={whatsapp ?? `${ADMIN_URL}/entrar`} rel={whatsapp ? "noopener noreferrer" : undefined}>{whatsapp ? copy.enroll : copy.studentArea}</a>
          </nav>
        </div>
      </header>
      <main>
        <section className="academy-hero" id="inicio">
          <div className="wrap academy-hero-grid">
            <div className="academy-hero-copy">
              <span>{fill(copy.welcome, { name: academy.name })}</span>
              <h1>{tagline || academy.name}</h1>
              <p>{copy.intro}</p>
              <div className="actions">
                {whatsapp && <a className="btn" href={whatsapp} rel="noopener noreferrer">{copy.whatsapp}</a>}
                <a className={whatsapp ? "btn outline" : "btn"} href={`${ADMIN_URL}/entrar`}>{copy.studentArea}</a>
              </div>
            </div>
            <div className="academy-identity">
              {safeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeLogo} alt={fill(copy.logo, { name: academy.name })} className="academy-logo" />
              ) : (
                <strong>{academy.name}</strong>
              )}
            </div>
          </div>
        </section>
        {(modalities.length > 0 || hasContact) && (
          <section className="academy-content">
            <div className="wrap academy-grid">
              {modalities.map((item) => (
                <article id={item === modalities[0] ? "modalidades" : undefined} key={item.title}>
                  <i aria-hidden="true">✓</i>
                  <h2>{item.title.toUpperCase()}</h2>
                  {item.text && <p>{item.text}</p>}
                </article>
              ))}
              {hasContact && (
                <article className="academy-contact" id="contato">
                  <h2>{copy.talk}</h2>
                  {whatsapp && <p><a href={whatsapp} rel="noopener noreferrer">WhatsApp</a></p>}
                  {address && <p>{address}</p>}
                </article>
              )}
            </div>
          </section>
        )}
      </main>
    </>
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
