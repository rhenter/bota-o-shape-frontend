"use client";
import Link from "next/link";
import { useState } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { useTrainingData } from "@/components/use-training-data";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import type { ApiMeasurement, AssessmentInput } from "@/lib/api-client";
import { measurementMethod } from "@/lib/assessments";

const measurement = (): ApiMeasurement => ({
  metric: "",
  raw_value: "",
  unit: "",
  side: "",
  anatomical_site: "",
  method: "",
  protocol: null,
  origin: "manual",
  equation_metadata: {},
  possible_error: false,
});
export default function NewAssessmentPage() {
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
    context,
    repository,
    api,
    mode,
    canWrite,
    trainingLoading,
    studentDataError: trainingError,
    refreshTraining,
    updateDemo,
  } = useTrainingData();
  const [student, setStudent] = useState("");
  const [protocolId, setProtocolId] = useState("");
  const [rows, setRows] = useState<ApiMeasurement[]>([measurement()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState("");
  const students = repository
    .getStudents(context)
    .filter((s) => s.status === "active");
  const protocols = data.protocols.filter((p) => p.is_active);
  const protocol = protocols.find((p) => p.id === protocolId);
  const consents = data.consents.filter(
    (c) => c.subject === student && c.granted && !c.revoked_at,
  );
  function changeRow(index: number, key: keyof ApiMeasurement, value: string) {
    setRows((items) =>
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }
  if (trainingLoading) return <LoadingState />;
  if (trainingError)
    return <ErrorState description={trainingError} onRetry={refreshTraining} />;
  if (!canWrite)
    return (
      <EmptyState
        title="Acesso de leitura"
        description="A coleta exige perfil de professor ou administração."
      />
    );
  if (!students.length || !protocols.length)
    return (
      <EmptyState
        title={
          !students.length
            ? "Nenhum aluno ativo disponível"
            : "Nenhum protocolo ativo disponível"
        }
        description={
          !students.length
            ? "A API atual não fornece a lista de alunos vinculados ao professor; a coleta depende de um perfil de aluno acessível."
            : "Cadastre e revise um protocolo na administração da API antes de coletar. Nenhum protocolo clínico é gerado automaticamente."
        }
        action={<Link href="/avaliacoes">Voltar às avaliações</Link>}
      />
    );
  if (savedId)
    return (
      <section className="card">
        <h1>Avaliação salva como rascunho</h1>
        <p>
          {mode === "demo"
            ? "Registro fictício nesta sessão."
            : "As medidas foram registradas na academia ativa."}{" "}
          Revise os dados antes de concluir e liberar.
        </p>
        <Link
          className="button button-primary"
          href={`/avaliacoes/relatorio?id=${encodeURIComponent(savedId)}`}
        >
          Revisar avaliação
        </Link>
      </section>
    );
  return (
    <>
      <Link className="back-link" href="/avaliacoes">
        ← Avaliações
      </Link>
      <PageHeader
        title="Nova avaliação física"
        description="Escolha o protocolo, registre as condições e confira cada medida bruta."
      />
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (trainingError || busy || !protocol) return;
          const form = new FormData(event.currentTarget);
          setError("");
          const measurements = rows.map((row) => ({
            ...row,
            protocol: protocol.id,
            method: protocol.method,
            equation_metadata:
              row.metric === "body_fat_percentage"
                ? {
                    equation: String(form.get("equation")),
                    population: String(form.get("population")),
                    applicability: String(form.get("applicability")),
                    responsible: String(form.get("responsible")),
                  }
                : {},
          }));
          const input: AssessmentInput = {
            student,
            consent: String(form.get("consent")),
            assessed_at: new Date(
              String(form.get("assessed_at")),
            ).toISOString(),
            device: {
              brand: String(form.get("brand")),
              model: String(form.get("model")),
            },
            preparation_conditions: {
              hydration: String(form.get("hydration")),
              food: String(form.get("food")),
              recent_exercise: String(form.get("recent_exercise")),
              notes: String(form.get("conditions")),
            },
            notes: String(form.get("notes")),
            measurements,
          };
          setBusy(true);
          try {
            if (mode === "api") {
              const saved = await api.createAssessment(context.tenantId, input);
              setSavedId(saved.id);
            } else {
              const id = crypto.randomUUID();
              updateDemo((d) => ({
                ...d,
                assessments: [
                  ...d.assessments,
                  {
                    ...input,
                    id,
                    status: "draft",
                    released_at: null,
                    measurements: measurements.map((m) => ({
                      ...m,
                      id: crypto.randomUUID(),
                      possible_error:
                        Number(m.raw_value) < 0 || Number(m.raw_value) > 10000,
                    })),
                  },
                ],
              }));
              setSavedId(id);
            }
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Não foi possível salvar a coleta.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="plain-fieldset" disabled={busy}>
          <div className="editor-grid">
            <section className="card">
              <h2>1. Aluno e protocolo</h2>
              <label className="field">
                Aluno *
                <select
                  value={student}
                  required
                  onChange={(e) => setStudent(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Data e hora da avaliação *
                <input type="datetime-local" name="assessed_at" required />
              </label>
              <label className="field">
                Protocolo de avaliação *
                <select
                  required
                  value={protocolId}
                  onChange={(e) => setProtocolId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {protocols.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · v{p.version} · {measurementMethod(p.method)}
                    </option>
                  ))}
                </select>
              </label>
              {protocol && (
                <div className="notice">
                  <strong>
                    Método: {measurementMethod(protocol.method)} · versão{" "}
                    {protocol.version}
                  </strong>
                  <p>
                    Sítios do protocolo:{" "}
                    {Array.isArray(protocol.sites)
                      ? protocol.sites
                          .map((site) =>
                            typeof site === "string"
                              ? site
                              : JSON.stringify(site),
                          )
                          .join(" · ") || "Não informados"
                      : JSON.stringify(protocol.sites)}
                  </p>
                </div>
              )}
              <label className="field">
                Consentimento registrado *
                <select required name="consent" key={student}>
                  <option value="">
                    Selecione o registro e confira a finalidade
                  </option>
                  {consents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.purpose} ·{" "}
                      {new Date(c.granted_at).toLocaleDateString("pt-BR")}
                    </option>
                  ))}
                </select>
              </label>
              {student && !consents.length && (
                <p className="notice">
                  Sem consentimento ativo registrado. Solicite o registro do
                  aluno antes da coleta.
                </p>
              )}
              <p className="help-text">
                Confira se a finalidade autoriza esta coleta. O consentimento é
                um registro separado; este formulário não o concede em nome do
                aluno.
              </p>
              <h2>2. Aparelho e condições</h2>
              <div className="form-grid">
                <label className="field">
                  Marca do aparelho
                  <input name="brand" />
                </label>
                <label className="field">
                  Modelo do aparelho
                  <input name="model" />
                </label>
              </div>
              <label className="field">
                Hidratação
                <input name="hydration" />
              </label>
              <label className="field">
                Alimentação / jejum
                <input name="food" />
              </label>
              <label className="field">
                Exercício recente
                <input name="recent_exercise" />
              </label>
              <label className="field">
                Outras condições de preparação
                <textarea name="conditions" />
              </label>
              <p className="help-text">
                Horário, aparelho e preparação podem afetar os resultados.
                Registre as condições para contextualizar comparações futuras.
              </p>
              <label className="field">
                Observações profissionais
                <textarea name="notes" />
              </label>
            </section>
            <section className="card">
              <h2>3. Medidas brutas</h2>
              <p className="help-text">
                Cada campo preserva unidade, lado e ponto anatômico. Não há
                interpretação clínica automática.
              </p>
              {rows.map((row, index) => (
                <fieldset className="measurement-fields" key={index}>
                  <legend>Medida {index + 1}</legend>
                  <label className="field">
                    Métrica *
                    <input
                      required
                      maxLength={100}
                      value={row.metric}
                      onChange={(e) =>
                        changeRow(index, "metric", e.target.value)
                      }
                    />
                  </label>
                  <div className="form-grid">
                    <label className="field">
                      Valor *
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={row.raw_value}
                        onChange={(e) =>
                          changeRow(index, "raw_value", e.target.value)
                        }
                      />
                    </label>
                    <label className="field">
                      Unidade *
                      <input
                        required
                        maxLength={24}
                        placeholder="cm, mm, kg…"
                        value={row.unit}
                        onChange={(e) =>
                          changeRow(index, "unit", e.target.value)
                        }
                      />
                    </label>
                  </div>
                  {row.raw_value !== "" &&
                    (Number(row.raw_value) < 0 ||
                      Number(row.raw_value) > 10000) && (
                      <p className="notice" role="status">
                        Valor fora da faixa de conferência da API. Revise a
                        unidade e a digitação; o registro continua permitido.
                      </p>
                    )}
                  <label className="field">
                    Lado
                    <select
                      value={row.side}
                      onChange={(e) => changeRow(index, "side", e.target.value)}
                    >
                      <option value="">Não se aplica / não informado</option>
                      <option value="left">Esquerdo</option>
                      <option value="right">Direito</option>
                    </select>
                  </label>
                  <label className="field">
                    Ponto anatômico{" "}
                    {protocol &&
                      ["circumference", "skinfold"].includes(protocol.method) &&
                      "*"}
                    <input
                      maxLength={120}
                      required={Boolean(
                        protocol &&
                        ["circumference", "skinfold"].includes(protocol.method),
                      )}
                      value={row.anatomical_site}
                      onChange={(e) =>
                        changeRow(index, "anatomical_site", e.target.value)
                      }
                    />
                  </label>
                  <label className="field">
                    Origem
                    <input
                      maxLength={80}
                      required
                      value={row.origin}
                      onChange={(e) =>
                        changeRow(index, "origin", e.target.value)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="button button-quiet"
                    disabled={rows.length <= 1}
                    onClick={() =>
                      setRows((items) => items.filter((_, i) => i !== index))
                    }
                  >
                    Remover medida {index + 1}
                  </button>
                </fieldset>
              ))}
              <button
                type="button"
                className="button"
                onClick={() => setRows((items) => [...items, measurement()])}
              >
                + Adicionar medida
              </button>
              {rows.some((r) => r.metric === "body_fat_percentage") && (
                <fieldset className="measurement-fields">
                  <legend>Metadados exigidos para percentual de gordura</legend>
                  <p className="help-text">
                    A API exige equação e responsável para esta métrica. O
                    painel não calcula percentual automaticamente.
                  </p>
                  {[
                    ["equation", "Equação"],
                    ["population", "População"],
                    ["applicability", "Aplicabilidade"],
                    ["responsible", "Responsável"],
                  ].map(([name, label]) => (
                    <label className="field" key={name}>
                      {label} *<input name={name} required />
                    </label>
                  ))}
                </fieldset>
              )}
            </section>
          </div>
          <footer className="card review-card">
            <p className="muted">
              A coleta será salva como rascunho. Depois, revise, conclua e
              libere para o aluno.
            </p>
            <button
              className="button button-primary"
              disabled={!protocol || !consents.length}
            >
              {busy ? "Aguarde…" : "Salvar rascunho"}
            </button>
          </footer>
        </fieldset>
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
      </form>
    </>
  );
}
