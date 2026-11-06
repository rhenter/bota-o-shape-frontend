"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "./auth-context";
import { CapabilityGuard, hasCapability } from "./capability-guard";
import {
  platformApi,
  type AccountFilters,
  type PlatformAccount,
  type PlatformPage,
} from "@/lib/platform-api";

const pageSize = 10;
const profileLabels: Record<string, string> = {
  gym: "Academia",
  personal_trainer: "Personal trainer",
  nutritionist: "Nutricionista",
  multidisciplinary: "Equipe multidisciplinar",
};

export function AccountsList() {
  const { membership } = useAuth();
  const [filters, setFilters] = useState<AccountFilters>({ limit: pageSize, offset: 0 });
  const [draft, setDraft] = useState({ search: "", profile: "", is_active: "", plan: "" });
  const [page, setPage] = useState<PlatformPage<PlatformAccount> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const allowed = Boolean(membership && hasCapability(membership, "accounts.read"));

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    platformApi.accounts(filters).then(
      (result) => active && setPage(result),
      (caught) => active && setError(caught instanceof Error ? caught.message : "Não foi possível carregar as contas."),
    ).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [allowed, filters]);

  if (!membership) return null;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFilters({ ...draft, limit: pageSize, offset: 0 });
  }

  function changePage(offset: number) {
    setLoading(true);
    setError("");
    setFilters((current) => ({ ...current, offset }));
  }

  return (
    <CapabilityGuard membership={membership} capability="accounts.read">
      <section className="accounts-page">
        <header className="page-heading">
          <p className="eyebrow">CONTAS GLOBAIS</p>
          <h1>Contas</h1>
          <p>Consulta operacional sem ações de alteração.</p>
        </header>
        <form className="filters" onSubmit={applyFilters}>
          <label>Nome ou CPF/CNPJ<input value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} /></label>
          <label>Perfil<select value={draft.profile} onChange={(event) => setDraft({ ...draft, profile: event.target.value })}>
            <option value="">Todos</option>
            {Object.entries(profileLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Status<select value={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.value })}>
            <option value="">Todos</option><option value="true">Ativa</option><option value="false">Inativa</option>
          </select></label>
          <label>Plano<input value={draft.plan} onChange={(event) => setDraft({ ...draft, plan: event.target.value })} /></label>
          <button className="button button-primary" type="submit">Filtrar</button>
        </form>
        {loading ? <div className="state-card" role="status">Carregando contas…</div> : error ? (
          <div className="state-card" role="alert"><h2>Não foi possível carregar</h2><p>{error}</p></div>
        ) : page?.results.length === 0 ? (
          <div className="state-card"><h2>Nenhuma conta encontrada</h2><p>Ajuste os filtros para ampliar a busca.</p></div>
        ) : (
          <>
            <div className="table-wrap"><table><thead><tr><th>Conta</th><th>Documento</th><th>Perfil</th><th>Status</th><th>Plano</th><th>Uso</th></tr></thead>
              <tbody>{page?.results.map((account) => <tr key={account.id}>
                <td><Link href={`/contas/${account.id}`}><strong>{account.name}</strong></Link><small>{account.legal_name}</small></td>
                <td>{account.tax_id ?? "Não informado"}</td><td>{profileLabels[account.profile]}</td>
                <td><span className={`status-pill ${account.is_active ? "active" : "inactive"}`}>{account.is_active ? "Ativa" : "Inativa"}</span></td>
                <td>{account.subscription?.plan.name ?? "Sem plano"}</td>
                <td>{account.counts.students} alunos · {account.counts.professionals} profissionais</td>
              </tr>)}</tbody></table></div>
            <nav className="pagination" aria-label="Paginação">
              <button className="button" type="button" disabled={!page?.previous} onClick={() => changePage(Math.max(0, (filters.offset ?? 0) - pageSize))}>Anterior</button>
              <span>{(filters.offset ?? 0) + 1}–{Math.min((filters.offset ?? 0) + pageSize, page?.count ?? 0)} de {page?.count ?? 0}</span>
              <button className="button" type="button" disabled={!page?.next} onClick={() => changePage((filters.offset ?? 0) + pageSize)}>Próxima</button>
            </nav>
          </>
        )}
      </section>
    </CapabilityGuard>
  );
}

export { profileLabels };
