import type { FoodSnapshot } from "@/lib/api-client";
export function NutritionTotals({
  snapshots,
}: {
  snapshots: (FoodSnapshot | undefined)[];
}) {
  const codes = [
    ...new Set(
      snapshots.flatMap((snapshot) => Object.keys(snapshot?.nutrients ?? {})),
    ),
  ];
  return (
    <>
      <dl className="detail-list">
        {codes.map((code) => {
          const nutrients = snapshots.map(
            (snapshot) => snapshot?.nutrients[code],
          );
          const first = nutrients.find((n) => n !== undefined)!;
          const complete = nutrients.every(
            (n) =>
              n &&
              n.unit === first.unit &&
              n.value.trim() !== "" &&
              Number.isFinite(Number(n.value)),
          );
          return (
            <div key={code}>
              <dt>{first.name}</dt>
              <dd>
                {complete
                  ? `${nutrients.reduce((sum, n) => sum + Number(n!.value), 0).toLocaleString("pt-BR")} ${first.unit}`
                  : "Não calculado — dados incompletos"}
              </dd>
            </div>
          );
        })}
      </dl>
      {!codes.length && <p>Não calculado — dados incompletos.</p>}
      <p className="muted">
        Estimativa descritiva dos itens. Nutrientes ausentes e preparações
        livres não viram zero. Nenhuma meta é sugerida.
      </p>
    </>
  );
}
