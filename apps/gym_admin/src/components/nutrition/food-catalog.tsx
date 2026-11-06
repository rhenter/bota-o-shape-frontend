"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAppContext } from "../app-context";
import type { ApiFood, FoodSnapshot } from "@/lib/api-client";
import { demoFoodRecord, demoFoodSnapshot } from "@/lib/nutrition";
import { LoadingState, ErrorState } from "../states";
import { FoodComposition } from "./food-search";
export function FoodCatalog({
  children,
}: {
  children: (foods: ApiFood[]) => ReactNode;
}) {
  const { api, context, mode, authenticated, repository } = useAppContext();
  const [snapshot, setSnapshot] = useState<{
      scope: string;
      foods: ApiFood[];
    }>(),
    [failure, setFailure] = useState<{ scope: string; message: string }>();
  const [revision, setRevision] = useState(0);
  const scope = `${context.tenantId}:${context.userId}:${revision}`;
  useEffect(() => {
    if (mode !== "api" || !context.tenantId || !authenticated) return;
    let active = true;
    api
      .getFoods(context.tenantId)
      .then((foods) => {
        if (active) setSnapshot({ scope, foods });
      })
      .catch((e) => {
        if (active)
          setFailure({
            scope,
            message: e instanceof Error ? e.message : "Catálogo indisponível.",
          });
      });
    return () => {
      active = false;
    };
  }, [api, context.tenantId, authenticated, mode, scope]);
  if (mode === "demo")
    return (
      <>
        <p className="notice">
          Itens fictícios da demonstração. Não representam TBCA, USDA nem
          revisão clínica. A base oficial entra somente pela API.
        </p>
        {children(repository.getFoods(context).map(demoFoodRecord))}
      </>
    );
  if (failure?.scope === scope)
    return (
      <ErrorState
        description={failure.message}
        onRetry={() => setRevision((r) => r + 1)}
      />
    );
  if (snapshot?.scope !== scope) return <LoadingState />;
  return children(snapshot.foods);
}
export function FoodEstimate({
  foodId,
  grams,
  onCalculated,
}: {
  foodId: string;
  grams: string;
  onCalculated?: (snapshot: FoodSnapshot) => void;
}) {
  const { api, context, mode, repository } = useAppContext();
  const [snapshot, setSnapshot] = useState<{
      key: string;
      value: FoodSnapshot;
    }>(),
    [error, setError] = useState<{ key: string; message: string }>();
  const key = `${context.tenantId}:${context.userId}:${foodId}:${grams}`;
  const demoSnapshot = useMemo(() => {
    if (mode !== "demo" || !(Number(grams) > 0)) return undefined;
    const food = repository
      .getFoods({ tenantId: context.tenantId, userId: context.userId })
      .find((item) => item.id === foodId);
    return food ? demoFoodSnapshot(food, Number(grams)) : undefined;
  }, [mode, repository, context.tenantId, context.userId, foodId, grams]);
  useEffect(() => {
    if (!foodId || !(Number(grams) > 0)) return;
    let active = true;
    if (mode === "demo") {
      if (demoSnapshot) onCalculated?.(demoSnapshot);
      return;
    }
    if (!context.tenantId) return;
    const timer = setTimeout(() => {
      api
        .calculateFood(context.tenantId, foodId, grams)
        .then((value) => {
          if (active) {
            setSnapshot({ key, value });
            onCalculated?.(value);
          }
        })
        .catch((e) => {
          if (active)
            setError({
              key,
              message: e instanceof Error ? e.message : "Cálculo indisponível.",
            });
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    api,
    context.tenantId,
    context.userId,
    demoSnapshot,
    mode,
    foodId,
    grams,
    key,
    onCalculated,
  ]);
  if (mode === "demo")
    return demoSnapshot ? (
      <FoodComposition snapshot={demoSnapshot} />
    ) : (
      <p className="muted">Composição não calculada.</p>
    );
  if (error?.key === key) return <p role="alert">{error.message}</p>;
  if (!(Number(grams) > 0))
    return <p className="muted">Composição não calculada.</p>;
  if (snapshot?.key !== key)
    return <LoadingState label="Calculando composição…" />;
  return <FoodComposition snapshot={snapshot.value} />;
}
export function FoodDetail({ id }: { id: string }) {
  const [grams, setGrams] = useState("100");
  return (
    <FoodCatalog>
      {(foods) => {
        const food = foods.find((f) => f.id === id);
        return !food ? (
          <ErrorState description="Alimento não encontrado no catálogo disponível." />
        ) : (
          <div className="editor-grid">
            <section className="card">
              <h2>{food.name}</h2>
              <p>
                {food.source.name} · {food.source.version} ·{" "}
                {food.preparation_state || "Preparo não informado"}
              </p>
              <p>
                ID externo: {food.external_id} ·{" "}
                {food.branded
                  ? "Produto de marca / rotulagem"
                  : "Alimento genérico"}{" "}
                · {food.reviewed ? "Revisado" : "Revisão pendente"}
              </p>
              <p>Licença: {food.source.license_status}</p>
              <label className="field">
                Porção comestível em gramas
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                />
              </label>
              <FoodEstimate foodId={id} grams={grams} />
            </section>
            <aside className="card">
              <h2>Medidas caseiras documentadas</h2>
              {food.household_measures.map((m) => (
                <p key={m.id}>
                  {m.name} · {m.grams} g<br />
                  {m.evidence}
                </p>
              ))}
              {!food.household_measures.length && (
                <p>Sem conversão documentada. Informe gramas comestíveis.</p>
              )}
              <p className="notice">
                Valores oficiais somente leitura. A API não oferece criação de
                alimento interno nem revisão de fonte nesta versão.
              </p>
            </aside>
          </div>
        );
      }}
    </FoodCatalog>
  );
}
