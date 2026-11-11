"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { CapabilityGuard, hasCapability } from "./capability-guard";
import { platformApi, type PlatformAuditEvent, type PlatformPage } from "@/lib/platform-api";

export function AuditConsole() {
  const { membership } = useAuth();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ search: "", limit: 25, offset: 0 });
  const [page, setPage] = useState<PlatformPage<PlatformAuditEvent> | null>(null);
  const [error, setError] = useState("");
  const allowed = Boolean(membership && hasCapability(membership, "audit.read"));
  useEffect(() => { if (!allowed) return; platformApi.audit(filters).then(setPage).catch((caught) => setError(caught instanceof Error ? caught.message : "Erro ao carregar auditoria.")); }, [allowed, filters]);
  if (!membership) return null;
  function submit(event: FormEvent) { event.preventDefault(); setFilters({ search, limit: 25, offset: 0 }); }
  return <CapabilityGuard membership={membership} capability="audit.read"><section className="accounts-page">
    <header className="page-heading"><p className="eyebrow">GOVERNANÇA</p><h1>Auditoria</h1><p>Trilha global somente leitura das ações relevantes.</p></header>
    <form className="filters audit-filters" onSubmit={submit}><label>Buscar por ação, conta ou ator<input value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className="button button-primary">Filtrar</button></form>
    {error ? <p className="form-error">{error}</p> : !page ? <div className="state-card">Carregando eventos…</div> : !page.results.length ? <div className="state-card"><h2>Nenhum evento</h2></div> : <><div className="table-wrap"><table><thead><tr><th>Data</th><th>Ação</th><th>Conta</th><th>Ator</th><th>Objeto</th></tr></thead><tbody>{page.results.map((event) => <tr key={event.id}><td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.created_at))}</td><td><strong>{event.action}</strong></td><td>{event.tenant_name ?? "Global"}</td><td>{event.actor_email ?? "Sistema"}</td><td>{[event.target_type, event.target_id].filter(Boolean).join(" · ") || "—"}</td></tr>)}</tbody></table></div><nav className="pagination"><button className="button" disabled={!page.previous} onClick={() => setFilters((value) => ({ ...value, offset: Math.max(0, value.offset - 25) }))}>Anterior</button><span>{page.count} eventos</span><button className="button" disabled={!page.next} onClick={() => setFilters((value) => ({ ...value, offset: value.offset + 25 }))}>Próxima</button></nav></>}
  </section></CapabilityGuard>;
}
