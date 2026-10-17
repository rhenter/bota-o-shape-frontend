import type { ReactNode } from "react";
export function EmptyState({
  title = "Nada por aqui ainda",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">
        ⌕
      </span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function LoadingState({
  label = "Carregando informações…",
}: {
  label?: string;
}) {
  return (
    <div role="status" className="state-card">
      <span className="loading-indicator" aria-hidden="true" />
      {label}
    </div>
  );
}
export function ErrorState({
  title = "Não foi possível carregar",
  description = "Tente novamente em instantes.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="state-card">
      <h2>{title}</h2>
      <p>{description}</p>
      {onRetry && (
        <button className="button" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
