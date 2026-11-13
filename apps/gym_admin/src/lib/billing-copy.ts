import type { SubscriptionStatus } from "./admin-contracts";

export const subscriptionLabels: Record<SubscriptionStatus, string> = {
  pilot: "Piloto provisionado",
  trial: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  delinquent: "Inadimplente",
  cancel_scheduled: "Cancelamento agendado",
  cancelled: "Cancelada",
  suspended: "Suspensa",
};

export const usageLabels: Record<string, string> = {
  active_students: "Alunos ativos",
  team_members: "Pessoas da equipe",
  units: "Unidades",
  students: "Alunos",
};

export const featureLabels: Record<string, string> = {
  student_app: "Aplicativo do aluno",
  workouts: "Treinos",
  assessments: "Avaliações",
  nutrition: "Nutrição",
  reports_metrics: "Relatórios",
  priority_support: "Suporte prioritário",
  multiple_units: "Várias unidades",
  landing_page: "Página da academia",
  landing_page_custom: "Página com domínio próprio",
};

export function formatInvoiceAmount(currency: string, amountMinor: number) {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(amountMinor / 100);
  } catch {
    return `${amountMinor} ${currency || "unidades"}`.trim();
  }
}

export function formatDay(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "Não informado";
}

export function usageLabel(key: string) {
  return usageLabels[key] ?? key;
}

export function featureLabel(key: string) {
  return featureLabels[key] ?? key;
}
