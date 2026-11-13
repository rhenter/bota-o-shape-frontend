"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BillingStatus } from "@/components/billing/billing-status";
import { useBillingAccount } from "@/components/billing/use-billing-account";
import { ErrorState } from "@/components/states";
import { PageHeader } from "@/components/ui/page-header";
import { hostedUrl, type ApiInvoice } from "@/lib/admin-contracts";
import { formatDay, formatInvoiceAmount } from "@/lib/billing-copy";

function CheckoutReturnNotice({ invoices }: { invoices: ApiInvoice[] }) {
  const params = useSearchParams();
  if (params.get("billing_return") !== "1") return null;
  const waiting = invoices.some((invoice) =>
    ["pending", "overdue", "refund_pending"].includes(invoice.status),
  );
  return (
    <p className="notice" role="status">
      {waiting || !invoices.length
        ? "Aguardando confirmação do pagamento pela API. O retorno do checkout não comprova o pagamento."
        : "A API não deixou cobrança em aberto. O status de cada fatura abaixo é a confirmação."}
    </p>
  );
}

export function ChargesWorkspace() {
  const billing = useBillingAccount();
  const hostedCheckout = billing.snapshot?.capabilities.capabilities.hosted_checkout === true;
  return (
    <BillingStatus
      billing={billing}
      demo={
        <section className="card">
          <h2>Cobranças</h2>
          <p>Portal e faturas exigem conexão com a API.</p>
        </section>
      }
    >
      {billing.snapshot && (
        <>
          <Suspense fallback={null}>
            <CheckoutReturnNotice invoices={billing.snapshot.invoices} />
          </Suspense>
          {billing.snapshot.subscriptions.map((subscription) => (
            <div className="row-actions section-space" key={subscription.id}>
              <button
                className="button button-primary"
                disabled={billing.busy}
                onClick={() => void billing.openBilling(subscription, "portal")}
              >
                Abrir cobrança existente
              </button>
              {hostedCheckout && ["pilot", "trial", "past_due"].includes(subscription.status) && (
                <button
                  className="button"
                  disabled={billing.busy}
                  onClick={() => void billing.openBilling(subscription, "checkout")}
                >
                  Abrir contratação segura
                </button>
              )}
            </div>
          ))}
          {billing.actionError && <ErrorState description={billing.actionError} />}
          {billing.providerLink && (
            <p className="notice" role="status">
              <a href={billing.providerLink} target="_blank" rel="noopener noreferrer">
                Continuar no portal seguro do provedor
              </a>
            </p>
          )}
          <section className="card">
            <h2>Faturas</h2>
            <div className="table-scroll">
              <table>
                <caption>Faturas da assinatura da academia</caption>
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th>Valor</th>
                    <th>Cobrança</th>
                    <th>Nota fiscal</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.snapshot.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{formatDay(invoice.due_at)}</td>
                      <td>{invoice.status}</td>
                      <td>{formatInvoiceAmount(invoice.currency, invoice.amount_minor)}</td>
                      <td>
                        {hostedUrl(invoice.hosted_url) ? (
                          <a href={hostedUrl(invoice.hosted_url)} target="_blank" rel="noopener noreferrer">
                            Abrir cobrança no provedor
                          </a>
                        ) : (
                          "Sem cobrança disponível"
                        )}
                        {["pending", "overdue"].includes(invoice.status) && (
                          <button
                            className="button"
                            disabled={billing.busy}
                            onClick={() => void billing.syncInvoice(invoice)}
                          >
                            Consultar confirmação
                          </button>
                        )}
                      </td>
                      <td>
                        {invoice.fiscal_document ? (
                          <>
                            <span>NFS-e {invoice.fiscal_document.status}</span>
                            {hostedUrl(invoice.fiscal_document.pdf_url) ? (
                              <a
                                href={hostedUrl(invoice.fiscal_document.pdf_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Abrir PDF da NFS-e
                              </a>
                            ) : null}
                            {invoice.fiscal_document.error_message ? (
                              <small>{invoice.fiscal_document.error_message}</small>
                            ) : null}
                          </>
                        ) : (
                          "Sem nota fiscal"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!billing.snapshot.invoices.length && <p>Nenhuma fatura disponível.</p>}
          </section>
          <p className="muted">
            Abrir a cobrança existente não cria outra. Contratação nova só ocorre no checkout hospedado quando a API
            informa essa capacidade.
          </p>
        </>
      )}
    </BillingStatus>
  );
}

export default function ChargesPage() {
  return (
    <AppShell>
      <PageHeader
        title="Cobranças"
        description="Consulte mensalidades, pagamentos e notas da academia."
      />
      <ChargesWorkspace />
    </AppShell>
  );
}
