"use client";

import { FormEvent, useEffect, useState } from "react";

import { formatMinor, operationIsUncertain, type BillingOperation } from "@/lib/billing";
import { platformApi } from "@/lib/platform-api";

import { useAuth } from "./auth-context";
import { hasCapability } from "./capability-guard";

export function BillingOperationsPanel() {
  const { membership } = useAuth();
  const canRead = Boolean(membership && hasCapability(membership, "operations.read"));
  const canReconcile = Boolean(membership && hasCapability(membership, "billing.manage"));
  const [draft, setDraft] = useState({ status: "", operation_type: "", tenant_id: "", invoice_id: "", needs_reconciliation: false });
  const [filters, setFilters] = useState(draft);
  const [operations, setOperations] = useState<BillingOperation[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead) return;
    let active = true;
    platformApi
      .billingOperations(filters)
      .then((list) => {
        if (active) setOperations(list);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível listar operações.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canRead, filters]);

  if (!membership || !canRead) return null;

  function apply(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setFilters(draft);
  }

  async function reconcile(operation: BillingOperation) {
    if (pendingId) return;
    setPendingId(operation.id);
    setError("");
    setMessage("");
    try {
      const updated = await platformApi.reconcileOperation(operation.id);
      setOperations((current) => current?.map((item) => (item.id === updated.id ? updated : item)) ?? [updated]);
      setMessage(
        operationIsUncertain(updated.status)
          ? "A consulta ainda não confirmou o resultado. Nenhuma cobrança nova foi criada."
          : "Operação reconciliada com o estado atual do provedor.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A reconciliação não concluiu.");
    } finally {
      setPendingId("");
    }
  }

  return (
    <section className="page-card">
      <h2>Operações de cobrança</h2>
      <p>A lista usa os filtros do servidor e traz no máximo 200 registros. Resultado incerto pede reconciliação, não uma nova cobrança.</p>
      <form className="filters" onSubmit={apply}>
        <label>
          Tipo
          <input aria-label="Tipo da operação" value={draft.operation_type} onChange={(event) => setDraft({ ...draft, operation_type: event.target.value })} />
        </label>
        <label>
          Status
          <input aria-label="Status da operação" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} />
        </label>
        <label>
          Conta
          <input aria-label="Conta da operação" value={draft.tenant_id} onChange={(event) => setDraft({ ...draft, tenant_id: event.target.value })} />
        </label>
        <label>
          Fatura
          <input aria-label="Fatura da operação" value={draft.invoice_id} onChange={(event) => setDraft({ ...draft, invoice_id: event.target.value })} />
        </label>
        <label>
          <input
            type="checkbox"
            checked={draft.needs_reconciliation}
            onChange={(event) => setDraft({ ...draft, needs_reconciliation: event.target.checked })}
          />{" "}
          Só pendentes de reconciliação
        </label>
        <button className="button">Filtrar operações</button>
      </form>
      {loading && !operations ? <p role="status">Carregando operações…</p> : null}
      {operations && !operations.length ? <p>Nenhuma operação para este filtro.</p> : null}
      {operations?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Erro</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => (
                <tr key={operation.id}>
                  <td>{operation.operation_type}</td>
                  <td>{operation.status}</td>
                  <td>{formatMinor(operation.amount_minor, operation.currency)}</td>
                  <td>{operation.error_message || "—"}</td>
                  <td>
                    {canReconcile && operationIsUncertain(operation.status) ? (
                      <button className="button" disabled={Boolean(pendingId)} onClick={() => void reconcile(operation)}>
                        Reconciliar
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert" className="form-error">{error}</p> : null}
    </section>
  );
}
