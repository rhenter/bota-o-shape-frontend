"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";

import {
  PLAN_FEATURES,
  PLAN_LIMITS,
  draftFromVersion,
  featureLabel,
  featureRows,
  isQuotePrice,
  latestPlanVersion,
  limitRows,
  orderedPlanVersions,
  planPublishPayload,
  type PlanDraft,
} from "@/lib/plan-catalog";
import { platformApi, type PlatformPlan } from "@/lib/platform-api";
import { useAuth } from "./auth-context";
import { CapabilityGuard } from "./capability-guard";

function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(
    () =>
      loader()
        .then(setData)
        .catch((caught) =>
          setError(caught instanceof Error ? caught.message : "Não foi possível carregar os dados."),
        ),
    [loader],
  );
  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);
  return { data, error, reload, setError };
}

function Page({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="accounts-page">
      <header className="page-heading plan-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function State({ error }: { error: string }) {
  return error ? (
    <div className="state-card" role="alert">
      <h2>Não foi possível carregar</h2>
      <p>{error}</p>
    </div>
  ) : (
    <div className="state-card" role="status">
      Carregando dados da plataforma…
    </div>
  );
}

function Guard({ children }: { children: ReactNode }) {
  const { membership } = useAuth();
  return membership ? (
    <CapabilityGuard membership={membership} capability="plans.manage">
      {children}
    </CapabilityGuard>
  ) : null;
}

const date = (value: string | null) =>
  value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)) : "—";

