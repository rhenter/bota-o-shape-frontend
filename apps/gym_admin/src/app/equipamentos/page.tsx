"use client";
import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/states";
import type { Equipment } from "@/lib/domain";

export default function EquipmentPage() {
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <EquipmentInventory key={tenant.id} />
    </AppShell>
  );
}
function EquipmentInventory() {
  const { context, repository, membership, mode, api, reload } =
    useAppContext();
  const [items, setItems] = useState(() => repository.getEquipment(context));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editor, setEditor] = useState<Equipment | "new" | null>(null);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const canWrite =
    membership?.status === "active" &&
    membership.roles.some((role) => role === "admin" || role === "professor");
  const exercises = repository.getExercises(context);
  const visible = items.filter(
    (item) =>
      `${item.name} ${item.location} ${item.description ?? ""}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")) &&
      (status === "all" || item.status === status),
  );
  const editing = editor && editor !== "new" ? editor : undefined;
  function openEditor(item: Equipment | "new") {
    setFormError("");
    setEditor(item);
  }
  return (
    <>
      <PageHeader
        title="Equipamentos"
        description="Organize os recursos disponíveis para os exercícios da sua academia."
        actions={
          canWrite && (
            <button
              className="button button-primary"
              onClick={() => openEditor("new")}
            >
              + Adicionar equipamento
            </button>
          )
        }
      />
      <section className="card table-card">
        <div className="filters">
          <label className="field search-field">
            <span className="sr-only">Buscar equipamentos</span>
            <input
              type="search"
              placeholder="Buscar equipamento…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field">
            Status do equipamento
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="available">
                {mode === "api" ? "Ativos" : "Disponíveis"}
              </option>
              {mode === "demo" && (
                <option value="maintenance">Em manutenção</option>
              )}
              <option value="inactive">Inativos</option>
            </select>
          </label>
          <button
            className="button button-quiet"
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
          >
            Limpar filtros
          </button>
        </div>
        <p className="results-count" role="status">
          {visible.length}{" "}
          {visible.length === 1
            ? "equipamento encontrado"
            : "equipamentos encontrados"}
        </p>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {visible.length ? (
          <DataTable
            caption="Inventário de equipamentos"
            rows={visible}
            columns={[
              {
                key: "name",
                title: "Equipamento",
                render: (item) => <strong>{item.name}</strong>,
              },
              {
                key: "location",
                title: mode === "demo" ? "Localização" : "Descrição",
                render: (item) =>
                  mode === "demo"
                    ? item.location
                    : item.description || "Não informado",
              },
              {
                key: "status",
                title: "Status",
                render: (item) => (
                  <StatusBadge
                    status={item.status}
                    label={
                      mode === "api" && item.status === "available"
                        ? "Ativo"
                        : undefined
                    }
                  />
                ),
              },
              {
                key: "exercises",
                title: "Exercícios relacionados",
                render: (item) => {
                  const related = exercises.filter((exercise) =>
                    exercise.equipmentIds.includes(item.id),
                  );
                  return related.length ? (
                    <details>
                      <summary>{related.length} exercício(s)</summary>
                      <ul>
                        {related.map((exercise) => (
                          <li key={exercise.id}>{exercise.name}</li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    "Nenhum exercício"
                  );
                },
              },
              {
                key: "actions",
                title: "Ações",
                render: (item) =>
                  canWrite ? (
                    <button
                      className="button button-small"
                      onClick={() => openEditor(item)}
                      aria-label={`Editar ${item.name}`}
                    >
                      Editar
                    </button>
                  ) : (
                    "Somente leitura"
                  ),
              },
            ]}
          />
        ) : (
          <EmptyState
            title="Nenhum equipamento encontrado"
            description="Ajuste a busca ou cadastre o primeiro equipamento desta academia."
          />
        )}
        <footer className="table-footer">
          Equipamento é um recurso: um mesmo aparelho pode apoiar vários
          movimentos.
        </footer>
      </section>
      {editor && canWrite && (
        <Dialog
          title={editing ? "Editar equipamento" : "Adicionar equipamento"}
          onClose={() => setEditor(null)}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canWrite) return;
              const form = new FormData(event.currentTarget);
              const name = String(form.get("name")).trim();
              if (!name) {
                setFormError("Informe o nome do equipamento.");
                return;
              }
              const newStatus = String(
                form.get("status"),
              ) as Equipment["status"];
              const description = String(form.get("description") ?? "");
              setBusy(true);
              setFormError("");
              try {
                if (mode === "api") {
                  await api.saveEquipment(
                    context.tenantId,
                    { name, description, is_active: newStatus === "available" },
                    editing?.id,
                  );
                  await reload();
                } else {
                  const item: Equipment = {
                    id: editing?.id ?? crypto.randomUUID(),
                    tenantId: context.tenantId,
                    name,
                    description,
                    location: String(form.get("location")),
                    status: newStatus,
                  };
                  setItems((current) =>
                    editing
                      ? current.map((record) =>
                          record.id === editing.id ? item : record,
                        )
                      : [...current, item],
                  );
                  setMessage(
                    `${name} ${editing ? "atualizado" : "adicionado"} somente nesta demonstração. As alterações não persistem ao sair da tela.`,
                  );
                }
                setEditor(null);
              } catch (failure) {
                setFormError(
                  failure instanceof Error
                    ? failure.message
                    : "Não foi possível salvar o equipamento.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              Nome do equipamento *
              <input
                name="name"
                required
                maxLength={150}
                defaultValue={editing?.name}
              />
            </label>
            {mode === "demo" && (
              <label className="field">
                Localização
                <input
                  name="location"
                  defaultValue={editing?.location}
                  placeholder="Ex.: Sala de musculação"
                />
              </label>
            )}
            <label className="field">
              Descrição
              <textarea
                name="description"
                rows={3}
                defaultValue={editing?.description}
              />
            </label>
            <label className="field">
              Status
              <select
                name="status"
                defaultValue={editing?.status ?? "available"}
              >
                <option value="available">
                  {mode === "api" ? "Ativo" : "Disponível"}
                </option>
                {mode === "demo" && (
                  <option value="maintenance">Em manutenção</option>
                )}
                <option value="inactive">Inativo</option>
              </select>
            </label>
            {formError && (
              <p className="notice" role="alert">
                {formError}
              </p>
            )}
            <p className="help-text">
              {mode === "demo"
                ? "Alterações locais e temporárias. Nenhum dado será enviado."
                : "A API possui status ativo/inativo. Localização, unidade e manutenção não fazem parte do contrato atual."}
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="button"
                onClick={() => setEditor(null)}
              >
                Cancelar
              </button>
              <button className="button button-primary" disabled={busy}>
                {busy ? "Salvando…" : "Salvar equipamento"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
