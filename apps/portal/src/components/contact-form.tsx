"use client";

import { type FormEvent, useState } from "react";
import { type RegistrationErrors, submitContact } from "@/lib/api";

const NO_ERRORS: RegistrationErrors = { fields: {}, general: [] };

export function ContactForm() {
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
    });
    setBusy(false);
    if (result) setErrors(result);
    else setSent(true);
  }

  if (sent) {
    return <div className="card ok" role="status"><h2>Mensagem enviada</h2><p>Recebemos seus dados e entraremos em contato pelos canais informados.</p></div>;
  }

  const fieldError = (name: string) => errors.fields[name]?.join(" ");
  return (
    <form className="card contact-form" onSubmit={submit} aria-busy={busy}>
      {errors.general.length > 0 && <div className="error" role="alert">{errors.general.join(" ")}</div>}
      <label>Nome<input name="name" required maxLength={255} aria-invalid={Boolean(fieldError("name"))} />{fieldError("name") && <span className="field-error">{fieldError("name")}</span>}</label>
      <label>E-mail<input name="email" type="email" required autoComplete="email" aria-invalid={Boolean(fieldError("email"))} />{fieldError("email") && <span className="field-error">{fieldError("email")}</span>}</label>
      <label>Telefone<input name="phone" type="tel" autoComplete="tel" maxLength={30} /></label>
      <label>Assunto<select name="contact_type" defaultValue="demonstration"><option value="demonstration">Quero uma demonstração</option><option value="plans">Dúvidas sobre planos</option><option value="quote">Solicitar proposta</option><option value="other">Outro assunto</option></select></label>
      <label>Mensagem<textarea name="message" required maxLength={4000} aria-invalid={Boolean(fieldError("message"))} />{fieldError("message") && <span className="field-error">{fieldError("message")}</span>}</label>
      <label className="consent"><input name="consent" type="checkbox" required /> Autorizo o uso dos meus dados para responder a este contato.</label>
      {fieldError("consent") && <p className="field-error" role="alert">{fieldError("consent")}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar mensagem"}</button>
    </form>
  );
}
