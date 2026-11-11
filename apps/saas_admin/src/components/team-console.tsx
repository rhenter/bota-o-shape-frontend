"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { platformApi, type PlatformCapability, type PlatformInvitation, type PlatformMembership } from "@/lib/platform-api";

const capabilityOptions: Array<[PlatformCapability, string]> = [
  ["accounts.read", "Contas"], ["billing.manage", "Cobrança"], ["support.manage", "Suporte"],
  ["subscriptions.read", "Assinaturas"], ["plans.manage", "Planos"], ["charges.read", "Cobranças"],
  ["finance.read", "Financeiro"], ["operations.read", "Operação"], ["integrations.manage", "Integrações"],
  ["legal.manage", "Jurídico"], ["audit.read", "Auditoria"], ["settings.manage", "Configurações"], ["platform.manage", "Plataforma"],
];

export function TeamConsole() {
  const { membership: current } = useAuth();
  const [members, setMembers] = useState<PlatformMembership[]>([]);
  const [invitations, setInvitations] = useState<PlatformInvitation[]>([]);
  const [email, setEmail] = useState("");
  const [capabilities, setCapabilities] = useState<PlatformCapability[]>(["accounts.read"]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [memberList, invitationList] = await Promise.all([platformApi.memberships(), platformApi.invitations()]);
    setMembers(memberList); setInvitations(invitationList);
  }, []);
  useEffect(() => {
    if (current?.role === "administrator") {
      void Promise.resolve().then(load).catch((caught) => setError(caught instanceof Error ? caught.message : "Erro ao carregar a equipe."));
    }
  }, [current, load]);

  if (!current) return null;
  if (current.role !== "administrator") return <section className="state-card"><h1>Acesso restrito</h1><p>Apenas administradores gerenciam a equipe da plataforma.</p></section>;

  async function invite(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await platformApi.invite({ email, role: "staff", capabilities }); setEmail(""); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Convite não enviado."); }
  }

  async function toggle(member: PlatformMembership) {
    setError("");
    try { await platformApi.updateMembership(member.id, { is_active: !member.is_active }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Acesso não alterado."); }
  }

  return <section className="accounts-page">
    <header className="page-heading"><p className="eyebrow">ACESSO À PLATAFORMA</p><h1>Equipe</h1><p>Convide operadores e revogue acessos sem usar o Django Admin.</p></header>
    {error && <p className="form-error" role="alert">{error}</p>}
    <form className="page-card invite-form" onSubmit={invite}><h2>Convidar operador</h2><label>E-mail<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><fieldset><legend>Acessos</legend>{capabilityOptions.map(([value, label]) => <label key={value}><input type="checkbox" checked={capabilities.includes(value)} onChange={(event) => setCapabilities((items) => event.target.checked ? [...items, value] : items.filter((item) => item !== value))} />{label}</label>)}</fieldset><button className="button button-primary" type="submit">Enviar convite</button></form>
    <div className="table-wrap"><table><thead><tr><th>Operador</th><th>Perfil</th><th>Acessos</th><th>Status</th><th /></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.name || member.email}</strong><small>{member.email}</small></td><td>{member.role}</td><td>{member.role === "administrator" ? "Todos" : member.capabilities.join(", ") || "Nenhum"}</td><td>{member.is_active ? "Ativo" : "Inativo"}</td><td><button className="button" disabled={member.id === current.id} onClick={() => void toggle(member)}>{member.is_active ? "Revogar" : "Reativar"}</button></td></tr>)}</tbody></table></div>
    <section className="page-card wide-card"><h2>Convites recentes</h2>{invitations.length ? <ul className="plain-list">{invitations.map((item) => <li key={item.id}><strong>{item.email}</strong> · {item.accepted_at ? "Aceito" : new Date(item.expires_at) < new Date() ? "Expirado" : "Pendente"}</li>)}</ul> : <p>Nenhum convite enviado.</p>}</section>
  </section>;
}
