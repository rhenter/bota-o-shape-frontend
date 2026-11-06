"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { useAdminData } from "@/components/use-admin-data";
import { canPublishMealPlan } from "@/lib/permissions";
import { LoadingState, ErrorState, EmptyState } from "@/components/states";
const planStatus: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  paused: "Pausado",
  superseded: "Substituído",
};
export default function NutritionPage() {
  const app = useAdminData(true);
  const [query, setQuery] = useState("");
  const { user, membership, students } = app;
  const plans = app.data.plans;
  return (
    <AppShell>
      <PageHeader
        title="Carteira nutricional"
        description="Alunos atribuídos, consentimento e planos versionados."
        actions={
          <Link className="button" href="/nutricao/catalogo">
            Catálogo de alimentos
          </Link>
        }
      />
      {app.loading ? (
        <LoadingState />
      ) : app.error ? (
        <ErrorState description={app.error} onRetry={app.refresh} />
      ) : app.scopeError ? (
        <p className="notice">{app.scopeError}</p>
      ) : (
        <>
          <div className="filters">
            <label className="field search-field">
              Buscar aluno
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            {students.some((s) => canPublishMealPlan(user, membership, s)) && (
              <Link
                href="/nutricao/planos/novo"
                className="button button-primary"
              >
                Novo plano alimentar
              </Link>
            )}
          </div>
          <div className="nutrition-portfolio">
            {students
              .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
              .map((s) => (
                <article className="card" key={s.id}>
                  <h2>{s.name}</h2>
                  <p>
                    {s.nutritionConsent
                      ? "Consentimento nutricional ativo"
                      : "Consentimento não confirmado"}{" "}
                    ·{" "}
                    {s.dietitianIds.includes(user.id)
                      ? "Atribuído a você"
                      : "Sem vínculo nutricional com você"}
                  </p>
                  <dl className="detail-list">
                    <div>
                      <dt>Objetivo declarado</dt>
                      <dd>{s.goal ?? "Não informado"}</dd>
                    </div>
                    <div>
                      <dt>Alergias e restrições</dt>
                      <dd>{s.restrictions ?? "Não informado"}</dd>
                    </div>
                    <div>
                      <dt>Rotina, preferências e diário</dt>
                      <dd>Não disponibilizados ao profissional nesta API</dd>
                    </div>
                  </dl>
                  {plans
                    .filter((p) => p.student === s.id)
                    .map((p) => (
                      <p key={p.id}>
                        <Link href={`/nutricao/planos/revisar?id=${p.id}`}>
                          {p.objective || "Plano alimentar"} ·{" "}
                          {planStatus[p.status] ?? p.status} ·{" "}
                          {p.versions.length} versão(ões)
                          {p.review_on ? ` · revisão ${p.review_on}` : ""}
                        </Link>
                      </p>
                    ))}
                  {canPublishMealPlan(user, membership, s) && (
                    <Link className="button" href="/nutricao/planos/novo">
                      Novo plano para {s.name.split(" ")[0]}
                    </Link>
                  )}
                </article>
              ))}
          </div>
          {!students.length && (
            <EmptyState
              title="Nenhum aluno autorizado"
              description="O acesso depende de vínculo ativo e consentimento."
            />
          )}
        </>
      )}
    </AppShell>
  );
}
