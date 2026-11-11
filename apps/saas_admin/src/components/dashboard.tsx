"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { platformApi, type PlatformDashboard } from "@/lib/platform-api";

const iso = (date: Date) => date.toISOString().slice(0, 10);
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
const money = (minor: number, currency: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(minor / 100);

function FinancialCard({ title, values, detail, link }: { title: string; values: Record<string, number>; detail: string; link: string }) {
  const rows = Object.entries(values);
  return <article className="financial-card"><header><span>{title}</span><small>Atualizado</small></header>{rows.length ? rows.map(([currency, amount]) => <strong key={currency}>{money(amount, currency)}</strong>) : <strong>Nenhum valor</strong>}<p>{detail}</p><footer><Link href={link}>› Ver detalhes da apuração</Link></footer></article>;
}

export function Dashboard() {
  const today = new Date(); const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);
  const [period, setPeriod] = useState({ start: iso(monthAgo), end: iso(today) });
  const [draft, setDraft] = useState(period); const [data, setData] = useState<PlatformDashboard | null>(null); const [error, setError] = useState("");
  const load = useCallback(() => platformApi.dashboard(period).then(setData).catch((caught) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar os indicadores.")), [period]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  function apply(event: FormEvent) { event.preventDefault(); setError(""); setPeriod(draft); }
  if (error) return <section className="state-card" role="alert"><h1>Visão geral indisponível</h1><p>{error}</p></section>;
  if (!data) return <section className="state-card" role="status">Carregando indicadores…</section>;
  const activeSubscriptions = data.subscriptions.by_status.active ?? 0;
  return <section className="accounts-page dashboard-page"><header className="page-heading"><p className="eyebrow">VISÃO GERAL</p><h1>Gestão comercial e financeira</h1><p>Indicadores calculados e classificados pela API da plataforma.</p></header>
    <form className="period-filter" onSubmit={apply}><label>Início<input type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} /></label><label>Fim exclusivo<input type="date" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} /></label><button className="button">Atualizar período</button></form>
    <div className="period-banner"><strong>PERÍODO ANALISADO</strong><b>{formatDate(data.period.start)} até {formatDate(data.period.end)}</b><span>Atualizado em {new Intl.DateTimeFormat("pt-BR").format(new Date(data.period.updated_at))} · fim exclusivo</span></div>
    <section className="dashboard-section"><div className="section-intro"><h2>Visão financeira</h2><p>Valores separados por moeda e calculados pela API da plataforma.</p></div><div className="financial-grid"><FinancialCard title="Receita recorrente mensal" values={data.financial.mrr} detail="Valor mensal contratado dos planos ativos." link="/assinaturas" /><FinancialCard title="Recebimentos no período" values={data.financial.received} detail="Pagamentos efetivamente recebidos no período selecionado." link="/recebiveis" /><FinancialCard title="Valores em atraso" values={data.financial.overdue} detail="Saldo positivo de cobranças vencidas e não confirmadas." link="/cobrancas" /></div></section>
    <section className="dashboard-section"><div className="section-intro"><h2>Operação da plataforma</h2><p>Indicadores atuais de contas, assinaturas e atendimento.</p></div><div className="summary-grid compact"><article className="summary-card"><span>Contas</span><strong>{data.accounts.total}</strong><small>{data.accounts.active} ativas · {data.accounts.total - data.accounts.active} suspensas</small></article><article className="summary-card"><span>Assinaturas pagas ativas</span><strong>{activeSubscriptions}</strong><small>{data.subscriptions.total} contratos no total</small></article><article className="summary-card"><span>Usuários vinculados</span><strong>{data.memberships.total}</strong><small>{data.memberships.active} vínculos ativos</small></article><article className="summary-card"><span>Chamados abertos</span><strong>{data.support.open}</strong><small>{data.support.urgent} urgentes</small></article><article className="summary-card"><span>Faturas no período</span><strong>{data.invoices.total}</strong><small>Registros financeiros</small></article></div></section>
    {data.limitations.length > 0 && <details className="limitations"><summary>Limitações e observações da API</summary>{data.limitations.map((item) => <p key={item}>{item}</p>)}</details>}
  </section>;
}
