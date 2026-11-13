export function StudentUsage({
  active,
  limit,
}: {
  active: number;
  limit: number | null;
}) {
  const hasLimit = typeof limit === "number";
  const width = hasLimit
    ? Math.min(100, limit > 0 ? (active / limit) * 100 : 100)
    : 0;
  return (
    <section className="plan-usage" aria-label="Alunos ativos no plano">
      <span className="plan-usage-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <circle
            cx="12"
            cy="8"
            r="3.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M6 19c.8-3 2.6-4.5 6-4.5S17.2 16 18 19"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <div>
        <strong>{hasLimit ? `${active} de ${limit}` : active}</strong>
        <small>Alunos ativos</small>
      </div>
      <div className="plan-usage-limit">
        <span>Limite do plano</span>
        <strong>{hasLimit ? `${limit} alunos` : "Sem limite"}</strong>
        {hasLimit && (
          <i aria-hidden="true">
            <b style={{ width: `${width}%` }} />
          </i>
        )}
      </div>
    </section>
  );
}
