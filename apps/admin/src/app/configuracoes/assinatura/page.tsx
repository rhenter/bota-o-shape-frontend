"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAppContext } from "@/components/app-context";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
import { canManageBilling } from "@/lib/permissions";
import {
  hostedUrl,
  type ApiSubscription,
  type ApiInvoice,
  type ApiEntitlement,
  type SubscriptionStatus,
} from "@/lib/admin-contracts";
function formatInvoiceAmount(currency: string, amountMinor: number) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(amountMinor / 100);
  } catch {
    return `${amountMinor} ${currency || "unidades"}`.trim();
  }
}
export const subscriptionLabels: Record<SubscriptionStatus, string> = {
  pilot: "Piloto provisionado",
  trial: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  delinquent: "Inadimplente",
  cancel_scheduled: "Cancelamento agendado",
  cancelled: "Cancelada",
  suspended: "Suspensa",
};
export function BillingWorkspace() {
  const app = useAppContext();
  return <BillingContent key={`${app.context.tenantId}:${app.user.id}`} />;
}
function BillingContent() {
  const app = useAppContext();
  const { api, context, mode, user, membership, tenant } = app;
  const allowed = canManageBilling(user, membership, tenant.id);
  const scope = `${context.tenantId}:${user.id}:${allowed}`;
  const [snapshot, setSnapshot] = useState<{
      scope: string;
      subscriptions: ApiSubscription[];
      invoices: ApiInvoice[];
      entitlements: ApiEntitlement[];
    }>(),
    [failure, setFailure] = useState<{ scope: string; message: string }>();
  const [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [actionError, setActionError] = useState(""),
    [providerLink, setProviderLink] = useState("");
  useEffect(() => {
    if (!allowed || mode !== "api") return;
    let active = true;
    Promise.all([
      api.getSubscriptions(context.tenantId),
      api.getInvoices(context.tenantId),
      api.getEntitlements(context.tenantId),
    ])
      .then(([subscriptions, invoices, entitlements]) => {
        if (active)
          setSnapshot({ scope, subscriptions, invoices, entitlements });
      })
      .catch((e) => {
        if (active)
          setFailure({
            scope,
            message: e instanceof Error ? e.message : "Cobrança indisponível.",
          });
      });
    return () => {
      active = false;
    };
  }, [api, context.tenantId, allowed, mode, scope, revision]);
  if (!allowed)
    return (
      <p className="notice">
        Cobrança restrita a pessoas com a permissão billing.manage na academia
        ativa.
      </p>
    );
  if (mode === "demo") {
    const subscription = app.repository.getSubscription(context);
    return (
      <section className="card">
        <h2>
          {subscription
            ? "Piloto de demonstração"
            : "Sem assinatura disponível"}
        </h2>
        <p>Condições comerciais e valores dependem do contrato da academia.</p>
        <p>Portal e faturas exigem conexão com a API.</p>
      </section>
    );
  }
  if (failure?.scope === scope)
    return (
      <ErrorState
        description={failure.message}
        onRetry={() => {
          setFailure(undefined);
          setRevision((r) => r + 1);
        }}
      />
    );
  if (snapshot?.scope !== scope) return <LoadingState />;
  async function open(
    subscription: ApiSubscription,
    action: "portal" | "checkout",
  ) {
    setBusy(true);
    setActionError("");
    setProviderLink("");
    try {
      const result = await api.openBilling(
        context.tenantId,
        subscription.id,
        action,
        window.location.href,
      );
      const link = hostedUrl(result.url);
      if (!link)
        throw new Error("O provedor não retornou um endereço seguro válido.");
      setProviderLink(link);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "O provedor não está disponível.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {snapshot.subscriptions.length === 0 && (
        <EmptyState
          title="Nenhuma assinatura disponível"
          description="A contratação assistida é provisionada pela operação da plataforma."
        />
      )}
      {snapshot.subscriptions.map((s) => (
        <section className="card section-space" key={s.id}>
          <div className="section-header">
            <div>
              <p className="eyebrow">STATUS DA ASSINATURA</p>
              <h2>{subscriptionLabels[s.status] ?? s.status}</h2>
              <p>{s.plan_detail.name}</p>
            </div>
            <div className="row-actions">
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() => void open(s, "portal")}
              >
                Gerenciar cobrança
              </button>
              {["pilot", "trial", "past_due"].includes(s.status) && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => void open(s, "checkout")}
                >
                  Abrir contratação segura
                </button>
              )}
            </div>
          </div>
          <dl className="detail-list">
            <div>
              <dt>Ciclo</dt>
              <dd>
                {s.billing_cycle === "monthly" ? "Mensal" : s.billing_cycle}
              </dd>
            </div>
            <div>
              <dt>Condições comerciais</dt>
              <dd>{s.plan_detail.price_reference || "Conforme contrato"}</dd>
            </div>
            <div>
              <dt>Período vigente até</dt>
              <dd>
                {s.current_period_end
                  ? new Date(s.current_period_end).toLocaleDateString("pt-BR")
                  : "Não informado"}
              </dd>
            </div>
            <div>
              <dt>Cancelamento</dt>
              <dd>
                {s.cancel_at
                  ? new Date(s.cancel_at).toLocaleDateString("pt-BR")
                  : "Não agendado"}
              </dd>
            </div>
            <div>
              <dt>Tolerância até</dt>
              <dd>
                {s.grace_ends_at
                  ? new Date(s.grace_ends_at).toLocaleDateString("pt-BR")
                  : "Não informada"}
              </dd>
            </div>
          </dl>
          {["delinquent", "cancelled", "suspended"].includes(s.status) && (
            <p className="notice">
              O servidor aplica limites de escrita conforme status e tolerância.
              O histórico de saúde permanece preservado.
            </p>
          )}
          <h3>Recursos contratados</h3>
          <p>{s.plan_detail.features.join(", ") || "Não informados"}</p>
          <ul className="record-list">
            {Object.entries(s.plan_detail.limits).map(([key, limit]) => (
              <li key={key}>
                {key}: {limit}
              </li>
            ))}
          </ul>
          <p className="muted">
            Alteração de dados, plano e cancelamento dependem do portal do
            provedor. O provedor desta API ainda não está configurado.
          </p>
        </section>
      ))}
      {actionError && <ErrorState description={actionError} />}{" "}
      {providerLink && (
        <p className="notice" role="status">
          <a href={providerLink} target="_blank" rel="noopener noreferrer">
            Continuar no portal seguro do provedor
          </a>
        </p>
      )}
      <div className="editor-grid section-space">
        <section className="card">
          <h2>Recursos e limites</h2>
          {snapshot.entitlements.length ? (
            <ul className="record-list">
              {snapshot.entitlements.map((e) => (
                <li key={e.id}>
                  {e.key} ·{" "}
                  {e.limit === null
                    ? "Sem limite informado"
                    : `Limite: ${e.limit}`}{" "}
                  · {e.source}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sem permissões comerciais adicionais informadas.</p>
          )}
          <p className="muted">
            O uso agregado da conta não é exposto pela API. Limites são
            aplicados pelo servidor.
          </p>
        </section>
        <section className="card">
          <h2>Dados da academia</h2>
          <p>
            {tenant.legalName || tenant.name}
            <br />
            {tenant.cnpj}
          </p>
          <p>
            Contato financeiro e endereço são gerenciados pelo provedor quando
            disponível.
          </p>
        </section>
      </div>
      <section className="card section-space">
        <h2>Faturas</h2>
        <div className="table-scroll">
          <table>
            <caption>Faturas da assinatura da academia</caption>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.invoices.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.due_at
                      ? new Date(i.due_at).toLocaleDateString("pt-BR")
                      : "Não informado"}
                  </td>
                  <td>{i.status}</td>
                  <td>
                    {formatInvoiceAmount(i.currency, i.amount_minor)}
                  </td>
                  <td>
                    {hostedUrl(i.hosted_url) ? (
                      <a
                        href={hostedUrl(i.hosted_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Abrir fatura no provedor
                      </a>
                    ) : (
                      "Sem documento disponível"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!snapshot.invoices.length && <p>Nenhuma fatura disponível.</p>}
      </section>
      <p className="notice">
        Alunos entram por convite da academia e não fazem pagamento individual
        no aplicativo. Dados de cartão são tratados somente pelo provedor.
      </p>
    </>
  );
}
export default function BillingPage() {
  return (
    <AppShell>
      <PageHeader
        title="Assinatura da academia"
        description="A academia é responsável pela contratação e cobrança do sistema."
      />
      <BillingWorkspace />
    </AppShell>
  );
}
