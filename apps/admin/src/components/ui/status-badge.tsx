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
