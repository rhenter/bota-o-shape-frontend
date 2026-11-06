"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useTrainingData } from "@/components/use-training-data";
export function WorkoutAssignment({ templateId }: { templateId?: string }) {
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <Content key={`${tenant.id}-${templateId}`} templateId={templateId} />
    </AppShell>
  );
}
function Content({ templateId }: { templateId?: string }) {
  const {
    data,
    context,
    repository,
    api,
    mode,
    canWrite,
    trainingLoading,
    studentDataError: trainingError,
    refreshTraining,
    updateDemo,
  } = useTrainingData();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const published = data.templates.filter((t) => t.status === "published");
  const students = repository
    .getStudents(context)
    .filter((s) => s.status === "active");
  if (trainingLoading) return <LoadingState />;
  if (trainingError)
    return <ErrorState description={trainingError} onRetry={refreshTraining} />;
  if (!canWrite)
    return (
      <EmptyState
        title="Acesso de leitura"
        description="A atribuição exige perfil de professor ou administração."
      />
    );
  return (
    <>
      <Link className="back-link" href="/treinos">
        ← Treinos
      </Link>
      <PageHeader
        title="Atribuir treino"
        description="Confirme o aluno, a versão publicada e o período de acesso."
      />
      {!published.length || !students.length ? (
        <EmptyState
          title={
            !published.length
              ? "Publique um modelo primeiro"
              : "Nenhum aluno ativo disponível"
          }
          description={
            !published.length
              ? "Somente versões publicadas podem ser atribuídas."
              : "O perfil do aluno precisa estar acessível na academia ativa. A API atual não disponibiliza a lista de alunos vinculados ao professor."
          }
          action={<Link href="/treinos">Voltar aos treinos</Link>}
        />
      ) : (
        <form
          className="card assignment-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (trainingError || busy || confirmed) return;
            const form = new FormData(event.currentTarget);
            const input = {
              template: String(form.get("template")),
              student: String(form.get("student")),
              starts_on: String(form.get("starts_on")),
              ends_on: String(form.get("ends_on")) || null,
              is_active: true,
            };
            if (input.ends_on && input.ends_on < input.starts_on) {
              setMessage("O término deve ser igual ou posterior ao início.");
              return;
            }
            setBusy(true);
            try {
              if (mode === "api")
                await api.createWorkoutAssignment(context.tenantId, input);
              else
                updateDemo((d) => ({
                  ...d,
                  assignments: [
                    ...d.assignments,
                    {
                      ...input,
                      id: crypto.randomUUID(),
                      template_detail: d.templates.find(
                        (t) => t.id === input.template,
                      )!,
                    },
                  ],
                }));
              setConfirmed(true);
              setMessage(
                mode === "demo"
                  ? "Atribuição fictícia registrada nesta sessão."
                  : "Treino atribuído ao aluno na academia ativa.",
              );
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "Não foi possível atribuir.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset className="plain-fieldset" disabled={busy || confirmed}>
            <div className="form-grid">
              <label className="field">
                Aluno *
                <select name="student" required>
                  <option value="">Selecione um aluno</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Modelo e versão *
                <select
                  name="template"
                  required
                  defaultValue={
                    published.some((t) => t.id === templateId) ? templateId : ""
                  }
                >
                  <option value="">Selecione um modelo</option>
                  {published.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · versão {t.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Data de início *<input type="date" name="starts_on" required />
              </label>
              <label className="field">
                Data de término
                <input type="date" name="ends_on" />
              </label>
            </div>
            <p className="notice">
              O aluno recebe a versão selecionada durante este período. Dias do
              modelo são sessões de treino; agenda semanal recorrente ainda não
              está disponível.
            </p>
            <label className="checkbox-field">
              <input type="checkbox" required />
              Conferi o aluno, a versão e o período de acesso.
            </label>
            <div className="form-actions">
              <Link className="button" href="/treinos">
                Voltar
              </Link>
              <button className="button button-primary">
                {busy ? "Aguarde…" : "Confirmar atribuição"}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {message && (
        <p className="notice" role="status">
          {message} {confirmed && <Link href="/agenda">Ver agenda</Link>}
        </p>
      )}
    </>
  );
}
