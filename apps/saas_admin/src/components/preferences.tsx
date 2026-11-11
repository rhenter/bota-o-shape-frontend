"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { platformApi } from "@/lib/platform-api";

export function Preferences() {
  const { membership, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  if (!membership) return null;

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmation) { setError("A confirmação não corresponde à nova senha."); return; }
    setSaving(true); setError("");
    try {
      await platformApi.changePassword(currentPassword, newPassword);
      await logout();
      router.replace("/entrar?senha=alterada");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível alterar a senha.");
      setSaving(false);
    }
  }

  return <section className="accounts-page">
    <header className="page-heading"><p className="eyebrow">CONTA DO OPERADOR</p><h1>Preferências</h1><p>Gerencie sua identidade e credenciais da administração SaaS.</p></header>
    <div className="detail-grid">
      <section className="page-card detail-section"><h2>Perfil</h2><dl className="definition-list"><div><dt>Nome</dt><dd>{membership.name || "Não informado"}</dd></div><div><dt>E-mail</dt><dd>{membership.email}</dd></div><div><dt>Perfil</dt><dd>{membership.role}</dd></div><div><dt>MFA</dt><dd>{membership.mfa_enabled ? "Ativo" : "Pendente"}</dd></div></dl></section>
      <form className="page-card password-form" onSubmit={changePassword}><h2>Alterar senha</h2><p>A alteração encerra todas as sessões da plataforma.</p><label>Senha atual<input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label>Nova senha<input type="password" required minLength={12} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label><label>Confirmar nova senha<input type="password" required minLength={12} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" disabled={saving}>{saving ? "Alterando…" : "Alterar senha"}</button></form>
    </div>
  </section>;
}
