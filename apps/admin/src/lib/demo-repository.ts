import type { AcademySubscription, Assessment, Equipment, Exercise, FoodCatalogItem, MealPlan, Membership, RepositoryContext, Student, Tenant, TenantRecord, User, Workout } from "./domain";
import * as data from "./demo-data";
import { canManageBilling, canPublishMealPlan } from "./permissions";

export { demoIds } from "./demo-data";

export interface DemoRepository {
  readonly mode: "demo";
  getUser(userId: string): User | undefined;
  getTenants(userId: string): Tenant[];
  getMembership(context: RepositoryContext): Membership | undefined;
  getStudents(context: RepositoryContext): Student[];
  getExercises(context: RepositoryContext): Exercise[];
  getEquipment(context: RepositoryContext): Equipment[];
  getWorkouts(context: RepositoryContext): Workout[];
  getAssessments(context: RepositoryContext): Assessment[];
  getFoods(context: RepositoryContext): FoodCatalogItem[];
  getMealPlans(context: RepositoryContext): MealPlan[];
  getTeam(context: RepositoryContext): User[];
  getSubscription(context: RepositoryContext): AcademySubscription | undefined;
}

function getMembership(context: RepositoryContext): Membership | undefined {
  return structuredClone(data.memberships.find((item) => item.userId === context.userId && item.tenantId === context.tenantId && item.status === "active"));
}

function scoped<T extends TenantRecord>(records: readonly T[], context: RepositoryContext): T[] {
  const membership = getMembership(context);
  if (!membership || !membership.roles.some((role) => role === "admin" || role === "professor" || role === "nutritionist")) return [];
  return structuredClone(records.filter((item) => item.tenantId === context.tenantId));
}

function getStudents(context: RepositoryContext): Student[] {
  const membership = getMembership(context);
  return scoped(data.students, context).filter((student) =>
    membership?.roles.includes("admin") ||
    (membership?.roles.includes("professor") && student.coachIds.includes(context.userId)) ||
    (membership?.roles.includes("nutritionist") && student.dietitianIds.includes(context.userId) && student.nutritionConsent),
  );
}

export const demoRepository: DemoRepository = {
  mode: "demo",
  getUser: (userId) => structuredClone(data.users.find((item) => item.id === userId)),
  getTenants: (userId) => structuredClone(data.tenants.filter((tenant) => getMembership({ userId, tenantId: tenant.id }))),
  getMembership,
  getStudents,
  getExercises: (context) => scoped(data.exercises, context),
  getEquipment: (context) => scoped(data.equipment, context),
  getFoods: (context) => scoped(data.foods, context),
  getWorkouts: (context) => {
    const studentIds = new Set(getStudents(context).map((student) => student.id));
    return scoped(data.workouts, context).filter((workout) => workout.studentIds.some((id) => studentIds.has(id)));
  },
  getAssessments: (context) => {
    const studentIds = new Set(getStudents(context).map((student) => student.id));
    return scoped(data.assessments, context).filter((assessment) => studentIds.has(assessment.studentId));
  },
  getMealPlans: (context) => {
    const user = data.users.find((item) => item.id === context.userId);
    const membership = getMembership(context);
    return scoped(data.mealPlans, context).filter((plan) => {
      const student = data.students.find((item) => item.id === plan.studentId && item.tenantId === context.tenantId);
      return user && student && canPublishMealPlan(user, membership, student);
    });
  },
  getTeam: (context) => {
    if (!getMembership(context)?.roles.includes("admin")) return [];
    const userIds = new Set(data.memberships.filter((item) => item.tenantId === context.tenantId && item.status === "active").map((item) => item.userId));
    return structuredClone(data.users.filter((item) => userIds.has(item.id)));
  },
  getSubscription: (context) => {
    const user = data.users.find((item) => item.id === context.userId);
    if (!user || !canManageBilling(user, getMembership(context), context.tenantId)) return undefined;
    return scoped(data.subscriptions, context)[0];
  },
};
