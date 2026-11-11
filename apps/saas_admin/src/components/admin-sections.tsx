"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { legalPlainText, sanitizeLegalHtml } from "@/lib/legal-html";
import { featureRows, limitRows } from "@/lib/plan-catalog";
import { useAuth } from "./auth-context";
import { CapabilityGuard } from "./capability-guard";
import {
  platformApi,
  type ManagedFaq,
  type PlatformCapability,
  type PlatformCommercial,
  type PlatformContact,
  type PlatformFinance,
  type PlatformIntegrations,
  type PlatformLegal,
  type PlatformOperations,
  type PlatformSubscriptionRecord,
  type PlatformUserRecord,
  type SupportContactSettings,
} from "@/lib/platform-api";

function useLoad<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(
    () =>
      loader()
        .then(setData)
        .catch((caught) =>
          setError(
            caught instanceof Error ? caught.message : "Não foi possível carregar os dados.",
          ),
        ),
    [loader],
  );
  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);
  return { data, error, reload, setData, setError };
}

function Page({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="accounts-page">
      <header className="page-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
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

function Guard({ capability, children }: { capability: PlatformCapability; children: ReactNode }) {
  const { membership } = useAuth();
  return membership ? (
    <CapabilityGuard membership={membership} capability={capability}>
      {children}
    </CapabilityGuard>
  ) : null;
}

const date = (value: string | null) =>
  value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)) : "—";
const money = (minor: number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(minor / 100);

const MODALITY_LABELS: Record<string, string> = {
  paid: "Paga",
  trial: "Trial",
  beta: "Beta",
};

const STATUS_TONES: Record<string, "active" | "warning" | "danger"> = {
  active: "active",
  trial: "active",
  trialing: "active",
  past_due: "warning",
  pending: "warning",
  expired: "danger",
  canceled: "danger",
  cancelled: "danger",
  suspended: "danger",
  unpaid: "danger",
};

function StatusPill({ value }: { value: string }) {
  const tone = STATUS_TONES[value] ?? "inactive";
  return <span className={`status-pill ${tone}`}>{value.replace(/_/g, " ")}</span>;
}

export function UsersTable() {
  const loader = useCallback(() => platformApi.users(), []);
  const query = useLoad<PlatformUserRecord[]>(loader);
  return (
    <Guard capability="accounts.read">
      <section className="page-card wide-card">
        <div className="panel-heading">
          <div>
            <h2>Usuários clientes</h2>
            <p>Usuários e vínculos com academias.</p>
          </div>
        </div>
        {!query.data ? (
          <State error={query.error} />
        ) : !query.data.length ? (
          <p>Nenhum usuário cadastrado.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Status</th>
                  <th>Academias</th>
                  <th>Papéis</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name || user.email}</strong>
                      <small>{user.email}</small>
                    </td>
                    <td>{user.is_active ? "Ativo" : "Inativo"}</td>
                    <td>{user.memberships.map((item) => item.tenant_name).join(", ") || "—"}</td>
                    <td>{user.memberships.flatMap((item) => item.roles).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Guard>
  );
}

export function SubscriptionsConsole() {
  const pageSize = 25;
  const [filters, setFilters] = useState({
    account_id: "",
    status: "",
    modality: "",
    plan_id: "",
    limit: pageSize,
    offset: 0,
  });
  const [draft, setDraft] = useState({ account_id: "", status: "", modality: "", plan_id: "" });
  const loader = useCallback(() => platformApi.subscriptions(filters), [filters]);
  const query = useLoad(loader);

  function apply(event: FormEvent) {
    event.preventDefault();
    setFilters({ ...draft, limit: pageSize, offset: 0 });
  }

  return (
    <Guard capability="subscriptions.read">
      <Page
        eyebrow="COMERCIAL"
        title="Assinaturas"
        description="Contratos, modalidade, plano e cobertura informados pela API; status da conta e da assinatura permanecem separados."
      >
        <form className="filters subscription-filters" onSubmit={apply}>
          <label>
            ID da conta
            <input
              value={draft.account_id}
              onChange={(event) => setDraft({ ...draft, account_id: event.target.value })}
            />
          </label>
          <label>
            Status
            <input
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              placeholder="active, past_due…"
            />
          </label>
          <label>
            Modalidade
            <select
              value={draft.modality}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  modality: event.target.value,
                })
              }
            >
              <option value="">Todas</option>
              <option value="paid">Paga</option>
              <option value="trial">Trial</option>
              <option value="beta">Beta</option>
            </select>
          </label>
          <label>
            ID ou código do plano
            <input
              value={draft.plan_id}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  plan_id: event.target.value,
                })
              }
            />
          </label>
          <button className="button">Filtrar</button>
        </form>
        {!query.data ? (
          <State error={query.error} />
        ) : (
          <div className="table-wrap subscription-table">
            <table>
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th>Ciclo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!query.data.results.length ? (
                  <tr>
                    <td className="table-empty" colSpan={5}>
                      Nenhum contrato corresponde aos filtros.
                    </td>
                  </tr>
                ) : (
                  query.data.results.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link className="text-link" href={`/contas/${item.account_id}`}>
                          <strong>{item.account_name}</strong>
                        </Link>
                        <small>{MODALITY_LABELS[item.modality] ?? item.modality}</small>
                      </td>
                      <td>
                        {item.plan_version.plan.name}
                        <small>v{item.plan_version.version}</small>
                      </td>
                      <td>
                        <StatusPill value={item.status} />
                      </td>
                      <td>
                        {date(item.cycle_start)} — {date(item.cycle_end)}
                      </td>
                      <td>
                        <Link className="text-link" href={`/assinaturas/${item.id}`}>
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="table-footer">
              <span>{query.data.count} registro(s)</span>
              <nav className="pagination">
                <button
                  className="button"
                  disabled={!query.data.previous}
                  onClick={() =>
                    setFilters((value) => ({
                      ...value,
                      offset: Math.max(0, value.offset - pageSize),
                    }))
                  }
                >
                  Anterior
                </button>
                <button
                  className="button"
                  disabled={!query.data.next}
                  onClick={() =>
                    setFilters((value) => ({
                      ...value,
                      offset: value.offset + pageSize,
                    }))
                  }
                >
                  Próxima
                </button>
              </nav>
            </div>
          </div>
        )}
      </Page>
    </Guard>
  );
}

