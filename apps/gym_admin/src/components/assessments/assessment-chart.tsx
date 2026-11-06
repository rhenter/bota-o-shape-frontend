"use client";
import { useState } from "react";
import type { ApiAssessment, ApiMeasurement } from "@/lib/api-client";
import { compatibleMeasurements, measurementMethod, measurementSide } from "@/lib/assessments";
import { assessmentDateKey, assessmentTimeZone } from "@/lib/dates";

export function sameDevice(a: ApiAssessment, b: ApiAssessment, method: string) {
  if (method !== "bioimpedance") return true;
  const hasIdentity = (device: ApiAssessment["device"]) =>
    typeof device.brand === "string" &&
    device.brand.trim() !== "" &&
    typeof device.model === "string" &&
    device.model.trim() !== "";
  // The backend has no stable device identifier; retain a conservative exact match.
  const identity = (device: ApiAssessment["device"]) =>
    JSON.stringify(
      Object.entries(device).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  return (
    hasIdentity(a.device) &&
    hasIdentity(b.device) &&
    identity(a.device) === identity(b.device)
  );
}

export function compatibleAssessmentContext(a: ApiAssessment, b: ApiAssessment, method: string) {
  return sameDevice(a, b, method) &&
    JSON.stringify(a.preparation_conditions) === JSON.stringify(b.preparation_conditions);
}
export function AssessmentChart({
  assessments,
  current,
}: {
  assessments: ApiAssessment[];
  current: ApiAssessment;
}) {
  const [metricIndex, setMetricIndex] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const metric = current.measurements[metricIndex];
  if (!metric) return <p>Nenhuma medida disponível para o gráfico.</p>;
  const points = assessments
    .filter(
      (a) =>
        a.student === current.student &&
        ["completed", "released"].includes(a.status) &&
        (!from || assessmentDateKey(a.assessed_at) >= from) &&
        (!to || assessmentDateKey(a.assessed_at) <= to),
    )
    .sort((a, b) => a.assessed_at.localeCompare(b.assessed_at))
    .map((a) => ({
      assessment: a,
      measurement: compatibleAssessmentContext(a, current, metric.method)
        ? a.measurements.find((m) => compatibleMeasurements(metric, m))
        : undefined,
    }));
  const valid = points
    .flatMap((p) => (p.measurement ? [Number(p.measurement.raw_value)] : []))
    .filter(Number.isFinite);
  const min = Math.min(...valid, 0),
    max = Math.max(...valid, 1);
  const x = (i: number) =>
    36 + (points.length < 2 ? 0 : (i / (points.length - 1)) * 528);
  const y = (m: ApiMeasurement) =>
    178 - ((Number(m.raw_value) - min) / (max - min || 1)) * 140;
  return (
    <section className="card">
      <h2>Evolução por medida compatível</h2>
      <div className="filters">
        <label className="field">
          Métrica e unidade
          <select
            value={metricIndex}
            onChange={(e) => setMetricIndex(Number(e.target.value))}
          >
            {current.measurements.map((m, i) => (
              <option value={i} key={i}>
                {m.metric} ({m.unit}) · {measurementSide(m.side) || "sem lado"} ·{" "}
                {m.anatomical_site}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          De
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="field">
          Até
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <p className="help-text">
        {measurementMethod(metric.method)} · unidade: {metric.unit}. Apenas
        avaliações concluídas ou liberadas com origem, equação e condições
        compatíveis e sem valor sinalizado para conferência. Lacunas indicam ausência de medida
        compatível; não há equivalência entre aparelhos de bioimpedância. Datas
        no horário de São Paulo.
      </p>
      {valid.length > 0 && (
        <svg
          className="assessment-chart"
          viewBox="0 0 600 210"
          role="img"
          aria-label={`Evolução de ${metric.metric} em ${metric.unit}. Os valores completos estão na tabela abaixo.`}
        >
          <path d="M36 25 V180 H575" fill="none" stroke="#9aabc0" />
          <text x="5" y="35" fontSize="12">
            {max}
          </text>
          <text x="5" y="178" fontSize="12">
            {min}
          </text>
          {points.map((p, i) =>
            p.measurement &&
            Number.isFinite(Number(p.measurement.raw_value)) ? (
              <g key={p.assessment.id}>
                {i > 0 && points[i - 1].measurement && (
                  <line
                    x1={x(i - 1)}
                    y1={y(points[i - 1].measurement!)}
                    x2={x(i)}
                    y2={y(p.measurement)}
                    stroke="#315bc9"
                    strokeWidth="3"
                  />
                )}
                <circle cx={x(i)} cy={y(p.measurement)} r="5" fill="#315bc9" />
              </g>
            ) : null,
          )}
        </svg>
      )}
      <div className="table-scroll">
        <table>
          <caption>
            Valores e lacunas de {metric.metric} ({metric.unit})
          </caption>
          <thead>
            <tr>
              <th>Data</th>
              <th>Valor</th>
              <th>Comparabilidade</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.assessment.id}>
                <td>
                  {new Date(p.assessment.assessed_at).toLocaleString("pt-BR", {
                    timeZone: assessmentTimeZone,
                  })}
                </td>
                <td>
                  {p.measurement
                    ? `${p.measurement.raw_value} ${metric.unit}`
                    : "—"}
                </td>
                <td>
                  {p.measurement
                    ? "Método, protocolo, ponto, lado e unidade compatíveis"
                    : "Sem comparação direta / medida ausente"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!points.length && (
        <p className="muted">Nenhuma avaliação concluída neste intervalo.</p>
      )}
    </section>
  );
}
