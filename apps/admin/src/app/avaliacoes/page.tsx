"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { useTrainingData } from "@/components/use-training-data";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { measurementMethod } from "@/lib/assessments";

export default function AssessmentsPage() {
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
    context,
    repository,
    canWrite,
    trainingLoading,
    trainingError,
    refreshTraining,
  } = useTrainingData();
  const [student, setStudent] = useState("all");
  const [status, setStatus] = useState("all");
  const students = repository.getStudents(context);
  const visible = data.assessments
    .filter(
      (a) =>
        (student === "all" || a.student === student) &&
        (status === "all" || a.status === status),
    )
    .sort((a, b) => b.assessed_at.localeCompare(a.assessed_at));
  if (trainingLoading) return <LoadingState />;
  if (trainingError)
    return <ErrorState description={trainingError} onRetry={refreshTraining} />;
  return (
    <>
      <PageHeader
        title="Avaliações"
        description="Dados brutos, protocolos e evolução com contexto."
        actions={
          canWrite && (
            <Link className="button button-primary" href="/avaliacoes/nova">
              + Nova avaliação
            </Link>
          )
        }
      />
      <div className="filters">
        <label className="field">
          Aluno
          <select value={student} onChange={(e) => setStudent(e.target.value)}>
            <option value="all">Todos os alunos</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="reviewed">Revisada</option>
            <option value="completed">Concluída</option>
            <option value="released">Liberada</option>
          </select>
        </label>
      </div>
      <div className="workout-list">
        {visible.map((assessment) => (
          <article className="card" key={assessment.id}>
            <div className="section-header">
              <h2>
                {students.find((s) => s.id === assessment.student)?.name ??
                  "Aluno sem perfil disponível"}
              </h2>
              <StatusBadge status={assessment.status} />
            </div>
            <p>{new Date(assessment.assessed_at).toLocaleString("pt-BR")}</p>
            <p className="muted">
              {[
                ...new Set(
                  assessment.measurements.map((m) =>
                    measurementMethod(m.method),
                  ),
                ),
              ].join(" · ")}{" "}
              · {assessment.measurements.length} medidas
            </p>
            <Link
              className="button"
              href={`/avaliacoes/relatorio?id=${encodeURIComponent(assessment.id)}`}
            >
              Revisar avaliação
            </Link>
          </article>
        ))}
      </div>
      {!visible.length && (
        <EmptyState
          title="Nenhuma avaliação encontrada"
          description="Ajuste os filtros ou inicie uma coleta com protocolo e consentimento."
        />
      )}
    </>
  );
}
