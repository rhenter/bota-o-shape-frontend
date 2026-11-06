"use client";

import { type FormEvent, useEffect, useState } from "react";
import { ADMIN_URL, type RegistrationErrors, registerOwner } from "@/lib/api";

const NO_ERRORS: RegistrationErrors = { fields: {}, general: [] };
type PersonType = "individual" | "legal_entity";
type Profile = "gym" | "personal_trainer" | "nutritionist" | "multidisciplinary";

export function normalizeTaxId(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatTaxId(value: string, personType: PersonType): string {
  const digits = normalizeTaxId(value).slice(0, personType === "individual" ? 11 : 14);
  if (personType === "individual") {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function Field({ label, name, errors, ...props }: { label: string; name: string; errors: string[] | undefined } & React.InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${name}-error`;
  return (
    <label>
      {label}
      <input name={name} aria-invalid={errors ? true : undefined} aria-describedby={errors ? errorId : undefined} {...props} />
      {errors && <span id={errorId} className="field-error">{errors.join(" ")}</span>}
    </label>
  );
}

export function SignupForm({ planCode }: { planCode?: string }) {
  const [errors, setErrors] = useState<RegistrationErrors>(NO_ERRORS);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [personType, setPersonType] = useState<PersonType>("legal_entity");
  const [profile, setProfile] = useState<Profile>("gym");
  const [taxId, setTaxId] = useState("");
  const panelUrl = `${ADMIN_URL}/entrar`;

  useEffect(() => {
    if (!done) return;
    // ADMIN_URL is a fixed, configured absolute URL (not user input).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    const timer = setTimeout(() => window.location.assign(panelUrl), 2500);
    return () => clearTimeout(timer);
  }, [done, panelUrl]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    setBusy(true);
    setErrors(NO_ERRORS);
    const result = await registerOwner({
      tenant_name: value("tenant_name"),
      person_type: personType,
      tax_id: normalizeTaxId(taxId),
      profile,
      first_name: value("first_name"),
      last_name: value("last_name"),
      email: value("email"),
      password: String(form.get("password") ?? ""),
      ...(planCode ? { plan_code: planCode } : {}),
    });
    setBusy(false);
    if (result) setErrors(result);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="card ok" role="status">
        <h3>Conta criada!</h3>
        <p>
          Sua conta foi cadastrada{planCode === "pro" ? " no plano Pro" : " no plano piloto"}. Redirecionando para o painel…
        </p>
        <a className="btn" href={panelUrl}>Acessar o painel</a>
      </div>
    );
  }

  const f = errors.fields;
  return (
    <form className="card rows" onSubmit={submit}>
      {errors.general.length > 0 && (
        <div className="error" role="alert">{errors.general.map((message) => <p key={message}>{message}</p>)}</div>
      )}
      <fieldset className="account-options">
        <legend>Tipo de pessoa</legend>
        <label>
          <input
            type="radio"
            name="person_type"
            value="legal_entity"
            checked={personType === "legal_entity"}
            onChange={() => {
              setPersonType("legal_entity");
              setTaxId((value) => formatTaxId(value, "legal_entity"));
            }}
          />
          Pessoa jurídica (CNPJ)
        </label>
        <label>
          <input
            type="radio"
            name="person_type"
            value="individual"
            checked={personType === "individual"}
            onChange={() => {
              setPersonType("individual");
              setTaxId((value) => formatTaxId(value, "individual"));
            }}
          />
          Pessoa física (CPF)
        </label>
      </fieldset>
      <label>
        Perfil
        <select name="profile" value={profile} onChange={(event) => setProfile(event.target.value as Profile)}>
          <option value="gym">Academia</option>
          <option value="personal_trainer">Personal trainer</option>
          <option value="nutritionist">Nutricionista</option>
          <option value="multidisciplinary">Equipe multidisciplinar</option>
        </select>
      </label>
      <Field
        label={personType === "individual" ? "Nome profissional" : "Nome da academia ou negócio"}
        name="tenant_name"
        errors={f.tenant_name}
        required
        maxLength={200}
      />
      <Field
        label={personType === "individual" ? "CPF" : "CNPJ"}
        name="tax_id"
        errors={f.tax_id}
        inputMode="numeric"
        autoComplete="off"
        required
        maxLength={personType === "individual" ? 14 : 18}
        value={taxId}
        onChange={(event) => setTaxId(formatTaxId(event.target.value, personType))}
      />
      <Field label="Responsável" name="first_name" errors={f.first_name} required maxLength={150} autoComplete="given-name" />
      <Field label="Sobrenome" name="last_name" errors={f.last_name} maxLength={150} autoComplete="family-name" />
      <Field label="E-mail" name="email" errors={f.email} type="email" required autoComplete="email" />
      <Field label="Senha" name="password" errors={f.password} type="password" required minLength={8} autoComplete="new-password" />
      {f.plan_code && <p className="field-error" role="alert">{f.plan_code.join(" ")}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Criando…" : "Criar conta"}</button>
    </form>
  );
}
