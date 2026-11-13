"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { BillingStatus } from "@/components/billing/billing-status";
import { useBillingAccount } from "@/components/billing/use-billing-account";
import { EmptyState, ErrorState } from "@/components/states";
import { PageHeader } from "@/components/ui/page-header";
import { activePlanFeatureNames, type ApiUsageItem } from "@/lib/admin-contracts";
import { featureLabel, formatInvoiceAmount, usageLabel } from "@/lib/billing-copy";

function UsageMeter({ item }: { item: ApiUsageItem }) {
  const limit = item.limit;
  const percent = limit && limit > 0 ? Math.min(100, Math.round((item.used / limit) * 100)) : null;
  return (
    <li>
      <div className="section-header">
        <strong>{usageLabel(item.key)}</strong>
        <span>{limit === null ? `${item.used} · sem limite contratado` : `${item.used} de ${limit}`}</span>
      </div>
      {percent !== null && (
        <progress max={100} value={percent}>
          {percent}%
        </progress>
      )}
    </li>
  );
}

function ChangePlanForm({
  busy,
  loadPlans,
  onSubmit,
}: {
  busy: boolean;
  loadPlans: () => Promise<Array<{ code: string; name: string }>>;
  onSubmit: (planCode: string, reason: string) => Promise<void>;
}) {
  const [plans, setPlans] = useState<Array<{ code: string; name: string }>>([]);
  const [planCode, setPlanCode] = useState("");
  const [reason, setReason] = useState("");

  async function ensurePlans() {
    if (plans.length) return;
    setPlans(await loadPlans());
  }

  return (
    <form
      className="stack"
      onSubmit={(event) => {
        event.preventDefault();
        if (!planCode || !reason.trim()) return;
        void onSubmit(planCode, reason.trim());
      }}
    >
      <h3>Alterar plano</h3>
      <label>
        Plano
        <select
          name="plan_code"
          value={planCode}
          onFocus={() => void ensurePlans()}
          onChange={(event) => setPlanCode(event.target.value)}
        >
          <option value="">Selecione um plano publicado</option>
          {plans.map((plan) => (
            <option key={plan.code} value={plan.code}>
              {plan.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Motivo
        <input value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      <button className="button" type="submit" disabled={busy || !planCode || !reason.trim()}>
        Solicitar alteração de plano
      </button>
      <p className="muted">A alteração usa a mesma chave se o provedor ainda não confirmar.</p>

    </form>
  );
}

export function PlanWorkspace() {
  const billing = useBillingAccount();
  const subscription = billing.app.repository.getSubscription(billing.app.context);
  const demoUsage: ApiUsageItem[] = subscription
    ? [
        {
          key: "active_students",
          used: billing.app.repository.getStudents(billing.app.context).filter((item) => item.status === "active").length,
          limit: subscription.limits?.active_students ?? subscription.limits?.students ?? null,
        },
        {
          key: "team_members",
          used: billing.app.repository.getTeam(billing.app.context).length,
          limit: subscription.limits?.team_members ?? null,
        },
      ]
    : [];
  return (
    <BillingStatus
      billing={billing}
      demo={
        <section className="card">
          <h2>{subscription?.planName ?? "Sem plano disponível"}</h2>
          <p>O consumo abaixo usa os dados de demonstração desta academia.</p>
          <ul className="record-list">
            {demoUsage.map((item) => (
              <UsageMeter key={item.key} item={item} />
            ))}
          </ul>
        </section>
      }
    >
      {billing.snapshot && (
        <>
          {billing.snapshot.subscriptions.length === 0 && (
            <EmptyState
              title="Nenhum plano disponível"
              description="A contratação assistida é provisionada pela operação da plataforma."
            />
          )}
          {billing.snapshot.subscriptions.map((item) => {
            const features = activePlanFeatureNames(item.plan_detail.features).map(featureLabel);
            const usage = billing.snapshot?.usage ?? [];
            const priced =
              typeof item.plan_detail.monthly_price_minor === "number"
                ? formatInvoiceAmount(item.plan_detail.currency || "BRL", item.plan_detail.monthly_price_minor)
                : item.plan_detail.price_reference;
            return (
              <section className="card section-space" key={item.id}>
                <p className="eyebrow">PLANO ATUAL</p>
                <h2>{item.plan_detail.name || "Plano contratado"}</h2>
                <p>
                  <span>
                    {item.plan_detail.version != null
                      ? `Versão ${item.plan_detail.version}`
                      : "Versão não informada"}
                  </span>
                  {priced ? ` · ${priced}` : ""}
                  {" · "}
                  {item.billing_cycle === "monthly" ? "Mensal" : item.billing_cycle}
                </p>
                <h3>Recursos</h3>
                <p>{features.join(", ") || "Não informados"}</p>
                <h3>Consumo</h3>
                {usage.length ? (
                  <ul className="record-list">
                    {usage.map((entry) => (
                      <UsageMeter key={entry.key} item={entry} />
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    A API não devolveu o consumo desta academia. Os limites continuam aplicados no servidor.
                  </p>
                )}
                {Object.entries(item.plan_detail.limits).length > 0 && (
                  <ul className="record-list">
                    {Object.entries(item.plan_detail.limits).map(([key, limit]) => (
                      <li key={key}>
                        Limite de {usageLabel(key)}: {limit}
                      </li>
                    ))}
                  </ul>
                )}
                <h3>Recursos e limites adicionais</h3>
                {billing.snapshot?.entitlements.length ? (
                  <ul className="record-list">
                    {billing.snapshot.entitlements.map((entitlement) => (
                      <li key={entitlement.id}>
                        {entitlement.key} · {entitlement.enabled ? "Habilitado" : "Desabilitado"} ·{" "}
                        {entitlement.limit === null ? "Sem limite informado" : `Limite: ${entitlement.limit}`} ·{" "}
                        {entitlement.source}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Sem permissões comerciais adicionais informadas.</p>
                )}
                <ChangePlanForm
                  busy={billing.busy}
                  loadPlans={async () => {
                    const catalog = await billing.app.api.getBillingPlans(billing.app.context.tenantId);
                    return catalog
                      .filter((plan) => plan.is_active && plan.current_version)
                      .map((plan) => ({ code: plan.code, name: plan.name }));
                  }}
                  onSubmit={(planCode, reason) => billing.changePlan(item, planCode, reason)}
                />
              </section>
            );
          })}
          {billing.actionError && <ErrorState description={billing.actionError} />}
        </>
      )}
    </BillingStatus>
  );
}

export default function PlanPage() {
  return (
    <AppShell>
      <PageHeader
        title="Plano e consumo"
        description="Acompanhe o plano contratado, os recursos e o uso atual da academia."
      />
      <PlanWorkspace />
    </AppShell>
  );
}
