"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { CapabilityGuard, hasCapability } from "./capability-guard";
import { platformApi, type SupportTicket } from "@/lib/platform-api";

const priorityLabels: Record<string, string> = { low: "Baixa", normal: "Normal", high: "Alta", urgent: "Urgente" };
const statusLabels: Record<string, string> = { open: "Aberto", pending: "Pendente", closed: "Encerrado" };

type TicketTab = "ongoing" | "closed" | "all";

const TABS: Array<{ id: TicketTab; label: string }> = [
  { id: "ongoing", label: "Em andamento" },
  { id: "closed", label: "Encerrados" },
  { id: "all", label: "Todos" },
];

const emptyFilters = {
  search: "",
  tenant_id: "",
  status: "",
  assignee_id: "",
  from: "",
  to: "",
};

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const matches = (value: string | null, term: string) =>
  !term.trim() || normalize(value ?? "").includes(normalize(term.trim()));

const inTab = (ticket: SupportTicket, tab: TicketTab) =>
  tab === "all" ? true : tab === "closed" ? ticket.status === "closed" : ticket.status !== "closed";

export function SupportConsole() {
  const { membership } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TicketTab>("ongoing");
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const allowed = Boolean(membership && hasCapability(membership, "support.manage"));

  const load = useCallback(async () => {
    const page = await platformApi.supportTickets({});
    setTickets(page.results);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    void Promise.resolve()
      .then(load)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Erro ao carregar chamados."),
      )
      .finally(() => setLoading(false));
  }, [allowed, load]);

  async function act(action: string, payload: Record<string, unknown> = {}) {
    const selected = tickets.find((item) => item.id === selectedId);
    if (!selected) return;
    setError("");
    try {
      const updated = await platformApi.supportAction(
        selected.id,
        action,
        payload,
        action === "reply" ? crypto.randomUUID() : undefined,
      );
      setSelectedId(updated.id);
      setBody("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A ação não foi concluída.");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    void act("reply", { channel: "email", body });
  }

  function apply(event: FormEvent) {
    event.preventDefault();
    setFilters(draft);
  }

  function changeTab(next: TicketTab) {
    setTab(next);
    setDraft((value) => ({ ...value, status: "" }));
    setFilters((value) => ({ ...value, status: "" }));
  }

  const counts = {
    ongoing: tickets.filter((item) => inTab(item, "ongoing")).length,
    closed: tickets.filter((item) => inTab(item, "closed")).length,
    all: tickets.length,
  };

  const start = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
  const end = filters.to ? new Date(`${filters.to}T23:59:59`).getTime() : null;
  const visible = tickets.filter((ticket) => {
    const created = new Date(ticket.created_at).getTime();
    return (
      inTab(ticket, tab) &&
      (!filters.status || ticket.status === filters.status) &&
      matches(ticket.subject, filters.search) &&
      matches(ticket.id, filters.search) &&
      matches(ticket.tenant_id, filters.tenant_id) &&
      matches(ticket.assignee_id, filters.assignee_id) &&
      (start === null || created >= start) &&
      (end === null || created <= end)
    );
  });

  const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;
  const statusOptions =
    tab === "ongoing"
      ? [
          { value: "open", label: "Aberto" },
          { value: "pending", label: "Pendente" },
        ]
      : tab === "closed"
        ? [{ value: "closed", label: "Encerrado" }]
        : [
            { value: "open", label: "Aberto" },
            { value: "pending", label: "Pendente" },
            { value: "closed", label: "Encerrado" },
          ];

  if (!membership) return null;
  return (
    <CapabilityGuard membership={membership} capability="support.manage">
      <section className="accounts-page">
        <header className="page-heading">
          <p className="eyebrow">ATENDIMENTO GLOBAL</p>
          <h1>Atendimento</h1>
          <p>
            Administrador e Staff compartilham a central. Vários chamados podem permanecer abertos
            para a mesma conta.
          </p>
        </header>
        <div className="console-tabs" role="tablist" aria-label="Chamados">
          {TABS.map((item) => (
            <button
              key={item.id}
              className={`console-tab ${tab === item.id ? "is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => changeTab(item.id)}
            >
              {item.label}
              <span className="tab-count">{counts[item.id]}</span>
            </button>
          ))}
        </div>
        <form className="filters support-filters" onSubmit={apply}>
          <label>
            Busca
            <input
              value={draft.search}
              onChange={(event) => setDraft({ ...draft, search: event.target.value })}
              placeholder="Protocolo ou assunto"
            />
          </label>
          <label>
            ID da conta
            <input
              value={draft.tenant_id}
              onChange={(event) => setDraft({ ...draft, tenant_id: event.target.value })}
            />
          </label>
          <label>
            Situação
            <select
              value={draft.status}
              onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            >
              <option value="">Todas da aba</option>
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Responsável
            <input
              value={draft.assignee_id}
              onChange={(event) => setDraft({ ...draft, assignee_id: event.target.value })}
              placeholder="ID do vínculo"
            />
          </label>
          <label>
            Aberto a partir de
            <input
              type="date"
              value={draft.from}
              onChange={(event) => setDraft({ ...draft, from: event.target.value })}
            />
          </label>
          <label>
            Aberto até
            <input
              type="date"
              value={draft.to}
              onChange={(event) => setDraft({ ...draft, to: event.target.value })}
            />
          </label>
          <button className="button">Filtrar</button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <div className="state-card">Carregando chamados…</div>
        ) : !visible.length ? (
          <div className="empty-panel">
            <h2>Nenhum chamado</h2>
            <p>
              {tickets.length
                ? "Ajuste os filtros ou registre um novo chamado para uma conta."
                : "Nenhum chamado registrado até o momento."}
            </p>
          </div>
        ) : (
          <div className="support-layout">
            <div className="ticket-list" aria-label="Chamados">
              {visible.map((ticket) => (
                <button
                  key={ticket.id}
                  className={selected?.id === ticket.id ? "selected" : ""}
                  onClick={() => setSelectedId(ticket.id)}
                >
                  <strong>{ticket.subject}</strong>
                  <span>
                    {ticket.requester_name} · {priorityLabels[ticket.priority]}
                  </span>
                  <small>{statusLabels[ticket.status] ?? ticket.status}</small>
                </button>
              ))}
            </div>
            {selected && (
              <article className="page-card ticket-detail">
                <header>
                  <div>
                    <h2>{selected.subject}</h2>
                    <p>
                      {selected.requester_name} ·{" "}
                      {selected.requester_email || selected.requester_phone}
                    </p>
                  </div>
                  <span
                    className={`status-pill ${selected.status === "closed" ? "inactive" : "active"}`}
                  >
                    {statusLabels[selected.status] ?? selected.status}
                  </span>
                </header>
                <div className="ticket-history">
                  {selected.messages.map((message) => (
                    <p key={message.id}>
                      <strong>{message.outbound ? "Equipe" : "Cliente"}</strong>
                      <span>{message.body}</span>
                    </p>
                  ))}
                  {selected.notes.map((note) => (
                    <p key={note.id} className="internal-note">
                      <strong>Nota interna</strong>
                      <span>{note.body}</span>
                    </p>
                  ))}
                </div>
                <form className="ticket-form" onSubmit={submit}>
                  <label>
                    Resposta ou nota
                    <textarea
                      rows={4}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                    />
                  </label>
                  <div className="command-grid">
                    <button className="button button-primary" type="submit">
                      Responder por e-mail
                    </button>
                    <button
                      className="button"
                      type="button"
                      disabled={!body.trim()}
                      onClick={() => void act("note", { body })}
                    >
                      Adicionar nota
                    </button>
                    {selected.status === "closed" ? (
                      <button className="button" type="button" onClick={() => void act("reopen")}>
                        Reabrir
                      </button>
                    ) : (
                      <button className="button" type="button" onClick={() => void act("close")}>
                        Encerrar
                      </button>
                    )}
                  </div>
                </form>
              </article>
            )}
          </div>
        )}
      </section>
    </CapabilityGuard>
  );
}
