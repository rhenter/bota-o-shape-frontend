"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import {
  formatMinor,
  idempotencyKey,
  operationIsUncertain,
  type ProviderBalance,
  type ProviderConfiguration,
  type ProviderReceivablesPage,
} from "@/lib/billing";
import { PlatformApiError, platformApi } from "@/lib/platform-api";

import { useAuth } from "./auth-context";
import { hasCapability } from "./capability-guard";

export function ProviderFinancePanel() {
  const { membership } = useAuth();
  const canRead = Boolean(membership && hasCapability(membership, "finance.read"));
  const canListProviders = Boolean(membership && hasCapability(membership, "integrations.manage"));
  const [providers, setProviders] = useState<ProviderConfiguration[]>([]);
  const [providerId, setProviderId] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<ProviderReceivablesPage | null>(null);
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const keys = useRef(new Map<string, string>());

  useEffect(() => {
    if (!canListProviders) return;
    let active = true;
    platformApi
      .providerConfigurations()
      .then((list) => {
        if (!active) return;
        setProviders(list);
        setProviderId((current) => current || list[0]?.id || "");
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível listar provedores.");
      });
    return () => {
      active = false;
    };
  }, [canListProviders]);

  useEffect(() => {
    if (!canRead || !providerId) return;
    let active = true;
    platformApi
      .providerReceivables(providerId, { offset, limit: 50, status })
      .then((result) => {
        if (active) setPage(result);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Não foi possível listar recebíveis.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canRead, providerId, offset, status]);

  if (!membership || !canRead) return null;
  if (!canListProviders) {
    return (
      <section className="page-card">
        <h2>Saldo do provedor</h2>
        <p>
          O resumo acima agrega faturas das academias. Consultar o saldo global Asaas exige a lista
          de configurações, disponível com integrations.manage.
        </p>
      </section>
    );
  }

  function apply(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setOffset(0);
    setStatus(statusDraft);
  }

  async function queryBalance() {
    if (!providerId || pending) return;
    if (reason.trim().length < 10) {
      setError("Informe uma justificativa com pelo menos 10 caracteres.");
      return;
    }
    if (!window.confirm("Consultar o saldo da conta do provedor?")) return;
    const operation = `balance:${providerId}:${reason.trim()}`;
    const key = idempotencyKey(keys.current, operation);
    setPending(true);
    setError("");
    setMessage("");
    try {
      const snapshot = await platformApi.queryProviderBalance(providerId, reason.trim(), key);
      setBalance(snapshot);
      if (operationIsUncertain(snapshot.status)) {
        setMessage("Saldo ainda incerto. A mesma consulta será repetida com a mesma chave.");
      } else {
        keys.current.delete(operation);
        setMessage("Saldo confirmado na conta do provedor. Ele não é a receita de uma academia.");
      }
    } catch (caught) {
      if (caught instanceof PlatformApiError && caught.uncertain) setMessage(caught.message);
      else setError(caught instanceof Error ? caught.message : "A consulta de saldo não concluiu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="page-card">
      <h2>Conta do provedor</h2>
      <p>Saldo e recebíveis abaixo pertencem à conta Asaas configurada, não a uma academia.</p>
      <label>
        Configuração
        <select
          aria-label="Configuração do provedor"
          value={providerId}
          onChange={(event) => {
            setLoading(true);
            setProviderId(event.target.value);
            setOffset(0);
            setBalance(null);
          }}
        >
          {providers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.provider_code} · {item.environment}
            </option>
          ))}
        </select>
      </label>
      <label>
        Justificativa da consulta de saldo
        <textarea aria-label="Justificativa da consulta de saldo" value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      <button className="button" type="button" disabled={pending || !providerId} onClick={() => void queryBalance()}>
        Consultar saldo do provedor
      </button>
      {balance ? (
        <dl className="definition-list">
          <div><dt>Disponível</dt><dd>{formatMinor(balance.available_minor, balance.currency)}</dd></div>
          <div><dt>Pendente</dt><dd>{formatMinor(balance.pending_minor, balance.currency)}</dd></div>
          <div><dt>Última sincronização</dt><dd>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(balance.checked_at))}</dd></div>
          <div><dt>Situação</dt><dd>{balance.status}</dd></div>
        </dl>
      ) : null}
      <form className="filters" onSubmit={apply}>
        <label>
          Status no provedor
          <input aria-label="Status no provedor" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)} />
        </label>
        <button className="button">Filtrar recebíveis</button>
      </form>
      {loading ? <p role="status">Carregando recebíveis…</p> : null}
      {page && !page.items.length ? <p>Nenhum recebível nesta página.</p> : null}
      {page?.items.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Método</th>
                <th>Bruto</th>
                <th>Taxa</th>
                <th>Líquido</th>
                <th>Estornado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((item) => (
                <tr key={item.external_id}>
                  <td>{item.payment_method || "Não informado"}</td>
                  <td>{formatMinor(item.amount_minor, item.currency)}</td>
                  <td>{formatMinor(item.fee_minor, item.currency)}</td>
                  <td>{formatMinor(item.net_minor, item.currency)}</td>
                  <td>{formatMinor(item.amount_refunded_minor, item.currency)}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="command-grid">
        <button className="button" type="button" disabled={offset === 0} onClick={() => { setLoading(true); setOffset(Math.max(0, offset - 50)); }}>
          Página anterior
        </button>
        <button
          className="button"
          type="button"
          disabled={!page?.has_more || page.next_offset == null}
          onClick={() => {
            if (page?.next_offset == null) return;
            setLoading(true);
            setOffset(page.next_offset);
          }}
        >
          Próxima página
        </button>
      </div>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert" className="form-error">{error}</p> : null}
    </section>
  );
}
