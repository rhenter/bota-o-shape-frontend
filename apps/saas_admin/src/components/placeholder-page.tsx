"use client";

import { CapabilityGuard } from "./capability-guard";
import { useAuth } from "./auth-context";
import type { PlatformCapability } from "@/lib/platform-api";

export function PlaceholderPage({
  title,
  description,
  capability,
}: {
  title: string;
  description: string;
  capability?: PlatformCapability;
}) {
  const { membership } = useAuth();
  if (!membership) return null;
  const content = (
    <section className="page-card">
      <p className="eyebrow">Fundação do SaaS Admin</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <span className="status">Estrutura pronta · recursos na etapa dedicada</span>
    </section>
  );
  return capability ? (
    <CapabilityGuard membership={membership} capability={capability}>
      {content}
    </CapabilityGuard>
  ) : content;
}
