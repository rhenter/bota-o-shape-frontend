import Link from "next/link";
import type { ReactNode } from "react";

import type {
  PlatformCapability,
  PlatformMembership,
} from "@/lib/platform-api";

export function hasCapability(
  membership: PlatformMembership,
  capability: PlatformCapability,
) {
  return (
    membership.role === "administrator" ||
    membership.capabilities.includes(capability)
  );
}

export function CapabilityGuard({
  membership,
  capability,
  children,
}: {
  membership: PlatformMembership;
  capability: PlatformCapability;
  children: ReactNode;
}) {
  if (!hasCapability(membership, capability)) {
    return (
      <section className="state-card" role="alert">
        <p className="eyebrow">Acesso restrito</p>
        <h1>Você não tem acesso a esta área</h1>
        <p>Solicite a capability necessária a um administrador da plataforma.</p>
        <Link className="button" href="/dashboard">
          Voltar à visão geral
        </Link>
      </section>
    );
  }
  return children;
}
