"use client";

import { useEffect, useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";

export default function PreferencesPage() {
  const { api, user, tenant, mode, reload } = useAppContext();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (mode !== "api" || !tenant.id || !user.id) return;
    let active = true;
    api
      .getUsers(tenant.id)
      .then((users) => {
        const current = users.find((item) => item.id === user.id);
        if (!active || !current) return;
        setFirstName(current.first_name);
        setLastName(current.last_name);
      })
      .catch((failure) => {
        if (active)
          setMessage(
            failure instanceof Error
              ? failure.message
              : "Não foi possível carregar suas preferências.",
          );
      });
    return () => {
      active = false;
    };
  }, [api, mode, tenant.id, user.id]);
  return (
    <AppShell>
      <PageHeader
        title="Preferências"
        description="Nome exibido na sua conta deste navegador."
      />
      <form
        className="card account-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setMessage("");
          if (mode === "demo") {
            setMessage(
              "Ambiente de demonstração: o nome não é gravado no servidor.",
            );
            return;
          }
          setBusy(true);
          try {
            await api.updateUser(tenant.id, user.id, {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            });
            await reload();
            setMessage("Preferências salvas.");
          } catch (failure) {
            setMessage(
              failure instanceof Error
                ? failure.message
                : "Não foi possível salvar.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Nome
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            autoComplete="given-name"
            required
          />
        </label>
        <label className="field">
          Sobrenome
          <input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            autoComplete="family-name"
            required
          />
        </label>
        <p className="muted">
          E-mail da conta: {user.email || "não informado"}. Tema, idioma e
          canais de aviso ainda não são gravados pela API.
        </p>
        {message && <p className="notice">{message}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>
          {busy ? "Salvando…" : "Salvar preferências"}
        </button>
      </form>
    </AppShell>
  );
}
