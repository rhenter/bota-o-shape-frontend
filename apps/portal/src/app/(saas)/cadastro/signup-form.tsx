"use client";

import { type FormEvent, useEffect, useState } from "react";
import { fill } from "@/i18n/locale";
import { useMessages } from "@/i18n/provider";
import { ADMIN_URL, type RegistrationErrors, lookupPostalCode, registerOwner } from "@/lib/api";
import { PUBLIC_SERVICE_CODES } from "@/lib/services";

const NO_ERRORS: RegistrationErrors = { fields: {}, general: [] };
const EMPTY_ADDRESS = {
  postal_code: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
};
type PersonType = "individual" | "legal_entity";
type Profile = "gym" | "personal_trainer" | "nutritionist" | "multidisciplinary";

export function normalizeTaxId(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatPostalCode(value: string): string {
  const digits = normalizeTaxId(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
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

function Field({ label, name, errors, className, ...props }: { label: string; name: string; errors: string[] | undefined; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${name}-error`;
  return (
    <label className={className}>
      {label}
      <input name={name} aria-invalid={errors ? true : undefined} aria-describedby={errors ? errorId : undefined} {...props} />
      {errors && <span id={errorId} className="field-error">{errors.join(" ")}</span>}
    </label>
  );
}

export function SignupForm({ planCode, planName }: { planCode: string; planName: string }) {
  const { signup, academy, errors: errorsCopy } = useMessages();
  const [errors, setErrors] = useState<RegistrationErrors>(NO_ERRORS);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [profile, setProfile] = useState<Profile>("gym");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [cepBusy, setCepBusy] = useState(false);
  const [cepNote, setCepNote] = useState("");
  const personType: PersonType = profile === "gym" ? "legal_entity" : "individual";
  const panelUrl = `${ADMIN_URL}/entrar`;

  useEffect(() => {
    if (!done) return;
    // ADMIN_URL is a fixed, configured absolute URL (not user input).
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    const timer = setTimeout(() => window.location.assign(panelUrl), 2500);
    return () => clearTimeout(timer);
  }, [done, panelUrl]);

  function setAddressField(name: keyof typeof EMPTY_ADDRESS, value: string) {
    setCepNote("");
    setAddress((current) => ({
      ...current,
      [name]: name === "postal_code" ? formatPostalCode(value) : name === "state" ? value.toUpperCase() : value,
    }));
  }

  async function lookupCep() {
    const postalCode = normalizeTaxId(address.postal_code);
    setCepNote("");
    if (postalCode.length !== 8) {
      setErrors((current) => ({ ...current, fields: { ...current.fields, "address.postal_code": [signup.cepInvalid] } }));
      return;
    }
    setCepBusy(true);
    const result = await lookupPostalCode(postalCode);
    setCepBusy(false);
    if ("error" in result) {
      const message = result.error === "missing" ? signup.cepNotFound : result.error === "invalid" ? signup.cepInvalid : signup.cepFailed;
      setErrors((current) => ({ ...current, fields: { ...current.fields, "address.postal_code": [message] } }));
      return;
    }
    setErrors((current) => ({ ...current, fields: { ...current.fields, "address.postal_code": [] } }));
    setAddress((current) => ({
      ...current,
      street: result.address.street || current.street,
      district: result.address.district || current.district,
      city: result.address.city || current.city,
      state: (result.address.state || current.state).toUpperCase(),
    }));
    setCepNote(signup.cepFound);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const phone = value("phone");
    const services = form.getAll("services").map(String);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("password_confirmation") ?? "")) {
      setErrors({ fields: { password_confirmation: [signup.passwordMismatch] }, general: [] });
      return;
    }
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
      password,
      services,
      ...(phone ? { phone } : {}),
      address: {
        postal_code: normalizeTaxId(value("postal_code")),
        street: value("street"),
        number: value("number"),
        complement: value("complement"),
        district: value("district"),
        city: value("city"),
        state: value("state").toUpperCase(),
      },
      ...(profile === "gym" ? { legal_name: value("legal_name") } : {}),
      plan_code: planCode,
    }, fetch, errorsCopy);
    setBusy(false);
    if (result) setErrors(result);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="card ok" role="status">
        <h3>{signup.created}</h3>
        <p>{fill(signup.createdPlan, { name: planName })}</p>
        <a className="btn" href={panelUrl}>{signup.openPanel}</a>
      </div>
    );
  }

  const f = errors.fields;
  const postalError = f["address.postal_code"]?.length ? f["address.postal_code"] : undefined;
  const credentialLater = profile === "personal_trainer"
    ? signup.credentialLaterTrainer
    : profile === "nutritionist"
      ? signup.credentialLaterNutritionist
      : profile === "multidisciplinary"
        ? signup.credentialLaterTeam
        : "";
  return (
    <form className="card rows" onSubmit={submit}>
      {errors.general.length > 0 && (
        <div className="error" role="alert">{errors.general.map((message) => <p key={message}>{message}</p>)}</div>
      )}
      <fieldset className="signup-group">
        <legend>{signup.identity}</legend>
        <div className="signup-fields">
          <label className="span-2">
            {signup.profile}
            <select
              name="profile"
              value={profile}
              onChange={(event) => {
                const next = event.target.value as Profile;
                setProfile(next);
                setTaxId((value) => formatTaxId(value, next === "gym" ? "legal_entity" : "individual"));
              }}
            >
              <option value="gym">{signup.gym}</option>
              <option value="personal_trainer">{signup.trainer}</option>
              <option value="nutritionist">{signup.nutritionist}</option>
              <option value="multidisciplinary">{signup.team}</option>
            </select>
          </label>
          {profile === "gym" ? (
            <>
              <Field key="tax_id" label={signup.cnpj} name="tax_id" errors={f.tax_id} inputMode="numeric" autoComplete="off" required maxLength={18} value={taxId} onChange={(event) => setTaxId(formatTaxId(event.target.value, personType))} />
              <Field key="tenant_name" label={signup.businessName} name="tenant_name" errors={f.tenant_name} required maxLength={150} />
              <Field key="legal_name" className="span-2" label={signup.legalName} name="legal_name" errors={f.legal_name} required maxLength={200} />
            </>
          ) : (
            <>
              <Field key="tenant_name" label={signup.professionalName} name="tenant_name" errors={f.tenant_name} required maxLength={200} />
              <Field key="tax_id" label={signup.cpf} name="tax_id" errors={f.tax_id} inputMode="numeric" autoComplete="off" required maxLength={14} value={taxId} onChange={(event) => setTaxId(formatTaxId(event.target.value, personType))} />
              <p className="signup-note span-2">{credentialLater}</p>
            </>
          )}
        </div>
      </fieldset>
      <fieldset className="signup-group address-fields">
        <legend>{signup.address}</legend>
        <div className="address-line address-line-main">
          <div className="cep-lookup">
            <Field
              label={signup.postalCode}
              name="postal_code"
              errors={undefined}
              required
              inputMode="numeric"
              maxLength={9}
              autoComplete="postal-code"
              placeholder="00000-000"
              aria-invalid={postalError ? true : undefined}
              aria-describedby={postalError ? "postal_code-error" : undefined}
              value={address.postal_code}
              onChange={(event) => setAddressField("postal_code", event.target.value)}
            />
            <button className="btn cep-search" type="button" onClick={() => void lookupCep()} disabled={cepBusy || busy}>
              {cepBusy ? signup.lookingUpCep : signup.lookupCep}
            </button>
          </div>
          <Field label={signup.street} name="street" errors={f["address.street"]} required maxLength={160} autoComplete="address-line1" value={address.street} onChange={(event) => setAddressField("street", event.target.value)} />
          <Field label={signup.number} name="number" errors={f["address.number"]} required maxLength={20} value={address.number} onChange={(event) => setAddressField("number", event.target.value)} />
        </div>
        {(postalError || cepNote) && (
          <p id="postal_code-error" className={postalError ? "field-error" : "cep-note"} role={postalError ? "alert" : "status"}>
            {postalError ? postalError.join(" ") : cepNote}
          </p>
        )}
        <div className="address-line address-line-extra">
          <Field label={signup.complement} name="complement" errors={f["address.complement"]} maxLength={80} autoComplete="address-line2" value={address.complement} onChange={(event) => setAddressField("complement", event.target.value)} />
          <Field label={signup.district} name="district" errors={f["address.district"]} required maxLength={80} value={address.district} onChange={(event) => setAddressField("district", event.target.value)} />
          <Field label={signup.city} name="city" errors={f["address.city"]} required maxLength={80} autoComplete="address-level2" value={address.city} onChange={(event) => setAddressField("city", event.target.value)} />
          <Field label={signup.state} name="state" errors={f["address.state"]} required maxLength={2} autoComplete="address-level1" value={address.state} onChange={(event) => setAddressField("state", event.target.value)} />
        </div>
      </fieldset>
      <fieldset className="signup-group">
        <legend>{signup.responsible}</legend>
        <div className="signup-fields">
          <Field label={signup.firstName} name="first_name" errors={f.first_name} required maxLength={150} autoComplete="given-name" />
          <Field label={signup.lastName} name="last_name" errors={f.last_name} maxLength={150} autoComplete="family-name" />
        </div>
      </fieldset>
      <fieldset className="signup-group">
        <legend>{signup.contact}</legend>
        <div className="signup-fields">
          <Field label={signup.phone} name="phone" errors={f.phone} type="tel" maxLength={30} autoComplete="tel" />
          <Field label={signup.email} name="email" errors={f.email} type="email" required autoComplete="email" />
        </div>
      </fieldset>
      <fieldset className="signup-group">
        <legend>{signup.authentication}</legend>
        <div className="signup-fields">
          <Field label={signup.password} name="password" errors={f.password} type="password" required minLength={8} autoComplete="new-password" />
          <Field label={signup.passwordConfirm} name="password_confirmation" errors={f.password_confirmation} type="password" required minLength={8} autoComplete="new-password" />
        </div>
      </fieldset>
      <fieldset className="signup-group service-choices">
        <legend>{signup.services}</legend>
        <p>{signup.servicesLead}</p>
        {PUBLIC_SERVICE_CODES.map((code) => (
          <label key={code}>
            <input type="checkbox" name="services" value={code} />
            {academy.offeredServices[code]}
          </label>
        ))}
      </fieldset>
      {f.plan_code && <p className="field-error" role="alert">{f.plan_code.join(" ")}</p>}
      <button className="btn signup-submit" type="submit" disabled={busy}>{busy ? signup.creating : signup.submit}</button>
    </form>
  );
}
