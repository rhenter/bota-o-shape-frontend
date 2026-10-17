"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useTrainingData } from "@/components/use-training-data";
import { assessmentDateKey, assessmentTimeZone } from "@/lib/dates";
function weekDays(anchor: string) {
  const start = new Date(`${anchor}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    return day.toISOString().slice(0, 10);
  });
}
export default function AgendaPage() {
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <Content key={tenant.id} />
    </AppShell>
  );
}
function Content() {
  const {
    data,
    repository,
    context,
    trainingLoading,
    studentDataError: trainingError,
    refreshTraining,
  } = useTrainingData();
  const [anchor, setAnchor] = useState(() => assessmentDateKey(new Date()));
  const [view, setView] = useState("week");
  const [kind, setKind] = useState("all");
  const students = repository.getStudents(context);
  const name = (id: string) =>
    students.find((s) => s.id === id)?.name ?? "Aluno sem perfil disponível";
  const events = [
    ...data.assignments
      .filter((a) => a.is_active)
      .flatMap((a) => [
        {
          id: `${a.id}-start`,
          date: a.starts_on,
          type: "workout",
          title: `Início de treino · ${name(a.student)}`,
          detail: `${a.template_detail.name} · v${a.template_detail.version}`,
          href: `/treinos/novo?id=${encodeURIComponent(a.template)}`,
        },
        ...(a.ends_on
          ? [
              {
                id: `${a.id}-end`,
                date: a.ends_on,
                type: "workout",
                title: `Término de treino · ${name(a.student)}`,
                detail: `${a.template_detail.name} · v${a.template_detail.version}`,
                href: `/treinos/novo?id=${encodeURIComponent(a.template)}`,
              },
            ]
          : []),
      ]),
    ...data.assessments.map((a) => ({
      id: a.id,
      date: assessmentDateKey(a.assessed_at),
      type: "assessment",
      title: `Avaliação registrada · ${name(a.student)}`,
      detail: new Date(a.assessed_at).toLocaleTimeString("pt-BR", {
        timeZone: assessmentTimeZone,
        hour: "2-digit",
        minute: "2-digit",
      }),
      href: `/avaliacoes/relatorio?id=${encodeURIComponent(a.id)}`,
    })),
  ]
    .filter((e) => kind === "all" || e.type === kind)
    .sort((a, b) => a.date.localeCompare(b.date));
  const days = weekDays(anchor);
  const visible = events.filter(
    (e) => view === "list" || days.includes(e.date),
  );
  function move(offset: number) {
    const next = new Date(`${anchor}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + offset);
    setAnchor(next.toISOString().slice(0, 10));
  }
  if (trainingLoading) return <LoadingState />;
  if (trainingError)
    return <ErrorState description={trainingError} onRetry={refreshTraining} />;
  const eventList = (items: typeof events) => (
    <ul className="agenda-events">
      {items.map((e) => (
        <li key={e.id} className={`agenda-event agenda-${e.type}`}>
          <Link href={e.href}>
            <strong>{e.title}</strong>
            <span>{e.detail}</span>
            {view === "list" && (
              <time dateTime={e.date}>
                {new Date(`${e.date}T12:00:00`).toLocaleDateString("pt-BR")}
              </time>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <>
      <PageHeader
        title="Agenda e alertas"
        description="Acompanhe as janelas dos treinos e as datas registradas das avaliações."
      />
      <section className="card">
        <div className="filters">
          <label className="field">
            Tipo
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">Todos os tipos</option>
              <option value="workout">Treinos</option>
              <option value="assessment">Avaliações</option>
            </select>
          </label>
          <label className="field">
            Data de referência
            <input
              type="date"
              value={anchor}
              required
              onChange={(e) => {
                if (e.target.value) setAnchor(e.target.value);
              }}
            />
          </label>
          <div
            className="segmented-control"
            role="group"
            aria-label="Visualização da agenda"
          >
            <button
              aria-pressed={view === "week"}
              onClick={() => setView("week")}
            >
              Semana
            </button>
            <button
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              Lista completa
            </button>
          </div>
        </div>
        {view === "week" && (
          <>
            <div className="section-header">
              <div className="row-actions">
                <button
                  className="button"
                  aria-label="Semana anterior"
                  onClick={() => move(-7)}
                >
                  ←
                </button>
                <button
                  className="button"
                  onClick={() => setAnchor(assessmentDateKey(new Date()))}
                >
                  Hoje
                </button>
                <button
                  className="button"
                  aria-label="Próxima semana"
                  onClick={() => move(7)}
                >
                  →
                </button>
              </div>
              <p>
                {new Date(`${days[0]}T12:00:00`).toLocaleDateString("pt-BR")} –{" "}
                {new Date(`${days[6]}T12:00:00`).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="agenda-week">
              {days.map((day) => (
                <section key={day}>
                  <h2>
                    <time dateTime={day}>
                      {new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </time>
                  </h2>
                  {eventList(visible.filter((e) => e.date === day))}
                  {!visible.some((e) => e.date === day) && (
                    <p className="help-text">Sem registros</p>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
        {view === "list" && eventList(visible)}
        {!visible.length && (
          <EmptyState
            title="Nenhum registro neste período"
            description="Escolha outra semana ou abra a lista completa."
          />
        )}
      </section>
      <p className="notice">
        As datas vêm das atribuições e coletas existentes. Agendamento de
        avaliações, horários recorrentes e notificações ainda não estão
        disponíveis. Nenhum lembrete é enviado por esta tela.
      </p>
    </>
  );
}
