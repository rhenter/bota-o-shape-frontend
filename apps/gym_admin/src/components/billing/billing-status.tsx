"use client";

import type { ReactNode } from "react";
import { ErrorState, LoadingState } from "@/components/states";
import type { useBillingAccount } from "./use-billing-account";

export function BillingStatus({
  billing,
  demo,
  children,
}: {
  billing: ReturnType<typeof useBillingAccount>;
  demo?: ReactNode;
  children: ReactNode;
}) {
  if (!billing.allowed)
    return (
      <p className="notice">
        Cobrança restrita a pessoas com a permissão billing.manage na academia
        ativa.
      </p>
    );
  if (billing.mode === "demo") return demo ?? null;
  if (billing.error)
    return <ErrorState description={billing.error} onRetry={billing.reload} />;
  if (!billing.snapshot) return <LoadingState />;
  return children;
}
