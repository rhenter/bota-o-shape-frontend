"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorState } from "@/components/states";
import type { ApiExercise } from "@/lib/api-client";

export default function NewExercisePage() {
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <ExerciseEditor key={tenant.id} />
    </AppShell>
  );
}
function ExerciseEditor() {
  const { context, repository, membership, mode, api, muscles, reload } =
    useAppContext();
  const router = useRouter();
  const [reviewed, setReviewed] = useState(false);
  const [savedStatus, setSavedStatus] = useState("draft");
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
        title="Novo exercício"
        description="Registre um movimento. Revise as instruções antes de marcar como revisado."
        actions={<StatusBadge status={savedStatus} />}
      />
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
                ? [String(form.get("muscle"))].filter(Boolean)
                : [],
            secondary_muscles: [],
            instructions: {
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
            if (mode === "api") {
              await api.saveExercise(context.tenantId, data);
              await reload();
              router.push("/exercicios");
            } else {
              setSavedStatus(status);
              setMessage(
                `Exercício ${status === "draft" ? "salvo como rascunho" : "marcado como revisado"} somente nesta demonstração. As alterações não persistem ao sair da tela.`,
              );
            }
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
              />
            </label>
            <label className="field">
              Descrição
              <textarea
                name="description"
                rows={2}
                placeholder="Objetivo e contexto do movimento"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Tipo de registro *
                <select name="type" required>
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
                Músculo principal *
                {mode === "api" ? (
                  <select name="muscle" required>
                    <option value="">Selecione</option>
                    {muscles.map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input name="muscle" placeholder="Ex.: Quadríceps" required />
                )}
              </label>
            </div>
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
              />
            </label>
            <fieldset className="equipment-fieldset">
              <legend>Equipamentos opcionais</legend>
              {equipment.length ? (
                equipment
                  .filter((item) => item.status !== "inactive")
                  .map((item) => (
                    <label className="checkbox-field" key={item.id}>
                      <input type="checkbox" name="equipment" value={item.id} />
                      {item.name}
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
                placeholder="Posição inicial e ajuste dos equipamentos"
              />
            </label>
            <label className="field">
              Execução, passo a passo
              <textarea
                name="steps"
                rows={5}
                placeholder="Escreva uma etapa por linha"
              />
            </label>
            <label className="field">
              Respiração
              <textarea name="breathing" rows={2} />
            </label>
            <label className="field">
              Erros comuns
              <textarea
                name="mistakes"
                rows={3}
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
