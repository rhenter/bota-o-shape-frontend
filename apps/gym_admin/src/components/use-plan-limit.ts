"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "@/components/app-context";

const openStatuses = new Set([
  "pilot",
  "trial",
  "active",
  "past_due",
  "delinquent",
  "cancel_scheduled",
]);

/** Numeric cap from an enabled entitlement, or from the current plan when the contract has no override. */
export function usePlanLimit(key: string) {
  const { api, mode, context, repository } = useAppContext();
  const [limit, setLimit] = useState<number | null>(null);
  useEffect(() => {
    if (mode === "demo") {
      const raw = repository.getSubscription(context)?.limits?.[key];
      setLimit(typeof raw === "number" ? raw : null);
      return;
    }
    let active = true;
    Promise.all([
      api.getSubscriptions(context.tenantId),
      api.getEntitlements(context.tenantId),
    ])
      .then(([subscriptions, entitlements]) => {
        if (!active) return;
        const subscription =
          subscriptions.find((item) => openStatuses.has(item.status)) ??
          subscriptions[0];
        const entitlement = entitlements.find(
          (item) => item.key === key && item.enabled,
        );
        const raw = entitlement
          ? entitlement.limit
          : subscription?.plan_detail.limits[key];
        setLimit(typeof raw === "number" ? raw : null);
      })
      .catch(() => {
        if (active) setLimit(null);
      });
    return () => {
      active = false;
    };
    // repository and context are recreated each render; reload by tenant and mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, context.tenantId, key, mode]);
  return limit;
}
