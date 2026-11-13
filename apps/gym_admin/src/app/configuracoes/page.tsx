"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState } from "@/components/states";
import type {
  ApiLandingPage,
  ApiUnit,
  ApiUsage,
  LandingBackground,
  LandingPageInput,
  LandingTheme,
  UnitAddress,
  UnitInput,
} from "@/lib/admin-contracts";
import { ApiError } from "@/lib/api-client";
import {
  normalizePublicSlug,
  publicSlugIssue,
  publicSlugMessage,
  type PublicSlugIssue,
} from "@/lib/public-slug";

const offeredServices = [
  ["strength_training", "Musculação"],
  ["functional_training", "Funcional"],
  ["cardio", "Cardio"],
  ["group_classes", "Aulas coletivas"],
  ["nutrition", "Nutrição"],
  ["physical_assessment", "Avaliação física"],
] as const;

const themes = [
  ["lime", "Lima"],
  ["graphite", "Grafite"],
  ["ocean", "Oceano"],
  ["black", "Logo com fundo preto"],
  ["white", "Logo com fundo branco"],
] as const;
const backgrounds = [
  ["none", "Sem imagem"],
  ["gym_floor", "Salão"],
  ["studio", "Estúdio"],
  ["outdoor", "Ar livre"],
  ["weights", "Pesos livres"],
  ["machines", "Máquinas"],
  ["group_class", "Aula coletiva"],
  ["nutrition", "Nutrição"],
] as const;

function choice<T extends string>(value: FormDataEntryValue | null, options: readonly (readonly [T, string])[], fallback: T): T {
  const selected = String(value ?? "");
  return options.some(([item]) => item === selected) ? (selected as T) : fallback;
}

function LogoField({ logo }: { logo: string | null }) {
  const [upload, setUpload] = useState<{ logo: string | null; url: string } | null>(null);
  const preview = upload?.logo === logo ? upload.url : logo;
  return (
    <label className="field settings-span">
      Logo
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="landing-logo" src={preview} alt="" />
      ) : (
        <p className="muted">Nenhum logo enviado.</p>
      )}
      <input
        name="logo"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const url = URL.createObjectURL(file);
          setUpload((current) => {
            if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
            return { logo, url };
          });
        }}
      />
    </label>
  );
}

