"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  formatMinor,
  idempotencyKey,
  operationIsUncertain,
  refundableMinor,
  refundAmountError,
  safeHttps,
  type BillingOperation,
  type PlatformInvoiceDetail,
} from "@/lib/billing";
import { PlatformApiError, platformApi } from "@/lib/platform-api";

import { useAuth } from "./auth-context";
import { CapabilityGuard, hasCapability } from "./capability-guard";

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const { membership } = useAuth();
  const canCharge = Boolean(membership && hasCapability(membership, "charges.read"));
  const canBill = Boolean(membership && hasCapability(membership, "billing.manage"));
  const [invoice, setInvoice] = useState<PlatformInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [uncertainOperation, setUncertainOperation] = useState("");
  const keys = useRef(new Map<string, string>());

  async function load() {
    const detail = await platformApi.platformInvoice(invoiceId);
    setInvoice(detail);
  }

  useEffect(() => {
    if (!canCharge) return;
    let active = true;
    platformApi
      .platformInvoice(invoiceId)
      .then((detail) => {
        if (active) setInvoice(detail);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar a fatura.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canCharge, invoiceId]);

  if (!membership) return null;

  function describe(operation: BillingOperation) {
    if (operationIsUncertain(operation.status)) {
      setUncertainOperation(operation.id);
      setMessage("Resultado incerto. Reconcile esta operação antes de repetir o estorno ou a sincronização.");
      return false;
    }
    if (operation.status === "failed") {
      setUncertainOperation("");
      setError(operation.error_message || "A API registrou falha na operação.");
      return true;
    }
    setUncertainOperation("");
    setMessage("Operação confirmada pela API.");
    return true;
  }

  async function run(action: "sync" | "refund" | "fiscal" | "fiscal-sync" | "reconcile") {
    if (!invoice || pending) return;
    const refundable = refundableMinor(invoice);
    const amountMinor = Number(amount);
    if (action === "refund") {
      if (invoice.status === "chargeback") {
        setError("Chargeback bloqueia um novo estorno.");
        return;
      }
      if (invoice.payment_method === "boleto" || invoice.payment_method === "bank_slip") {
        setError("Estorno de boleto usa o fluxo separado do provedor.");
        return;
      }
      const amountError = refundAmountError(amountMinor, refundable);
      if (amountError) {
        setError(amountError);
        return;
      }
      if (reason.trim().length < 10) {
        setError("Informe uma justificativa com pelo menos 10 caracteres.");
        return;
      }
      if (!window.confirm("Confirmar o estorno desta cobrança?")) return;
    }
    if ((action === "sync" || action === "fiscal") && reason.trim().length < 10 && action === "fiscal") {
      setError("Informe uma justificativa com pelo menos 10 caracteres.");
      return;
    }
    if (action === "fiscal" && !window.confirm("Solicitar a NFS-e desta cobrança paga? Isso não cancela a cobrança.")) {
      return;
    }
    const operation =
      action === "refund"
        ? `refund:${invoice.id}:${amountMinor}:${reason.trim()}`
        : `${action}:${invoice.id}`;
    const key = idempotencyKey(keys.current, operation);
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (action === "sync") {
        const result = await platformApi.syncPlatformInvoice(invoice.id, key);
        if (describe(result)) keys.current.delete(operation);
      } else if (action === "refund") {
        const result = await platformApi.refundInvoice(
          invoice.id,
          { amount_minor: amountMinor, reason: reason.trim() },
          key,
        );
        if (describe(result)) keys.current.delete(operation);
      } else if (action === "fiscal") {
        const document = await platformApi.issueFiscalDocument(invoice.id, reason.trim());
        if ("detail" in document && document.detail) {
          setMessage(String(document.detail));
        } else if (operationIsUncertain(document.status)) {
          setMessage("Resultado da nota fiscal incerto. Consulte a NFS-e antes de emitir outra.");
        } else {
          setMessage("A API respondeu à solicitação da nota fiscal.");
        }
      } else if (action === "fiscal-sync") {
        await platformApi.syncFiscalDocument(invoice.id);
        setMessage("Status da nota fiscal consultado na API.");
      } else if (uncertainOperation) {
        describe(await platformApi.reconcileOperation(uncertainOperation));
      }
      await load();
    } catch (caught) {
      if (caught instanceof PlatformApiError && caught.uncertain) {
        setUncertainOperation(uncertainOperation);
        setMessage(caught.message);
      } else {
        setError(caught instanceof Error ? caught.message : "A API não concluiu a operação.");
      }
    } finally {
      setPending(false);
    }
  }

  const refundable = invoice ? refundableMinor(invoice) : 0;
  const chargeUrl = safeHttps(invoice?.hosted_url);
  const pdfUrl = safeHttps(invoice?.fiscal_document?.pdf_url);
  const xmlUrl = safeHttps(invoice?.fiscal_document?.xml_url);

  return (
    <CapabilityGuard membership={membership} capability="charges.read">
      <section className="accounts-page">
        <header className="page-heading">
          <p className="eyebrow">COBRANÇA</p>
          <h1>Fatura da academia</h1>
          <p>Valores, estorno e nota fiscal vêm da API. Este saldo não é o saldo global do Asaas.</p>
        </header>
        <p>
          <Link href="/cobrancas">Voltar às cobranças</Link>
        </p>
        {loading ? <div role="status" className="state-card">Carregando fatura…</div> : null}
        {!loading && error && !invoice ? (
          <div role="alert" className="state-card">
            <h2>Não foi possível carregar</h2>
            <p>{error}</p>
          </div>
        ) : null}
        {invoice ? (
          <>
            <section className="page-card">
              <h2>{invoice.tenant_name}</h2>
              <dl className="definition-list">
                <div><dt>Status da cobrança</dt><dd>{invoice.status}</dd></div>
                <div><dt>Método</dt><dd>{invoice.payment_method || "Não informado"}</dd></div>
                <div><dt>Bruto</dt><dd>{formatMinor(invoice.amount_minor, invoice.currency)}</dd></div>
                <div><dt>Taxas</dt><dd>{formatMinor(invoice.fee_minor, invoice.currency)}</dd></div>
                <div><dt>Líquido</dt><dd>{formatMinor(invoice.net_minor, invoice.currency)}</dd></div>
                <div><dt>Estornado</dt><dd>{formatMinor(invoice.amount_refunded_minor, invoice.currency)}</dd></div>
                <div><dt>Saldo residual</dt><dd>{formatMinor(refundable, invoice.currency)}</dd></div>
                <div><dt>Status no provedor</dt><dd>{invoice.provider_status || "Não informado"}</dd></div>
              </dl>
              {chargeUrl ? (
                <a href={chargeUrl} target="_blank" rel="noopener noreferrer">Abrir cobrança no provedor</a>
              ) : (
                <p>Sem link seguro da cobrança.</p>
              )}
              <p>A API não expõe cancelamento avulso desta cobrança. O cancelamento de renovação continua no comando da conta.</p>
            </section>
            <section className="page-card">
              <h2>Nota fiscal</h2>
              <p>A NFS-e é independente da cobrança.</p>
              {invoice.fiscal_document ? (
                <>
                  <dl className="definition-list">
                    <div><dt>Status da nota</dt><dd>{invoice.fiscal_document.status}</dd></div>
                    <div><dt>Número</dt><dd>{invoice.fiscal_document.number || "Não informado"}</dd></div>
                    <div><dt>Falha</dt><dd>{invoice.fiscal_document.error_message || "Nenhuma falha informada"}</dd></div>
                  </dl>
                  {pdfUrl ? <a href={pdfUrl} target="_blank" rel="noopener noreferrer">Abrir PDF da NFS-e</a> : null}
                  {xmlUrl ? <a href={xmlUrl} target="_blank" rel="noopener noreferrer">Abrir XML da NFS-e</a> : null}
                </>
              ) : (
                <p>Nenhuma nota fiscal vinculada a esta cobrança.</p>
              )}
            </section>
            <section className="page-card">
              <h2>Movimentos</h2>
              {invoice.movements.length ? (
                <ul className="invoice-list">
                  {invoice.movements.map((movement) => (
                    <li key={movement.id}>
                      <span>
                        <strong>{movement.movement_type}</strong>
                        <small>{movement.state}</small>
                      </span>
                      <span>{formatMinor(movement.amount_minor, movement.currency)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum movimento registrado.</p>
              )}
            </section>
            {canBill ? (
              <section className="page-card">
                <h2>Ações financeiras</h2>
                <label>
                  Justificativa
                  <textarea aria-label="Justificativa" value={reason} onChange={(event) => setReason(event.target.value)} />
                </label>
                <label>
                  Estorno parcial em centavos
                  <input
                    aria-label="Estorno parcial em centavos"
                    inputMode="numeric"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
                <div className="command-grid">
                  <button className="button" disabled={pending} onClick={() => void run("sync")}>Sincronizar cobrança</button>
                  <button className="button" disabled={pending} onClick={() => void run("refund")}>Estornar</button>
                  <button className="button" disabled={pending || invoice.status !== "paid"} onClick={() => void run("fiscal")}>
                    Emitir NFS-e
                  </button>
                  <button className="button" disabled={pending || !invoice.fiscal_document} onClick={() => void run("fiscal-sync")}>
                    Consultar NFS-e
                  </button>
                  <button className="button" disabled={pending || !uncertainOperation} onClick={() => void run("reconcile")}>
                    Reconciliar operação
                  </button>
                </div>
              </section>
            ) : (
              <p>Alterações financeiras exigem a capability billing.manage.</p>
            )}
          </>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
        {invoice && error ? <p role="alert" className="form-error">{error}</p> : null}
      </section>
    </CapabilityGuard>
  );
}
