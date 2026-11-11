import type { PlatformPlan, PlatformPlanVersion, PlanFeatures } from "@/lib/platform-api";

export const PLAN_FEATURES = [
  ["student_app", "App do aluno"],
  ["workouts", "Gestão de treinos"],
  ["assessments", "Avaliações físicas"],
  ["nutrition", "Nutrição (planos alimentares)"],
  ["reports_metrics", "Relatórios e métricas"],
  ["priority_support", "Suporte prioritário"],
  ["multiple_units", "Múltiplas unidades"],
  ["landing_page", "Página padrão para a academia"],
  ["landing_page_custom", "Página customizada para a academia"],
] as const;

export const PLAN_LIMITS = [
  ["active_students", "Alunos ativos"],
  ["team_members", "Equipe"],
  ["units", "Unidades"],
] as const;

const featureLabels = new Map<string, string>(PLAN_FEATURES);
const limitLabels = new Map<string, string>(PLAN_LIMITS);

export function latestPlanVersion(plan: PlatformPlan) {
  return plan.versions.reduce<PlatformPlanVersion | undefined>(
    (latest, version) => (!latest || version.version > latest.version ? version : latest),
    undefined,
  );
}

export function orderedPlanVersions(plan: PlatformPlan) {
  return [...plan.versions].sort((left, right) => right.version - left.version);
}

export function isQuotePrice(version: PlatformPlanVersion | undefined) {
  return !version || version.monthly_price_minor === 0;
}

export function featureLabel(code: string) {
  return featureLabels.get(code) ?? code;
}

/** Feature codes (catalog order) that are enabled in the `has_*` flag map. */
export function enabledFeatureCodes(features: PlanFeatures | undefined): string[] {
  if (!features) return [];
  return PLAN_FEATURES.flatMap(([code]) => (features[`has_${code}`] ? [code] : []));
}

/** Build the `has_*` flag map the publish endpoint expects from a draft's code list. */
export function featuresToFlags(codes: string[]): PlanFeatures {
  const flags = {} as PlanFeatures;
  for (const [code] of PLAN_FEATURES) {
    flags[`has_${code}` as keyof PlanFeatures] = codes.includes(code);
  }
  return flags;
}

export function limitSummary(limits: Record<string, number>) {
  const known = PLAN_LIMITS.map(([key, label]) => {
    const value = limits[key];
    return `${label}: ${value === undefined ? "ilimitado" : value}`;
  });
  const extra = Object.keys(limits).filter((key) => !limitLabels.has(key));
  return [...known, ...extra.map((key) => `${key}: ${limits[key]}`)].join(" · ");
}

/** Every known feature with its on/off state, sorted alphabetically by label. */
export function featureRows(
  features: PlanFeatures | undefined,
): Array<{ code: string; label: string; enabled: boolean }> {
  const map = (features ?? {}) as Record<string, boolean>;
  return PLAN_FEATURES.map(([code, label]) => ({
    code,
    label,
    enabled: map[`has_${code}`] === true,
  })).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

/** Known limits plus any extra keys, in catalog order. */
export function limitRows(
  limits: Record<string, number> = {},
): Array<{ key: string; label: string; value: string }> {
  const known = PLAN_LIMITS.map(([key, label]) => ({
    key,
    label,
    value: limits[key] === undefined ? "ilimitado" : String(limits[key]),
  }));
  const extra = Object.keys(limits)
    .filter((key) => !limitLabels.has(key))
    .map((key) => ({ key, label: key, value: String(limits[key]) }));
  return [...known, ...extra];
}

export interface PlanDraft {
  currency: string;
  price: string;
  features: string[];
  limits: Record<string, string>;
  reason: string;
}

export function draftFromVersion(version: PlatformPlanVersion | undefined): PlanDraft {
  const limits: Record<string, string> = {};
  for (const [key] of PLAN_LIMITS) limits[key] = version?.limits[key]?.toString() ?? "";
  return {
    currency: version?.currency || "BRL",
    price: version && version.monthly_price_minor > 0
      ? (version.monthly_price_minor / 100).toFixed(2).replace(".", ",")
      : "",
    features: enabledFeatureCodes(version?.features),
    limits,
    reason: "",
  };
}

export function planPublishPayload(draft: PlanDraft) {
  const reason = draft.reason.trim();
  if (reason.length < 10) {
    return { ok: false as const, error: "Informe um motivo com pelo menos 10 caracteres." };
  }
  const currency = draft.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false as const, error: "Informe a moeda com 3 letras, por exemplo BRL." };
  }
  const priceInput = draft.price.trim();
  let monthlyPriceMinor = 0;
  if (priceInput) {
    const normalized = priceInput.includes(",")
      ? priceInput.replace(/\./g, "").replace(",", ".")
      : priceInput;
    const price = Number(normalized);
    if (!Number.isFinite(price) || price < 0) {
      return { ok: false as const, error: "Informe um preço mensal válido." };
    }
    monthlyPriceMinor = Math.round(price * 100);
  }
  const limits: Record<string, number> = {};
  for (const [key, raw] of Object.entries(draft.limits)) {
    if (!raw.trim()) continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      return { ok: false as const, error: `Informe um limite inteiro para ${limitLabels.get(key) ?? key}.` };
    }
    limits[key] = value;
  }
  const amount = new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    monthlyPriceMinor / 100,
  );
  return {
    ok: true as const,
    payload: {
      reason,
      features: featuresToFlags(draft.features),
      limits,
      price_reference: monthlyPriceMinor ? `${amount}/mês` : "Consulte",
      monthly_price_minor: monthlyPriceMinor,
      currency,
    },
  };
}
