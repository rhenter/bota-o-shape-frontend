"use client";
import Link from "next/link";
import { useState } from "react";
import type { ApiFood, FoodSnapshot } from "@/lib/api-client";
export function FoodSearch({
  foods,
  onSelect,
}: {
  foods: ApiFood[];
  onSelect?: (food: ApiFood) => void;
}) {
  const [query, setQuery] = useState(""),
    [source, setSource] = useState(""),
    [preparation, setPreparation] = useState("");
  const filtered = foods
    .filter(
      (f) =>
        f.name
          .toLocaleLowerCase("pt-BR")
          .includes(query.toLocaleLowerCase("pt-BR")) &&
        (!source || f.source.kind === source) &&
        (!preparation || f.preparation_state === preparation),
    )
    .toSorted((a, b) => {
      if (a.source.kind === b.source.kind) return 0;
      if (a.source.kind === "tbca") return -1;
      if (b.source.kind === "tbca") return 1;
      return 0;
    });
  return (
    <>
      <div className="filters">
        <label className="field search-field">
          Buscar alimento
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="field">
          Fonte
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Todas</option>
            <option value="tbca">TBCA</option>
            <option value="usda">USDA</option>
            <option value="internal">Interna</option>
          </select>
        </label>
        <label className="field">
          Estado / preparo
          <select
            value={preparation}
            onChange={(e) => setPreparation(e.target.value)}
          >
            <option value="">Todos</option>
            {[...new Set(foods.map((f) => f.preparation_state))].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>
      <ul className="record-list">
        {filtered.map((food) => (
          <li key={food.id}>
            <div>
              <strong>{food.name}</strong>
              <p className="muted">
                {food.source.name} · {food.source.version} ·{" "}
                {food.preparation_state || "Preparo não informado"}
              </p>
              <small>
                {food.branded
                  ? "Produto de marca / rotulagem"
                  : "Alimento genérico"}{" "}
                · {food.reviewed ? "Revisado" : "Revisão pendente"}
              </small>
            </div>
            {onSelect ? (
              <button className="button" onClick={() => onSelect(food)}>
                Adicionar {food.name}
              </button>
            ) : (
              <Link className="button" href={`/nutricao/catalogo/${food.id}`}>
                Revisar item
              </Link>
            )}
          </li>
        ))}
      </ul>
      {!filtered.length && (
        <p className="muted">
          Nenhum alimento encontrado no catálogo disponível.
        </p>
      )}
    </>
  );
}
export function FoodComposition({ snapshot }: { snapshot?: FoodSnapshot }) {
  const nutrients = Object.values(snapshot?.nutrients ?? {});
  return (
    <>
      <p className="muted">
        Composição estimada · {snapshot?.grams ?? "100"} g ·{" "}
        {snapshot?.source?.toUpperCase() ?? "Fonte não disponível"}{" "}
        {snapshot?.source_version}
      </p>
      <dl className="detail-list">
        {nutrients.map((n, i) => (
          <div key={i}>
            <dt>{n.name}</dt>
            <dd>
              {Number.isFinite(Number(n.value))
                ? `${Number(n.value).toLocaleString("pt-BR")} ${n.unit}`
                : "Não informado"}
            </dd>
          </div>
        ))}
        {[
          "Energia",
          "Proteínas",
          "Carboidratos disponíveis",
          "Carboidratos totais",
          "Gorduras",
          "Fibras",
        ]
          .filter(
            (name) =>
              !nutrients.some(
                (n) =>
                  n.name.toLocaleLowerCase("pt-BR") ===
                  name.toLocaleLowerCase("pt-BR"),
              ),
          )
          .map((name) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>Não informado</dd>
            </div>
          ))}
      </dl>
      <p className="muted">
        Nutrientes ausentes permanecem desconhecidos. Carboidratos disponíveis e
        totais não são intercambiáveis.
      </p>
    </>
  );
}
