"use client";
import Link from "next/link";
import { AppShell, useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/states";

export default function DashboardPage() {
  const { context, tenant, repository, user, mode } = useAppContext();
  const students = repository.getStudents(context);
  const exercises = repository.getExercises(context);
  const equipment = repository.getEquipment(context);
  const assessments = repository.getAssessments(context);
  const metrics = [
    {
      label: "Alunos ativos",
      value: students.filter((item) => item.status === "active").length,
      note: "Vínculos da academia ativa",
      icon: "♙",
      href: "/alunos",
    },
    {
      label: "Exercícios no catálogo",
      value: exercises.length,
      note: "Movimentos e instruções",
      icon: "↔",
      href: "/exercicios",
    },
    {
      label: "Aguardando revisão",
      value: exercises.filter(
        (item) => item.status === "draft" || item.status === "in_review",
      ).length,
      note: "Conteúdo local em rascunho",
      icon: "◷",
      href: "/exercicios",
    },
    {
      label: "Equipamentos ativos",
      value: equipment.filter((item) => item.status === "available").length,
      note: "Requisitos para seus exercícios",
      icon: "◫",
      href: "/equipamentos",
    },
  ];
  return (
    <AppShell>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0] || "profissional"}!`}
        description={`Um olhar sobre a rotina da ${tenant.name}.`}
        actions={
          <Link className="button button-primary" href="/alunos">
            Ver meus alunos <span aria-hidden="true">→</span>
          </Link>
        }
      />
      <div className="metrics-grid">
        {metrics.map((metric) => (
          <Link className="metric-card" href={metric.href} key={metric.label}>
            <span className="metric-icon" aria-hidden="true">
              {metric.icon}
            </span>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="section-header">
            <h2>Alunos em acompanhamento</h2>
            <Link href="/alunos">Ver todos →</Link>
          </div>
          {students.length ? (
            <ul className="record-list">
              {students.slice(0, 4).map((student) => (
                <li key={student.id}>
                  <span className="avatar avatar-soft" aria-hidden="true">
                    {student.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <Link href={`/alunos/${student.id}`}>
                      <strong>{student.name}</strong>
                    </Link>
                    <small>{student.goal ?? "Objetivo não informado"}</small>
                  </div>
                  <StatusBadge status={student.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Sem alunos disponíveis"
              description={
                mode === "api"
                  ? "A API atual disponibiliza os perfis de alunos apenas à administração da academia."
                  : "Os alunos desta academia aparecerão aqui."
              }
            />
          )}
        </section>
        <section className="card">
          <h2>Catálogo com cuidado</h2>
          <p className="muted">
            Revise as instruções antes de utilizá-las em um treino.
          </p>
          <div className="catalog-summary">
            <span className="summary-number">
              {
                exercises.filter(
                  (item) =>
                    item.status === "approved" || item.status === "reviewed",
                ).length
              }
              <small>exercícios revisados</small>
            </span>
            <span className="summary-number">
              {exercises.filter((item) => item.status === "draft").length}
              <small>rascunhos para revisar</small>
            </span>
          </div>
          <Link className="button button-secondary" href="/exercicios">
            Abrir biblioteca
          </Link>
        </section>
        <section className="card">
          <h2>Atividade recente</h2>
          {mode === "demo" && assessments.length ? (
            <ul className="record-list">
              {assessments.map((assessment) => (
                <li key={assessment.id}>
                  <span className="activity-dot" aria-hidden="true" />
                  <div>
                    <strong>
                      Avaliação ·{" "}
                      {
                        students.find(
                          (student) => student.id === assessment.studentId,
                        )?.name
                      }
                    </strong>
                    <small>
                      {new Date(assessment.assessedAt).toLocaleDateString(
                        "pt-BR",
                        { timeZone: "America/Sao_Paulo" },
                      )}{" "}
                      · {assessment.protocol} ·{" "}
                      {assessment.released
                        ? "Liberada ao aluno"
                        : "Não liberada"}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Consulte as coletas, protocolos e relatórios em Avaliações.
            </p>
          )}
          <Link className="button" href="/avaliacoes">
            Ver avaliações
          </Link>
        </section>
        <section className="card next-step-card">
          <span className="eyebrow">CADA ALUNO, UMA ROTINA</span>
          <h2>Seu próximo treino começa na biblioteca.</h2>
          <p>
            Organize movimentos, equipamentos e instruções para apoiar um
            acompanhamento individual.
          </p>
          <Link href="/exercicios/novo" className="button button-primary">
            Cadastrar exercício
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
