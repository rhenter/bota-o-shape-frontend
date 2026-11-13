"use client";

import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";

export default function ChangePasswordPage() {
  const { api, user, mode } = useAppContext();
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <AppShell>
      <PageHeader
        title="Trocar senha"
        description="Enviamos um código para o e-mail da sua conta. Ele vale uma vez e expira."
      />
      <form
        className="card account-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setBusy(true);
          setMessage("");
          try {
            if (mode === "demo") {
              setMessage(
                "Ambiente de demonstração: nenhum e-mail é enviado e a senha não muda.",
              );
              return;
            }
            if (!sent) {
              await api.requestPasswordReset(user.email);
              setSent(true);
              setMessage(
                "Se a conta existir, o código chega no e-mail. Cole o identificador e o token.",
              );
              return;
            }
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
            setSent(false);
            setMessage("Senha atualizada. Use a nova senha no próximo acesso.");
          } catch (failure) {
            setMessage(
              failure instanceof Error
                ? failure.message
                : "Não foi possível trocar a senha.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="muted">Conta: {user.email || "e-mail não informado"}</p>
        {sent && (
          <>
            <label className="field">
              Código recebido por e-mail
              <input
                name="code"
                autoComplete="one-time-code"
                required
                placeholder="identificador:token"
              />
            </label>
            <label className="field">
              Nova senha
              <div className="password-field">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </label>
          </>
        )}
        {message && <p className="notice">{message}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? "Aguarde…" : sent ? "Salvar nova senha" : "Enviar código"}
        </button>
      </form>
    </AppShell>
  );
}
