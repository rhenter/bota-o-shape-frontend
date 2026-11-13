"use client";

import { type FormEvent, useRef, useState } from "react";
import { useMessages } from "@/i18n/provider";
import { type RegistrationErrors, submitContact } from "@/lib/api";

const NO_ERRORS: RegistrationErrors = { fields: {}, general: [] };

export function AcademyContactForm({
  slug,
  title,
  privacyUrl = null,
}: {
  slug: string;
  title: string;
  privacyUrl?: string | null;
}) {
  const { academy, contact, errors: errorsCopy } = useMessages();
  const [errors, setErrors] = useState(NO_ERRORS);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    setBusy(true);
    setErrors(NO_ERRORS);
    const result = await submitContact(
      {
        name: value("name"),
        email: value("email"),
        phone: value("phone"),
        contact_type: "other",
        message: value("message"),
        consent: form.get("consent") === "on",
        page_url: window.location.href,
        academy_slug: slug,
      },
      fetch,
      errorsCopy,
    );
    if (result) {
      setErrors(result);
      submitting.current = false;
      setBusy(false);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="card ok academy-contact-form" role="status">
        <h2>{contact.sentTitle}</h2>
        <p>{contact.sentBody}</p>
      </div>
    );
  }

  const fieldError = (name: string) => errors.fields[name]?.join(" ");
  return (
    <form className="card contact-form academy-contact-form" onSubmit={submit} aria-busy={busy}>
      <h2>{title}</h2>
      {errors.general.length > 0 && <div className="error" role="alert">{errors.general.join(" ")}</div>}
      <div className="academy-contact-fields">
        <label>
          {contact.name}
          <input name="name" required maxLength={255} aria-invalid={Boolean(fieldError("name"))} />
          {fieldError("name") && <span className="field-error">{fieldError("name")}</span>}
        </label>
        <label className="academy-contact-email">
          {contact.email}
          <input name="email" type="email" required autoComplete="email" aria-invalid={Boolean(fieldError("email"))} />
          {fieldError("email") && <span className="field-error">{fieldError("email")}</span>}
        </label>
        <label>
          {contact.phone}
          <input name="phone" type="tel" autoComplete="tel" maxLength={30} aria-invalid={Boolean(fieldError("phone"))} />
          {fieldError("phone") && <span className="field-error">{fieldError("phone")}</span>}
        </label>
      </div>
      <label className="academy-message">
        {contact.message}
        <textarea name="message" required maxLength={4000} aria-invalid={Boolean(fieldError("message"))} />
        {fieldError("message") && <span className="field-error">{fieldError("message")}</span>}
      </label>
      <div className="consent-block">
        <label className="consent">
          <input name="consent" type="checkbox" required /> {contact.consent}
        </label>
        {privacyUrl && (
          <a href={privacyUrl} rel="noopener noreferrer">{academy.platformPrivacy}</a>
        )}
      </div>
      {fieldError("consent") && <p className="field-error" role="alert">{fieldError("consent")}</p>}
      {fieldError("academy_slug") && <p className="field-error" role="alert">{fieldError("academy_slug")}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? contact.sending : contact.submit}</button>
    </form>
  );
}
