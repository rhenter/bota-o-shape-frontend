"use client";

import { FormEvent, useState } from "react";

import { useAuth } from "./auth-context";
import { platformApi } from "@/lib/platform-api";

interface SetupData {
  secret: string;
  otpauth_uri: string;
}

export function MfaSettings() {
  const { membership, refreshMembership } = useAuth();
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  if (!membership) return null;

  async function beginSetup() {
    setWorking(true);
    setError("");
    try {
      setSetup(await platformApi.setupMfa());
      setRecoveryCodes([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível iniciar o MFA.");
    } finally {
      setWorking(false);
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      const result = await platformApi.confirmMfa(code);
      setRecoveryCodes(result.recovery_codes);
      setSetup(null);
      setCode("");
      await refreshMembership();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Código inválido.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="page-card security-card">
      <p className="eyebrow">SEGURANÇA</p>
      <h1>Autenticação em dois fatores</h1>
      <p>
        Status: <strong>{membership.mfa_enabled ? "ativa" : "não configurada"}</strong>
      </p>
      {!setup && recoveryCodes.length === 0 && (
        <button className="button button-primary" type="button" disabled={working} onClick={() => void beginSetup()}>
          {membership.mfa_enabled ? "Gerar nova configuração" : "Configurar MFA"}
        </button>
      )}
      {setup && (
        <form className="mfa-setup" onSubmit={confirm}>
          <p>Adicione a chave abaixo ao seu aplicativo autenticador:</p>
          <code>{setup.secret}</code>
          <a href={setup.otpauth_uri}>Abrir no aplicativo autenticador</a>
          <label htmlFor="mfa-code">Código atual de 6 dígitos</label>
          <input
            id="mfa-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            minLength={6}
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button className="button button-primary" disabled={working} type="submit">Confirmar MFA</button>
        </form>
      )}
      {recoveryCodes.length > 0 && (
        <div className="recovery-codes" role="status">
          <h2>Salve seus códigos de recuperação agora</h2>
          <p>Eles não serão exibidos novamente e cada código funciona uma única vez.</p>
          <ul>{recoveryCodes.map((item) => <li key={item}><code>{item}</code></li>)}</ul>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}
