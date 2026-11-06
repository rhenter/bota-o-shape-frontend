"use client";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/states";
export default function AuditPage() {
  const { membership } = useAppContext();
  return (
    <AppShell>
      <PageHeader
        title="Logs de auditoria"
        description="Ator, ação, objeto, data e justificativa de operações sensíveis."
      />
      {membership?.roles.includes("admin") ? (
        <EmptyState
          title="Consulta de auditoria indisponível"
          description="A API registra eventos, mas ainda não expõe consulta ou exportação autorizada. Nenhum evento fictício é apresentado."
        />
      ) : (
        <p className="notice">
          A auditoria é restrita à administração autorizada.
        </p>
      )}
    </AppShell>
  );
}
