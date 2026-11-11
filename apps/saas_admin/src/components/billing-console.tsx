"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "./auth-context";
import { CapabilityGuard, hasCapability } from "./capability-guard";
import {
  platformApi,
  type PlatformAccount,
  type PlatformPlan,
} from "@/lib/platform-api";

function latestPlanVersion(plan: PlatformPlan) {
  return plan.versions.reduce<PlatformPlan["versions"][number] | undefined>(
    (latest, version) => (!latest || version.version > latest.version ? version : latest),
    undefined,
  );
}

function latestPlanLabel(plan: PlatformPlan) {
  const version = latestPlanVersion(plan);
  if (!version) return "Sem versão";
  const price = version.monthly_price_minor
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: version.currency }).format(version.monthly_price_minor / 100)
    : version.price_reference || "sem preço";
  return `v${version.version} · ${price}`;
}

export function BillingConsole() {
  const { membership } = useAuth();
  const allowed = Boolean(membership && hasCapability(membership, "billing.manage"));
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const operationKeys = useRef(new Map<string, string>());

  async function load() {
    const [accountPage, planList] = await Promise.all([
      platformApi.accounts({ limit: 100 }),
      platformApi.plans(),
    ]);
    setAccounts(accountPage.results);
    setPlans(planList);
    setSelectedId((current) => current || accountPage.results[0]?.id || "");
  }

  useEffect(() => {
    if (!allowed) return;
    Promise.all([platformApi.accounts({ limit: 100 }), platformApi.plans()])
      .then(([accountPage, planList]) => {
        setAccounts(accountPage.results);
        setPlans(planList);
        setSelectedId(accountPage.results[0]?.id ?? "");
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Erro ao carregar cobrança."))
      .finally(() => setLoading(false));
  }, [allowed]);

  if (!membership) return null;
  const account = accounts.find((item) => item.id === selectedId);

  async function run(command: string, extra: Record<string, unknown> = {}) {
    if (!account || reason.trim().length < 10) {
      setError("Informe uma justificativa com pelo menos 10 caracteres.");
      return;
    }
    if (!window.confirm(`Confirmar ${command} para ${account.name}?`)) return;
    const operation = `${account.id}:${command}:${JSON.stringify(extra)}`;
    const key = operationKeys.current.get(operation) ?? crypto.randomUUID();
    operationKeys.current.set(operation, key);
    setError("");
    try {
      await platformApi.accountCommand(account.id, command, { reason, ...extra }, key);
      operationKeys.current.delete(operation);
      setMessage("Comando concluído e auditado.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A API recusou o comando.");
    }
  }

  return (
    <CapabilityGuard membership={membership} capability="billing.manage">
      <section className="accounts-page">
        <header className="page-heading"><p className="eyebrow">COBRANÇA GLOBAL</p><h1>Planos e assinaturas</h1><p>Comandos confirmados, justificados e auditáveis.</p></header>
        {loading ? <div role="status" className="state-card">Carregando cobrança…</div> : (
          <>
            <section className="page-card billing-controls">
              <label>Conta<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label>Justificativa<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
              {account && <div className="billing-summary"><strong>{account.subscription?.plan.name ?? "Sem plano"}</strong><span>{account.subscription?.status ?? "sem assinatura"} · {account.subscription?.provider || "provedor não selecionado"}</span></div>}
              <div className="command-grid">
                <button className="button" onClick={() => void run(account?.is_active ? "suspend" : "reactivate")}>{account?.is_active ? "Suspender conta" : "Reativar conta"}</button>
                <button className="button" onClick={() => void run("cancel-renewal")}>Cancelar renovação</button>
                <button className="button" onClick={() => void run("select-provider", { provider: "asaas" })}>Selecionar Asaas</button>
                <button className="button" onClick={() => void run("select-provider", { provider: "mercado_pago" })}>Selecionar Mercado Pago</button>
              </div>
              <div className="command-grid">{plans.map((plan) => <button className="button" key={plan.id} onClick={() => void run("change-plan", { plan_code: plan.code })}>Alterar para {plan.name}</button>)}</div>
              <div className="command-grid"><button className="button" onClick={() => void run("set-limit", { key: "active_students", limit: 500 })}>Override 500 alunos</button><button className="button" onClick={() => void run("remove-limit", { key: "active_students" })}>Remover override</button></div>
            </section>
            <section className="page-card"><h2>Planos e versões publicadas</h2>{plans.map((plan) => <div className="plan-row" key={plan.id}><strong>{plan.name}</strong><span>{latestPlanLabel(plan)}</span><button className="button" onClick={() => { const latest = latestPlanVersion(plan); if (reason.length >= 10 && latest && window.confirm(`Publicar nova versão de ${plan.name}?`)) void platformApi.publishPlan(plan.id, { reason, features: latest.features, limits: latest.limits, price_reference: latest.price_reference, monthly_price_minor: latest.monthly_price_minor, currency: latest.currency }).then(load).catch((caught) => setError(caught instanceof Error ? caught.message : "Erro ao publicar.")); }}>Publicar nova versão</button></div>)}</section>
            {account && <section className="page-card"><h2>Faturas recentes</h2>{account.invoices.length ? <ul className="invoice-list">{account.invoices.slice(0, 10).map((invoice) => <li key={invoice.id}><span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: invoice.currency }).format(invoice.amount_minor / 100)}</strong><small>{invoice.status}</small></span></li>)}</ul> : <p>Nenhuma fatura.</p>}</section>}
          </>
        )}
        {message && <p role="status" className="status">{message}</p>}{error && <p role="alert" className="form-error">{error}</p>}
      </section>
    </CapabilityGuard>
  );
}
