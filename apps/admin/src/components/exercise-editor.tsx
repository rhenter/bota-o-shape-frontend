"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorState, LoadingState } from "@/components/states";
import type { ApiExercise } from "@/lib/api-client";

export function ExerciseEditor({ exerciseId }: { exerciseId?: string }) {
  const { membership, getExercise } = useAppContext();
  const [initial, setInitial] = useState<ApiExercise | null>(null);
  const [error, setError] = useState("");
  const canWrite =
    membership?.status === "active" &&
    membership.roles.some((role) => role === "admin" || role === "professor");
  useEffect(() => {
    if (!exerciseId || !canWrite) return;
    let current = true;
    getExercise(exerciseId)
      .then((exercise) => {
        if (current) setInitial(exercise);
      })
      .catch((failure) => {
        if (current)
          setError(
            failure instanceof Error
              ? failure.message
              : "Não foi possível carregar o exercício.",
          );
      });
    return () => {
      current = false;
    };
  }, [exerciseId, canWrite, getExercise]);
  if (!canWrite)
    return (
      <ErrorState
        title="Acesso restrito"
        description="A edição de exercícios exige papel de professor ou administrador na academia ativa."
      />
    );
  if (error)
    return (
      <>
        <Link className="back-link" href="/exercicios">
          ← Voltar à biblioteca
        </Link>
        <ErrorState title="Exercício não disponível" description={error} />
      </>
    );
  if (exerciseId && !initial)
    return <LoadingState label="Carregando exercício…" />;
  if (initial?.review_status === "archived")
    return (
      <ErrorState
        title="Exercício arquivado"
        description="Este exercício não pode ser editado no catálogo ativo."
      />
    );
  return <ExerciseForm initial={initial ?? undefined} />;
}

