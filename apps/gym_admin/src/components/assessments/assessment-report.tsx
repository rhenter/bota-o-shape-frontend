"use client";
import { assessmentTimeZone } from "@/lib/dates";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { useTrainingData } from "@/components/use-training-data";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import type {
  ApiAssessment,
  ApiAssessmentReport,
  AssessmentStatus,
} from "@/lib/api-client";
import {
  compareMeasurements,
  comparisonLabels,
  compatibleMeasurements,
  measurementMethod,
  measurementSide,
  assessmentContext,
} from "@/lib/assessments";
import { AssessmentChart, compatibleAssessmentContext } from "./assessment-chart";
const nextStatus: Partial<Record<AssessmentStatus, AssessmentStatus>> = {
  draft: "reviewed",
  reviewed: "completed",
  completed: "released",
};
const actionLabels: Record<string, string> = {
  reviewed: "Marcar como revisada",
  completed: "Concluir avaliação",
  released: "Liberar para o aluno",
};
export function AssessmentReport({ assessmentId }: { assessmentId?: string }) {
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <Content
        key={`${tenant.id}-${assessmentId}`}
        assessmentId={assessmentId}
      />
    </AppShell>
  );
}
function Content({ assessmentId }: { assessmentId?: string }) {
  const {
    data,
    api,
    mode,
    context,
    repository,
    canWrite,
    trainingLoading,
    studentDataError: trainingError,
    refreshTraining,
    updateDemo,
  } = useTrainingData();
  const [updated, setUpdated] = useState<ApiAssessment>();
  const [report, setReport] = useState<ApiAssessmentReport>();
  const [reportError, setReportError] = useState("");
  const [reportRevision, setReportRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const current =
    updated ??
    data.assessments.find((a) => a.id === assessmentId) ??
    (!assessmentId ? data.assessments[0] : undefined);
  useEffect(() => {
    if (mode !== "api" || trainingError || current?.status !== "released")
      return;
    let active = true;
    api
      .getAssessmentReport(context.tenantId, current.id)
      .then((r) => {
        if (active) {
          setReport(r);
          setReportError("");
        }
      })
      .catch((e) => {
        if (active)
          setReportError(
            e instanceof Error ? e.message : "Relatório indisponível.",
          );
      });
    return () => {
      active = false;
    };
  }, [
    api,
    mode,
    context.tenantId,
    current?.id,
    current?.status,
    reportRevision,
    trainingError,
  ]);
  if (trainingLoading) return <LoadingState />;
  if (trainingError)
    return <ErrorState description={trainingError} onRetry={refreshTraining} />;
  if (!current)
    return (
      <EmptyState
        title="Avaliação não encontrada"
        description="Selecione uma avaliação da academia ativa."
        action={<Link href="/avaliacoes">Voltar às avaliações</Link>}
      />
    );
  const previous = data.assessments
    .filter(
      (a) =>
        a.student === current.student &&
        a.assessed_at < current.assessed_at &&
        ["completed", "released"].includes(a.status),
    )
    .sort((a, b) => b.assessed_at.localeCompare(a.assessed_at));
  const target = nextStatus[current.status];
  const students = repository.getStudents(context);
  async function transition() {
    if (trainingError || !current || !target || busy || !confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      let result: ApiAssessment;
      if (mode === "api")
        result = await api.transitionAssessment(
          context.tenantId,
          current.id,
          target,
        );
      else {
        result = {
          ...current,
          status: target,
          released_at: target === "released" ? new Date().toISOString() : null,
        };
        updateDemo((d) => ({
          ...d,
          assessments: d.assessments.map((a) =>
            a.id === result.id ? result : a,
          ),
        }));
      }
      setUpdated(result);
      setConfirmed(false);
      setMessage(
        `Avaliação ${target === "released" ? "liberada para o aluno" : target === "completed" ? "concluída" : "revisada"}${mode === "demo" ? " nesta demonstração" : ""}.`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível alterar o status.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="back-link" href="/avaliacoes">
        ← Avaliações
      </Link>
      <PageHeader
        title="Resultado da avaliação"
        description="Revise os dados e as condições antes de liberar o relatório."
      />
      <section className="card">
        <div className="section-header">
          <h2>
            {students.find((s) => s.id === current.student)?.name ??
              "Aluno sem perfil disponível"}
          </h2>
          <StatusBadge status={current.status} />
        </div>
        <dl className="details-list">
          <div>
            <dt>Data e hora</dt>
            <dd>
              {new Date(current.assessed_at).toLocaleString("pt-BR", {
                timeZone: assessmentTimeZone,
              })}
            </dd>
          </div>
          <div>
            <dt>Avaliador</dt>
            <dd>
              {mode === "demo"
                ? "Profissional de demonstração"
                : "Identificação não fornecida pela API de avaliações."}
            </dd>
          </div>
          <div>
            <dt>Aparelho</dt>
            <dd>{assessmentContext(current.device)}</dd>
          </div>
          <div>
            <dt>Condições de preparação</dt>
            <dd>{assessmentContext(current.preparation_conditions)}</dd>
          </div>
          <div>
            <dt>Observações profissionais</dt>
            <dd>{current.notes || "Não informadas"}</dd>
          </div>
        </dl>
        <p className="help-text">
          A direção da mudança depende do objetivo e do contexto. Nenhuma
          métrica recebe classificação automática de melhora ou piora.
        </p>
      </section>
      <section className="card section-space">
        <h2>Medidas e comparação</h2>
        {mode === "api" && current.status !== "released" && (
          <p className="notice">
            O relatório comparativo da API é gerado ao liberar a avaliação. Até
            lá, confira as medidas brutas.
          </p>
        )}
        {reportError && (
          <p className="notice" role="alert">
            Relatório indisponível: {reportError}
            <button
              className="button"
              onClick={() => setReportRevision((value) => value + 1)}
            >
              Tentar carregar relatório novamente
            </button>
          </p>
        )}
        <div className="table-scroll">
          <table>
            <caption>Medidas, métodos e diferenças compatíveis</caption>
            <thead>
              <tr>
                <th>Medida</th>
                <th>Atual</th>
                <th>Método / protocolo</th>
                <th>Lado / ponto</th>
                <th>Anterior</th>
                <th>Variação</th>
              </tr>
            </thead>
            <tbody>
              {current.measurements.map((m, i) => {
                const comparison = report?.comparisons.find(
                  (c) => c.measurement_id === m.id,
                );
                const priorAssessment = previous.find(
                  (a) =>
                    compatibleAssessmentContext(a, current, m.method) &&
                    a.measurements.some((p) =>
                      comparison?.previous_measurement_id
                        ? p.id === comparison.previous_measurement_id &&
                          compatibleMeasurements(m, p)
                        : compatibleMeasurements(m, p),
                    ),
                );
                const prior = priorAssessment?.measurements.find((p) =>
                  comparison?.previous_measurement_id
                    ? p.id === comparison.previous_measurement_id
                    : compatibleMeasurements(m, p),
                );
                const computed =
                  mode === "demo" ? compareMeasurements(m, prior) : null;
                const state =
                  computed?.status ??
                  (comparison && prior
                    ? comparison.comparison_status
                    : "not_comparable");
                const difference =
                  computed?.difference ??
                  (state !== "not_comparable"
                    ? comparison?.difference
                    : undefined);
                const percent =
                  computed?.percent ?? comparison?.difference_percent;
                const protocol = data.protocols.find(
                  (p) => p.id === m.protocol,
                );
                return (
                  <tr key={m.id ?? i}>
                    <td>
                      {m.metric}
                      {m.possible_error && <p>Conferir valor sinalizado</p>}
                    </td>
                    <td>
                      {m.raw_value} {m.unit}
                    </td>
                    <td>
                      {measurementMethod(m.method)}
                      <br />
                      {protocol
                        ? `${protocol.name} · v${protocol.version}`
                        : m.protocol
                          ? "Protocolo sem detalhe disponível"
                          : "Sem protocolo"}
                      {Object.keys(m.equation_metadata).length > 0 && (
                        <p>
                          Equação / contexto:{" "}
                          {assessmentContext(m.equation_metadata)}
                        </p>
                      )}
                    </td>
                    <td>
                      {measurementSide(m.side) || "—"} · {m.anatomical_site || "—"}
                    </td>
                    <td>
                      {state !== "not_comparable" && prior
                        ? `${prior.raw_value} ${prior.unit}`
                        : "—"}
                    </td>
                    <td>
                      {comparisonLabels[state]}
                      {state !== "not_comparable" &&
                        difference !== undefined && (
                          <p>
                            {difference} {m.unit} ·{" "}
                            {percent == null
                              ? "percentual indisponível (base zero)"
                              : `${Number(percent).toFixed(2)}%`}
                          </p>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="help-text">
          Comparação exige mesma métrica, unidade, lado, ponto anatômico, método
          e protocolo, origem, equação e condições compatíveis, sem valores
          sinalizados para conferência. Aparelhos de bioimpedância diferentes não recebem
          comparação direta.
        </p>
        {report?.professional_interpretation && (
          <p>
            Interpretação profissional: {report.professional_interpretation}
          </p>
        )}
      </section>
      <div className="section-space">
        <AssessmentChart
          assessments={data.assessments.map((a) =>
            a.id === current.id ? current : a,
          )}
          current={current}
        />
      </div>
      {target && canWrite && (
        <section className="card review-card">
          <div>
            <h2>{actionLabels[target]}</h2>
            <p className="muted">
              {target === "completed"
                ? "Após concluir, as medidas ficam imutáveis."
                : target === "released"
                  ? "O relatório ficará disponível ao aluno. A liberação depende do acesso comercial da academia."
                  : "Confira valores, método, unidade, ponto anatômico e condições."}
            </p>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              Conferi os dados e desejo continuar.
            </label>
          </div>
          <button
            className="button button-primary"
            disabled={busy || !confirmed}
            onClick={() => {
              void transition();
            }}
          >
            {busy ? "Aguarde…" : actionLabels[target]}
          </button>
        </section>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <p className="help-text">
        A edição de medidas após salvar, anotações no relatório e exportação PDF
        ainda não estão disponíveis na API. As observações da coleta permanecem
        visíveis.
      </p>
    </>
  );
}
