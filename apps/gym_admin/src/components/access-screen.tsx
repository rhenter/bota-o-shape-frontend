"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppContext } from "./app-context";

export function AccessScreen({ recovery = false }: { recovery?: boolean }) {
  const { mode, login, api } = useAppContext();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <main className="access-page">
      <section className="access-brand">
        <Image
          src="/brand/logo.png"
          alt="Bota o Shape!"
          width={245}
          height={91}
          priority
        />
        <h1>
          Mais cuidado.
          <br />
          Mais movimento.
        </h1>
        <p>
          Alunos, treinos e evolução.
          <br />
          Sua academia conectada em um só lugar.
        </p>
        <ul>
          <li>Alunos organizados, atenção individual</li>
          <li>Treinos e avaliações com contexto</li>
          <li>Mais tempo para quem importa</li>
        </ul>
        <small>Painel profissional e administrativo</small>
      </section>
      <section className="access-form">
        <div className="access-card">
          <span className="demo-label">
            {mode === "demo"
              ? "Demonstração · dados fictícios"
              : "Portal da academia"}
          </span>
          <h2>{recovery ? "Recuperar senha" : "Acesse o portal"}</h2>
          <p>
            {recovery
              ? "Use o e-mail da sua conta para receber as instruções."
              : "Bom ter você por aqui. Entre para acompanhar sua academia."}
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setBusy(true);
              setMessage("");
              try {
                if (mode === "demo") {
                  setMessage(
                    "Fluxo demonstrativo: nenhum acesso real foi autenticado ou e-mail enviado. Abra o painel de demonstração para explorar os dados fictícios.",
                  );
                } else if (recovery && confirmReset) {
                  const [uid, ...tokenParts] = String(data.get("code"))
                    .trim()
                    .split(":");
                  const token = tokenParts.join(":");
                  if (!uid || !token)
                    throw new Error(
                      "Informe o código completo no formato recebido por e-mail (identificador:token).",
                    );
                  await api.confirmPasswordReset({
                    uid,
                    token,
                    password: String(data.get("password")),
                  });
                  setConfirmReset(false);
                  setMessage(
                    "Senha redefinida. Volte para entrar com a nova senha.",
                  );
                } else if (recovery) {
                  await api.requestPasswordReset(String(data.get("email")));
                  setMessage(
                    "Se a conta existir, enviaremos as instruções de recuperação.",
                  );
                } else {
                  await login(
                    String(data.get("email")),
                    String(data.get("password")),
                  );
                  router.push("/dashboard");
                }
              } catch (failure) {
                setMessage(
                  failure instanceof Error
                    ? failure.message
                    : "Não foi possível concluir. Tente novamente.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmReset ? (
              <label className="field">
                Código recebido por e-mail
                <input
                  name="code"
                  autoComplete="one-time-code"
                  required
                  placeholder="identificador:token"
                />
              </label>
            ) : (
              <label className="field">
                E-mail
                <input
                  name="email"
                  type="email"
                  placeholder="voce@academia.com.br"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            {(!recovery || confirmReset) && (
              <label className="field">
                {confirmReset ? "Nova senha" : "Senha"}
                <div className="password-field">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    autoComplete={
                      confirmReset ? "new-password" : "current-password"
                    }
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>
            )}
            {!recovery && (
              <div className="access-options">
                <Link href="/recuperar-senha">Esqueci minha senha</Link>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="button button-primary full-width"
            >
              {busy
                ? "Aguarde…"
                : recovery
                  ? confirmReset
                    ? "Redefinir senha"
                    : "Solicitar recuperação"
                  : "Entrar"}
            </button>
          </form>
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          {!recovery && (
            <>
              <div className="divider">ou</div>
              <button type="button" className="button full-width" disabled>
                Entrar com Google · indisponível
              </button>
              <p className="help-text">OAuth: configuração pendente.</p>
            </>
          )}
          {recovery && (
            <button
              className="button button-quiet full-width"
              onClick={() => {
                setConfirmReset(!confirmReset);
                setMessage("");
              }}
            >
              {confirmReset ? "Solicitar novo código" : "Já recebi o código"}
            </button>
          )}
          {(recovery || mode === "demo") && (
            <Link
              className="button button-secondary full-width"
              href={recovery ? "/entrar" : "/dashboard"}
            >
              {recovery ? "Voltar para entrar" : "Abrir painel de demonstração"}
            </Link>
          )}
          <p className="help-text">
            {recovery
              ? "O código de recuperação é pessoal, de uso único e possui expiração."
              : mode === "demo"
                ? "Acesso de desenvolvimento. Alterações temporárias, sem envio à API."
                : "Acesso por vínculo com sua academia. A sessão fica na memória; ao recarregar, entre novamente."}
          </p>
        </div>
      </section>
    </main>
  );
}
