import type { AcademySubscription, Assessment, Equipment, Exercise, FoodCatalogItem, MealPlan, Membership, Student, Tenant, User, Workout } from "./domain";

// Fictitious fixtures only. No external catalog was imported or clinically reviewed.
export const demoIds = {
  user: "00000000-0000-4000-8000-000000000001",
  tenant: "00000000-0000-4000-8000-000000000101",
  secondTenant: "00000000-0000-4000-8000-000000000102",
  student: "00000000-0000-4000-8000-000000000201",
  secondStudent: "00000000-0000-4000-8000-000000000202",
  exercise: "00000000-0000-4000-8000-000000000301",
  equipment: "00000000-0000-4000-8000-000000000401",
  food: "00000000-0000-4000-8000-000000000501",
} as const;

export const users: readonly User[] = [{
  id: demoIds.user, name: "Mariana Costa", email: "mariana@example.test",
  nutritionRegistration: { crn: "DEMO-00000", uf: "SP", status: "verified" },
}];

export const tenants: readonly Tenant[] = [
  { id: demoIds.tenant, name: "Academia Horizonte", legalName: "Horizonte Demonstração", cnpj: "CNPJ fictício · Matriz" },
  { id: demoIds.secondTenant, name: "Academia Movimento", legalName: "Movimento Demonstração", cnpj: "CNPJ fictício · Unidade Centro" },
];

export const memberships: readonly Membership[] = [
  { id: "00000000-0000-4000-8000-000000000601", tenantId: demoIds.tenant, userId: demoIds.user, status: "active", roles: ["admin", "professor", "nutritionist"], permissions: ["billing.manage"] },
  { id: "00000000-0000-4000-8000-000000000602", tenantId: demoIds.secondTenant, userId: demoIds.user, status: "active", roles: ["professor"], permissions: [] },
];

export const students: readonly Student[] = [
  { id: demoIds.student, tenantId: demoIds.tenant, name: "João Pedro Silva", email: "joao@example.test", status: "active", coachIds: [demoIds.user], dietitianIds: [demoIds.user], nutritionConsent: true, goal: "Manter uma rotina de treinos", restrictions: "Sem restrições declaradas neste exemplo." },
  { id: demoIds.secondStudent, tenantId: demoIds.tenant, name: "Ana Clara Souza", email: "ana@example.test", status: "active", coachIds: [demoIds.user], dietitianIds: [], nutritionConsent: false, goal: "Melhorar o condicionamento" },
  { id: "00000000-0000-4000-8000-000000000203", tenantId: demoIds.tenant, name: "Bruno Almeida", email: "bruno@example.test", status: "archived", coachIds: [], dietitianIds: [], nutritionConsent: false },
  { id: "00000000-0000-4000-8000-000000000204", tenantId: demoIds.secondTenant, name: "Camila Ferreira", email: "camila@example.test", status: "active", coachIds: [demoIds.user], dietitianIds: [], nutritionConsent: false },
];

export const equipment: readonly Equipment[] = [{ id: demoIds.equipment, tenantId: demoIds.tenant, name: "Halteres", location: "Sala de musculação", status: "available" }];

export const exercises: readonly Exercise[] = [{
  id: demoIds.exercise, tenantId: demoIds.tenant, name: "Agachamento com halter",
  primaryMuscle: "Quadríceps", secondaryMuscles: ["Glúteos"], equipmentIds: [demoIds.equipment], recordType: "load_reps",
  preparation: "Conteúdo de demonstração. Aguarda revisão profissional.",
  instructions: ["A execução e a mídia serão disponibilizadas após revisão profissional."],
  breathing: "Aguarda revisão profissional.", commonMistakes: [], status: "draft",
}];

export const workouts: readonly Workout[] = [{
  id: "00000000-0000-4000-8000-000000000701", tenantId: demoIds.tenant,
  name: "Treino A · Demonstração", goal: "Exemplo de ficha, sem prescrição real", version: 1, status: "draft", studentIds: [demoIds.student],
  exercises: [{ id: "00000000-0000-4000-8000-000000000702", exerciseId: demoIds.exercise,
    coachObservation: "Exemplo de observação do professor. Validar com o profissional responsável.",
    sets: [{ id: "00000000-0000-4000-8000-000000000703", repetitions: "10–12", restSeconds: 60, note: "Alvo ilustrativo, sem recomendação automática." }],
  }],
}];

export const assessments: readonly Assessment[] = [{
  id: "00000000-0000-4000-8000-000000000801", tenantId: demoIds.tenant, studentId: demoIds.student,
  assessedAt: "2026-10-10T12:00:00Z", assessorId: demoIds.user, method: "circumference", protocol: "Perímetros · exemplo",
  conditions: "Condições fictícias para demonstração; manter protocolo consistente em coletas reais.",
  measurements: [{ name: "Cintura", value: 82, unit: "cm", anatomicalPoint: "Ponto médio entre última costela e crista ilíaca" }],
  released: true, notes: "Medida fictícia. Sem interpretação clínica automática.",
}];

export const foods: readonly FoodCatalogItem[] = [{
  id: demoIds.food, tenantId: demoIds.tenant, name: "Arroz · exemplo fictício", preparation: "Cozido",
  source: "demo", sourceId: "demo-rice", sourceVersion: "demo-2026-10", dataType: "demo",
  nutrientsPer100g: { energyKcal: 120, proteinG: 2.5, availableCarbohydrateG: 26, totalCarbohydrateG: null, fatG: 0.5, fiberG: null },
  portions: [],
}];

export const mealPlans: readonly MealPlan[] = [{
  id: "00000000-0000-4000-8000-000000000901", tenantId: demoIds.tenant, studentId: demoIds.student,
  authorId: demoIds.user, authorCrn: "DEMO-00000", authorUf: "SP", name: "Plano ilustrativo", version: 1,
  status: "draft", startsAt: "2026-10-17T00:00:00Z", reviewAt: "2026-11-17T00:00:00Z",
  changeSummary: "Rascunho de demonstração; sem orientação individual real.", meals: [],
}];

export const subscriptions: readonly AcademySubscription[] = [{
  id: "00000000-0000-4000-8000-000000001001", tenantId: demoIds.tenant, status: "pilot",
  planName: "Piloto de demonstração · valores a definir", billingContact: "financeiro@example.test", periodEnd: "2026-11-17T00:00:00Z",
}];
