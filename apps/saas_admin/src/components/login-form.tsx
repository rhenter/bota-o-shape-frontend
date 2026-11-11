"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "./auth-context";
import { PlatformApiError } from "@/lib/platform-api";

type Stage = "credentials" | "mfa";
type Factor = "otp" | "recovery";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("credentials");
  const [factor, setFactor] = useState<Factor>("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({
        email,
        password,
        ...(stage === "mfa" && factor === "otp" ? { otp: code } : {}),
        ...(stage === "mfa" && factor === "recovery"
          ? { recovery_code: code }
          : {}),
      });
      router.replace("/dashboard");
    } catch (caught) {
      if (caught instanceof PlatformApiError && caught.mfaRequired) {
        setStage("mfa");
        setCode("");
        setError("Informe o segundo fator para concluir o acesso.");
      } else {
        setError(
          caught instanceof Error
            ? caught.message
            : "Não foi possível concluir o login.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <Image
        className="auth-logo"
        src="/brand/logo-light.png"
        alt="Bota o Shape!"
        width={1536}
        height={1024}
        priority
      />
      <p className="eyebrow">ACESSO RESTRITO</p>
      <h1>{stage === "credentials" ? "SaaS Admin" : "Confirme sua identidade"}</h1>
      <p>
        {stage === "credentials"
          ? "Use sua conta exclusiva de operador da plataforma."
          : factor === "otp"
            ? "Digite o código atual do seu aplicativo autenticador."
            : "Use um código de recuperação ainda não utilizado."}
      </p>
      {stage === "credentials" ? (
        <>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </>
      ) : (
        <>
          <label htmlFor="second-factor">
            {factor === "otp" ? "Código de 6 dígitos" : "Código de recuperação"}
          </label>
          <input
            id="second-factor"
            inputMode={factor === "otp" ? "numeric" : "text"}
            autoComplete="one-time-code"
            minLength={factor === "otp" ? 6 : undefined}
            maxLength={factor === "otp" ? 6 : undefined}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button
            className="text-button align-left"
            type="button"
            onClick={() => {
              setFactor((current) => (current === "otp" ? "recovery" : "otp"));
              setCode("");
              setError("");
            }}
          >
            {factor === "otp"
              ? "Usar código de recuperação"
              : "Usar aplicativo autenticador"}
          </button>
        </>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={submitting} type="submit">
        {submitting ? "Validando…" : stage === "credentials" ? "Entrar" : "Confirmar"}
      </button>
      {stage === "mfa" && (
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setStage("credentials");
            setCode("");
            setError("");
          }}
        >
          Voltar e alterar credenciais
        </button>
      )}
    </form>
  );
}
