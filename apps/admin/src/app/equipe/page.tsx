"use client";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { useAdminData } from "@/components/use-admin-data";
import { TeamTable, RoleFields } from "@/components/admin/team-table";
import { LoadingState, ErrorState } from "@/components/states";
import type { ApiRole, ApiUser } from "@/lib/api-client";
export default function TeamPage() {
  const app = useAdminData();
  const [email, setEmail] = useState(""),
    [roles, setRoles] = useState<ApiRole[]>(["coach"]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [professional, setProfessional] = useState(""),
    [crn, setCrn] = useState(""),
    [uf, setUf] = useState(""),
    [student, setStudent] = useState(""),
    [dietitian, setDietitian] = useState("");
  const { api, context, data } = app;
  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      app.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ação não concluída.");
    } finally {
      setBusy(false);
    }
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
          <section className="card">
            <h2>Convidar profissional</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(
                  () => api.invite(context.tenantId, email, roles),
                  "Convite solicitado. A pessoa receberá instruções no e-mail.",
                );
              }}
            >
              <label className="field">
                E-mail *
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <RoleFields roles={roles} onChange={setRoles} />
              <button
                className="button button-primary"
                disabled={busy || !roles.length}
              >
                Convidar profissional
              </button>
            </form>
          </section>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
          <section className="card section-space">
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
            />
          </section>
          <div className="editor-grid section-space">
            <section className="card">
              <h2>Registro profissional</h2>
              <p className="notice">
                Verifique a documentação antes de confirmar o CRN/UF. O papel
                administrador não autoriza prescrição.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () =>
                      api.saveCredential(context.tenantId, {
                        professional,
                        kind: "crn",
                        registration_number: crn,
                        state: uf.toUpperCase(),
                      }),
                    "Registro cadastrado como pendente.",
                  );
                }}
              >
                <label className="field">
                  Profissional
                  <select
                    required
                    value={professional}
                    onChange={(e) => setProfessional(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {data.members
                      .filter(
                        (m) =>
                          m.status === "active" &&
                          m.roles.includes("dietitian"),
                      )
                      .map((m) => (
                        <option key={m.id} value={m.user}>
                          {m.email}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  CRN
                  <input
                    required
                    value={crn}
                    onChange={(e) => setCrn(e.target.value)}
                  />
                </label>
                <label className="field">
                  UF
                  <input
                    required
                    minLength={2}
                    maxLength={2}
                    pattern="[A-Za-z]{2}"
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                  />
                </label>
                <button className="button" disabled={busy}>
                  Cadastrar registro pendente
                </button>
              </form>
              <ul className="record-list">
                {data.credentials
                  .filter((c) => c.kind === "crn")
                  .map((c) => (
                    <li key={c.id}>
                      <p>
                        {
                          data.members.find((m) => m.user === c.professional)
                            ?.email
                        }{" "}
                        · CRN {c.registration_number}/{c.state}
                        <br />
                        {c.verified_at ? "Verificado" : "Verificação pendente"}
                      </p>
                      {!c.verified_at && (
                        <button
                          className="button"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Conferi a documentação e confirmo a verificação deste CRN/UF.",
                              )
                            )
                              void run(
                                () =>
                                  api.verifyCredential(context.tenantId, c.id),
                                "Registro verificado.",
                              );
                          }}
                        >
                          Confirmar verificação documental
                        </button>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
            <section className="card">
              <h2>Atribuições de nutrição</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(
                    () =>
                      api.saveDietitianAssignment(context.tenantId, {
                        student,
                        dietitian,
                        is_active: true,
                      }),
                    "Vínculo nutricional criado. Consentimento continua obrigatório.",
                  );
                }}
              >
                <label className="field">
                  Aluno
                  <select
                    required
                    value={student}
                    onChange={(e) => setStudent(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {app.students
                      .filter((s) => s.status === "active")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  Nutricionista
                  <select
                    required
                    value={dietitian}
                    onChange={(e) => setDietitian(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {data.members
                      .filter(
                        (m) =>
                          m.status === "active" &&
                          m.roles.includes("dietitian"),
                      )
                      .map((m) => (
                        <option key={m.id} value={m.user}>
                          {m.email}
                        </option>
                      ))}
                  </select>
                </label>
                <button className="button" disabled={busy}>
                  Vincular nutricionista
                </button>
              </form>
              <ul className="record-list">
                {data.assignments.map((a) => (
                  <li key={a.id}>
                    {app.students.find((s) => s.id === a.student)?.name ??
                      "Aluno"}{" "}
                    →{" "}
                    {data.members.find((m) => m.user === a.dietitian)?.email ??
                      "Profissional"}{" "}
                    · {a.is_active ? "Ativo" : "Inativo"}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
