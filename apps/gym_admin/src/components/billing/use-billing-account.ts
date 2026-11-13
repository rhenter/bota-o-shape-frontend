"use client";

import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/components/app-context";
import {
  hostedUrl,
  type ApiBillingCapabilities,
  type ApiBillingOperation,
  type ApiEntitlement,
  type ApiInvoice,
  type ApiSubscription,
  type ApiUsageItem,
} from "@/lib/admin-contracts";
import { canManageBilling } from "@/lib/permissions";

export interface BillingSnapshot {
  subscriptions: ApiSubscription[];
  invoices: ApiInvoice[];
  entitlements: ApiEntitlement[];
  capabilities: ApiBillingCapabilities;
  usage: ApiUsageItem[];
}

export function useBillingAccount() {
  const app = useAppContext();
  const { api, context, mode, user, membership, tenant } = app;
  const allowed = canManageBilling(user, membership, tenant.id);
  const scope = `${context.tenantId}:${user.id}:${allowed}`;
  const [snapshot, setSnapshot] = useState<{ scope: string; data: BillingSnapshot }>();
  const [failure, setFailure] = useState<{ scope: string; message: string }>();
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [providerLink, setProviderLink] = useState("");
  const busyRef = useRef(false);
  const operationKeys = useRef(new Map<string, string>());

  useEffect(() => {
    if (!allowed || mode !== "api") return;
    let active = true;
    Promise.all([
      api.getSubscriptions(context.tenantId),
      api.getInvoices(context.tenantId),
      api.getEntitlements(context.tenantId),
      api.getBillingCapabilities(context.tenantId).catch(() => ({
        provider: null,
        capabilities: {},
      })),
      api.getUsage(context.tenantId).catch(() => ({ items: [] as ApiUsageItem[] })),
    ])
      .then(([subscriptions, invoices, entitlements, capabilities, usage]) => {
        if (!active) return;
        setSnapshot({
          scope,
          data: {
            subscriptions,
            invoices,
            entitlements,
            capabilities,
            usage: Array.isArray(usage?.items) ? usage.items : [],
          },
        });
      })
      .catch((error) => {
        if (active)
          setFailure({
            scope,
            message: error instanceof Error ? error.message : "Cobrança indisponível.",
          });
      });
    return () => {
      active = false;
    };
  }, [api, context.tenantId, allowed, mode, scope, revision]);

  function reload() {
    setFailure(undefined);
    setRevision((current) => current + 1);
  }

  async function runOperation(
    operation: string,
    request: (idempotencyKey: string) => Promise<ApiBillingOperation>,
  ) {
    if (busyRef.current) return null;
    busyRef.current = true;
    setBusy(true);
    setActionError("");
    setProviderLink("");
    const key = operationKeys.current.get(operation) ?? crypto.randomUUID();
    operationKeys.current.set(operation, key);
    try {
      const result = await request(key);
      if (result.status === "unknown" || result.status === "processing") {
        setActionError(
          "O provedor ainda não confirmou esta operação. A mesma chave será reutilizada, sem abrir outra cobrança.",
        );
        return result;
      }
      if (result.status === "failed") {
        operationKeys.current.delete(operation);
        setActionError(result.error_message || "O provedor recusou a operação.");
        return result;
      }
      const link = hostedUrl(result.result_data?.url ?? "");
      if (result.result_data?.url && !link) {
        throw new Error("O provedor não retornou um endereço seguro válido.");
      }
      operationKeys.current.delete(operation);
      if (link) setProviderLink(link);
      return result;
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "O provedor não está disponível.",
      );
      return null;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function openBilling(subscription: ApiSubscription, action: "portal" | "checkout") {
    const url = new URL(window.location.href);
    url.pathname = "/configuracoes/cobrancas";
    url.searchParams.set("billing_return", "1");
    const returnUrl = url.toString();
    await runOperation(
      `${action}:${subscription.id}:${returnUrl}`,
      (idempotencyKey) =>
        api.openBilling(context.tenantId, subscription.id, action, returnUrl, idempotencyKey),
    );
  }

  async function syncInvoice(invoice: ApiInvoice) {
    const result = await runOperation(`sync:${invoice.id}`, (idempotencyKey) =>
      api.syncInvoice(context.tenantId, invoice.id, idempotencyKey),
    );
    if (result && result.status !== "unknown" && result.status !== "processing" && result.status !== "failed") {
      reload();
    }
  }

  async function cancelRenewal(subscription: ApiSubscription, reason: string) {
    const result = await runOperation(
      `cancel:${subscription.id}:${reason}`,
      (idempotencyKey) =>
        api.cancelRenewal(context.tenantId, subscription.id, reason, idempotencyKey),
    );
    if (result && !["unknown", "processing", "failed"].includes(result.status)) reload();
  }

  async function changePlan(subscription: ApiSubscription, planCode: string, reason: string) {
    const result = await runOperation(
      `plan:${subscription.id}:${planCode}:${reason}`,
      (idempotencyKey) =>
        api.changePlan(context.tenantId, subscription.id, planCode, reason, idempotencyKey),
    );
    if (result && !["unknown", "processing", "failed"].includes(result.status)) reload();
  }

  const ready = snapshot?.scope === scope ? snapshot.data : undefined;
  const error = failure?.scope === scope ? failure.message : "";
  return {
    app,
    allowed,
    mode,
    loading: allowed && mode === "api" && !ready && !error,
    error,
    reload,
    snapshot: ready,
    busy,
    actionError,
    providerLink,
    openBilling,
    syncInvoice,
    cancelRenewal,
    changePlan,
  };
}
