"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { platformApi, type PlatformContact } from "@/lib/platform-api";
import { useAuth } from "./auth-context";
import { CapabilityGuard, hasCapability } from "./capability-guard";

const subjectLabels: Record<string, string> = {
  demonstration: "Quero conhecer a plataforma",
  plans: "Tenho dúvidas sobre os planos",
  quote: "Quero solicitar uma cotação",
  custom_plan_quote: "Proposta de plano personalizado",
  addon_quote: "Solicitação de serviço adicional",
  other: "Outro assunto",
};

const pageSize = 25;

const subjectOf = (contact: PlatformContact) =>
  subjectLabels[contact.contact_type] || contact.subject || "Sem assunto informado";

const contactTypeOf = (contact: PlatformContact) =>
  subjectLabels[contact.contact_type] || contact.contact_type || "Não informado";

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(value),
      )
    : "—";

function Metadata({ contact }: { contact: PlatformContact }) {
  return (
    <details className="contact-metadata">
      <summary>Ver metadados da solicitação</summary>
      <dl className="contact-metadata-list">
        <div>
          <dt>Origem</dt>
          <dd>{contact.source || "Não informado"}</dd>
        </div>
        <div>
          <dt>Página</dt>
          <dd>{contact.page_url || "Não informado"}</dd>
        </div>
        <div>
          <dt>Referência</dt>
          <dd>{contact.referrer || "Não informado"}</dd>
        </div>
        <div>
          <dt>IP</dt>
          <dd>{contact.ip_address || "Não informado"}</dd>
        </div>
        <div>
          <dt>Navegador</dt>
          <dd>{contact.user_agent || "Não informado"}</dd>
        </div>
        <div>
          <dt>Lido em</dt>
          <dd>{contact.read_at ? date(contact.read_at) : "Ainda não lido"}</dd>
        </div>
        <div>
          <dt>Lido por</dt>
          <dd>
            {contact.read_by
              ? contact.read_by
              : contact.is_read
                ? "Não registrado"
                : "Ainda não lido"}
          </dd>
        </div>
        <div>
          <dt>Atualizado em</dt>
          <dd>{date(contact.updated_at)}</dd>
        </div>
      </dl>
    </details>
  );
}

export function ContactsConsole() {
  const { membership } = useAuth();
  const [contacts, setContacts] = useState<PlatformContact[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const pendingRead = useRef(new Set<string>());
  const allowed = Boolean(membership && hasCapability(membership, "support.manage"));

  const load = useCallback(async () => {
    const items = await platformApi.contacts();
    setContacts(items);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    void Promise.resolve()
      .then(load)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Erro ao carregar contatos."),
      )
      .finally(() => setLoading(false));
  }, [allowed, load]);

  const subjects = [...new Set(contacts.map(subjectOf))];
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filtered = contacts.filter((contact) => {
    const matchesSubject = filter === "all" || subjectOf(contact) === filter;
    const matchesSender =
      !normalizedSearch ||
      `${contact.name} ${contact.email}`.toLocaleLowerCase().includes(normalizedSearch);
    return matchesSubject && matchesSender;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selected = contactOfId(filtered, selectedId) ?? contactOfId(contacts, selectedId);

  function openContact(contact: PlatformContact) {
    setSelectedId(contact.id);
    if (contact.is_read || pendingRead.current.has(contact.id)) return;
    pendingRead.current.add(contact.id);
    setError("");
    platformApi
      .markContactRead(contact.id)
      .then((updated) =>
        setContacts((items) => items.map((item) => (item.id === updated.id ? updated : item))),
      )
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : "Não foi possível marcar como visualizado.",
        ),
      )
      .finally(() => pendingRead.current.delete(contact.id));
  }

  if (!membership) return null;
  return (
    <CapabilityGuard membership={membership} capability="support.manage">
      <section className="accounts-page contacts-page">
        <header className="page-heading">
          <p className="eyebrow">RELACIONAMENTO</p>
          <h1>Contatos</h1>
          <p>Leia e organize as solicitações recebidas pelo formulário público.</p>
        </header>
        <div className="contact-toolbar page-card">
          <label>
            Buscar remetente
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nome ou e-mail"
            />
          </label>
          <label>
            Filtrar por assunto
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Todos os assuntos</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
          <span>
            {filtered.length} de {contacts.length} contato(s)
          </span>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <div className="state-card">Carregando contatos…</div>
        ) : !filtered.length ? (
          <div className="empty-panel">
            <h2>Nenhum contato encontrado</h2>
            <p>As solicitações recebidas aparecerão nesta caixa de entrada.</p>
          </div>
        ) : (
          <div className="contacts-layout">
            <section className="contact-inbox page-card" aria-label="Lista de contatos">
              <header>
                <strong>Caixa de entrada</strong>
                <small>{filtered.filter((item) => !item.is_read).length} não visualizado(s)</small>
              </header>
              <div className="contact-list">
                {pageItems.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className={`contact-row ${contact.is_read ? "is-read" : "is-unread"} ${selectedId === contact.id ? "is-selected" : ""}`}
                    onClick={() => openContact(contact)}
                  >
                    <span className="contact-avatar">
                      {contact.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="contact-row-copy">
                      <strong>{contact.name}</strong>
                      <span>{subjectOf(contact)}</span>
                      <small>{contact.email}</small>
                    </span>
                    <span className="contact-row-meta">
                      <time>{date(contact.created_at)}</time>
                      {!contact.is_read && <i aria-label="Não visualizado" />}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="contact-reader page-card" aria-label="Contato selecionado">
              {!selected ? (
                <div className="empty-panel">
                  <h2>Selecione um contato</h2>
                  <p>Escolha uma mensagem para visualizar os dados completos.</p>
                </div>
              ) : (
                <>
                  <header className="contact-reader-header">
                    <div>
                      <span className="contact-kicker">Mensagem recebida</span>
                      <h2>{subjectOf(selected)}</h2>
                      <p>{date(selected.created_at)}</p>
                    </div>
                    <span className={`status-pill ${selected.is_read ? "inactive" : "warning"}`}>
                      {selected.is_read ? "Visualizado" : "Não visualizado"}
                    </span>
                  </header>
                  <div className="contact-sender">
                    <span className="contact-avatar contact-avatar-large">
                      {selected.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{selected.name}</strong>
                      <a href={`mailto:${selected.email}`}>{selected.email}</a>
                      {selected.phone && <a href={`tel:${selected.phone}`}>{selected.phone}</a>}
                    </div>
                  </div>
                  <div className="contact-message">
                    <p>Olá, {selected.name.split(" ")[0]}.</p>
                    <p>{selected.message || "Nenhuma mensagem foi enviada."}</p>
                    <p>
                      Recebemos seu contato sobre <strong>{contactTypeOf(selected)}</strong>.
                    </p>
                  </div>
                  <Metadata contact={selected} />
                </>
              )}
            </section>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="table-footer">
            <span>{filtered.length} registro(s)</span>
            <div className="pagination">
              <button
                className="button"
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </button>
              <button
                className="button"
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </section>
    </CapabilityGuard>
  );
}

function contactOfId(items: PlatformContact[], id: string | null) {
  return id ? (items.find((item) => item.id === id) ?? null) : null;
}
