import type { Academy } from "@/lib/api";
import { ADMIN_URL, modalitiesOf, whatsappUrl } from "@/lib/api";

/** Public, tenant-branded landing. Only fields the public API exposes (name, tagline, logo) are rendered. */
export function AcademyLanding({ academy }: { academy: Academy }) {
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
          <nav aria-label="Academia">
            <a href="#inicio">Início</a>
            {modalities.length > 0 && <a href="#modalidades">Modalidades</a>}
            {hasContact && <a href="#contato">Contato</a>}
            <a className="btn" href={whatsapp ?? `${ADMIN_URL}/entrar`} rel={whatsapp ? "noopener noreferrer" : undefined}>{whatsapp ? "Matricule-se" : "Área do aluno"}</a>
          </nav>
        </div>
      </header>
      <main>
        <section className="academy-hero" id="inicio">
          <div className="wrap academy-hero-grid">
            <div className="academy-hero-copy">
              <span>Bem-vindo à {academy.name}</span>
              <h1>{tagline || academy.name}</h1>
              <p>Conheça as modalidades e fale diretamente com a academia.</p>
              <div className="actions">
                {whatsapp && <a className="btn" href={whatsapp} rel="noopener noreferrer">Fale no WhatsApp</a>}
                <a className={whatsapp ? "btn outline" : "btn"} href={`${ADMIN_URL}/entrar`}>Área do aluno</a>
              </div>
            </div>
            <div className="academy-identity">
              {safeLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeLogo} alt={`Logo ${academy.name}`} className="academy-logo" />
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
                  <h2>FALE CONOSCO</h2>
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

export function AcademyUnavailable({ failed }: { failed: boolean }) {
  return (
    <main className="block">
      <div className="wrap">
        <h1>{failed ? "Não foi possível carregar a página" : "Academia indisponível"}</h1>
        <p role={failed ? "alert" : undefined}>
          {failed ? "Tente novamente em instantes." : "Esta página não existe ou não está ativa."}
        </p>
      </div>
    </main>
  );
}