export function SubscriptionDetailConsole() {
  const parameters = useParams<{ id: string }>();
  const loader = useCallback(() => platformApi.subscription(parameters.id), [parameters.id]);
  const query = useLoad<PlatformSubscriptionRecord>(loader);
  const record = query.data;
  const planVersion = record?.plan_version;
  const limits = planVersion ? limitRows(planVersion.limits) : [];

  return (
    <Guard capability="subscriptions.read">
      <Page
        eyebrow="ASSINATURA"
        title={record?.account_name ?? "Assinatura"}
        description={record ? `Contrato ${record.id}` : "Detalhes do contrato comercial."}
      >
        {!record || !planVersion ? (
          <State error={query.error} />
        ) : (
          <>
            <div className="detail-grid">
              <section className="page-card detail-section">
                <h2>Contrato</h2>
                <dl className="definition-list">
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <StatusPill value={record.status} />
                    </dd>
                  </div>
                  <div>
                    <dt>Modalidade</dt>
                    <dd>{MODALITY_LABELS[record.modality] ?? record.modality}</dd>
                  </div>
                  <div>
                    <dt>Renovação</dt>
                    <dd>{record.renewal_state || "Não informado"}</dd>
                  </div>
                  <div>
                    <dt>Cobrança</dt>
                    <dd>{record.collection_mode || "Não definido"}</dd>
                  </div>
                  <div>
                    <dt>Vigência</dt>
                    <dd>
                      {date(record.cycle_start)} — {date(record.cycle_end)}
                    </dd>
                  </div>
                  <div>
                    <dt>Próxima cobrança</dt>
                    <dd>{date(record.next_due_date)}</dd>
                  </div>
                  <div>
                    <dt>Pago até</dt>
                    <dd>{date(record.paid_through)}</dd>
                  </div>
                  <div>
                    <dt>Cancelamento</dt>
                    <dd>{record.cancel_at ? date(record.cancel_at) : "—"}</dd>
                  </div>
                </dl>
              </section>
              <section className="page-card detail-section">
                <h2>Limites</h2>
                {limits.length ? (
                  <dl className="definition-list">
                    {limits.map(({ label, value }) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="muted">Sem limites definidos.</p>
                )}
                <p className="muted">
                  Plano {planVersion.plan.name} · código {planVersion.plan.code} · v
                  {planVersion.version} ·{" "}
                  {money(planVersion.monthly_price_minor, planVersion.currency)}/mês
                </p>
              </section>
            </div>
            <section className="page-card detail-section plan-features-card">
              <h2>Recursos do plano</h2>
              <ul className="plan-checks plan-features">
                {featureRows(planVersion.features).map((row) => (
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
            <div className="command-grid">
              <Link className="button" href="/assinaturas">
                Voltar
              </Link>
              <Link className="button" href={`/contas/${record.account_id}`}>
                Conta da academia
              </Link>
              <Link
                className="button"
                href={`/planos/${planVersion.plan.id}/versoes/${planVersion.id}`}
              >
                Versão do plano
              </Link>
              <Link className="button button-primary" href="/cobranca">
                Gerenciar plano e renovação
              </Link>
            </div>
          </>
        )}
      </Page>
    </Guard>
  );
}

export function BetaConsole() {
  const loader = useCallback(() => platformApi.commercial(), []);
  const query = useLoad<PlatformCommercial>(loader);
  const [reason, setReason] = useState("");
  const [account, setAccount] = useState("");

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!account) return;
    try {
      await platformApi.updateBeta(account, true, reason);
      setReason("");
      setAccount("");
      await query.reload();
    } catch (caught) {
      query.setError(caught instanceof Error ? caught.message : "Ação recusada.");
    }
  }

  return (
    <Guard capability="accounts.read">
      <Page
        eyebrow="PROGRAMA CONTROLADO"
        title="Beta testers"
        description="Academias com acesso antecipado a recursos do Bota o Shape."
      >
        <form className="filters compact-form" onSubmit={add}>
          <label>
            ID da conta
            <input value={account} onChange={(event) => setAccount(event.target.value)} required />
          </label>
          <label>
            Justificativa
            <input
              minLength={10}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </label>
          <button className="button button-primary">Adicionar ao beta</button>
        </form>
        {!query.data ? (
          <State error={query.error} />
        ) : (
          <div className="table-wrap beta-table">
            <table>
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Estado</th>
                  <th>Plano</th>
                  <th>Assinatura</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!query.data.beta.length ? (
                  <tr>
                    <td className="table-empty" colSpan={5}>
                      Nenhuma academia no programa beta. Use o formulário para habilitar uma conta.
                    </td>
                  </tr>
                ) : (
                  query.data.beta.map((item) => (
                    <tr key={item.tenant_id}>
                      <td>
                        <Link className="text-link" href={`/contas/${item.tenant_id}`}>
                          <strong>{item.tenant_name}</strong>
                        </Link>
                      </td>
                      <td>
                        <span className={`status-pill ${item.enabled ? "active" : "inactive"}`}>
                          {item.enabled ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>{item.plan}</td>
                      <td>
                        <StatusPill value={item.status} />
                      </td>
                      <td>
                        <button
                          className="button"
                          onClick={() =>
                            void platformApi
                              .updateBeta(
                                item.tenant_id,
                                false,
                                "Remoção do programa beta pelo administrador",
                              )
                              .then(query.reload)
                          }
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="table-footer">
              <span>{query.data.beta.length} registro(s)</span>
            </div>
          </div>
        )}
      </Page>
    </Guard>
  );
}

export function TrialsConsole() {
  const loader = useCallback(() => platformApi.commercial(), []);
  const query = useLoad<PlatformCommercial>(loader);
  return (
    <Guard capability="accounts.read">
      <Page
        eyebrow="RETENÇÃO"
        title="Trials e retenção"
        description="Pilotos, pendências comerciais e contas em risco."
      >
        {!query.data ? (
          <State error={query.error} />
        ) : !query.data.trials.length ? (
          <div className="state-card">
            <h2>Nenhuma conta em trial ou risco</h2>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Estado comercial</th>
                  <th>Retenção</th>
                  <th>Prazo</th>
                </tr>
              </thead>
              <tbody>
                {query.data.trials.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/contas/${item.tenant_id}`}>{item.tenant_name}</Link>
                    </td>
                    <td>{item.status}</td>
                    <td>{item.retention_state === "at_risk" ? "Em risco" : "Ativa"}</td>
                    <td>{date(item.ends_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Page>
    </Guard>
  );
}

export function ChargesConsole() {
  const loader = useCallback(() => platformApi.finance(), []);
  const query = useLoad<PlatformFinance>(loader);
  return (
    <Guard capability="charges.read">
      <Page
        eyebrow="FINANCEIRO"
        title="Cobranças"
        description="Faturas emitidas e tentativas de pagamento registradas pelos provedores."
      >
        {!query.data ? (
          <State error={query.error} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Conta</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Vencimento</th>
                  <th>Tentativas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {query.data.charges.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/contas/${item.tenant_id}`}>{item.tenant_name}</Link>
                    </td>
                    <td>
                      <strong>{money(item.amount_minor, item.currency)}</strong>
                    </td>
                    <td>{item.status}</td>
                    <td>{date(item.due_at)}</td>
                    <td>{item.attempts.length}</td>
                    <td>
                      {item.hosted_url ? (
                        <a
                          className="text-link"
                          href={item.hosted_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir fatura
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Page>
    </Guard>
  );
}

export function ReceivablesConsole() {
  const loader = useCallback(() => platformApi.receivables(), []);
  const query = useLoad<PlatformFinance>(loader);
  return (
    <Guard capability="finance.read">
      <Page
        eyebrow="FLUXO FINANCEIRO"
        title="Recebíveis e repasses"
        description="Valores confirmados e saldos vencidos, separados por moeda."
      >
        {!query.data ? (
          <State error={query.error} />
        ) : (
          <div className="summary-grid">
            {Object.entries(query.data.received).map(([currency, amount]) => (
              <article className="summary-card" key={`received-${currency}`}>
                <span>Recebido · {currency}</span>
                <strong>{money(amount, currency)}</strong>
                <small>Faturas confirmadas</small>
              </article>
            ))}
            {Object.entries(query.data.overdue).map(([currency, amount]) => (
              <article className="summary-card" key={`overdue-${currency}`}>
                <span>Em atraso · {currency}</span>
                <strong>{money(amount, currency)}</strong>
                <small>Saldo vencido e não confirmado</small>
              </article>
            ))}
            {!Object.keys(query.data.received).length &&
              !Object.keys(query.data.overdue).length && (
                <div className="state-card">
                  <h2>Nenhum movimento financeiro</h2>
                </div>
              )}
          </div>
        )}
      </Page>
    </Guard>
  );
}

export function OperationsConsole() {
  const loader = useCallback(() => platformApi.operations(), []);
  const query = useLoad<PlatformOperations>(loader);
  return (
    <Guard capability="operations.read">
      <Page
        eyebrow="OBSERVABILIDADE"
        title="Operação e alertas"
        description="Falhas financeiras, eventos de webhook e contatos pendentes."
      >
        {!query.data ? (
          <State error={query.error} />
        ) : (
          <>
            <div className="summary-grid">
              <article className="summary-card">
                <span>Erros de webhook</span>
                <strong>{query.data.alerts.billing_errors}</strong>
              </article>
              <article className="summary-card">
                <span>Pagamentos falhos</span>
                <strong>{query.data.alerts.failed_payments}</strong>
              </article>
              <article className="summary-card">
                <span>Contatos não lidos</span>
                <strong>{query.data.alerts.unread_contacts}</strong>
              </article>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Provedor</th>
                    <th>Evento</th>
                    <th>Conta</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.events.map((item) => (
                    <tr key={item.id}>
                      <td>{date(item.created_at)}</td>
                      <td>{item.provider}</td>
                      <td>{item.event_type}</td>
                      <td>{item.tenant_name ?? "Não correlacionado"}</td>
                      <td>{item.error || "Processado"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Page>
    </Guard>
  );
}

export function IntegrationsConsole() {
  const loader = useCallback(() => platformApi.integrations(), []);
  const query = useLoad<PlatformIntegrations>(loader);
  return (
    <Guard capability="integrations.manage">
      <Page
        eyebrow="CONFIGURAÇÃO TÉCNICA"
        title="Integrações"
        description="Diagnóstico sanitizado dos provedores e canais da plataforma."
      >
        {!query.data ? (
          <State error={query.error} />
        ) : (
          <div className="detail-grid">
            <article className="page-card">
              <h2>Cobrança</h2>
              {query.data.billing_providers.map((item) => (
                <p key={item.provider}>
                  <strong>{item.provider}</strong> · {item.accounts} conta(s)
                </p>
              ))}
              {!query.data.billing_providers.length && <p>Nenhum provedor selecionado.</p>}
            </article>
            <article className="page-card">
              <h2>E-mail</h2>
              <p>
                {query.data.email.configured
                  ? `${query.data.email.transport} · ${query.data.email.host}`
                  : "Não configurado"}
              </p>
            </article>
            <article className="page-card">
              <h2>Webhooks</h2>
              <p>
                {query.data.webhooks.events_total} eventos · {query.data.webhooks.errors} com erro
              </p>
            </article>
          </div>
        )}
      </Page>
    </Guard>
  );
}

const legalLabels = {
  terms: { title: "Termos de uso", description: "Condições de uso da plataforma." },
  privacy: { title: "Política de privacidade", description: "Como os dados pessoais são tratados." },
} as const;

type LegalKind = keyof typeof legalLabels;

export function LegalConsole() {
  const loader = useCallback(() => platformApi.legal(), []);
  const query = useLoad<PlatformLegal>(loader);
  const editorRef = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<LegalKind>("terms");
  const [editor, setEditor] = useState<{ version: number; initialText: string } | null>(null);
  const [draftText, setDraftText] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const documents = [...(query.data?.documents ?? [])]
    .filter((item) => item.kind === kind)
    .sort((a, b) => b.version - a.version);
  const current = documents[0];
  const initialText = editor?.initialText;

  useEffect(() => {
    if (editorRef.current && initialText !== undefined) editorRef.current.innerHTML = initialText;
  }, [initialText]);

  function openEditor(text = current?.text ?? "") {
    setNotice("");
    setSaveError("");
    setDraftText(text);
    setEditor({ version: (current?.version || 0) + 1, initialText: text });
  }

  function execute(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setDraftText(editorRef.current?.innerHTML || "");
  }

  function removeCopiedStyles() {
    const content = editorRef.current;
    if (!content) return;
    const clean = sanitizeLegalHtml(content.innerHTML);
    content.innerHTML = clean;
    setDraftText(clean);
  }

  function addLink() {
    const href = window.prompt("Endereço do link");
    if (href?.trim()) execute("createLink", href.trim());
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    const text = sanitizeLegalHtml(draftText);
    if (!legalPlainText(text)) {
      setSaveError("Escreva o conteúdo antes de publicar.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await platformApi.publishLegal({ kind, version: editor.version, text });
      setNotice(`${legalLabels[kind].title} v${editor.version} salva com sucesso.`);
      setEditor(null);
      await query.reload();
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Documento não publicado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Guard capability="legal.manage">
      <Page
        eyebrow="CONFIGURAÇÃO"
        title="Documentos legais"
        description="Publique novas versões e preserve o histórico dos documentos já aceitos."
      >
        {notice && (
          <p className="legal-notice" role="status">
            {notice}
          </p>
        )}
        {!query.data ? (
          <State error={query.error} />
        ) : (
          <>
            <div className="legal-document-tabs" role="tablist" aria-label="Documentos legais">
              {(Object.keys(legalLabels) as LegalKind[]).map((item) => (
                <button
                  key={item}
                  className={`button ${kind === item ? "button-primary" : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={kind === item}
                  onClick={() => {
                    setKind(item);
                    setEditor(null);
                    setNotice("");
                  }}
                >
                  {legalLabels[item].title}
                </button>
              ))}
            </div>
            <section className="page-card wide-card legal-document-panel">
              <div className="panel-heading">
                <div>
                  <h2>{legalLabels[kind].title}</h2>
                  <p>{legalLabels[kind].description} A versão mais alta é a atual.</p>
                </div>
                <button className="button button-primary" type="button" onClick={() => openEditor()}>
                  Nova versão
                </button>
              </div>
              {!documents.length ? (
                <div>
                  <h3>Nenhuma versão cadastrada</h3>
                  <p>Crie a primeira versão para disponibilizar este documento.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Versão</th>
                        <th>Conteúdo</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((item, index) => (
                        <tr key={item.id}>
                          <td>
                            <strong>v{item.version}</strong>
                          </td>
                          <td>
                            <span className="legal-document-snippet" title={legalPlainText(item.text)}>
                              {legalPlainText(item.text) || "Sem conteúdo"}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${index === 0 ? "active" : "inactive"}`}>
                              {index === 0 ? "Atual" : "Histórica"}
                            </span>
                          </td>
                          <td>
                            <button className="button" type="button" onClick={() => openEditor(item.text)}>
                              Usar como base de nova versão
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
        {editor && (
          <div className="modal-backdrop" role="presentation">
            <section
              className="legal-editor-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="legal-editor-title"
            >
              <header>
                <h2 id="legal-editor-title">Nova versão de {legalLabels[kind].title}</h2>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Fechar"
                  disabled={saving}
                  onClick={() => setEditor(null)}
                >
                  ×
                </button>
              </header>
              <form onSubmit={(event) => void publish(event)}>
                <label>
                  Versão
                  <input
                    type="number"
                    min={(current?.version || 0) + 1}
                    value={editor.version}
                    disabled={saving}
                    onChange={(event) =>
                      setEditor((value) =>
                        value ? { ...value, version: Number(event.target.value) } : value,
                      )
                    }
                  />
                  <small>Uma nova versão fica disponível para o fluxo de leitura e aceite.</small>
                </label>
                <div className="rich-editor">
                  <div className="rich-editor-toolbar" role="toolbar" aria-label="Formatação">
                    <button type="button" onClick={() => execute("formatBlock", "p")}>
                      Parágrafo
                    </button>
                    <button type="button" onClick={() => execute("formatBlock", "h2")}>
                      Título
                    </button>
                    <button type="button" onClick={() => execute("bold")}>
                      <strong>Negrito</strong>
                    </button>
                    <button type="button" onClick={() => execute("italic")}>
                      <em>Itálico</em>
                    </button>
                    <button type="button" onClick={addLink}>
                      Link
                    </button>
                    <button type="button" onClick={() => execute("insertUnorderedList")}>
                      Lista
                    </button>
                    <button type="button" onClick={() => execute("insertOrderedList")}>
                      Lista numerada
                    </button>
                    <button type="button" onClick={removeCopiedStyles} title="Remove estilos trazidos de outro editor">
                      Remover estilos
                    </button>
                  </div>
                  <div
                    ref={editorRef}
                    className="rich-editor-content"
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label="Conteúdo do documento"
                    onInput={(event) => setDraftText(event.currentTarget.innerHTML)}
                  />
                </div>
                {saveError && (
                  <p className="legal-error" role="alert">
                    {saveError}
                  </p>
                )}
                <div className="modal-actions">
                  <button className="button" type="button" onClick={() => setEditor(null)} disabled={saving}>
                    Cancelar
                  </button>
                  <button className="button button-primary" type="submit" disabled={saving}>
                    {saving ? "Salvando…" : "Publicar nova versão"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </Page>
    </Guard>
  );
}

export function FaqConsole() {
  const loader = useCallback(() => platformApi.faq(), []);
  const query = useLoad<ManagedFaq[]>(loader);
  const empty = {
    question: "",
    answer: "",
    category: "other",
    audience: "all",
    locale: "pt-BR",
    sort_order: 0,
    is_published: false,
  };
  const [draft, setDraft] = useState(empty);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await platformApi.saveFaq(null, draft);
      setDraft(empty);
      await query.reload();
    } catch (caught) {
      query.setError(caught instanceof Error ? caught.message : "FAQ não salva.");
    }
  }

  async function toggle(item: ManagedFaq) {
    try {
      await platformApi.saveFaq(item.id, {
        question: item.question,
        answer: item.answer,
        category: item.category,
        audience: item.audience,
        locale: item.locale,
        sort_order: item.sort_order,
        is_published: !item.is_published,
      });
      await query.reload();
    } catch (caught) {
      query.setError(caught instanceof Error ? caught.message : "FAQ não atualizada.");
    }
  }

  return (
    <Guard capability="support.manage">
      <Page
        eyebrow="CONTEÚDO DE AJUDA"
        title="Perguntas frequentes"
        description="Publique respostas por público e idioma."
      >
        <form className="page-card faq-form" onSubmit={save}>
          <label>
            Pergunta
            <input
              value={draft.question}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  question: event.target.value,
                })
              }
              required
            />
          </label>
          <label>
            Resposta
            <textarea
              rows={5}
              value={draft.answer}
              onChange={(event) => setDraft({ ...draft, answer: event.target.value })}
              required
            />
          </label>
          <label>
            Categoria
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  category: event.target.value,
                })
              }
            >
              <option value="plans">Planos</option>
              <option value="billing">Cobrança</option>
              <option value="account">Conta</option>
              <option value="technical">Técnico</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.is_published}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  is_published: event.target.checked,
                })
              }
            />
            Publicar agora
          </label>
          <button className="button button-primary">Adicionar FAQ</button>
        </form>
        {!query.data ? (
          <State error={query.error} />
        ) : (
          <div className="faq-list">
            {query.data.map((item) => (
              <article className="page-card" key={item.id}>
                <header>
                  <h2>{item.question}</h2>
                  <span className={`status-pill ${item.is_published ? "active" : "inactive"}`}>
                    {item.is_published ? "Publicada" : "Rascunho"}
                  </span>
                </header>
                <p>{item.answer}</p>
                <button className="button" type="button" onClick={() => void toggle(item)}>
                  {item.is_published ? "Mover para rascunho" : "Publicar"}
                </button>
              </article>
            ))}
          </div>
        )}
      </Page>
    </Guard>
  );
}

export function SupportContactConsole() {
  const loader = useCallback(() => platformApi.supportContact(), []);
  const query = useLoad<SupportContactSettings>(loader);
  const [message, setMessage] = useState("");
  if (!query.data)
    return (
      <Guard capability="support.manage">
        <Page
          eyebrow="CANAIS PÚBLICOS"
          title="WhatsApp / contato"
          description="Configure o canal exibido no produto."
        >
          <State error={query.error} />
        </Page>
      </Guard>
    );

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const saved = await platformApi.saveSupportContact(query.data!);
      query.setData(saved);
      setMessage("Configuração salva e auditada.");
    } catch (caught) {
      query.setError(caught instanceof Error ? caught.message : "Configuração não salva.");
    }
  }

  return (
    <Guard capability="support.manage">
      <Page
        eyebrow="CANAIS PÚBLICOS"
        title="WhatsApp / contato"
        description="Configure o canal exibido no produto."
      >
        <form className="page-card support-contact-form" onSubmit={save}>
          <label>
            Número internacional
            <input
              value={query.data.whatsapp_number}
              onChange={(event) =>
                query.setData({ ...query.data!, whatsapp_number: event.target.value })
              }
              placeholder="5511999999999"
            />
          </label>
          <label>
            Mensagem inicial
            <input
              value={query.data.whatsapp_prefill_default}
              onChange={(event) =>
                query.setData({
                  ...query.data!,
                  whatsapp_prefill_default: event.target.value,
                })
              }
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={query.data.whatsapp_enabled}
              onChange={(event) =>
                query.setData({
                  ...query.data!,
                  whatsapp_enabled: event.target.checked,
                })
              }
            />
            Canal ativo
          </label>
          <button className="button button-primary">Salvar</button>
          {message && <p className="status">{message}</p>}
        </form>
      </Page>
    </Guard>
  );
}

export function ContactsConsole() {
  const loader = useCallback(() => platformApi.contacts(), []);
  const query = useLoad<PlatformContact[]>(loader);
  return (
    <Guard capability="support.manage">
      <Page
        eyebrow="LEADS E CONTATOS"
        title="Contatos"
        description="Solicitações recebidas pelos formulários públicos."
      >
        {!query.data ? (
          <State error={query.error} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Contato</th>
                  <th>Assunto</th>
                  <th>Origem</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((item) => (
                  <tr key={item.id}>
                    <td>{date(item.created_at)}</td>
                    <td>
                      <strong>{item.name}</strong>
                      <small>
                        {item.email} · {item.phone}
                      </small>
                    </td>
                    <td>
                      {item.subject || item.contact_type}
                      <small>{item.message}</small>
                    </td>
                    <td>{item.source || "Site"}</td>
                    <td>{item.is_read ? "Lido" : "Novo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Page>
    </Guard>
  );
}
