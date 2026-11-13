"use client";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog } from "@/components/ui/dialog";
import { useAdminData } from "@/components/use-admin-data";
import { TeamTable, RoleFields } from "@/components/admin/team-table";

import { LoadingState, ErrorState } from "@/components/states";
import type { ApiRole, ApiUser } from "@/lib/api-client";
export default function TeamPage() {
  const app = useAdminData();
  const [panel, setPanel] = useState<null | "invite" | "new">(null);
  const [email, setEmail] = useState(""),
    [firstName, setFirstName] = useState(""),
    [lastName, setLastName] = useState(""),
    [roles, setRoles] = useState<ApiRole[]>(["coach"]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const { api, context, data } = app;
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      app.refresh();
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ação não concluída.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  function closePanel() {
    setPanel(null);
    setEmail("");
    setFirstName("");
    setLastName("");
    setRoles(["coach"]);
  }
  const users: ApiUser[] = app.repository
    .getTeam(context)
    .map((u) => ({
      id: u.id,
      first_name: u.name,
      last_name: "",
      email: u.email,
      is_active: true,
    }));
  return (
    <AppShell>
      <PageHeader
        title="Equipe e acessos"
        description="Funções combináveis, vínculo com alunos e credenciais profissionais."
        actions={
          app.isAdmin &&
          app.mode === "api" && (
            <>
              <button
                className="button"
                type="button"
                onClick={() => setPanel("invite")}
              >
                Convidar
              </button>
              <button
                className="button button-primary"
                type="button"
                onClick={() => setPanel("new")}
              >
                + Novo
              </button>
            </>
          )
        }
      />
      {!app.isAdmin ? (
        <p className="notice">
          Apenas a administração pode gerenciar a equipe desta academia.
        </p>
      ) : app.mode === "demo" ? (
        <p className="notice">
          Gestão de equipe indisponível na demonstração. Convites, verificação
          de registro e redefinições exigem conexão com a API.
        </p>
      ) : app.loading ? (
        <LoadingState />
      ) : app.error ? (
        <ErrorState description={app.error} onRetry={app.refresh} />
      ) : (
        <>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <section className="card">
            <TeamTable
              members={data.members}
              users={users}
              credentials={data.credentials}
              onRoles={async (m, r) => {
                await api.setRoles(context.tenantId, m.id, r);
                app.refresh();
                if (m.user === app.user.id) await app.reload();
              }}
              onReset={async (m) => {
                await api.resetUserPassword(context.tenantId, m.user);
              }}
              onArchive={async (m) => {
                await api.archiveMembership(
                  context.tenantId,
                  m.id,
                  m.status === "archived",
                );
                app.refresh();
                if (m.user === app.user.id) await app.reload();
              }}
              onSaveCredential={async (member, kind, number, state) => {
                await api.saveCredential(context.tenantId, {
                  professional: member.user,
                  kind,
                  registration_number: number,
                  state,
                });
                app.refresh();
              }}
              onVerifyCredential={async (id) => {
                await api.verifyCredential(context.tenantId, id);
                app.refresh();
              }}
            />
          </section>
        </>
      )}
      {panel === "invite" && (
        <Dialog title="Convidar profissional" onClose={closePanel}>
          <p className="muted">
            A pessoa recebe um convite no e-mail e conclui o próprio acesso.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(
                () => api.invite(context.tenantId, email, roles),
                `Convite solicitado para ${email}.`,
              ).then((saved) => {
                if (saved) closePanel();
              });
            }}
          >
            <label className="field">
              E-mail
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <RoleFields roles={roles} onChange={setRoles} />
            <div className="form-actions">
              <button className="button" type="button" onClick={closePanel}>
                Cancelar
              </button>
              <button
                className="button button-primary"
                disabled={busy || !roles.length}
              >
                {busy ? "Aguarde…" : "Enviar convite"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {panel === "new" && (
        <Dialog title="Novo membro da equipe" onClose={closePanel}>
          <p className="muted">
            Informe quem entra na equipe e as funções. O acesso é criado pelo
            convite enviado ao e-mail; a pessoa define a senha ao aceitar.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const name = `${firstName} ${lastName}`.trim();
              void run(
                () => api.invite(context.tenantId, email, roles),
                `${name} adicionado. O convite foi enviado para ${email}.`,
              ).then((saved) => {
                if (saved) closePanel();
              });
            }}
          >
            <label className="field">
              Nome
              <input
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </label>
            <label className="field">
              Sobrenome
              <input
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>
            <label className="field">
              E-mail
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <RoleFields roles={roles} onChange={setRoles} />
            <div className="form-actions">
              <button className="button" type="button" onClick={closePanel}>
                Cancelar
              </button>
              <button
                className="button button-primary"
                disabled={busy || !roles.length}
              >
                {busy ? "Aguarde…" : "Adicionar"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </AppShell>
  );
}
