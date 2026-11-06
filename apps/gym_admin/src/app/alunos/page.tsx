"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/states";
import type { Student } from "@/lib/domain";

export default function StudentsPage() {
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <StudentsContent key={tenant.id} />
    </AppShell>
  );
}

function StudentsContent() {
  const { context, repository, membership, mode, api, reload } =
    useAppContext();
  const [students, setStudents] = useState(() =>
    repository.getStudents(context),
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [coach, setCoach] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Student | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const admin =
    membership?.status === "active" && membership.roles.includes("admin");
  const coaches = [
    ...new Set(students.flatMap((student) => [...student.coachIds])),
  ];
  const visible = students.filter(
    (student) =>
      `${student.name} ${student.email}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")) &&
      (status === "all" || student.status === status) &&
      (coach === "all" || student.coachIds.includes(coach)),
  );
  function clear() {
    setQuery("");
    setStatus("all");
    setCoach("all");
  }
  async function archive() {
    if (!admin || !archiveTarget) return;
    setBusy(true);
    try {
      const restore = archiveTarget.status === "archived";
      if (mode === "api") {
        if (!archiveTarget.membershipId)
          throw new Error("Vínculo não encontrado.");
        await api.archiveMembership(
          context.tenantId,
          archiveTarget.membershipId,
          restore,
        );
        await reload();
        return;
      }
      setStudents((items) =>
        items.map((item) =>
          item.id === archiveTarget.id
            ? { ...item, status: restore ? "active" : "archived" }
            : item,
        ),
      );
      setMessage(
        `${archiveTarget.name}: vínculo ${restore ? "restaurado" : "arquivado"}${mode === "demo" ? " somente nesta demonstração" : " na academia ativa"}.`,
      );
      setArchiveTarget(null);
    } catch (failure) {
      setMessage(
        failure instanceof Error
          ? failure.message
          : "Não foi possível alterar o vínculo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title="Alunos"
        description="Conheça cada rotina e acompanhe quem treina com você."
        actions={
          admin && (
            <button
              className="button button-primary"
              onClick={() => setInviteOpen(true)}
            >
              + Convidar aluno
            </button>
          )
        }
      />
      <section className="card table-card">
        <div className="filters">
          <label className="field search-field">
            <span className="sr-only">Buscar alunos</span>
            <input
              type="search"
              placeholder="Buscar por nome ou e-mail…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field">
            Status do aluno
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="archived">Arquivados</option>
              {mode === "api" && <option value="inactive">Inativos</option>}
              {mode === "api" && <option value="invited">Convidados</option>}
            </select>
          </label>
          <label className="field">
            Professor responsável
            <select
              value={coach}
              onChange={(event) => setCoach(event.target.value)}
            >
              <option value="all">Todos</option>
              {coaches.map((id) => (
                <option key={id} value={id}>
                  {repository.getUser(id)?.name ?? "Profissional vinculado"}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button button-quiet" onClick={clear}>
            Limpar filtros
          </button>
        </div>
        <p className="results-count" role="status">
          {visible.length}{" "}
          {visible.length === 1 ? "aluno encontrado" : "alunos encontrados"}
        </p>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {visible.length ? (
          <DataTable
            caption="Alunos da academia ativa"
            rows={visible}
            columns={[
              {
                key: "name",
                title: "Nome",
                render: (student) => (
                  <Link className="student-link" href={`/alunos/${student.id}`}>
                    <span className="avatar avatar-soft" aria-hidden="true">
                      {student.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <strong>{student.name}</strong>
                  </Link>
                ),
              },
              {
                key: "email",
                title: "E-mail",
                render: (student) => (
                  <span className="muted">{student.email}</span>
                ),
              },
              {
                key: "coach",
                title: "Professor",
                render: (student) =>
                  student.coachIds
                    .map(
                      (id) =>
                        repository.getUser(id)?.name ??
                        "Profissional vinculado",
                    )
                    .join(", ") || "Não atribuído",
              },
              {
                key: "status",
                title: "Status",
                render: (student) => <StatusBadge status={student.status} />,
              },
              {
                key: "actions",
                title: "Ações",
                render: (student) => (
                  <div className="row-actions">
                    <Link
                      className="button button-small"
                      href={`/alunos/${student.id}`}
                    >
                      Ver perfil
                    </Link>
                    {admin && (
                      <button
                        type="button"
                        className="button button-small button-quiet"
                        onClick={() => setArchiveTarget(student)}
                        aria-label={`${student.status === "archived" ? "Restaurar" : "Arquivar"} ${student.name}`}
                      >
                        {student.status === "archived"
                          ? "Restaurar"
                          : "Arquivar"}
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <EmptyState
            title="Nenhum aluno encontrado"
            description={
              mode === "api" && !admin
                ? "A API atual não fornece os perfis de alunos vinculados ao professor. Solicite acesso à administração."
                : "Tente outro nome ou ajuste os filtros para continuar."
            }
            action={
              <button className="button" onClick={clear}>
                Limpar filtros
              </button>
            }
          />
        )}
        <footer className="table-footer">
          {visible.length
            ? `Mostrando ${visible.length} de ${students.length} alunos`
            : "Sem resultados para estes filtros"}
          <span>Academia ativa · acesso por vínculo</span>
        </footer>
      </section>
      {inviteOpen && admin && (
        <Dialog title="Convidar aluno" onClose={() => setInviteOpen(false)}>
          <p className="muted">
            O aluno recebe acesso pela academia, sem cobrança individual.
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!admin) return;
              const form = new FormData(event.currentTarget);
              const email = String(form.get("email"));
              setBusy(true);
              try {
                if (mode === "api")
                  await api.invite(context.tenantId, email, ["student"]);
                setMessage(
                  mode === "demo"
                    ? `Convite simulado para ${email}. Nenhum e-mail foi enviado ou vínculo criado.`
                    : `Convite solicitado para ${email}. O aluno terá vínculo após aceitar.`,
                );
                setInviteOpen(false);
              } catch (failure) {
                setMessage(
                  failure instanceof Error
                    ? failure.message
                    : "Não foi possível convidar.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              E-mail do aluno
              <input type="email" name="email" autoComplete="email" required />
            </label>
            <p className="help-text">
              {mode === "demo"
                ? "Esta ação apenas demonstra o fluxo. Nenhum e-mail será enviado."
                : "A API enviará o convite de uso único ao endereço informado."}
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="button"
                onClick={() => setInviteOpen(false)}
              >
                Cancelar
              </button>
              <button className="button button-primary" disabled={busy}>
                {busy
                  ? "Aguarde…"
                  : mode === "demo"
                    ? "Simular convite"
                    : "Enviar convite"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {archiveTarget && (
        <Dialog
          title={
            archiveTarget.status === "archived"
              ? "Restaurar vínculo"
              : "Arquivar aluno"
          }
          onClose={() => setArchiveTarget(null)}
        >
          <p>
            {archiveTarget.status === "archived"
              ? `Restaurar o vínculo de ${archiveTarget.name} com esta academia?`
              : `Arquivar o vínculo de ${archiveTarget.name}? O histórico será preservado.`}
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setArchiveTarget(null)}>
              Cancelar
            </button>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => {
                void archive();
              }}
            >
              {busy ? "Aguarde…" : "Confirmar"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
