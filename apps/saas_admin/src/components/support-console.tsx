"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { CapabilityGuard, hasCapability } from "./capability-guard";
import { platformApi, type SupportTicket } from "@/lib/platform-api";

const priorityLabels: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };

export function SupportConsole() {
  const { membership } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [status, setStatus] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const allowed = Boolean(membership && hasCapability(membership, "support.manage"));

  const load = useCallback(async () => {
    const page = await platformApi.supportTickets(status ? { status } : {});
    setTickets(page.results); setSelected((current) => page.results.find((item) => item.id === current?.id) ?? page.results[0] ?? null);
  }, [status]);

  useEffect(() => {
    if (!allowed) return;
    void Promise.resolve().then(load).catch((caught) => setError(caught instanceof Error ? caught.message : "Erro ao carregar chamados.")).finally(() => setLoading(false));
  }, [allowed, load]);

  async function act(action: string, payload: Record<string, unknown> = {}) {
    if (!selected) return;
    setError("");
    try {
      const updated = await platformApi.supportAction(selected.id, action, payload, action === "reply" ? crypto.randomUUID() : undefined);
      setSelected(updated); setBody(""); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "A ação não foi concluída."); }
  }

  function submit(event: FormEvent) {
    event.preventDefault(); if (!body.trim()) return;
    void act("reply", { channel: "email", body });
  }

  if (!membership) return null;
  return <CapabilityGuard membership={membership} capability="support.manage"><section className="accounts-page">
    <header className="page-heading"><p className="eyebrow">ATENDIMENTO GLOBAL</p><h1>Suporte</h1><p>Fila de chamados, histórico e ações operacionais.</p></header>
    <label className="compact-filter">Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="open">Abertos</option><option value="pending">Pendentes</option><option value="closed">Fechados</option></select></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <div className="state-card">Carregando chamados…</div> : !tickets.length ? <div className="state-card"><h2>Nenhum chamado</h2><p>A fila está vazia para este filtro.</p></div> : <div className="support-layout">
      <div className="ticket-list" aria-label="Chamados">{tickets.map((ticket) => <button key={ticket.id} className={selected?.id === ticket.id ? "selected" : ""} onClick={() => setSelected(ticket)}><strong>{ticket.subject}</strong><span>{ticket.requester_name} · {priorityLabels[ticket.priority]}</span><small>{ticket.status}</small></button>)}</div>
      {selected && <article className="page-card ticket-detail"><header><div><h2>{selected.subject}</h2><p>{selected.requester_name} · {selected.requester_email || selected.requester_phone}</p></div><span className={`status-pill ${selected.status === "closed" ? "inactive" : "active"}`}>{selected.status}</span></header>
        <div className="ticket-history">{selected.messages.map((message) => <p key={message.id}><strong>{message.outbound ? "Equipe" : "Cliente"}</strong><span>{message.body}</span></p>)}{selected.notes.map((note) => <p key={note.id} className="internal-note"><strong>Nota interna</strong><span>{note.body}</span></p>)}</div>
        <form className="ticket-form" onSubmit={submit}><label>Resposta ou nota<textarea rows={4} value={body} onChange={(event) => setBody(event.target.value)} /></label><div className="command-grid"><button className="button button-primary" type="submit">Responder por e-mail</button><button className="button" type="button" disabled={!body.trim()} onClick={() => void act("note", { body })}>Adicionar nota</button>{selected.status === "closed" ? <button className="button" type="button" onClick={() => void act("reopen")}>Reabrir</button> : <button className="button" type="button" onClick={() => void act("close")}>Encerrar</button>}</div></form>
      </article>}
    </div>}
  </section></CapabilityGuard>;
}
