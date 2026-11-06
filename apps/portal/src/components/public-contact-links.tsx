import type { PublicContact } from "@/lib/api";
import { whatsappUrl } from "@/lib/api";

export function PublicContactLinks({ contact }: { contact: PublicContact | null }) {
  if (!contact) return null;
  const whatsapp = whatsappUrl(contact.whatsapp);
  return (
    <>
      <div className="public-contact-links">
        {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
        {Object.entries(contact.social_urls).map(([name, url]) => <a key={name} href={url} rel="noopener noreferrer">{name}</a>)}
      </div>
      {whatsapp && <a className="whatsapp-float" href={whatsapp} rel="noopener noreferrer" aria-label="Falar com o Bota o Shape! no WhatsApp">WhatsApp</a>}
    </>
  );
}
