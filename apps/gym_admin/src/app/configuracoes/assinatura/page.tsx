"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BillingStatus } from "@/components/billing/billing-status";
import { useBillingAccount } from "@/components/billing/use-billing-account";
import { ErrorState } from "@/components/states";
import { PageHeader } from "@/components/ui/page-header";
import { formatDay, subscriptionLabels } from "@/lib/billing-copy";

export { subscriptionLabels } from "@/lib/billing-copy";

export function BillingWorkspace() {
  const billing = useBillingAccount();
  const { tenant } = billing.app;
  const [reason, setReason] = useState("");
  const demo = billing.app.repository.getSubscription(billing.app.context);
  return (
    <BillingStatus
      billing={billing}
      demo={
        <section className="card">
          <h2>{demo ? "Piloto de demonstração" : "Sem assinatura disponível"}</h2>
          <p>Condições comerciais e valores dependem do contrato da academia.</p>
          <h3>Dados da academia</h3>
          <p>
            {tenant.legalName || tenant.name}
            <br />
            {tenant.cnpj}
          </p>
        </section>
      }
    >
      {billing.snapshot && (
        <>
          {billing.snapshot.subscriptions.map((subscription) => (
            <section className="card section-space" key={subscription.id}>
              <p className="eyebrow">STATUS DA ASSINATURA</p>
              <h2>{subscriptionLabels[subscription.status] ?? subscription.status}</h2>
              <dl className="detail-list">
                <div>
                  <dt>Ciclo</dt>
                  <dd>{subscription.billing_cycle === "monthly" ? "Mensal" : subscription.billing_cycle}</dd>
                </div>
                <div>
                  <dt>Preço</dt>
                  <dd>
                    {typeof subscription.plan_detail.monthly_price_minor === "number"
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: subscription.plan_detail.currency || "BRL",
                        }).format(subscription.plan_detail.monthly_price_minor / 100)
                      : subscription.plan_detail.price_reference || "Conforme contrato"}
                  </dd>
                </div>
                <div>
                  <dt>Período pago</dt>
                  <dd>
                    {formatDay(subscription.current_period_start)} até {formatDay(subscription.current_period_end)}
                  </dd>
                </div>
                <div>
                  <dt>Cancelamento</dt>
                  <dd>{subscription.cancel_at ? formatDay(subscription.cancel_at) : "Não agendado"}</dd>
                </div>
                <div>
                  <dt>Tolerância até</dt>
                  <dd>{subscription.grace_ends_at ? formatDay(subscription.grace_ends_at) : "Não informada"}</dd>
                </div>
              </dl>
              {["delinquent", "cancelled", "suspended"].includes(subscription.status) && (
                <p className="notice">
                  O servidor aplica limites de escrita conforme status e tolerância. O histórico de saúde permanece
                  preservado.
                </p>
              )}
              {subscription.status === "cancel_scheduled" && (
                <p className="notice">O cancelamento está agendado para o fim do período já pago.</p>
              )}
              {["active", "past_due", "pilot", "trial"].includes(subscription.status) && (
                <form
                  className="stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!reason.trim()) return;
                    void billing.cancelRenewal(subscription, reason.trim());
                  }}
                >
                  <h3>Cancelar renovação</h3>
                  <label>
                    Motivo
                    <input value={reason} onChange={(event) => setReason(event.target.value)} />
                  </label>
                  <button className="button" type="submit" disabled={billing.busy || !reason.trim()}>
                    Agendar cancelamento da renovação
                  </button>
                </form>
              )}
            </section>
          ))}
          {!billing.snapshot.subscriptions.length && (
            <section className="card">
              <h2>Sem assinatura disponível</h2>
            </section>
          )}
          <section className="card section-space">
            <h2>Dados da academia</h2>
            <p>
              {tenant.legalName || tenant.name}
              <br />
              {tenant.cnpj}
            </p>
            <p>Contato financeiro e endereço são gerenciados pelo provedor quando disponível.</p>
            <p className="muted">
              Alunos entram por convite da academia e não fazem pagamento individual no aplicativo. Dados de cartão são
              tratados somente pelo provedor.
            </p>
          </section>
          {billing.actionError && <ErrorState description={billing.actionError} />}
        </>
      )}
    </BillingStatus>
  );
}

export default function BillingPage() {
  return (
    <AppShell>
      <PageHeader
        title="Assinatura e dados"
        description="Acompanhe o contrato da academia e os dados usados na cobrança."
      />
      <BillingWorkspace />
    </AppShell>
  );
}
