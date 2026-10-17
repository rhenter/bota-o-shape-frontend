import type {
  ApiCredential,
  ApiDietitianAssignment,
  ApiFood,
  FoodSnapshot,
  ApiMealPlan,
  MealPlanInput,
  MealVersionInput,
  ApiMealVersion,
  ApiSubscription,
  ApiInvoice,
  ApiEntitlement,
  ApiUnit,
} from "./admin-contracts";
export type * from "./admin-contracts";
import type {
  ApiWorkoutTemplate,
  WorkoutTemplateInput,
  ApiWorkoutAssignment,
  WorkoutAssignmentInput,
  ApiWorkoutSession,
  ApiMeasurementProtocol,
  ApiAssessment,
  AssessmentInput,
  AssessmentStatus,
  ApiAssessmentReport,
  ApiConsent,
} from "./training-contracts";
export type * from "./training-contracts";
// DTOs mirror the local Django API serializers, not demo view models.
export type ApiRole =
  "owner" | "admin" | "coach" | "dietitian" | "student" | "billing.manage";
export interface ApiTenant {
  id: string;
  name: string;
  legal_name: string;
  cnpj: string | null;
  is_active: boolean;
}
export interface ApiUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
}
export interface ApiMembership {
  id: string;
  user: string;
  email: string;
  status: "invited" | "active" | "inactive" | "archived";
  roles: ApiRole[];
}
export interface ApiEquipment {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}
export interface ApiMuscle {
  id: string;
  name: string;
}
export interface ApiExercise {
  id: string;
  name: string;
  description: string;
  instructions: Record<string, unknown>;
  movement_pattern: string;
  tracking_type:
    "load_reps" | "bodyweight_reps" | "duration" | "distance" | "activity";
  review_status: "draft" | "reviewed" | "archived";
  equipment: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
}
export interface ApiAssignment {
  id: string;
  coach: string;
  student: string;
  is_active: boolean;
}
interface Tokens {
  access: string;
  refresh: string;
}
interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private tokens: Tokens | null = null;
  private refreshing: Promise<void> | null = null;
  private sessionListeners = new Set<(authenticated: boolean) => void>();
  constructor(
    private baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://127.0.0.1:8000",
    private fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}
  get authenticated() {
    return this.tokens !== null;
  }
  subscribeSession(listener: (authenticated: boolean) => void) {
    this.sessionListeners.add(listener);
    return () => {
      this.sessionListeners.delete(listener);
    };
  }
  private setSession(tokens: Tokens | null) {
    this.tokens = tokens;
    for (const listener of this.sessionListeners) listener(this.authenticated);
  }
  // This is an identifier hint only. The API authorizes every subsequent request.
  get userId(): string | undefined {
    try {
      return JSON.parse(
        atob(
          this.tokens!.access.split(".")[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/"),
        ),
      ).user_id;
    } catch {
      return undefined;
    }
  }
  clearSession() {
    this.setSession(null);
  }
  async login(email: string, password: string) {
    this.clearSession();
    const tokens = await this.request<Tokens>(
      "/api/user/auth/token/",
      { method: "POST", body: JSON.stringify({ email, password }) },
      undefined,
      false,
    );
    this.setSession(tokens);
  }
  async logout() {
    const refresh = this.tokens?.refresh;
    this.clearSession();
    if (refresh)
      await this.request<void>(
        "/api/user/auth/token/revoke/",
        { method: "POST", body: JSON.stringify({ refresh }) },
        undefined,
        false,
      );
  }
  private async rotate() {
    const refresh = this.tokens?.refresh;
    if (!refresh)
      throw new ApiError(401, "Sua sessão terminou. Entre novamente.");
    try {
      const tokens = await this.request<Tokens>(
        "/api/user/auth/token/refresh/",
        { method: "POST", body: JSON.stringify({ refresh }) },
        undefined,
        false,
      );
      // Do not restore a session that was explicitly closed while refresh was pending.
      if (this.tokens?.refresh === refresh) this.setSession(tokens);
    } catch (error) {
      this.clearSession();
      throw error;
    }
  }
  async request<T>(
    path: string,
    options: RequestInit = {},
    tenantId?: string,
    authenticated = true,
    retry = true,
  ): Promise<T> {
    const headers = new Headers(options.headers);
    if (options.body && !(options.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    if (authenticated) {
      if (!this.tokens)
        throw new ApiError(401, "Entre para acessar sua academia.");
      headers.set("Authorization", `Bearer ${this.tokens.access}`);
    }
    if (tenantId) headers.set("X-Tenant-ID", tenantId);
    let response: Response;
    try {
      response = await this.fetcher(
        `${this.baseUrl.replace(/\/$/, "")}${path}`,
        {
          ...options,
          headers,
          cache: "no-store",
          signal: options.signal ?? AbortSignal.timeout(15000),
        },
      );
    } catch {
      throw new ApiError(
        0,
        "Não foi possível conectar à API. Verifique o serviço e tente novamente.",
      );
    }
    if (response.status === 401 && authenticated && retry) {
      this.refreshing ??= this.rotate().finally(() => {
        this.refreshing = null;
      });
      await this.refreshing;
      return this.request<T>(path, options, tenantId, authenticated, false);
    }
    if (!response.ok) {
      if (response.status === 401 && authenticated) this.clearSession();
      const messages: Record<number, string> = {
        400: "Confira os campos informados. A API recusou os dados.",
        401: "Credenciais inválidas ou sessão encerrada. Entre novamente.",
        403: "Você não tem permissão para esta ação na academia ativa.",
        404: "Registro não encontrado nesta academia.",
        429: "Muitas solicitações. Aguarde e tente novamente.",
      };
      throw new ApiError(
        response.status,
        messages[response.status] ??
          "O serviço não concluiu a solicitação. Tente novamente.",
      );
    }
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  }
  async list<T>(path: string, tenantId?: string): Promise<T[]> {
    const items: T[] = [];
    let next: string | null = path;
    const visited = new Set<string>();
    while (next) {
      if (visited.has(next))
        throw new ApiError(
          0,
          "A paginação da API retornou uma resposta inválida.",
        );
      visited.add(next);
      const page: Page<T> | T[] = await this.request(next, {}, tenantId);
      if (Array.isArray(page)) return [...items, ...page];
      items.push(...page.results);
      // Never send Authorization to an origin supplied by a pagination response.
      if (page.next) {
        const url: URL = new URL(page.next, this.baseUrl);
        if (
          url.origin !== new URL(this.baseUrl).origin ||
          !url.pathname.startsWith("/api/")
        )
          throw new ApiError(
            0,
            "A paginação da API retornou uma origem inválida.",
          );
        next = `${url.pathname}${url.search}`;
      } else next = null;
    }
    return items;
  }
  getCredentials = (tenant: string) =>
    this.list<ApiCredential>("/api/tenancy/credentials/", tenant);
  saveCredential = (
    tenant: string,
    data: Omit<ApiCredential, "id" | "verified_at">,
  ) =>
    this.request<ApiCredential>(
      "/api/tenancy/credentials/",
      { method: "POST", body: JSON.stringify(data) },
      tenant,
    );
  verifyCredential = (tenant: string, id: string) =>
    this.request<ApiCredential>(
      `/api/tenancy/credentials/${encodeURIComponent(id)}/verify/`,
      { method: "POST" },
      tenant,
    );
  getDietitianAssignments = (tenant: string) =>
    this.list<ApiDietitianAssignment>(
      "/api/tenancy/dietitian-assignments/",
      tenant,
    );
  saveDietitianAssignment = (
    tenant: string,
    data: Omit<ApiDietitianAssignment, "id">,
  ) =>
    this.request<ApiDietitianAssignment>(
      "/api/tenancy/dietitian-assignments/",
      { method: "POST", body: JSON.stringify(data) },
      tenant,
    );
  getFoods = (tenant: string) => this.list<ApiFood>("/api/food/foods/", tenant);
  getFood = (tenant: string, id: string) =>
    this.request<ApiFood>(
      `/api/food/foods/${encodeURIComponent(id)}/`,
      {},
      tenant,
    );
  calculateFood = (tenant: string, id: string, grams: string) =>
    this.request<FoodSnapshot>(
      `/api/food/foods/${encodeURIComponent(id)}/calculate/`,
      { method: "POST", body: JSON.stringify({ grams }) },
      tenant,
    );
  getMealPlans = (tenant: string, studentId: string) =>
    this.list<ApiMealPlan>(
      `/api/nutrition/plans/?student=${encodeURIComponent(studentId)}`,
      tenant,
    );
  getMealPlan = (tenant: string, id: string) =>
    this.request<ApiMealPlan>(
      `/api/nutrition/plans/${encodeURIComponent(id)}/`,
      {},
      tenant,
    );
  createMealPlan = (tenant: string, data: MealPlanInput) =>
    this.request<ApiMealPlan>(
      "/api/nutrition/plans/",
      { method: "POST", body: JSON.stringify(data) },
      tenant,
    );
  publishMealPlan = (tenant: string, id: string) =>
    this.request<ApiMealPlan>(
      `/api/nutrition/plans/${encodeURIComponent(id)}/publish/`,
      { method: "POST" },
      tenant,
    );
  reviseMealPlan = (tenant: string, id: string, data: MealVersionInput) =>
    this.request<ApiMealVersion>(
      `/api/nutrition/plans/${encodeURIComponent(id)}/revise/`,
      { method: "POST", body: JSON.stringify(data) },
      tenant,
    );
  getSubscriptions = (tenant: string) =>
    this.list<ApiSubscription>("/api/billing/subscriptions/", tenant);
  getInvoices = (tenant: string) =>
    this.list<ApiInvoice>("/api/billing/invoices/", tenant);
  getEntitlements = (tenant: string) =>
    this.list<ApiEntitlement>("/api/billing/entitlements/", tenant);
  openBilling = (
    tenant: string,
    id: string,
    action: "portal" | "checkout",
    returnUrl: string,
  ) =>
    this.request<{ url: string }>(
      `/api/billing/subscriptions/${encodeURIComponent(id)}/${action}/`,
      { method: "POST", body: JSON.stringify({ return_url: returnUrl }) },
      tenant,
    );
  getUnits = (tenant: string) =>
    this.list<ApiUnit>("/api/tenancy/units/", tenant);
  saveUnit = (
    tenant: string,
    id: string,
    data: Pick<ApiUnit, "name" | "is_active">,
  ) =>
    this.request<ApiUnit>(
      `/api/tenancy/units/${encodeURIComponent(id)}/`,
      { method: "PATCH", body: JSON.stringify(data) },
      tenant,
    );
  getWorkoutTemplates = (tenant: string) =>
    this.list<ApiWorkoutTemplate>("/api/workouts/templates/", tenant);
  getWorkoutTemplate = (tenant: string, id: string) =>
    this.request<ApiWorkoutTemplate>(
      `/api/workouts/templates/${encodeURIComponent(id)}/`,
      {},
      tenant,
    );
  createWorkoutTemplate = (tenant: string, data: WorkoutTemplateInput) =>
    this.request<ApiWorkoutTemplate>(
      "/api/workouts/templates/",
      { method: "POST", body: JSON.stringify(data) },
      tenant,
    );
  // Nested writes are supported only on create by the current Django serializer.
  updateWorkoutMetadata = (
    tenant: string,
    id: string,
    data: Omit<WorkoutTemplateInput, "days">,
  ) =>
    this.request<ApiWorkoutTemplate>(
      `/api/workouts/templates/${encodeURIComponent(id)}/`,
      { method: "PATCH", body: JSON.stringify(data) },
      tenant,
    );
  publishWorkout = (tenant: string, id: string) =>
    this.request<ApiWorkoutTemplate>(
      `/api/workouts/templates/${encodeURIComponent(id)}/publish/`,
      { method: "POST" },
      tenant,
    );
  reviseWorkout = (tenant: string, id: string) =>
    this.request<ApiWorkoutTemplate>(
      `/api/workouts/templates/${encodeURIComponent(id)}/revise/`,
      { method: "POST" },
      tenant,
    );
  getWorkoutAssignments = (tenant: string) =>
    this.list<ApiWorkoutAssignment>("/api/workouts/assignments/", tenant);
  createWorkoutAssignment = (tenant: string, data: WorkoutAssignmentInput) =>
    this.request<ApiWorkoutAssignment>(
      "/api/workouts/assignments/",
      { method: "POST", body: JSON.stringify(data) },
      tenant,
    );
  getWorkoutSessions = (tenant: string) =>
    this.list<ApiWorkoutSession>("/api/workouts/sessions/", tenant);
  getAssessmentProtocols = (tenant: string) =>
    this.list<ApiMeasurementProtocol>("/api/assessments/protocols/", tenant);
  getAssessments = (tenant: string) =>
    this.list<ApiAssessment>("/api/assessments/assessments/", tenant);
  createAssessment = (tenant: string, data: AssessmentInput) =>
    this.request<ApiAssessment>(
      "/api/assessments/assessments/",
      { method: "POST", body: JSON.stringify(data) },
      tenant,
    );
  transitionAssessment = (
    tenant: string,
    id: string,
    status: AssessmentStatus,
  ) =>
    this.request<ApiAssessment>(
      `/api/assessments/assessments/${encodeURIComponent(id)}/transition/`,
      { method: "POST", body: JSON.stringify({ status }) },
      tenant,
    );
  getAssessmentReport = (tenant: string, id: string) =>
    this.request<ApiAssessmentReport>(
      `/api/assessments/assessments/${encodeURIComponent(id)}/report/`,
      {},
      tenant,
    );
  getConsents = (tenant: string) =>
    this.list<ApiConsent>("/api/tenancy/consents/", tenant);
  getTenants = () => this.list<ApiTenant>("/api/tenancy/tenants/");
  getUsers = (tenant: string) => this.list<ApiUser>("/api/user/users/", tenant);
  getUser = (tenant: string, id: string) =>
    this.request<ApiUser>(
      `/api/user/users/${encodeURIComponent(id)}/`,
      {},
      tenant,
    );
  updateUser = (
    tenant: string,
    id: string,
    data: Pick<ApiUser, "first_name" | "last_name">,
  ) =>
    this.request<ApiUser>(
      `/api/user/users/${encodeURIComponent(id)}/`,
      { method: "PATCH", body: JSON.stringify(data) },
      tenant,
    );
  getMemberships = (tenant: string) =>
    this.list<ApiMembership>("/api/tenancy/memberships/", tenant);
  getEquipment = (tenant: string) =>
    this.list<ApiEquipment>("/api/workouts/equipment/", tenant);
  getExercises = (tenant: string) =>
    this.list<ApiExercise>("/api/workouts/exercises/", tenant);
  getExercise = (tenant: string, id: string) =>
    this.request<ApiExercise>(
      `/api/workouts/exercises/${encodeURIComponent(id)}/`,
      {},
      tenant,
    );
  getMuscles = (tenant: string) =>
    this.list<ApiMuscle>("/api/workouts/muscle-groups/", tenant);
  getCoachAssignments = (tenant: string) =>
    this.list<ApiAssignment>("/api/tenancy/coach-assignments/", tenant);
  saveEquipment = (
    tenant: string,
    data: Omit<ApiEquipment, "id">,
    id?: string,
  ) =>
    this.request<ApiEquipment>(
      `/api/workouts/equipment/${id ? `${encodeURIComponent(id)}/` : ""}`,
      { method: id ? "PATCH" : "POST", body: JSON.stringify(data) },
      tenant,
    );
  saveExercise = (tenant: string, data: Omit<ApiExercise, "id">, id?: string) =>
    this.request<ApiExercise>(
      `/api/workouts/exercises/${id ? `${encodeURIComponent(id)}/` : ""}`,
      { method: id ? "PATCH" : "POST", body: JSON.stringify(data) },
      tenant,
    );
  archiveMembership = (tenant: string, id: string, restore = false) =>
    this.request<ApiMembership>(
      `/api/tenancy/memberships/${encodeURIComponent(id)}/${restore ? "restore" : "archive"}/`,
      { method: "POST" },
      tenant,
    );
  setRoles = (tenant: string, id: string, roles: ApiRole[]) =>
    this.request<ApiMembership>(
      `/api/tenancy/memberships/${encodeURIComponent(id)}/roles/`,
      { method: "PUT", body: JSON.stringify({ roles }) },
      tenant,
    );
  invite = (tenant: string, email: string, roles: ApiRole[]) =>
    this.request<{ id: string }>(
      "/api/tenancy/memberships/invite/",
      { method: "POST", body: JSON.stringify({ email, roles }) },
      tenant,
    );
  acceptInvitation = (data: {
    token: string;
    password: string;
    first_name: string;
    last_name?: string;
  }) =>
    this.request<ApiMembership>(
      "/api/tenancy/invitations/accept/",
      { method: "POST", body: JSON.stringify(data) },
      undefined,
      false,
    );
  requestPasswordReset = (email: string) =>
    this.request<{ detail: string }>(
      "/api/user/auth/password-reset/",
      { method: "POST", body: JSON.stringify({ email }) },
      undefined,
      false,
    );
  confirmPasswordReset = (data: {
    uid: string;
    token: string;
    password: string;
  }) =>
    this.request<void>(
      "/api/user/auth/password-reset/confirm/",
      { method: "POST", body: JSON.stringify(data) },
      undefined,
      false,
    );
  resetUserPassword = (tenant: string, id: string) =>
    this.request<void>(
      `/api/user/users/${encodeURIComponent(id)}/request_password_reset/`,
      { method: "POST" },
      tenant,
    );
}

export const apiClient = new ApiClient();