function LandingForm({
  page,
  busy,
  onSave,
  checkSlug,
}: {
  page: ApiLandingPage;
  busy: boolean;
  onSave: (data: LandingPageInput, logo?: File) => Promise<void>;
  checkSlug: (slug: string) => Promise<PublicSlugIssue | null>;
}) {
  const [slug, setSlug] = useState(page.slug ?? "");
  const [remote, setRemote] = useState<{ slug: string; issue: PublicSlugIssue | null } | null>(null);
  const normalized = normalizePublicSlug(slug);
  const localIssue = publicSlugIssue(normalized);
  const unchanged = normalized === (page.slug ?? "");
  const remoteIssue = remote?.slug === normalized ? remote.issue : null;
  const issue = localIssue ?? remoteIssue;
  const waiting = Boolean(normalized) && !localIssue && !unchanged && remote?.slug !== normalized;
  const slugBlocked = Boolean(issue) || waiting;

  useEffect(() => {
    if (!normalized || localIssue || unchanged) return;
    let active = true;
    const timer = window.setTimeout(() => {
      checkSlug(normalized)
        .then((result) => {
          if (active) setRemote({ slug: normalized, issue: result });
        })
        .catch(() => {
          if (active) setRemote({ slug: normalized, issue: "unknown" });
        });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [checkSlug, localIssue, normalized, unchanged]);

  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (slugBlocked) return;
        const form = new FormData(event.currentTarget);
        const file = form.get("logo");
        const logo = file instanceof File && file.size > 0 ? file : undefined;
        const data: LandingPageInput = {
          title: String(form.get("title") ?? "").trim(),
          phone: String(form.get("phone") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
          whatsapp: String(form.get("whatsapp") ?? "").trim(),
          instagram_url: String(form.get("instagram_url") ?? "").trim(),
          facebook_url: String(form.get("facebook_url") ?? "").trim(),
          youtube_url: String(form.get("youtube_url") ?? "").trim(),
          theme: choice<LandingTheme>(form.get("theme"), themes, page.theme),
          background: choice<LandingBackground>(form.get("background"), backgrounds, page.background),
          slug: normalized || null,
        };
        if (page.mode === "custom") data.custom_domain = String(form.get("custom_domain") ?? "").trim();
        void onSave(data, logo);
      }}
    >
      <LogoField logo={page.logo} />
      <label className="field settings-span">
        Título da página
        <input name="title" maxLength={160} defaultValue={page.title} />
      </label>
      <label className="field">
        Telefone
        <input name="phone" maxLength={30} defaultValue={page.phone} />
      </label>
      <label className="field">
        E-mail de contato
        <input name="email" type="email" defaultValue={page.email} />
      </label>
      <label className="field">
        WhatsApp
        <input name="whatsapp" maxLength={20} defaultValue={page.whatsapp} />
      </label>
      <label className="field">
        Instagram
        <input name="instagram_url" type="url" defaultValue={page.instagram_url} placeholder="https://" />
      </label>
      <label className="field">
        Facebook
        <input name="facebook_url" type="url" defaultValue={page.facebook_url} placeholder="https://" />
      </label>
      <label className="field">
        YouTube
        <input name="youtube_url" type="url" defaultValue={page.youtube_url} placeholder="https://" />
      </label>
      <label className="field">
        Tema
        <select name="theme" defaultValue={page.theme}>
          {themes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Fundo
        <select name="background" defaultValue={page.background}>
          {backgrounds.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={page.mode === "custom" ? "field" : "field settings-span"}>
        Endereço público
        <input
          name="slug"
          maxLength={63}
          value={slug}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={issue ? true : undefined}
          aria-describedby="public-slug-help"
          onChange={(event) => setSlug(event.target.value)}
        />
        <span id="public-slug-help" className="help-text">
          {normalized ? `/${normalized}` : "A página fica em /seu-endereco."}
          {waiting ? " Conferindo disponibilidade…" : ""}
        </span>
        {issue && (
          <span className="field-error" role="alert">
            {publicSlugMessage(issue)}
          </span>
        )}
      </label>
      {page.mode === "custom" && (
        <label className="field">
          Domínio próprio
          <input name="custom_domain" maxLength={253} defaultValue={page.custom_domain} />
        </label>
      )}
      {page.mode === "custom" && (
        <p className="settings-span">{page.domain_verified ? "Domínio verificado." : "Domínio ainda não verificado."}</p>
      )}
      <div className="form-actions settings-span">
        {page.slug ? (
          <a className="button" href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
            Pré-visualizar
          </a>
        ) : (
          <button type="button" className="button" disabled>
            Pré-visualizar
          </button>
        )}
        <button className="button button-primary" disabled={busy || slugBlocked}>
          Salvar página pública
        </button>
      </div>
      <p className="help-text settings-span">
        {page.slug
          ? "A pré-visualização abre a página já publicada. Salve para ver tema, fundo e endereço novos."
          : "Salve um endereço público para pré-visualizar a página."}
      </p>
    </form>
  );
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  return digits(value)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCnpj(value: string) {
  return digits(value)
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function addressValue(address: Partial<UnitAddress> | undefined, key: keyof UnitAddress) {
  const value = address?.[key];
  return typeof value === "string" ? value : "";
}

function unitInput(form: FormData, academy: boolean): UnitInput {
  return {
    name: String(form.get("name") ?? "").trim(),
    legal_name: academy ? String(form.get("legal_name") ?? "").trim() : "",
    tax_id: academy ? digits(String(form.get("tax_id") ?? "")) : "",
    is_active: form.has("active"),
    services: form.getAll("services").map(String),
    address: {
      postal_code: digits(String(form.get("postal_code") ?? "")),
      street: String(form.get("street") ?? "").trim(),
      number: String(form.get("number") ?? "").trim(),
      complement: String(form.get("complement") ?? "").trim(),
      district: String(form.get("district") ?? "").trim(),
      city: String(form.get("city") ?? "").trim(),
      state: String(form.get("state") ?? "").trim().toUpperCase(),
    },
  };
}

function formatCep(value: string) {
  const postalCode = digits(value).slice(0, 8);
  if (postalCode.length <= 5) return postalCode;
  return `${postalCode.slice(0, 5)}-${postalCode.slice(5)}`;
}

function AddressFields({ address }: { address?: Partial<UnitAddress> }) {
  const [postalCode, setPostalCode] = useState(formatCep(addressValue(address, "postal_code")));
  return (
    <div className="address-lines settings-span">
      <div className="address-line address-line-main">
        <label className="field field-cep">
          CEP
          <input
            name="postal_code"
            required
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            placeholder="00000-000"
            pattern="\d{5}-\d{3}"
            title="Informe o CEP no formato 00000-000"
            value={postalCode}
            onChange={(event) => setPostalCode(formatCep(event.target.value))}
          />
        </label>
        <label className="field">
          Endereço
          <input name="street" required maxLength={160} autoComplete="address-line1" defaultValue={addressValue(address, "street")} />
        </label>
        <label className="field field-number">
          Número
          <input name="number" required maxLength={20} defaultValue={addressValue(address, "number")} />
        </label>
      </div>
      <div className="address-line address-line-extra">
        <label className="field">
          Complemento
          <input name="complement" maxLength={80} autoComplete="address-line2" defaultValue={addressValue(address, "complement")} />
        </label>
        <label className="field">
          Bairro
          <input name="district" required maxLength={80} defaultValue={addressValue(address, "district")} />
        </label>
        <label className="field">
          Cidade
          <input name="city" required maxLength={80} autoComplete="address-level2" defaultValue={addressValue(address, "city")} />
        </label>
        <label className="field field-uf">
          UF
          <input name="state" required maxLength={2} autoComplete="address-level1" defaultValue={addressValue(address, "state")} />
        </label>
      </div>
    </div>
  );
}

function UnitEditor({
  unit,
  academy,
  accountEmail,
  fallbackName,
  fallbackLegalName,
  fallbackTaxId,
  busy,
  onSubmit,
}: {
  unit?: ApiUnit;
  academy: boolean;
  accountEmail?: string;
  fallbackName: string;
  fallbackLegalName: string;
  fallbackTaxId: string;
  busy: boolean;
  onSubmit: (data: UnitInput) => Promise<void>;
}) {
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("active", "on");
    void onSubmit(unitInput(form, academy));
  }

  return (
    <form onSubmit={save}>
      {academy && (
        <div className="settings-form settings-unit">
          <label className="field">
            Nome fantasia
            <input name="name" required maxLength={150} defaultValue={unit?.name || fallbackName} />
          </label>
          <label className="field">
            Razão social
            <input name="legal_name" required maxLength={200} defaultValue={unit?.legal_name || fallbackLegalName} />
          </label>
          <label className="field">
            CNPJ
            <input name="tax_id" required inputMode="numeric" maxLength={18} defaultValue={formatCnpj(unit?.tax_id || fallbackTaxId)} />
          </label>
          {accountEmail ? (
            <label className="field">
              E-mail
              <input type="email" readOnly value={accountEmail} />
            </label>
          ) : null}
        </div>
      )}
      <div className="settings-form settings-unit">
        {!academy && <input type="hidden" name="name" defaultValue={unit?.name || "Endereço"} />}
        <h3 className="settings-span">Endereço</h3>
        <AddressFields address={unit?.address} />
      </div>
      <div className="settings-form settings-unit">
        <fieldset className="settings-span service-choices">
          <legend>Serviços oferecidos</legend>
          <p>
            {academy
              ? "Marque somente o que esta unidade oferece. A página pública mostra a união das unidades ativas."
              : "Marque somente o que você oferece. A página pública mostra só esses itens."}
          </p>
          <div className="service-choice-list">
            {offeredServices.map(([code, label]) => (
              <label className="checkbox-field" key={code}>
                <input
                  type="checkbox"
                  name="services"
                  value={code}
                  defaultChecked={unit?.services?.includes(code)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="form-actions">
        <button className="button button-primary" disabled={busy}>
          {unit ? (academy ? "Salvar" : "Salvar endereço") : academy ? "Adicionar unidade" : "Salvar endereço"}
        </button>
      </div>
    </form>
  );
}

function UnitSection({
  academy,
  accountEmail,
  fallbackName,
  fallbackLegalName,
  fallbackTaxId,
  mode,
  scope,
  error,
  snapshot,
  busy,
  message,
  onSave,
}: {
  academy: boolean;
  accountEmail: string;
  fallbackName: string;
  fallbackLegalName: string;
  fallbackTaxId: string;
  mode: string;
  scope: string;
  error?: { scope: string; message: string };
  snapshot?: { scope: string; units: ApiUnit[]; usage: ApiUsage | null };
  busy: boolean;
  message: string;
  onSave: (unit: ApiUnit | undefined, data: UnitInput) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const limit = snapshot?.usage?.items.find((item) => item.key === "units")?.limit ?? null;
  const used = snapshot?.units.filter((unit) => unit.is_active).length ?? 0;
  const canAdd = limit === null || used < limit;
  return (
    <>
      <h2>{academy ? "Dados da academia" : "Endereço"}</h2>
      {mode === "demo" ? (
        <p>Edite o endereço ao conectar a API.</p>
      ) : error?.scope === scope ? (
        <ErrorState description={error.message} />
      ) : snapshot?.scope !== scope ? (
        <LoadingState />
      ) : (
        <>
          <p>
            {limit === null
              ? `Em uso: ${used}. O plano não limita a quantidade.`
              : `Em uso: ${used} de ${limit}.`}
          </p>
          {snapshot.units.map((unit, index) => (
            <UnitEditor
              key={`${scope}:${unit.id}`}
              unit={unit}
              academy={academy}
              accountEmail={index === 0 ? accountEmail : undefined}
              fallbackName={fallbackName}
              fallbackLegalName={fallbackLegalName}
              fallbackTaxId={fallbackTaxId}
              busy={busy}
              onSubmit={(data) => onSave(unit, data)}
            />
          ))}
          {!snapshot.units.length && !canAdd && <p>Nenhum endereço cadastrado.</p>}
          {canAdd && snapshot.units.length > 0 && !adding && (
            <button type="button" className="button" onClick={() => setAdding(true)}>
              Adicionar unidade
            </button>
          )}
          {canAdd && (snapshot.units.length === 0 || adding) && (
            <UnitEditor
              key={`${scope}:new`}
              academy={academy}
              accountEmail={snapshot.units.length === 0 ? accountEmail : undefined}
              fallbackName={fallbackName}
              fallbackLegalName={fallbackLegalName}
              fallbackTaxId={fallbackTaxId}
              busy={busy}
              onSubmit={async (data) => {
                await onSave(undefined, data);
                setAdding(false);
              }}
            />
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
    </>
  );
}

export default function SettingsPage() {
  const app = useAppContext();
  const { api, tenant, context, mode, membership } = app;
  const admin = membership?.roles.includes("admin");
  const [snapshot, setSnapshot] = useState<{
      scope: string;
      units: ApiUnit[];
      landing: ApiLandingPage | null;
      usage: ApiUsage | null;
    }>(),
    [message, setMessage] = useState<{ scope: string; area: "landing" | "units"; text: string }>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<{ scope: string; message: string }>(),
    [tab, setTab] = useState<"account" | "landing">("account");
  const scope = `${tenant.id}:${app.user.id}`;
  const checkSlug = useCallback(
    async (value: string) => {
      const result = await api.checkPublicSlug(context.tenantId, value);
      if (result.available) return null;
      if (result.reason === "invalid" || result.reason === "reserved" || result.reason === "taken") {
        return result.reason;
      }
      return "unknown" as const;
    },
    [api, context.tenantId],
  );
  useEffect(() => {
    if (!admin || mode !== "api" || !tenant.id) return;
    let active = true;
    Promise.all([
      api.getUnits(tenant.id),
      api.getLandingPage(tenant.id).catch((failure: unknown) => {
        if (failure instanceof ApiError && failure.status === 403) return null;
        throw failure;
      }),
      api.getUsage(tenant.id).catch(() => null),
    ])
      .then(([units, landing, usage]) => {
        if (active) setSnapshot({ scope, units, landing, usage });
      })
      .catch((e) => {
        if (active)
          setError({
            scope,
            message:
              e instanceof Error ? e.message : "Configurações indisponíveis.",
          });
      });
    return () => {
      active = false;
    };
  }, [api, admin, mode, tenant.id, scope]);
  return (
    <AppShell>
      <PageHeader
        title="Configurações"
        description="Preferências do CNPJ ou profissional selecionado no topo."
      />
      <div className="profile-tabs" role="tablist" aria-label="Configurações">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "account"}
          className={tab === "account" ? "selected" : ""}
          onClick={() => setTab("account")}
        >
          {tenant.profile === "gym" ? "Dados da academia" : "Dados do profissional"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "landing"}
          className={tab === "landing" ? "selected" : ""}
          onClick={() => setTab("landing")}
        >
          Página pública
        </button>
      </div>
      {tab === "account" ? (
        <>
          {tenant.profile !== "gym" && (
            <section className="card">
              <h2>Dados do profissional</h2>
              <div className="settings-form">
                <label className="field">
                  Nome
                  <input readOnly value={tenant.name} />
                </label>
                <label className="field">
                  {digits(tenant.cnpj).length > 11 ? "CNPJ" : "CPF"}
                  <input
                    readOnly
                    value={
                      digits(tenant.cnpj).length > 11
                        ? formatCnpj(tenant.cnpj)
                        : formatCpf(tenant.cnpj)
                    }
                  />
                </label>
                <label className="field settings-span">
                  E-mail
                  <input type="email" readOnly value={app.user.email} />
                </label>
              </div>
            </section>
          )}
          {admin ? (
            <section className={tenant.profile === "gym" ? "card" : "card section-space"}>
              <UnitSection
                academy={tenant.profile === "gym"}
                accountEmail={app.user.email}
                fallbackName={tenant.name}
                fallbackLegalName={tenant.legalName}
                fallbackTaxId={tenant.cnpj}
                mode={mode}
                scope={scope}
                error={error}
                snapshot={snapshot}
                busy={busy}
                message={message?.scope === scope && message.area === "units" ? message.text : ""}
                onSave={async (unit, data) => {
                  setBusy(true);
                  setMessage(undefined);
                  try {
                    const saved = unit
                      ? await api.saveUnit(context.tenantId, unit.id, data)
                      : await api.createUnit(context.tenantId, data);
                    setSnapshot((current) =>
                      current?.scope === scope
                        ? {
                            ...current,
                            units: current.units.some((item) => item.id === saved.id)
                              ? current.units.map((item) => (item.id === saved.id ? saved : item))
                              : [...current.units, saved],
                          }
                        : current,
                    );
                    setMessage({
                      scope,
                      area: "units",
                      text: unit ? "Dados salvos." : "Unidade adicionada.",
                    });
                  } catch (failure) {
                    setMessage({
                      scope,
                      area: "units",
                      text: failure instanceof Error ? failure.message : "Falha ao salvar.",
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </section>
          ) : (
            <section className="card">
              <p>Somente a administração deste cadastro altera estes dados.</p>
            </section>
          )}
        </>
      ) : (
        <section className="card">
          <h2>Página pública</h2>
          {mode === "demo" ? (
            <p>A página pública é gravada na API da academia selecionada.</p>
          ) : !admin ? (
            <p>Somente a administração deste CNPJ altera a página pública.</p>
          ) : error?.scope === scope ? (
            <ErrorState description={error.message} />
          ) : snapshot?.scope !== scope ? (
            <LoadingState />
          ) : snapshot.landing ? (
            <LandingForm
              key={scope}
              page={snapshot.landing}
              busy={busy}
              checkSlug={checkSlug}
              onSave={async (data, logo) => {
                setBusy(true);
                setMessage(undefined);
                try {
                  let saved = await api.saveLandingPage(context.tenantId, data);
                  if (logo) saved = await api.saveLandingLogo(context.tenantId, logo);
                  setSnapshot({ scope, units: snapshot.units, landing: saved, usage: snapshot.usage });
                  setMessage({ scope, area: "landing", text: "Preferências da academia salvas." });
                } catch (failure) {
                  setMessage({
                    scope,
                    area: "landing",
                    text: failure instanceof Error ? failure.message : "Falha ao salvar.",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : (
            <p>O plano desta academia não inclui a página pública.</p>
          )}
          {message?.scope === scope && message.area === "landing" && <p role="status">{message.text}</p>}
        </section>
      )}
    </AppShell>
  );
}
