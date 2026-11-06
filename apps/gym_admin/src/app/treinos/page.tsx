"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { useTrainingData } from "@/components/use-training-data";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import type { ApiWorkoutTemplate } from "@/lib/api-client";
export default function WorkoutsPage() {
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <Content key={tenant.id} />
    </AppShell>
  );
}
function Content() {
  const {
    data,
    mode,
    api,
    context,
    canWrite,
    trainingLoading,
    trainingError,
    studentDataError,
    refreshTraining,
    updateDemo,
    repository,
  } = useTrainingData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const visible = data.templates.filter(
    (t) =>
      t.name
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")) &&
      (status === "all" || t.status === status),
  );
  async function revise(template: ApiWorkoutTemplate) {
    setBusy(true);
    try {
      if (mode === "api") {
        const revised = await api.reviseWorkout(context.tenantId, template.id);
        setMessage(
          `Rascunho da versão ${revised.version} criado a partir da versão ${template.version}.`,
        );
        refreshTraining();
      } else {
        const revised = {
          ...structuredClone(template),
          id: crypto.randomUUID(),
          supersedes: template.id,
          version: template.version + 1,
          status: "draft" as const,
          published_at: null,
        };
        updateDemo((d) => ({ ...d, templates: [...d.templates, revised] }));
        setMessage(`Revisão fictícia: rascunho da versão ${revised.version}.`);
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível criar a revisão.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (trainingLoading) return <LoadingState />;
  if (trainingError)
    return <ErrorState description={trainingError} onRetry={refreshTraining} />;
  return (
    <>
      <PageHeader
        title="Treinos"
        description="Modelos versionados, atribuições e acompanhamento de sessões."
        actions={
          canWrite && (
            <Link className="button button-primary" href="/treinos/novo">
              + Criar modelo
            </Link>
          )
        }
      />
      <div className="filters">
        <label className="field search-field">
          Buscar modelo
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="field">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos</option>
            <option value="draft">Rascunhos</option>
            <option value="published">Publicados</option>
            <option value="archived">Arquivados</option>
          </select>
        </label>
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="workout-list">
        {visible.map((template) => (
          <article className="card" key={template.id}>
            <div className="section-header">
              <h2>{template.name}</h2>
              <StatusBadge status={template.status} />
            </div>
            <p>{template.objective || "Objetivo não informado"}</p>
            <p className="muted">
              Versão {template.version} · {template.days.length} dias ·{" "}
              {template.days.reduce((n, d) => n + d.exercises.length, 0)}{" "}
              exercícios
            </p>
            <div className="row-actions">
              <Link
                className="button"
                href={`/treinos/novo?id=${encodeURIComponent(template.id)}`}
              >
                {template.status === "draft" && canWrite
                  ? "Abrir rascunho"
                  : "Ver versão"}
              </Link>
              {canWrite && template.status === "published" && (
                <>
                  {!studentDataError && (
                    <Link
                      className="button"
                      href={`/treinos/atribuir?id=${encodeURIComponent(template.id)}`}
                    >
                      Atribuir
                    </Link>
                  )}
                  <button
                    disabled={busy}
                    className="button button-quiet"
                    onClick={() => {
                      void revise(template);
                    }}
                  >
                    Criar revisão
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <EmptyState
          title="Nenhum modelo encontrado"
          description="Crie um rascunho ou ajuste a busca e o status."
        />
      )}
      <section className="card section-space">
        <h2>Treinos atribuídos</h2>
        {studentDataError ? (
          <p className="notice">{studentDataError}</p>
        ) : (
          !data.assignments.length && (
            <p className="muted">
              Nenhuma atribuição registrada nesta academia.
            </p>
          )
        )}
        <ul className="record-list">
          {data.assignments.map((a) => (
            <li key={a.id}>
              <div>
                <strong>
                  {repository
                    .getStudents(context)
                    .find((s) => s.id === a.student)?.name ??
                    "Aluno sem perfil disponível"}
                </strong>
                <small>
                  {a.template_detail.name} · v{a.template_detail.version} ·{" "}
                  {a.starts_on} até {a.ends_on ?? "sem término"}
                </small>
              </div>
              <StatusBadge status={a.is_active ? "active" : "inactive"} />
            </li>
          ))}
        </ul>
      </section>
      <section className="card section-space">
        <h2>Sessões registradas</h2>
        {studentDataError ? (
          <p className="notice">{studentDataError}</p>
        ) : !data.sessions.length ? (
          <p className="muted">Nenhuma sessão recebida do app do aluno.</p>
        ) : (
          <ul className="record-list">
            {data.sessions.map((s) => (
              <li key={s.id}>
                <div>
                  <strong>
                    {new Date(s.started_at).toLocaleString("pt-BR")}
                  </strong>
                  <small>
                    {data.assignments.find((a) => a.id === s.assignment)
                      ?.template_detail.name ??
                      "Treino sem detalhe disponível"}{" "}
                    · {s.completed_at ? "Finalizada" : "Em andamento"}
                  </small>
                  {s.student_note && (
                    <p>Nota pessoal do aluno: {s.student_note}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
