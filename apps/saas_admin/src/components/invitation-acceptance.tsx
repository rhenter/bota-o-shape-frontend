"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { platformApi } from "@/lib/platform-api";

export function InvitationAcceptance() {
  const [form, setForm] = useState({ token: "", password: "", first_name: "", last_name: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await platformApi.acceptInvitation(form); setDone(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Convite não aceito."); }
  }
  if (done) return <main className="auth-page"><section className="auth-card"><h1>Acesso confirmado</h1><p>Seu usuário já pode entrar no SaaS Admin.</p><Link className="button button-primary" href="/entrar">Ir para o login</Link></section></main>;
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><p className="eyebrow">CONVITE DA PLATAFORMA</p><h1>Ativar acesso</h1><label>Código do convite<input required value={form.token} onChange={(event) => setForm({ ...form, token: event.target.value })} /></label><label>Nome<input value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} /></label><label>Sobrenome<input value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} /></label><label>Senha<input type="password" minLength={12} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="button button-primary">Ativar acesso</button></form></main>;
}
