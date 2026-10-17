"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { useTrainingData } from "@/components/use-training-data";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { PageHeader } from "@/components/ui/page-header";
import type {
  ApiWorkoutTemplate,
  WorkoutTemplateInput,
} from "@/lib/api-client";
import { WorkoutBuilder } from "./workout-builder";
export function WorkoutEditor({ templateId }: { templateId?: string }) {
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
    api,
    mode,
    context,
    repository,
    canWrite,
    updateDemo,
    trainingLoading,
    trainingError,
    refreshTraining,
  } = useTrainingData();
  const [saved, setSaved] = useState<ApiWorkoutTemplate>();
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const initial = saved ?? data.templates.find((t) => t.id === templateId);
  if (trainingLoading) return <LoadingState />;
  if (trainingError)
    return <ErrorState description={trainingError} onRetry={refreshTraining} />;
  if (templateId && !initial)
    return (
      <EmptyState
        title="Modelo não encontrado"
        description="Selecione um modelo da academia ativa."
        action={<Link href="/treinos">Voltar para treinos</Link>}
      />
    );
  if (!canWrite && !initial)
    return (
      <EmptyState
        title="Acesso de leitura"
        description="A criação de treinos requer perfil de professor ou administração."
      />
    );
  async function save(input: WorkoutTemplateInput, publish: boolean) {
    let persistedDraft: ApiWorkoutTemplate | undefined;
    setFailure("");
    try {
      let result: ApiWorkoutTemplate;
      if (mode === "api") {
        if (initial) {
          const { name, objective, level, notes } = input;
          result = await api.updateWorkoutMetadata(
            context.tenantId,
            initial.id,
            {
              name,
              objective,
              level,
              notes,
            },
          );
        } else
          result = await api.createWorkoutTemplate(context.tenantId, input);
        // Preserve the created ID on publish failure without remounting during the request.
        persistedDraft = result;
        if (publish) {
          result = await api.publishWorkout(context.tenantId, result.id);
        }
        setSaved(result);
      } else {
        result = {
          ...structuredClone(input),
          id: initial?.id ?? crypto.randomUUID(),
          version: initial?.version ?? 1,
          supersedes: initial?.supersedes ?? null,
          status: publish ? "published" : "draft",
          published_at: publish ? new Date().toISOString() : null,
        };
        updateDemo((d) => ({
          ...d,
          templates: [...d.templates.filter((t) => t.id !== result.id), result],
        }));
        setSaved(result);
      }
      setMessage(
        `${mode === "demo" ? "Demonstração: " : ""}versão ${result.version} ${result.status === "published" ? "publicada. Atribua este modelo a um aluno." : "salva como rascunho."}`,
      );
    } catch (error) {
      if (persistedDraft) {
        setSaved(persistedDraft);
        setMessage(`Rascunho da versão ${persistedDraft.version} salvo.`);
      }
      setFailure(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o treino.",
      );
    }
  }
  return (
    <>
      <Link className="back-link" href="/treinos">
        ← Treinos
      </Link>
      <PageHeader
        title={
          initial?.status === "published"
            ? "Versão publicada"
            : "Montador de treino"
        }
        description="Organize os dias, configure alvos por série e oriente o aluno em cada exercício."
      />
      {failure && (
        <p className="notice" role="alert">
          {failure}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}{" "}
          {saved?.status === "published" && (
            <Link href={`/treinos/atribuir?id=${saved.id}`}>
              Atribuir treino
            </Link>
          )}
        </p>
      )}
      {initial?.status === "published" && (
        <p className="notice">
          Versões publicadas são preservadas. Para iniciar uma nova versão, crie
          uma revisão na lista de treinos.
        </p>
      )}
      <WorkoutBuilder
        key={initial?.id ?? "new"}
        initial={initial}
        exercises={repository.getExercises(context)}
        nestedReadOnly={mode === "api" && Boolean(initial)}
        readOnly={!canWrite || Boolean(initial && initial.status !== "draft")}
        onSave={save}
      />
    </>
  );
}
