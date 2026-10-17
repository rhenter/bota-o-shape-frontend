"use client";
import Link from "next/link";
import { use, useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useTrainingData } from "@/components/use-training-data";

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <StudentProfile key={`${tenant.id}:${id}`} id={id} />
    </AppShell>
  );
}
function StudentProfile({ id }: { id: string }) {
  const {
    context,
    repository,
    membership,
    mode,
    api,
    data,
    trainingLoading,
    trainingError,
    refreshTraining,
  } = useTrainingData();
  const student = repository
    .getStudents(context)
    .find((item) => item.id === id);
  const [section, setSection] = useState("overview");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!student)
    return (
      <>
        <Link className="back-link" href="/alunos">
          ← Voltar aos alunos
        </Link>
        <ErrorState
          title="Aluno não disponível"
          description="O perfil não foi encontrado ou não está autorizado na academia ativa."
        />
      </>
    );
  const workouts = data.assignments.filter(
    (item) => item.student === student.id,
  );
  const assessments = data.assessments.filter(
    (item) => item.student === student.id,
  );
  const sections = [
    { id: "overview", label: "Visão geral" },
    { id: "workouts", label: "Treinos" },
    { id: "assessments", label: "Avaliações" },
    { id: "consents", label: "Consentimentos" },
  ];
  return (
    <>
      <Link className="back-link" href="/alunos">
        ← Voltar aos alunos
      </Link>
      <PageHeader
        title={student.name}
        description={student.email}
        actions={<StatusBadge status={student.status} />}
      />
      <div className="profile-tabs" role="group" aria-label="Seções do perfil">
        {sections.map((item) => (
          <button
            className={section === item.id ? "selected" : ""}
            aria-pressed={section === item.id}
            key={item.id}
            onClick={() => setSection(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {section === "overview" && (
        <div className="dashboard-grid">
          <section className="card">
            <h2>Informações principais</h2>
            <dl className="details-list">
              <div>
                <dt>Objetivo</dt>
                <dd>{student.goal ?? "Não informado"}</dd>
              </div>
              <div>
                <dt>Restrições compartilhadas</dt>
                <dd>{student.restrictions ?? "Não informado"}</dd>
              </div>
              <div>
                <dt>Vínculo</dt>
                <dd>
                  {student.status === "active"
                    ? "Ativo nesta academia"
                    : student.status === "archived"
                      ? "Arquivado · histórico preservado"
                      : student.status === "invited"
                        ? "Convite pendente"
                        : "Inativo nesta academia"}
                </dd>
              </div>
            </dl>
          </section>
          <section className="card">
            <h2>Profissional responsável</h2>
            {student.coachIds.length ? (
              student.coachIds.map((coachId) => (
                <p key={coachId}>
                  {repository.getUser(coachId)?.name ??
                    "Profissional vinculado"}
                </p>
              ))
            ) : (
              <p className="muted">Nenhum professor atribuído.</p>
            )}
            <p className="help-text">
              O acesso às informações segue os vínculos e as permissões da
              academia.
            </p>
          </section>
          <section className="card">
            <h2>Acesso à plataforma</h2>
            <p className="muted">
              A redefinição é enviada ao titular. A administração nunca vê ou
              define a senha existente.
            </p>
            {membership?.roles.includes("admin") && (
              <button
                className="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    if (mode === "api")
                      await api.resetUserPassword(context.tenantId, student.id);
                    setMessage(
                      mode === "demo"
                        ? "Redefinição simulada. Nenhum e-mail foi enviado."
                        : "Solicitação de redefinição enviada ao titular.",
                    );
                  } catch (failure) {
                    setMessage(
                      failure instanceof Error
                        ? failure.message
                        : "Não foi possível solicitar a redefinição.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Aguarde…" : "Solicitar redefinição de senha"}
              </button>
            )}
          </section>
          <section className="card">
            <h2>Acompanhamento</h2>
            <p>
              {trainingLoading
                ? "Carregando acompanhamento…"
                : trainingError
                  ? "Acompanhamento indisponível."
                  : `${workouts.length} atribuição(ões) de treino e ${assessments.length} avaliação(ões)${mode === "demo" ? " nesta demonstração" : " registradas"}.`}
            </p>
          </section>
        </div>
      )}
      {section === "workouts" && (
        <section className="card">
          <h2>Treinos do aluno</h2>
          {trainingLoading ? (
            <LoadingState />
          ) : trainingError ? (
            <ErrorState description={trainingError} onRetry={refreshTraining} />
          ) : workouts.length ? (
            workouts.map((workout) => (
              <article key={workout.id} className="list-card">
                <h3>{workout.template_detail.name}</h3>
                <p>
                  {workout.starts_on} até {workout.ends_on ?? "sem término"}
                </p>
                <StatusBadge
                  status={workout.is_active ? "active" : "inactive"}
                />
                <small>Versão {workout.template_detail.version}</small>
                <p>
                  <Link href={`/treinos/novo?id=${workout.template}`}>
                    Ver versão atribuída
                  </Link>
                </p>
              </article>
            ))
          ) : (
            <EmptyState
              title="Nenhum treino disponível"
              description="Nenhuma atribuição de treino foi registrada para este aluno."
            />
          )}
        </section>
      )}
      {section === "assessments" && (
        <section className="card">
          <h2>Avaliações</h2>
          {trainingLoading ? (
            <LoadingState />
          ) : trainingError ? (
            <ErrorState description={trainingError} onRetry={refreshTraining} />
          ) : assessments.length ? (
            assessments.map((assessment) => (
              <article className="list-card" key={assessment.id}>
                <h3>
                  {[
                    ...new Set(assessment.measurements.map((m) => m.method)),
                  ].join(" · ") || "Avaliação"}
                </h3>
                <p>
                  {new Date(assessment.assessed_at).toLocaleDateString(
                    "pt-BR",
                    {
                      timeZone: "America/Sao_Paulo",
                    },
                  )}{" "}
                  ·{" "}
                  {assessment.status === "released"
                    ? "Liberada ao aluno"
                    : "Não liberada"}
                </p>
                <p>{assessment.notes}</p>
                <Link href={`/avaliacoes/relatorio?id=${assessment.id}`}>
                  Ver avaliação
                </Link>
              </article>
            ))
          ) : (
            <EmptyState
              title="Nenhuma avaliação disponível"
              description="Nenhuma avaliação foi registrada para este aluno."
            />
          )}
        </section>
      )}
      {section === "consents" && (
        <section className="card">
          <h2>Consentimentos por finalidade</h2>
          <p>
            {mode === "demo"
              ? `Acompanhamento nutricional: ${student.nutritionConsent ? "consentimento demonstrativo concedido" : "não concedido"}.`
              : "Acesso nutricional depende da validação da habilitação e dos consentimentos pela API."}
          </p>
          {trainingLoading ? (
            <LoadingState />
          ) : trainingError ? (
            <ErrorState description={trainingError} onRetry={refreshTraining} />
          ) : (
            <ul>
              {data.consents
                .filter((consent) => consent.subject === student.id)
                .map((consent) => (
                  <li key={consent.id}>
                    {consent.purpose} ·{" "}
                    {consent.granted && !consent.revoked_at
                      ? "Ativo"
                      : "Revogado"}
                  </li>
                ))}
            </ul>
          )}
          <p className="muted">
            Somente o titular pode conceder ou revogar seus consentimentos. Esta
            tela não altera essa escolha.
          </p>
        </section>
      )}
    </>
  );
}
