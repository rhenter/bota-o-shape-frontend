"use client";

import { type FormEvent, useState } from "react";
import { useMessages } from "@/i18n/provider";
import { type RegistrationErrors, submitContact } from "@/lib/api";

const NO_ERRORS: RegistrationErrors = { fields: {}, general: [] };

export function ContactForm() {
  const { contact, errors: errorsCopy } = useMessages();
  const [errors, setErrors] = useState(NO_ERRORS);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    setBusy(true);
    setErrors(NO_ERRORS);
    const result = await submitContact({
      name: value("name"),
      email: value("email"),
      phone: value("phone"),
      contact_type: value("contact_type") as "demonstration" | "plans" | "quote" | "other",
      message: value("message"),
      consent: form.get("consent") === "on",
      page_url: window.location.href,
    }, fetch, errorsCopy);
    setBusy(false);
    if (result) setErrors(result);
    else setSent(true);
  }

  if (sent) {
    return <div className="card ok" role="status"><h2>{contact.sentTitle}</h2><p>{contact.sentBody}</p></div>;
  }

  const fieldError = (name: string) => errors.fields[name]?.join(" ");
  return (
    <form className="card contact-form" onSubmit={submit} aria-busy={busy}>
      {errors.general.length > 0 && <div className="error" role="alert">{errors.general.join(" ")}</div>}
      <label>{contact.name}<input name="name" required maxLength={255} aria-invalid={Boolean(fieldError("name"))} />{fieldError("name") && <span className="field-error">{fieldError("name")}</span>}</label>
      <label>{contact.email}<input name="email" type="email" required autoComplete="email" aria-invalid={Boolean(fieldError("email"))} />{fieldError("email") && <span className="field-error">{fieldError("email")}</span>}</label>
      <label>{contact.phone}<input name="phone" type="tel" autoComplete="tel" maxLength={30} /></label>
      <label>{contact.subject}<select name="contact_type" defaultValue="demonstration"><option value="demonstration">{contact.demonstration}</option><option value="plans">{contact.plans}</option><option value="quote">{contact.quote}</option><option value="other">{contact.other}</option></select></label>
      <label>{contact.message}<textarea name="message" required maxLength={4000} aria-invalid={Boolean(fieldError("message"))} />{fieldError("message") && <span className="field-error">{fieldError("message")}</span>}</label>
      <label className="consent"><input name="consent" type="checkbox" required /> {contact.consent}</label>
      {fieldError("consent") && <p className="field-error" role="alert">{fieldError("consent")}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? contact.sending : contact.submit}</button>
    </form>
  );
}