function ExerciseForm({ initial }: { initial?: ApiExercise }) {
  const {
    context,
    repository,
    membership,
    mode,
    muscles,
    reload,
    saveExercise,
  } = useAppContext();
  const router = useRouter();
  const [reviewed, setReviewed] = useState(false);
  const [savedStatus, setSavedStatus] = useState(
    initial?.review_status ?? "draft",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canWrite =
    membership?.status === "active" &&
    membership.roles.some((role) => role === "admin" || role === "professor");
  if (!canWrite)
    return (
      <ErrorState
        title="Acesso restrito"
        description="O cadastro de exercícios exige papel de professor ou administrador na academia ativa."
      />
    );
  const equipment = repository.getEquipment(context);
  return (
    <>
      <Link className="back-link" href="/exercicios">
        ← Voltar à biblioteca
      </Link>
      <PageHeader
        title={initial ? "Editar exercício" : "Novo exercício"}
        description="Registre um movimento. Revise as instruções antes de marcar como revisado."
        actions={<StatusBadge status={savedStatus} />}
      />
      {mode === "demo" && (
        <p className="notice">
          Alterações demonstrativas: exercícios podem ser reabertos durante esta
          sessão. Nada é enviado ou preservado após recarregar.
        </p>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!canWrite) return;
          const form = new FormData(event.currentTarget);
          const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
          const status =
            submitter?.value === "reviewed" && reviewed ? "reviewed" : "draft";
          setBusy(true);
          setMessage("");
          const data: Omit<ApiExercise, "id"> = {
            name: String(form.get("name")).trim(),
            description: String(form.get("description")),
            movement_pattern: String(form.get("movement")),
            tracking_type: String(
              form.get("type"),
            ) as ApiExercise["tracking_type"],
            review_status: status,
            equipment: form.getAll("equipment").map(String),
            primary_muscles:
              mode === "api"
                ? form.getAll("muscle").map(String)
                : String(form.get("muscle"))
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
            secondary_muscles:
              mode === "api"
                ? form.getAll("secondaryMuscle").map(String)
                : String(form.get("secondaryMuscle") ?? "")
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
            instructions: {
              ...initial?.instructions,
              preparation: String(form.get("preparation")),
              steps: String(form.get("steps"))
                .split("\n")
                .filter((line) => line.trim()),
              breathing: String(form.get("breathing")),
              commonMistakes: String(form.get("mistakes"))
                .split("\n")
                .filter((line) => line.trim()),
            },
          };
          try {
            if (!data.name) throw new Error("Informe o nome do exercício.");
            if (
              status === "reviewed" &&
              (!String(form.get("preparation")).trim() ||
                !String(form.get("steps")).trim())
            )
              throw new Error(
                "Informe preparação e execução antes de marcar como revisado.",
              );
            await saveExercise(data, initial?.id);
            setSavedStatus(status);
            if (mode === "api") await reload();
            router.push("/exercicios");
          } catch (failure) {
            setMessage(
              failure instanceof Error
                ? failure.message
                : "Não foi possível salvar o exercício.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="editor-grid">
          <section className="card">
            <h2>Informações básicas</h2>
            <label className="field">
              Nome do exercício *
              <input
                name="name"
                placeholder="Ex.: Agachamento com halter"
                maxLength={180}
                required
                defaultValue={initial?.name}
              />
            </label>
            <label className="field">
              Descrição
              <textarea
                name="description"
                rows={2}
                defaultValue={initial?.description}
                placeholder="Objetivo e contexto do movimento"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Tipo de registro *
                <select
                  name="type"
                  required
                  defaultValue={initial?.tracking_type ?? "load_reps"}
                >
                  <option value="load_reps">Carga + repetições</option>
                  <option value="bodyweight_reps">
                    Peso corporal + repetições
                  </option>
                  <option value="duration">Duração</option>
                  <option value="distance">Distância</option>
                  <option value="activity">Atividade sem carga</option>
                </select>
              </label>
              <label className="field">
                Músculos principais *
                {mode === "api" ? (
                  <select
                    name="muscle"
                    multiple
                    required
                    defaultValue={initial?.primary_muscles ?? []}
                  >
                    {muscles.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name="muscle"
                    placeholder="Ex.: Quadríceps"
                    required
                    defaultValue={initial?.primary_muscles.join(", ")}
                  />
                )}
              </label>
            </div>
            <label className="field">
              Músculos secundários
              {mode === "api" ? (
                <select
                  name="secondaryMuscle"
                  multiple
                  defaultValue={initial?.secondary_muscles ?? []}
                >
                  {muscles.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="secondaryMuscle"
                  placeholder="Separe os nomes por vírgula"
                  defaultValue={initial?.secondary_muscles.join(", ")}
                />
              )}
            </label>
            {mode === "api" && !muscles.length && (
              <p className="notice">
                Cadastre um grupo muscular na API antes de criar o exercício. O
                gerenciamento de grupos ainda não está disponível nesta tela.
              </p>
            )}
            <label className="field">
              Padrão de movimento
              <input
                name="movement"
                placeholder="Ex.: Agachar"
                maxLength={100}
                defaultValue={initial?.movement_pattern}
              />
            </label>
            <fieldset className="equipment-fieldset">
              <legend>Equipamentos opcionais</legend>
              {equipment.length ? (
                equipment.map((item) => (
                  <label className="checkbox-field" key={item.id}>
                    <input
                      type="checkbox"
                      name="equipment"
                      value={item.id}
                      defaultChecked={initial?.equipment.includes(item.id)}
                    />
                    {item.name}
                    {item.status === "inactive" ? " (inativo)" : ""}
                  </label>
                ))
              ) : (
                <p className="muted">
                  Sem equipamento cadastrado. O movimento pode usar apenas o
                  peso corporal.
                </p>
              )}
            </fieldset>
            <div className="media-placeholder">
              <span aria-hidden="true">▧</span>
              <strong>Instrução textual disponível</strong>
              <p>
                A API atual não expõe upload de mídia do catálogo. Inclua as
                orientações de execução ao lado.
              </p>
            </div>
          </section>
          <section className="card">
            <h2>Instruções permanentes</h2>
            <p className="help-text">
              Estas orientações pertencem à biblioteca. Observações específicas
              de cada aluno ficam no treino.
            </p>
            <label className="field">
              Preparação
              <textarea
                name="preparation"
                rows={3}
                defaultValue={
                  typeof initial?.instructions.preparation === "string"
                    ? initial.instructions.preparation
                    : ""
                }
                placeholder="Posição inicial e ajuste dos equipamentos"
              />
            </label>
            <label className="field">
              Execução, passo a passo
              <textarea
                name="steps"
                rows={5}
                defaultValue={
                  Array.isArray(initial?.instructions.steps)
                    ? initial.instructions.steps.join("\n")
                    : ""
                }
                placeholder="Escreva uma etapa por linha"
              />
            </label>
            <label className="field">
              Respiração
              <textarea
                name="breathing"
                rows={2}
                defaultValue={
                  typeof initial?.instructions.breathing === "string"
                    ? initial.instructions.breathing
                    : ""
                }
              />
            </label>
            <label className="field">
              Erros comuns
              <textarea
                name="mistakes"
                rows={3}
                defaultValue={
                  Array.isArray(initial?.instructions.commonMistakes)
                    ? initial.instructions.commonMistakes.join("\n")
                    : ""
                }
                placeholder="Escreva um item por linha"
              />
            </label>
          </section>
        </div>
        <section className="card review-card">
          <div>
            <h2>Revisão profissional</h2>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              Conferi as instruções e a adequação do conteúdo para uso
              profissional.
            </label>
          </div>
          <div className="form-actions">
            <button
              className="button"
              type="submit"
              name="action"
              value="draft"
              disabled={busy}
            >
              Salvar rascunho
            </button>
            <button
              className="button button-primary"
              type="submit"
              name="action"
              value="reviewed"
              disabled={busy || !reviewed}
            >
              Salvar como revisado
            </button>
          </div>
        </section>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
      </form>
    </>
  );
}
