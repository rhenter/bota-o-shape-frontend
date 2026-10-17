"use client";
import Link from "next/link";
import { useState, useCallback } from "react";
import { useAdminData } from "../use-admin-data";
import { canPublishMealPlan } from "@/lib/permissions";
import { assertNutritionAuthorization } from "@/lib/nutrition-authorization";
import { FoodSearch } from "./food-search";
import { FoodEstimate } from "./food-catalog";
import { NutritionTotals } from "./nutrition-totals";
import { LoadingState, ErrorState } from "../states";
import type {
  ApiMealPlan,
  MealSlotInput,
  MealVersionInput,
  PlannedFoodInput,
  FoodSnapshot,
} from "@/lib/api-client";
export function MealPlanEditor({ planId }: { planId?: string }) {
  const app = useAdminData(true);
  const scope = `${app.context.tenantId}:${app.user.id}`;
  return <Editor key={scope} app={app} planId={planId} />;
}
function Editor({
  app,
  planId,
}: {
  app: ReturnType<typeof useAdminData>;
  planId?: string;
}) {
  const { user, membership, students, mode, api, context, data } = app;
  const existing = data.plans.find((p) => p.id === planId);
  const [studentId, setStudent] = useState(""),
    [objective, setObjective] = useState(""),
    [starts, setStarts] = useState(""),
    [ends, setEnds] = useState(""),
    [review, setReview] = useState("");
  const [reason, setReason] = useState(""),
    [hydration, setHydration] = useState(""),
    [guidance, setGuidance] = useState("");
  const [meals, setMeals] = useState<MealSlotInput[]>([]),
    [selectedMeal, setSelectedMeal] = useState(0),
    [preview, setPreview] = useState(false),
    [checked, setChecked] = useState(false);
  const [revising, setRevising] = useState(false);
  const [freeDescription, setFreeDescription] = useState("");
  const [summaryDay, setSummaryDay] = useState(1);
  const [calculations, setCalculations] = useState<
    Record<string, FoodSnapshot>
  >({});
  const rememberCalculation = useCallback(
    (snapshot: FoodSnapshot) =>
      setCalculations((items) => ({
        ...items,
        [`${snapshot.food_id}:${Number(snapshot.grams)}`]: snapshot,
      })),
    [],
  );
  const dayFoods = meals
    .filter((meal) => meal.day === summaryDay)
    .flatMap((meal) => meal.foods);
  function moveMeal(index: number, delta: number) {
    setMeals((items) => {
      const next = [...items];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next.map((meal, order) => ({ ...meal, order: order + 1 }));
    });
    setSelectedMeal(0);
  }

  const [saved, setSaved] = useState<ApiMealPlan>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const plan = saved ?? existing;
  const student = students.find((s) => s.id === (plan?.student ?? studentId));
  const latest = plan?.versions.toSorted((a, b) => b.version - a.version)[0];
  const canAuthor = Boolean(
    membership?.roles.includes("nutritionist") &&
    user.nutritionRegistration?.status === "verified",
  );
  const allowed = Boolean(
    student && canPublishMealPlan(user, membership, student),
  );
  const locked = !!plan && !revising;
  const version: MealVersionInput = {
    change_reason: reason,
    hydration_guidance: hydration,
    complementary_guidance: guidance,
    meal_slots: meals,
  };
  const hasMeals =
    meals.length > 0 &&
    meals.every(
      (m) =>
        m.foods.length > 0 &&
        m.name.trim() &&
        m.foods.every(
          (f) => f.description.trim() && (!f.food || Number(f.grams) > 0),
        ),
    );
  const publishableVersion = Boolean(
    latest?.meal_slots.length &&
    latest.meal_slots.every(
      (meal) =>
        meal.name.trim() &&
        meal.foods.length &&
        meal.foods.every(
          (food) =>
            food.description.trim() && (!food.food || Number(food.grams) > 0),
        ),
    ),
  );
  async function save() {
    if (
      !allowed ||
      !student ||
      !starts ||
      !objective.trim() ||
      !reason.trim() ||
      !hasMeals
    )
      return;
    setBusy(true);
    setError("");
    try {
      if (mode === "api")
        await assertNutritionAuthorization(
          api,
          context.tenantId,
          user.id,
          student.id,
        );
      const input = {
        student: student.id,
        objective,
        starts_on: starts,
        ends_on: ends || null,
        review_on: review || null,
        draft: version,
      };
      const demoVersion = {
        ...version,
        id: crypto.randomUUID(),
        version: (latest?.version ?? 0) + 1,
        crn: user.nutritionRegistration!.crn,
        crn_state: user.nutritionRegistration!.uf,
        published_at: null,
      };
      const next =
        revising && plan
          ? {
              ...plan,
              versions: [
                ...plan.versions,
                mode === "api"
                  ? await api.reviseMealPlan(context.tenantId, plan.id, version)
                  : demoVersion,
              ],
            }
          : mode === "api"
            ? await api.createMealPlan(context.tenantId, input)
            : {
                ...input,
                id: crypto.randomUUID(),
                status: "draft" as const,
                versions: [demoVersion],
              };
      if (mode === "demo")
        app.setDemoNutrition((items) => ({
          ...items,
          [context.tenantId]: [
            ...(items[context.tenantId] ?? []).filter((p) => p.id !== next.id),
            next,
          ],
        }));
      setSaved(next);
      setRevising(false);
      setPreview(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (
      !allowed ||
      !plan ||
      !checked ||
      !latest ||
      !publishableVersion ||
      latest.published_at
    )
      return;
    setBusy(true);
    setError("");
    try {
      if (mode === "api")
        await assertNutritionAuthorization(
          api,
          context.tenantId,
          user.id,
          plan.student,
        );
      const next =
        mode === "api"
          ? await api.publishMealPlan(context.tenantId, plan.id)
          : {
              ...plan,
              status: "published" as const,
              versions: plan.versions.map((v) =>
                v.id === latest.id
                  ? { ...v, published_at: new Date().toISOString() }
                  : v,
              ),
            };
      setSaved(next);
      if (mode === "demo")
        app.setDemoNutrition((items) => ({
          ...items,
          [context.tenantId]: [
            ...(items[context.tenantId] ?? []).filter((p) => p.id !== next.id),
            next,
          ],
        }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publicação não concluída.");
    } finally {
      setBusy(false);
    }
  }
  function updateMeal(index: number, patch: Partial<MealSlotInput>) {
    setMeals((ms) => ms.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }
  function updateFood(
    mi: number,
    fi: number,
    patch: Partial<PlannedFoodInput>,
  ) {
    updateMeal(mi, {
      foods: meals[mi].foods.map((f, i) => (i === fi ? { ...f, ...patch } : f)),
    });
  }
  if (app.loading) return <LoadingState />;
  if (app.error)
    return <ErrorState description={app.error} onRetry={app.refresh} />;
  if (!canAuthor)
    return (
      <p className="notice">
        Elaboração e publicação exigem papel de nutricionista e CRN/UF
        verificado pelo servidor. Administrador sozinho não pode publicar.
      </p>
    );
  if (app.scopeError) return <p className="notice">{app.scopeError}</p>;
  if (planId && !plan)
    return (
      <ErrorState description="Plano não disponível nesta academia e neste escopo." />
    );
  return (
    <>
      <p className="notice">
        Responsável: {user.name} · CRN {user.nutritionRegistration?.crn}/
        {user.nutritionRegistration?.uf}. A API revalida a autorização em cada
        ação.
      </p>
      {error && <ErrorState description={error} />}
      <div className="editor-grid">
        <section className="card">
          <h2>{locked ? "Revisar plano alimentar" : "Informações do plano"}</h2>
          {locked && plan ? (
            <>
              <p>
                {plan.objective} ·{" "}
                {plan.status === "published" ? "Publicado" : "Rascunho"} ·
                Versão {latest?.version}
              </p>
              <p>
                Vigência: {plan.starts_on} até {plan.ends_on || "Não definida"}{" "}
                · Revisão: {plan.review_on || "Não definida"}
              </p>
              <p className="notice">
                Rascunho salvo. A API não oferece edição das refeições já
                salvas; para ajustes, publique e crie uma nova versão. Versões
                publicadas são preservadas.
              </p>
            </>
          ) : (
            <>
              <label className="field">
                Aluno *
                <select
                  disabled={revising}
                  value={studentId}
                  onChange={(e) => setStudent(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Objetivo *
                <input
                  disabled={revising}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </label>
              <div className="form-grid">
                <label className="field">
                  Início *
                  <input
                    disabled={revising}
                    type="date"
                    value={starts}
                    onChange={(e) => setStarts(e.target.value)}
                  />
                </label>
                <label className="field">
                  Término
                  <input
                    disabled={revising}
                    type="date"
                    value={ends}
                    min={starts}
                    onChange={(e) => setEnds(e.target.value)}
                  />
                </label>
                <label className="field">
                  Revisão
                  <input
                    disabled={revising}
                    type="date"
                    value={review}
                    min={starts}
                    onChange={(e) => setReview(e.target.value)}
                  />
                </label>
              </div>
              <label className="field">
                Resumo da alteração *
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            </>
          )}
          {student && (
            <p className="notice">
              {student.name} ·{" "}
              {student.nutritionConsent
                ? "Consentimento ativo"
                : "Consentimento ausente"}{" "}
              ·{" "}
              {student.dietitianIds.includes(user.id)
                ? "Vínculo ativo"
                : "Sem atribuição ativa"}
              <br />
              {student.restrictions ||
                "Anamnese e restrições não disponibilizadas ao profissional pela API. Confirme com o aluno antes de publicar."}
            </p>
          )}
          {!allowed && (
            <p className="notice">
              Selecione aluno ativo com atribuição e consentimento nutricional
              válidos para continuar.
            </p>
          )}
          <h2>Refeições da semana</h2>
          {(locked ? (latest?.meal_slots ?? []) : meals).map((meal, mi) => (
            <article className="meal-card" key={mi}>
              <div className="section-header">
                <h3>
                  Dia {meal.day} · {meal.name} {meal.scheduled_time}
                </h3>
                {!locked && (
                  <div className="row-actions">
                    <button
                      className="button"
                      aria-label={`Mover ${meal.name} para cima`}
                      disabled={mi === 0}
                      onClick={() => moveMeal(mi, -1)}
                    >
                      ↑
                    </button>
                    <button
                      className="button"
                      aria-label={`Mover ${meal.name} para baixo`}
                      disabled={mi === meals.length - 1}
                      onClick={() => moveMeal(mi, 1)}
                    >
                      ↓
                    </button>
                  </div>
                )}
                {!locked && (
                  <button
                    className="button"
                    onClick={() => {
                      setMeals((ms) => ms.filter((_, i) => i !== mi));
                      setSelectedMeal(0);
                    }}
                  >
                    Remover refeição
                  </button>
                )}
              </div>
              {!locked && (
                <div className="form-grid">
                  <label className="field">
                    Dia
                    <select
                      value={meal.day}
                      onChange={(e) =>
                        updateMeal(mi, { day: Number(e.target.value) })
                      }
                    >
                      {[
                        "Segunda",
                        "Terça",
                        "Quarta",
                        "Quinta",
                        "Sexta",
                        "Sábado",
                        "Domingo",
                      ].map((d, i) => (
                        <option key={d} value={i + 1}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Nome da refeição
                    <input
                      value={meal.name}
                      onChange={(e) => updateMeal(mi, { name: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Horário
                    <input
                      type="time"
                      value={meal.scheduled_time ?? ""}
                      onChange={(e) =>
                        updateMeal(mi, {
                          scheduled_time: e.target.value || null,
                        })
                      }
                    />
                  </label>
                </div>
              )}
              {!locked && (
                <label className="field">
                  Instruções da refeição
                  <textarea
                    value={meal.instructions}
                    onChange={(e) =>
                      updateMeal(mi, { instructions: e.target.value })
                    }
                  />
                </label>
              )}
              {(locked || preview) && meal.instructions && (
                <p>{meal.instructions}</p>
              )}
              {meal.foods.map((food, fi) => (
                <div className="planned-food" key={fi}>
                  <strong>{food.description}</strong>
                  {locked || preview ? (
                    <p>
                      {food.grams
                        ? `${food.grams} g`
                        : `${food.quantity ?? ""} ${food.unit}`}{" "}
                      · {food.preparation} · {food.observation}
                      <br />
                      Substituições:{" "}
                      {food.substitutions
                        .map((s) => s.description)
                        .join(", ") || "Não informadas"}
                    </p>
                  ) : (
                    <>
                      {(() => {
                        const catalog = data.foods.find(
                          (item) => item.id === food.food,
                        );
                        return catalog?.household_measures.length ? (
                          <label className="field">
                            Medida caseira documentada
                            <select
                              value={
                                catalog.household_measures.find(
                                  (m) => m.grams === food.grams,
                                )?.id ?? ""
                              }
                              onChange={(e) => {
                                const measure = catalog.household_measures.find(
                                  (m) => m.id === e.target.value,
                                );
                                if (!measure) return;
                                updateFood(mi, fi, {
                                  grams: measure.grams,
                                  quantity: measure.grams,
                                  unit: "g",
                                });
                              }}
                            >
                              <option value="">Informar gramas</option>
                              {catalog.household_measures.map((measure) => (
                                <option key={measure.id} value={measure.id}>
                                  {measure.name} · {measure.grams} g
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null;
                      })()}
                      <label className="field">
                        Quantidade em gramas
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={food.grams ?? ""}
                          onChange={(e) =>
                            updateFood(mi, fi, {
                              grams: e.target.value,
                              quantity: e.target.value,
                              unit: "g",
                            })
                          }
                        />
                      </label>
                      <label className="field">
                        Preparo / instruções
                        <textarea
                          value={food.preparation}
                          onChange={(e) =>
                            updateFood(mi, fi, { preparation: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Observações
                        <textarea
                          value={food.observation}
                          onChange={(e) =>
                            updateFood(mi, fi, { observation: e.target.value })
                          }
                        />
                      </label>
                      <label className="field">
                        Substituições (uma por linha)
                        <textarea
                          value={food.substitutions
                            .map((s) => s.description)
                            .join("\n")}
                          onChange={(e) =>
                            updateFood(mi, fi, {
                              substitutions: e.target.value
                                .split("\n")
                                .filter(Boolean)
                                .map((description) => ({
                                  description,
                                  unit: "",
                                })),
                            })
                          }
                        />
                      </label>
                      <button
                        className="button"
                        onClick={() =>
                          updateMeal(mi, {
                            foods: meal.foods.filter((_, i) => i !== fi),
                          })
                        }
                      >
                        Remover alimento
                      </button>
                    </>
                  )}
                  {locked ? (
                    <small>
                      Snapshot nutricional preservado no servidor. A composição
                      histórica não é exposta nesta API.
                    </small>
                  ) : food.food && food.grams ? (
                    <FoodEstimate
                      foodId={food.food}
                      grams={food.grams}
                      onCalculated={rememberCalculation}
                    />
                  ) : (
                    <small>Composição: não calculado.</small>
                  )}
                </div>
              ))}
              {!locked && (
                <section>
                  <h4>Resumo da refeição</h4>
                  <NutritionTotals
                    snapshots={meal.foods.map((food) =>
                      food.food && food.grams
                        ? calculations[`${food.food}:${Number(food.grams)}`]
                        : undefined,
                    )}
                  />
                </section>
              )}
            </article>
          ))}
          {!locked && (
            <>
              <button
                className="button"
                disabled={!allowed}
                onClick={() => {
                  setMeals((ms) => [
                    ...ms,
                    {
                      day: 1,
                      name: "Nova refeição",
                      scheduled_time: null,
                      order: ms.length + 1,
                      instructions: "",
                      foods: [],
                    },
                  ]);
                  setSelectedMeal(meals.length);
                }}
              >
                Adicionar refeição
              </button>
              <label className="field">
                Hidratação (opcional)
                <textarea
                  value={hydration}
                  onChange={(e) => setHydration(e.target.value)}
                />
              </label>
              <label className="field">
                Orientações complementares
                <textarea
                  value={guidance}
                  onChange={(e) => setGuidance(e.target.value)}
                />
              </label>
            </>
          )}
        </section>
        <aside className="card">
          <h2>{locked ? "Checklist e versões" : "Adicionar alimento"}</h2>
          {!locked ? (
            <>
              <label className="field">
                Refeição de destino
                <select
                  value={selectedMeal}
                  onChange={(e) => setSelectedMeal(Number(e.target.value))}
                >
                  {meals.map((m, i) => (
                    <option key={i} value={i}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              {meals.length > 0 && allowed && (
                <FoodSearch
                  foods={data.foods}
                  onSelect={(f) =>
                    updateMeal(selectedMeal, {
                      foods: [
                        ...meals[selectedMeal].foods,
                        {
                          food: f.id,
                          description: f.name,
                          quantity: "100",
                          grams: "100",
                          unit: "g",
                          preparation: f.preparation_state,
                          observation: "",
                          substitutions: [],
                        },
                      ],
                    })
                  }
                />
              )}
              <p className="muted">
                Sem alimento catalogado? Registre uma descrição; valores
                nutricionais permanecem não calculados.
              </p>
              <label className="field">
                Descrição livre
                <input
                  value={freeDescription}
                  onChange={(e) => setFreeDescription(e.target.value)}
                />
              </label>
              <button
                className="button"
                disabled={!allowed || !meals.length || !freeDescription.trim()}
                onClick={() => {
                  const description = freeDescription;
                  if (description.trim())
                    updateMeal(selectedMeal, {
                      foods: [
                        ...meals[selectedMeal].foods,
                        {
                          description: description.trim(),
                          unit: "",
                          preparation: "",
                          observation: "",
                          substitutions: [],
                        },
                      ],
                    });
                  setFreeDescription("");
                }}
              >
                Adicionar descrição livre
              </button>
            </>
          ) : (
            <>
              <ul className="record-list">
                {plan.versions.map((v) => (
                  <li key={v.id}>
                    Versão {v.version} · CRN {v.crn}/{v.crn_state} ·{" "}
                    {v.published_at ?? "Rascunho"}
                    <p>{v.change_reason}</p>
                  </li>
                ))}
              </ul>
              <p>{latest?.hydration_guidance}</p>
              <p>{latest?.complementary_guidance}</p>
              {!publishableVersion && (
                <p className="notice">
                  O plano precisa conter refeições e alimentos com porções
                  válidas antes da publicação.
                </p>
              )}
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                Conferi alergias, restrições, porções, preparo e substituições
                com o aluno.
              </label>
            </>
          )}
          {!locked && (
            <section className="section-space">
              <h3>Resumo nutricional do dia</h3>
              <label className="field">
                Dia do resumo
                <select
                  value={summaryDay}
                  onChange={(e) => setSummaryDay(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <option key={day} value={day}>
                      Dia {day}
                    </option>
                  ))}
                </select>
              </label>
              <NutritionTotals
                snapshots={dayFoods.map((food) =>
                  food.food && food.grams
                    ? calculations[`${food.food}:${Number(food.grams)}`]
                    : undefined,
                )}
              />
            </section>
          )}
          <div className="form-actions">
            {!locked ? (
              <>
                <button className="button" onClick={() => setPreview(!preview)}>
                  {preview ? "Voltar ao editor" : "Visualizar como aluno"}
                </button>
                <button
                  className="button button-primary"
                  disabled={
                    busy ||
                    !allowed ||
                    !hasMeals ||
                    !starts ||
                    !objective.trim() ||
                    !reason.trim() ||
                    (!!ends && ends < starts) ||
                    (!!review && review < starts)
                  }
                  onClick={() => void save()}
                >
                  Salvar rascunho
                </button>
              </>
            ) : latest && !latest.published_at ? (
              <button
                className="button button-primary"
                disabled={busy || !allowed || !checked || !publishableVersion}
                onClick={() => void publish()}
              >
                Publicar e atribuir ao aluno
              </button>
            ) : (
              <div>
                <p role="status">
                  Versão publicada. O histórico permanece preservado.
                </p>
                <button
                  className="button button-primary"
                  disabled={!allowed || busy}
                  onClick={() => {
                    if (!plan || !latest) return;
                    setStudent(plan.student);
                    setObjective(plan.objective);
                    setStarts(plan.starts_on);
                    setEnds(plan.ends_on ?? "");
                    setReview(plan.review_on ?? "");
                    setReason("");
                    setHydration(latest.hydration_guidance);
                    setGuidance(latest.complementary_guidance);
                    setMeals(structuredClone(latest.meal_slots));
                    setPreview(false);
                    setChecked(false);
                    setRevising(true);
                  }}
                >
                  Criar nova versão
                </button>
              </div>
            )}
          </div>
          <Link href="/nutricao" className="button">
            Voltar à carteira
          </Link>
        </aside>
      </div>
    </>
  );
}
