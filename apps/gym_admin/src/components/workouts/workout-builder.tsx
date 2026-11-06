"use client";
import { useState } from "react";
import type {
  ApiSetPrescription,
  ApiWorkoutTemplate,
  WorkoutTemplateInput,
} from "@/lib/api-client";
import type { Exercise } from "@/lib/domain";
import { StudentPreview } from "./student-preview";
const newSet = (order: number): ApiSetPrescription => ({
  order,
  repetitions_min: null,
  repetitions_max: null,
  load_kg: null,
  duration_seconds: null,
  distance_meters: null,
  rest_seconds: null,
  rpe: null,
  rir: null,
  cadence: "",
  note: "",
});
const newDraft = (): WorkoutTemplateInput => ({
  name: "",
  objective: "",
  level: "",
  notes: "",
  days: [{ name: "Treino A", order: 1, exercises: [] }],
});
export function WorkoutBuilder({
  exercises,
  initial,
  onSave,
  nestedReadOnly = false,
  readOnly = false,
}: {
  exercises: Exercise[];
  initial?: ApiWorkoutTemplate;
  onSave: (data: WorkoutTemplateInput, publish: boolean) => Promise<void>;
  nestedReadOnly?: boolean;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<WorkoutTemplateInput>(() =>
    initial ? structuredClone(initial) : newDraft(),
  );
  const [activeDay, setActiveDay] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedExercise, setSelectedExercise] = useState(
    exercises[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const day = draft.days[activeDay];
  const candidates = exercises.filter(
    (item) =>
      item.status !== "archived" &&
      item.name
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  function edit(update: (next: WorkoutTemplateInput) => void) {
    setDraft((current) => {
      const next = structuredClone(current);
      update(next);
      return next;
    });
  }
  async function save(publish: boolean) {
    setError("");
    if (
      !draft.days.length ||
      draft.days.some(
        (d) => !d.exercises.length || d.exercises.some((e) => !e.sets.length),
      )
    ) {
      setError("Inclua pelo menos um exercício e uma série em cada dia.");
      return;
    }
    if (
      draft.days.some((d) =>
        d.exercises.some((e) =>
          e.sets.some(
            (s) =>
              s.repetitions_min !== null &&
              s.repetitions_max !== null &&
              s.repetitions_min > s.repetitions_max,
          ),
        ),
      )
    ) {
      setError("Repetições mínimas não podem superar as máximas.");
      return;
    }
    setBusy(true);
    try {
      await onSave(draft, publish);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível salvar o treino.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
    >
      <div className="builder-layout">
        <div className="builder-main">
          <section className="card">
            <h2>
              Informações do modelo {initial && `· versão ${initial.version}`}
            </h2>
            <fieldset className="plain-fieldset" disabled={busy || readOnly}>
              <div className="form-grid">
                <label className="field">
                  Nome do modelo *
                  <input
                    required
                    maxLength={180}
                    value={draft.name}
                    onChange={(e) =>
                      edit((n) => {
                        n.name = e.target.value;
                      })
                    }
                  />
                </label>
                <label className="field">
                  Objetivo
                  <input
                    maxLength={200}
                    value={draft.objective}
                    onChange={(e) =>
                      edit((n) => {
                        n.objective = e.target.value;
                      })
                    }
                  />
                </label>
                <label className="field">
                  Nível
                  <input
                    maxLength={80}
                    value={draft.level}
                    onChange={(e) =>
                      edit((n) => {
                        n.level = e.target.value;
                      })
                    }
                  />
                </label>
                <label className="field">
                  Observações gerais
                  <textarea
                    value={draft.notes}
                    onChange={(e) =>
                      edit((n) => {
                        n.notes = e.target.value;
                      })
                    }
                  />
                </label>
              </div>
            </fieldset>
          </section>
          {nestedReadOnly && !readOnly && (
            <p className="notice">
              Os dias, exercícios e séries deste rascunho estão em leitura: a
              API ainda não permite atualizar esses itens após salvar. As
              informações gerais podem ser editadas.
            </p>
          )}
          <div className="day-tabs" role="group" aria-label="Dias do treino">
            {draft.days.map((d, i) => (
              <button
                type="button"
                className={`button ${activeDay === i ? "button-secondary" : ""}`}
                aria-pressed={activeDay === i}
                key={i}
                onClick={() => setActiveDay(i)}
              >
                {d.name}
              </button>
            ))}
            <button
              type="button"
              className="button"
              disabled={nestedReadOnly || busy || readOnly}
              onClick={() => {
                edit((n) => {
                  n.days.push({
                    name: `Treino ${String.fromCharCode(65 + n.days.length)}`,
                    order: n.days.length + 1,
                    exercises: [],
                  });
                });
                setActiveDay(draft.days.length);
              }}
            >
              + Adicionar dia
            </button>
          </div>
          {day && (
            <section className="card">
              <fieldset
                className="plain-fieldset"
                disabled={nestedReadOnly || busy || readOnly}
              >
                <div className="form-grid">
                  <label className="field">
                    Nome do dia
                    <input
                      required
                      maxLength={120}
                      value={day.name}
                      onChange={(e) =>
                        edit((n) => {
                          n.days[activeDay].name = e.target.value;
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="button button-quiet"
                    disabled={draft.days.length <= 1}
                    onClick={() => {
                      edit((n) => {
                        n.days.splice(activeDay, 1);
                        n.days.forEach((d, i) => {
                          d.order = i + 1;
                        });
                      });
                      setActiveDay(0);
                    }}
                  >
                    Remover dia
                  </button>
                </div>
                <div className="filters">
                  <label className="field">
                    Buscar exercício
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Exercício
                    <select
                      value={
                        candidates.some((e) => e.id === selectedExercise)
                          ? selectedExercise
                          : (candidates[0]?.id ?? "")
                      }
                      onChange={(e) => setSelectedExercise(e.target.value)}
                    >
                      {!candidates.length && (
                        <option value="">Nenhum exercício disponível</option>
                      )}
                      {candidates.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="button"
                    disabled={!candidates.length}
                    onClick={() =>
                      edit((n) => {
                        const id = candidates.some(
                          (e) => e.id === selectedExercise,
                        )
                          ? selectedExercise
                          : candidates[0].id;
                        n.days[activeDay].exercises.push({
                          exercise: id,
                          variant: null,
                          alternative: null,
                          order: day.exercises.length + 1,
                          coach_observation: "",
                          sets: [newSet(1)],
                        });
                      })
                    }
                  >
                    Adicionar exercício
                  </button>
                </div>
                {!day.exercises.length && (
                  <p className="muted">
                    Busque na biblioteca para começar este dia.
                  </p>
                )}
                {day.exercises.map((item, i) => (
                  <article className="prescription-card" key={i}>
                    <div className="section-header">
                      <h3>
                        {i + 1}.{" "}
                        {exercises.find((e) => e.id === item.exercise)?.name ??
                          item.exercise_name ??
                          "Exercício indisponível"}
                      </h3>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="button button-small"
                          aria-label={`Mover exercício ${i + 1} para cima`}
                          disabled={!i}
                          onClick={() =>
                            edit((n) => {
                              const list = n.days[activeDay].exercises;
                              [list[i - 1], list[i]] = [list[i], list[i - 1]];
                              list.forEach((e, index) => {
                                e.order = index + 1;
                              });
                            })
                          }
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="button button-small"
                          aria-label={`Mover exercício ${i + 1} para baixo`}
                          disabled={i === day.exercises.length - 1}
                          onClick={() =>
                            edit((n) => {
                              const list = n.days[activeDay].exercises;
                              [list[i], list[i + 1]] = [list[i + 1], list[i]];
                              list.forEach((e, index) => {
                                e.order = index + 1;
                              });
                            })
                          }
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="button button-quiet"
                          onClick={() =>
                            edit((n) => {
                              n.days[activeDay].exercises.splice(i, 1);
                              n.days[activeDay].exercises.forEach(
                                (e, index) => {
                                  e.order = index + 1;
                                },
                              );
                            })
                          }
                        >
                          Remover exercício {i + 1}
                        </button>
                      </div>
                    </div>
                    <label className="field coach-observation">
                      Observação do professor
                      <textarea
                        aria-label="Observação do professor"
                        value={item.coach_observation}
                        onChange={(e) =>
                          edit((n) => {
                            n.days[activeDay].exercises[i].coach_observation =
                              e.target.value;
                          })
                        }
                      />
                      <span className="help-text">
                        Orientação específica deste exercício. Não altera a
                        biblioteca nem a anotação pessoal do aluno.
                      </span>
                    </label>
                    <label className="field">
                      Exercício alternativo
                      <select
                        value={item.alternative ?? ""}
                        onChange={(e) =>
                          edit((n) => {
                            n.days[activeDay].exercises[i].alternative =
                              e.target.value || null;
                          })
                        }
                      >
                        <option value="">Sem alternativa</option>
                        {exercises
                          .filter(
                            (e) =>
                              e.id !== item.exercise && e.status !== "archived",
                          )
                          .map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    {item.sets.map((set, si) => (
                      <fieldset className="set-fields" key={si}>
                        <legend>Série {si + 1}</legend>
                        <div className="set-grid">
                          {(
                            [
                              ["repetitions_min", "Repetições mínimas", "1"],
                              ["repetitions_max", "Repetições máximas", "1"],
                              ["load_kg", "Carga (kg)", "0.01"],
                              ["duration_seconds", "Duração (s)", "1"],
                              ["distance_meters", "Distância (m)", "0.01"],
                              ["rest_seconds", "Descanso (s)", "1"],
                              ["rpe", "RPE", "0.1"],
                              ["rir", "RIR", "1"],
                            ] as const
                          ).map(([key, label, step]) => (
                            <label className="field" key={key}>
                              {label}
                              <input
                                type="number"
                                min="0"
                                max={
                                  key === "rpe" || key === "rir"
                                    ? 10
                                    : undefined
                                }
                                step={step}
                                value={set[key] ?? ""}
                                onChange={(e) =>
                                  edit((n) => {
                                    const target =
                                      n.days[activeDay].exercises[i].sets[si];
                                    const value = e.target.value;
                                    if (
                                      key === "load_kg" ||
                                      key === "distance_meters" ||
                                      key === "rpe"
                                    )
                                      target[key] = value || null;
                                    else
                                      target[key] =
                                        value === "" ? null : Number(value);
                                  })
                                }
                              />
                            </label>
                          ))}
                        </div>
                        <div className="form-grid">
                          <label className="field">
                            Cadência
                            <input
                              maxLength={30}
                              value={set.cadence}
                              onChange={(e) =>
                                edit((n) => {
                                  n.days[activeDay].exercises[i].sets[
                                    si
                                  ].cadence = e.target.value;
                                })
                              }
                            />
                          </label>
                          <label className="field">
                            Nota da série
                            <textarea
                              value={set.note}
                              onChange={(e) =>
                                edit((n) => {
                                  n.days[activeDay].exercises[i].sets[si].note =
                                    e.target.value;
                                })
                              }
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          className="button button-quiet"
                          disabled={item.sets.length <= 1}
                          onClick={() =>
                            edit((n) => {
                              const sets = n.days[activeDay].exercises[i].sets;
                              sets.splice(si, 1);
                              sets.forEach((s, index) => {
                                s.order = index + 1;
                              });
                            })
                          }
                        >
                          Remover série {si + 1}
                        </button>
                      </fieldset>
                    ))}
                    <button
                      type="button"
                      className="button"
                      onClick={() =>
                        edit((n) => {
                          n.days[activeDay].exercises[i].sets.push(
                            newSet(item.sets.length + 1),
                          );
                        })
                      }
                    >
                      Adicionar série
                    </button>
                  </article>
                ))}
              </fieldset>
            </section>
          )}
        </div>
        <StudentPreview day={day} exercises={exercises} />
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {!readOnly && (
        <footer className="card review-card">
          <p className="muted">
            Rascunhos não ficam disponíveis ao aluno. A publicação preserva a
            versão; depois, atribua o treino.
          </p>
          <div className="form-actions">
            <button className="button" disabled={busy}>
              {busy ? "Aguarde…" : "Salvar rascunho"}
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={busy}
              onClick={(e) => {
                if (e.currentTarget.form?.reportValidity()) void save(true);
              }}
            >
              Publicar versão {initial?.version ?? 1}
            </button>
          </div>
        </footer>
      )}
    </form>
  );
}
