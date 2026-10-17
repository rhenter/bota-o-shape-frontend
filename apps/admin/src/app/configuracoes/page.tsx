"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { canManageBilling } from "@/lib/permissions";
import { LoadingState, ErrorState } from "@/components/states";
import type { ApiUnit } from "@/lib/api-client";
export default function SettingsPage() {
  const app = useAppContext();
  const { api, tenant, context, mode, membership } = app;
  const admin = membership?.roles.includes("admin");
  const [snapshot, setSnapshot] = useState<{
      scope: string;
      units: ApiUnit[];
    }>(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<{ scope: string; message: string }>();
  const scope = `${tenant.id}:${app.user.id}`;
  useEffect(() => {
    if (!admin || mode !== "api" || !tenant.id) return;
    let active = true;
    api
      .getUnits(tenant.id)
      .then((units) => {
        if (active) setSnapshot({ scope, units });
      })
      .catch((e) => {
        if (active)
          setError({
            scope,
            message:
              e instanceof Error ? e.message : "Configurações indisponíveis.",
          });
      });
    return () => {
      active = false;
    };
  }, [api, admin, mode, tenant.id, scope]);
  return (
    <AppShell>
      <PageHeader
        title="Configurações"
        description="Academia ativa e preferências da sua conta."
        actions={
          canManageBilling(app.user, membership, tenant.id) && (
            <Link href="/configuracoes/assinatura" className="button">
              Assinatura da academia
            </Link>
          )
        }
      />
      <div className="editor-grid">
        <section className="card">
          <h2>Dados da academia</h2>
          <dl className="detail-list">
            <div>
              <dt>Nome</dt>
              <dd>{tenant.name}</dd>
            </div>
            <div>
              <dt>Razão social</dt>
              <dd>{tenant.legalName || "Não informada"}</dd>
            </div>
            <div>
              <dt>CNPJ</dt>
              <dd>{tenant.cnpj}</dd>
            </div>
          </dl>
          <p className="notice">
            Identidade visual, horários, integrações e política de privacidade
            não possuem atualização disponível nesta API.
          </p>
        </section>
        <section className="card">
          <h2>Sua conta</h2>
          <p>
            {app.user.name}
            <br />
            {app.user.email}
          </p>
          <Link href="/recuperar-senha" className="button">
            Redefinir minha senha
          </Link>
          <p className="muted">
            Tema, notificações e idioma ainda não possuem preferências
            persistidas no servidor.
          </p>
        </section>
      </div>
      {admin && (
        <section className="card section-space">
          <h2>Unidades</h2>
          {mode === "demo" ? (
            <p>Edite unidades ao conectar a API.</p>
          ) : error?.scope === scope ? (
            <ErrorState description={error.message} />
          ) : snapshot?.scope !== scope ? (
            <LoadingState />
          ) : snapshot.units.length ? (
            snapshot.units.map((unit) => (
              <form
                key={`${scope}:${unit.id}`}
                className="meal-card"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  setBusy(true);
                  setMessage("");
                  try {
                    await api.saveUnit(context.tenantId, unit.id, {
                      name: String(form.get("name")),
                      is_active: form.has("active"),
                    });
                    setMessage("Unidade atualizada.");
                  } catch (e) {
                    setMessage(
                      e instanceof Error ? e.message : "Falha ao salvar.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label className="field">
                  Nome da unidade
                  <input name="name" required defaultValue={unit.name} />
                </label>
                <p>
                  Endereço:{" "}
                  {Object.values(unit.address)
                    .filter(
                      (value) =>
                        typeof value === "string" || typeof value === "number",
                    )
                    .join(", ") || "Não informado"}
                </p>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={unit.is_active}
                  />
                  Unidade ativa
                </label>
                <button className="button button-primary" disabled={busy}>
                  Salvar unidade
                </button>
              </form>
            ))
          ) : (
            <p>Nenhuma unidade cadastrada.</p>
          )}
          {message && <p role="status">{message}</p>}
        </section>
      )}
    </AppShell>
  );
}