const money = (minor: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(minor / 100);


export function PlansConsole() {
  const loader = useCallback(() => platformApi.plans(), []);
  const query = useLoad<PlatformPlan[]>(loader);
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState("");

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSearch(String(form.get("search") || "").trim().toLowerCase());
    setCatalog(String(form.get("catalog") || ""));
  }

  const plans = (query.data ?? []).filter((plan) => {
    const matchesSearch = !search || `${plan.name} ${plan.code}`.toLowerCase().includes(search);
    const matchesCatalog = !catalog || String(plan.is_active) === catalog;
    return matchesSearch && matchesCatalog;
  });

  return (
    <Guard>
      <Page
        eyebrow="CATÁLOGO"
        title="Planos e versões"
        description="Catálogo real. Publicar uma versão afeta novas contratações e não migra contratos atuais."
      >
        <form className="filters plan-filters" onSubmit={filter}>
          <label>
            Busca
            <input name="search" placeholder="Nome ou código" defaultValue={search} />
          </label>
          <label>
            Catálogo
            <select name="catalog" defaultValue={catalog}>
              <option value="">Todos</option>
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </label>
          <button className="button" type="submit">
            Filtrar
          </button>
        </form>
        {!query.data ? (
          <State error={query.error} />
        ) : !plans.length ? (
          <div className="state-card">
            <h2>Nenhum plano</h2>
            <p>O catálogo ainda não possui planos para este filtro.</p>
          </div>
        ) : (
          <div className="table-wrap plan-table">
            <table>
              <thead>
                <tr>
                  <th>Plano</th>
                  <th>Versão</th>
                  <th>Catálogo</th>
                  <th>Comercial</th>
                  <th>Ordem</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const version = latestPlanVersion(plan);
                  return (
                    <tr key={plan.id}>
                      <td>
                        <strong>{plan.name}</strong>
                      </td>
                      <td>{version ? `v${version.version}` : "Sem versão"}</td>
                      <td>
                        <span className={`status-pill ${plan.is_active ? "active" : "inactive"}`}>
                          {plan.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>{isQuotePrice(version) ? "Sob proposta" : "Preço por versão"}</td>
                      <td>{plan.sort_order}</td>
                      <td>
                        <Link className="text-link" href={`/planos/${plan.id}`}>
                          Versões
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Page>
    </Guard>
  );
}

export function PlanDetailConsole() {
  const params = useParams<{ id: string }>();
  const planId = params.id;
  const loader = useCallback(() => platformApi.plans(), []);
  const query = useLoad<PlatformPlan[]>(loader);
  const plan = query.data?.find((item) => item.id === planId);
  const [editor, setEditor] = useState<PlanDraft | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const versions = plan ? orderedPlanVersions(plan) : [];
  const current = versions[0];

  function openEditor() {
    setSaveError("");
    setNotice("");
    setEditor(draftFromVersion(current));
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!editor || !plan) return;
    const result = planPublishPayload(editor);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await platformApi.publishPlan(plan.id, result.payload);
      setNotice(`Versão publicada para novas contratações. Contratos atuais não foram migrados.`);
      setEditor(null);
      await query.reload();
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Versão não publicada.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Guard>
      {!query.data ? (
        <Page eyebrow="PLANO" title="Plano" description="Versões publicadas são somente leitura.">
          <State error={query.error} />
        </Page>
      ) : !plan ? (
        <Page eyebrow="PLANO" title="Plano" description="Este plano não está no catálogo.">
          <div className="state-card" role="alert">
            <h2>Plano não encontrado</h2>
            <Link className="button" href="/planos">
              Voltar
            </Link>
          </div>
        </Page>
      ) : (
        <Page
          eyebrow="PLANO"
          title={plan.name}
          description={`Código ${plan.code} · ${plan.is_active ? "Ativo no catálogo" : "Inativo no catálogo"} · Contratação: ${isQuotePrice(current) ? "Sob proposta" : "Preço conforme versão"}`}
          action={
            <Link className="button" href="/planos">
              Voltar
            </Link>
          }
        >
          {notice && (
            <p className="legal-notice" role="status">
              {notice}
            </p>
          )}
          <section className="page-card wide-card legal-document-panel">
            <div className="panel-heading">
              <div>
                <h2>Versões</h2>
                <p>Publicadas são somente leitura. A versão mais alta vale para novas contratações.</p>
              </div>
              <button className="button button-primary" type="button" onClick={openEditor}>
                Nova versão
              </button>
            </div>
            {!versions.length ? (
              <div>
                <h3>Sem versões</h3>
                <p>Publique a primeira versão para disponibilizar este plano.</p>
              </div>
            ) : (
              <div className="table-wrap plan-table">
                <table>
                  <thead>
                    <tr>
                      <th>Versão</th>
                      <th>Status</th>
                      <th>Contratação</th>
                      <th>Vigência</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((version, index) => (
                      <tr key={version.id}>
                        <td>
                          <strong>v{version.version}</strong>
                        </td>
                        <td>
                          <span className={`status-pill ${index === 0 ? "active" : "inactive"}`}>
                            {index === 0 ? "Atual" : "Histórica"}
                          </span>
                        </td>
                        <td>
                          {isQuotePrice(version)
                            ? "Sob proposta"
                            : `${money(version.monthly_price_minor, version.currency)}/mês`}
                        </td>
                        <td>{date(version.published_at)}</td>
                        <td>
                          <Link
                            className="text-link"
                            href={`/planos/${plan.id}/versoes/${version.id}`}
                          >
                            Detalhes
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {editor && (
            <div className="modal-backdrop" role="presentation">
              <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="plan-editor-title">
                <header>
                  <h2 id="plan-editor-title">Nova versão de {plan.name}</h2>
                  <button className="icon-button" type="button" aria-label="Fechar" disabled={saving} onClick={() => setEditor(null)}>
                    ×
                  </button>
                </header>
                <form onSubmit={(event) => void publish(event)}>
                  <p>
                    A versão publicada fica imutável e disponível para novas contratações. As assinaturas atuais
                    permanecem nas versões vigentes.
                  </p>
                  <div className="form-grid">
                    <label>
                      Moeda
                      <input
                        value={editor.currency}
                        maxLength={3}
                        disabled={saving}
                        onChange={(event) =>
                          setEditor({ ...editor, currency: event.target.value.toUpperCase() })
                        }
                      />
                      <small>Ex.: BRL.</small>
                    </label>
                    <label>
                      Preço mensal
                      <input
                        inputMode="decimal"
                        value={editor.price}
                        placeholder="Deixe vazio para contratação sob proposta"
                        disabled={saving}
                        onChange={(event) => setEditor({ ...editor, price: event.target.value })}
                      />
                      <small>Deixe vazio para contratação sob proposta.</small>
                    </label>
                  </div>
                  <h3 className="form-section-title">Limites</h3>
                  <div className="form-grid">
                    {PLAN_LIMITS.map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          type="number"
                          min="0"
                          value={editor.limits[key] ?? ""}
                          placeholder="Ilimitado"
                          disabled={saving}
                          onChange={(event) =>
                            setEditor({
                              ...editor,
                              limits: { ...editor.limits, [key]: event.target.value },
                            })
                          }
                        />
                        <small>Vazio significa ilimitado.</small>
                      </label>
                    ))}
                  </div>
                  <h3 className="form-section-title">Recursos</h3>
                  <div className="plan-checks">
                    {[...PLAN_FEATURES.map(([code]) => code), ...editor.features.filter((code) => !PLAN_FEATURES.some(([item]) => item === code))].map(
                      (code) => (
                        <label className="plan-check" key={code}>
                          <input
                            type="checkbox"
                            checked={editor.features.includes(code)}
                            disabled={saving}
                            onChange={(event) =>
                              setEditor({
                                ...editor,
                                features: event.target.checked
                                  ? [...editor.features, code]
                                  : editor.features.filter((item) => item !== code),
                              })
                            }
                          />
                          {featureLabel(code)}
                        </label>
                      ),
                    )}
                  </div>
                  <label>
                    Motivo
                    <textarea
                      rows={4}
                      maxLength={1000}
                      required
                      value={editor.reason}
                      disabled={saving}
                      onChange={(event) => setEditor({ ...editor, reason: event.target.value })}
                    />
                  </label>
                  {saveError && (
                    <p className="legal-error" role="alert">
                      {saveError}
                    </p>
                  )}
                  <div className="modal-actions">
                    <button className="button" type="button" onClick={() => setEditor(null)} disabled={saving}>
                      Voltar
                    </button>
                    <button className="button button-primary" type="submit" disabled={saving}>
                      {saving ? "Publicando…" : "Confirmar publicação"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}
        </Page>
      )}
    </Guard>
  );
}

export function PlanVersionDetailConsole() {
  const params = useParams<{ id: string; versionId: string }>();
  const loader = useCallback(() => platformApi.plans(), []);
  const query = useLoad<PlatformPlan[]>(loader);
  const plan = query.data?.find((item) => item.id === params.id);
  const versions = plan ? orderedPlanVersions(plan) : [];
  const version = versions.find((item) => item.id === params.versionId);
  const isCurrent = Boolean(plan && version) && versions[0]?.id === version?.id;

  return (
    <Guard>
      {!query.data ? (
        <Page eyebrow="VERSÃO" title="Versão do plano" description="Somente leitura.">
          <State error={query.error} />
        </Page>
      ) : !plan ? (
        <Page eyebrow="VERSÃO" title="Versão do plano" description="Este plano não está no catálogo.">
          <div className="state-card" role="alert">
            <h2>Plano não encontrado</h2>
            <Link className="button" href="/planos">
              Voltar
            </Link>
          </div>
        </Page>
      ) : !version ? (
        <Page eyebrow="VERSÃO" title="Versão do plano" description="Esta versão não existe no plano.">
          <div className="state-card" role="alert">
            <h2>Versão não encontrada</h2>
            <Link className="button" href={`/planos/${plan.id}`}>
              Voltar às versões
            </Link>
          </div>
        </Page>
      ) : (
        <Page
          eyebrow="VERSÃO"
          title={`Versão ${version.version} · ${plan.name}`}
          description={`Código ${plan.code} · ${plan.is_active ? "Ativo no catálogo" : "Inativo no catálogo"} · Publicada em ${date(version.published_at)}`}
          action={
            <Link className="button" href={`/planos/${plan.id}`}>
              Voltar às versões
            </Link>
          }
        >
          <div className={isCurrent ? "status-pill active version-status" : "status-pill inactive version-status"}>
            {isCurrent ? "Versão atual" : "Versão histórica"}
          </div>
          <div className="detail-grid">
            <section className="page-card detail-section">
              <h2>Contratação</h2>
              <dl className="definition-list">
                <div>
                  <dt>Preço mensal</dt>
                  <dd>
                    {isQuotePrice(version)
                      ? "Sob proposta"
                      : `${money(version.monthly_price_minor, version.currency)}/mês`}
                  </dd>
                </div>
                <div>
                  <dt>Moeda</dt>
                  <dd>{version.currency}</dd>
                </div>
                {version.price_reference ? (
                  <div>
                    <dt>Referência</dt>
                    <dd>{version.price_reference}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Publicada em</dt>
                  <dd>{date(version.published_at)}</dd>
                </div>
              </dl>
            </section>
            <section className="page-card detail-section">
              <h2>Limites</h2>
              {limitRows(version.limits).length ? (
                <dl className="definition-list">
                  {limitRows(version.limits).map(({ label, value }) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="muted">Sem limites definidos.</p>
              )}
            </section>
          </div>
          <section className="page-card detail-section plan-features-card">
            <h2>Recursos</h2>
            <ul className="plan-checks plan-features">
              {featureRows(version.features).map((row) => (
                <li
                  key={row.code}
                  className={`plan-feature ${row.enabled ? "on" : "off"}`}
                >
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    disabled
                    readOnly
                    aria-label={`${row.label}: ${row.enabled ? "ativado" : "desativado"}`}
                  />
                  <span className="feature-name">{row.label}</span>
                  <span className={`feature-badge ${row.enabled ? "on" : "off"}`}>
                    {row.enabled ? "Ativado" : "Desativado"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </Page>
      )}
    </Guard>
  );
}
