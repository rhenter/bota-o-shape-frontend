"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "./auth-context";
import { CapabilityGuard, hasCapability } from "./capability-guard";
import { profileLabels } from "./accounts-list";
import { platformApi, type PlatformAccount } from "@/lib/platform-api";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

function formatDate(value: string | null) {
  return value ? date.format(new Date(value)) : "—";
}

export function AccountDetail() {
  const { membership } = useAuth();
  const parameters = useParams<{ id: string }>();
  const [account, setAccount] = useState<PlatformAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const allowed = Boolean(membership && hasCapability(membership, "accounts.read"));

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    platformApi.account(parameters.id).then(
      (result) => active && setAccount(result),
      (caught) => active && setError(caught instanceof Error ? caught.message : "Não foi possível carregar a conta."),
    ).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [allowed, parameters.id]);

  if (!membership) return null;
  return (
    <CapabilityGuard membership={membership} capability="accounts.read">
      {loading ? <div className="state-card" role="status">Carregando detalhes…</div> : error ? (
        <div className="state-card" role="alert"><h1>Não foi possível carregar</h1><p>{error}</p></div>
      ) : account ? <AccountContent account={account} /> : null}
    </CapabilityGuard>
  );
}

function AccountContent({ account }: { account: PlatformAccount }) {
  const limits = account.subscription?.plan.limits ?? {};
  return (
    <article className="account-detail">
      <Link href="/contas">← Voltar para contas</Link>
      <header className="page-card detail-heading">
        <div><p className="eyebrow">{profileLabels[account.profile]}</p><h1>{account.name}</h1><p>{account.legal_name || "Sem razão social"}</p></div>
        <dl><div><dt>Documento</dt><dd>{account.tax_id ?? "Não informado"}</dd></div><div><dt>Status</dt><dd>{account.is_active ? "Ativa" : "Inativa"}</dd></div></dl>
      </header>
      <div className="detail-grid">
        <DetailSection title="Owners"><MemberList items={account.owners} empty="Nenhum owner cadastrado." /></DetailSection>
        <DetailSection title="Uso atual"><dl className="metrics"><div><dt>Alunos</dt><dd>{account.counts.students}</dd></div><div><dt>Profissionais</dt><dd>{account.counts.professionals}</dd></div><div><dt>Usuários</dt><dd>{account.counts.memberships}</dd></div><div><dt>Unidades</dt><dd>{account.counts.units}</dd></div></dl></DetailSection>
        <DetailSection title="Assinatura">
          {account.subscription ? <dl className="definition-list"><div><dt>Plano</dt><dd>{account.subscription.plan.name}</dd></div><div><dt>Status</dt><dd>{account.subscription.status}</dd></div><div><dt>Ciclo</dt><dd>{account.subscription.billing_cycle}</dd></div><div><dt>Período até</dt><dd>{formatDate(account.subscription.current_period_end)}</dd></div></dl> : <p>Sem assinatura.</p>}
        </DetailSection>
        <DetailSection title="Limites e entitlements">
          {Object.keys(limits).length > 0 && <dl className="definition-list">{Object.entries(limits).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
          {account.entitlements.length > 0 ? <ul className="plain-list">{account.entitlements.map((item) => <li key={item.id}><strong>{item.key}</strong> · {item.enabled ? "ativo" : "inativo"}{item.limit !== null ? ` · limite ${item.limit}` : ""}</li>)}</ul> : <p>Sem entitlements adicionais.</p>}
        </DetailSection>
        <DetailSection title="Unidades">
          {account.units.length ? <ul className="plain-list">{account.units.map((unit) => <li key={unit.id}><strong>{unit.name}</strong> · {unit.is_active ? "ativa" : "inativa"}</li>)}</ul> : <p>Nenhuma unidade cadastrada.</p>}
        </DetailSection>
        <DetailSection title="Faturas recentes">
          {account.invoices.length ? <ul className="invoice-list">{account.invoices.slice(0, 5).map((invoice) => <li key={invoice.id}><span><strong>{money.format(invoice.amount_minor / 100)}</strong><small>Vencimento {formatDate(invoice.due_at)}</small></span><span>{invoice.status}</span></li>)}</ul> : <p>Nenhuma fatura.</p>}
        </DetailSection>
      </div>
      <DetailSection title="Usuários"><MemberList items={account.memberships} empty="Nenhum usuário cadastrado." /></DetailSection>
    </article>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="page-card detail-section"><h2>{title}</h2>{children}</section>;
}

function MemberList({ items, empty }: { items: PlatformAccount["memberships"]; empty: string }) {
  if (!items.length) return <p>{empty}</p>;
  return <ul className="member-list">{items.map((item) => <li key={item.id}><span><strong>{item.name || item.email}</strong><small>{item.email}</small></span><span>{item.roles.join(", ") || "sem papel"}</span></li>)}</ul>;
}
