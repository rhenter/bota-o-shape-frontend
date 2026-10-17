"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog } from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/states";
import type { Exercise } from "@/lib/domain";

export default function ExercisesPage() {
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <ExerciseLibrary key={tenant.id} />
    </AppShell>
  );
}
function ExerciseLibrary() {
  const { context, repository, membership } = useAppContext();
  const exercises = repository.getExercises(context);
  const equipment = repository.getEquipment(context);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("all");
  const [equipmentId, setEquipmentId] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [layout, setLayout] = useState("grid");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const canWrite = membership?.roles.some(
    (role) => role === "admin" || role === "professor",
  );
  const visible = exercises.filter(
    (exercise) =>
      exercise.name
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")) &&
      (muscle === "all" || exercise.primaryMuscle === muscle) &&
      (equipmentId === "all" || exercise.equipmentIds.includes(equipmentId)) &&
      (type === "all" || exercise.recordType === type) &&
      (status === "all" || exercise.status === status),
  );
  function clear() {
    setQuery("");
    setMuscle("all");
    setEquipmentId("all");
    setType("all");
    setStatus("all");
  }
  return (
    <>
      <PageHeader
        title="Biblioteca de exercícios"
        description="Movimentos, instruções e variações para construir cada treino."
        actions={
          canWrite && (
            <Link className="button button-primary" href="/exercicios/novo">
              + Novo exercício
            </Link>
          )
        }
      />
      <section className="card">
        <div className="filters">
          <label className="field search-field">
            <span className="sr-only">Buscar exercícios</span>
            <input
              type="search"
              placeholder="Buscar exercício…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field">
            Grupo muscular
            <select
              value={muscle}
              onChange={(event) => setMuscle(event.target.value)}
            >
              <option value="all">Todos</option>
              {[
                ...new Set(
                  exercises.map((item) => item.primaryMuscle).filter(Boolean),
                ),
              ].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Equipamento
            <select
              value={equipmentId}
              onChange={(event) => setEquipmentId(event.target.value)}
            >
              <option value="all">Todos</option>
              {equipment.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Tipo de registro
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="load_reps">Carga + repetições</option>
              <option value="bodyweight_reps">Peso corporal</option>
              <option value="duration">Duração</option>
              <option value="distance">Distância</option>
              <option value="activity">Atividade</option>
            </select>
          </label>
          <label className="field">
            Status do exercício
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Todos</option>
              {[...new Set(exercises.map((item) => item.status))].map(
                (value) => (
                  <option key={value} value={value}>
                    {value === "draft"
                      ? "Rascunho"
                      : value === "archived"
                        ? "Arquivado"
                        : value === "in_review"
                          ? "Em revisão"
                          : "Revisado"}
                  </option>
                ),
              )}
            </select>
          </label>
          <button className="button button-quiet" onClick={clear}>
            Limpar filtros
          </button>
        </div>
        <div className="section-header">
          <p className="results-count" role="status">
            {visible.length}{" "}
            {visible.length === 1
              ? "exercício encontrado"
              : "exercícios encontrados"}
          </p>
          <div
            className="segmented-control"
            role="group"
            aria-label="Visualização da biblioteca"
          >
            <button
              aria-pressed={layout === "grid"}
              onClick={() => setLayout("grid")}
            >
              ▦ Grade
            </button>
            <button
              aria-pressed={layout === "list"}
              onClick={() => setLayout("list")}
            >
              ☷ Lista
            </button>
          </div>
        </div>
        {!visible.length ? (
          <EmptyState
            title="Nenhum exercício encontrado"
            description="Ajuste os filtros ou cadastre o primeiro movimento desta academia."
            action={
              <button className="button" onClick={clear}>
                Limpar filtros
              </button>
            }
          />
        ) : layout === "grid" ? (
          <div className="exercise-grid">
            {visible.map((exercise) => (
              <button
                key={exercise.id}
                className="exercise-card"
                onClick={() => setSelected(exercise)}
              >
                <div className="exercise-illustration" aria-hidden="true">
                  <svg viewBox="0 0 120 64" fill="none">
                    <path
                      d="M21 23v18m8-24v30m62-24v18m-8-24v30M29 32h54"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>CATÁLOGO LOCAL</span>
                </div>
                <div className="exercise-card-content">
                  <StatusBadge status={exercise.status} />
                  <h2>{exercise.name}</h2>
                  <p>{exercise.primaryMuscle || "Grupo não informado"}</p>
                  <small>
                    {exercise.equipmentIds
                      .map(
                        (id) => equipment.find((item) => item.id === id)?.name,
                      )
                      .filter(Boolean)
                      .join(", ") || "Sem equipamento"}
                  </small>
                  <span className="exercise-detail-link">Ver instruções →</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <DataTable
            caption="Biblioteca de exercícios"
            rows={visible}
            columns={[
              {
                key: "name",
                title: "Exercício",
                render: (item) => (
                  <button
                    className="text-button"
                    onClick={() => setSelected(item)}
                  >
                    {item.name}
                  </button>
                ),
              },
              {
                key: "muscle",
                title: "Grupo muscular",
                render: (item) => item.primaryMuscle || "Não informado",
              },
              {
                key: "equipment",
                title: "Equipamento",
                render: (item) =>
                  item.equipmentIds
                    .map((id) => equipment.find((part) => part.id === id)?.name)
                    .filter(Boolean)
                    .join(", ") || "Sem equipamento",
              },
              {
                key: "status",
                title: "Status",
                render: (item) => <StatusBadge status={item.status} />,
              },
            ]}
          />
        )}
      </section>
      {selected && (
        <Dialog title={selected.name} onClose={() => setSelected(null)}>
          <StatusBadge status={selected.status} />
          <dl className="details-list">
            <div>
              <dt>Músculo principal</dt>
              <dd>{selected.primaryMuscle || "Não informado"}</dd>
            </div>
            <div>
              <dt>Músculos secundários</dt>
              <dd>{selected.secondaryMuscles.join(", ") || "Não informado"}</dd>
            </div>
            <div>
              <dt>Preparação</dt>
              <dd>{selected.preparation || "Não informado"}</dd>
            </div>
          </dl>
          <h3>Execução</h3>
          {selected.instructions.length ? (
            <ol>
              {selected.instructions.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          ) : (
            <p>Instruções não informadas.</p>
          )}
          <h3>Respiração</h3>
          <p>{selected.breathing || "Não informado"}</p>
          <h3>Erros comuns</h3>
          <p>{selected.commonMistakes.join(" · ") || "Não informado"}</p>
          <p className="notice">
            {selected.status === "draft"
              ? "Rascunho: conteúdo aguardando revisão profissional."
              : "Confira a adequação das instruções com o profissional responsável."}
          </p>
          <p className="help-text">
            Mídia não disponível. As instruções textuais permanecem acessíveis.
          </p>
          <button
            className="button full-width"
            onClick={() => setSelected(null)}
          >
            Fechar detalhes
          </button>
        </Dialog>
      )}
    </>
  );
}
