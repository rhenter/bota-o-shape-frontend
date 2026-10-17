const labels: Record<string, string> = {
  active: "Ativo",
  inactive: "Inativo",
  invited: "Convidado",
  archived: "Arquivado",
  draft: "Rascunho",
  in_review: "Em revisão",
  approved: "Revisado",
  reviewed: "Revisado",
  available: "Disponível",
  maintenance: "Em manutenção",
  published: "Publicado",
  completed: "Concluída",
  released: "Liberada",
  paused: "Pausado",
  superseded: "Substituído",
  pilot: "Piloto",
  trial: "Período de teste",
  past_due: "Pagamento pendente",
  delinquent: "Inadimplente",
  cancel_scheduled: "Cancelamento agendado",
  cancelled: "Cancelada",
  suspended: "Suspensa",
};
export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <span className={`status-badge status-${status}`}>
      <span aria-hidden="true">●</span> {label ?? labels[status] ?? status}
    </span>
  );
}
