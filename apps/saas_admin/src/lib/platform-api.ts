import type {
  BillingOperation,
  FiscalDocument,
  PlatformInvoiceDetail,
  ProviderBalance,
  ProviderConfiguration,
  ProviderReceivablesPage,
  ProviderWrite,
} from "./billing";

export interface PlatformTokens {
  access: string;
  refresh: string;
}

export type PlatformCapability =
  | "platform.manage"
  | "accounts.read"
  | "subscriptions.read"
  | "plans.manage"
  | "billing.manage"
  | "charges.read"
  | "finance.read"
  | "operations.read"
  | "integrations.manage"
  | "legal.manage"
  | "support.manage"
  | "settings.manage"
  | "audit.read";

export interface PlatformMembership {
  id: string;
  email: string;
  name: string;
  role: "administrator" | "staff";
  capabilities: PlatformCapability[];
  is_active: boolean;
  mfa_enabled: boolean;
}

export interface PlatformAccountMembership {
  id: string;
  user_id: string;
  email: string;
  name: string;
  status: string;
  roles: string[];
}

export interface PlatformAccount {
  id: string;
  name: string;
  legal_name: string;
  person_type: "individual" | "legal_entity";
  tax_id: string | null;
  profile: "gym" | "personal_trainer" | "nutritionist" | "multidisciplinary";
  is_active: boolean;
  created_at: string;
  owners: PlatformAccountMembership[];
  memberships: PlatformAccountMembership[];
  units: Array<{ id: string; name: string; is_active: boolean }>;
  subscription: null | {
    id: string;
    status: string;
    billing_cycle: string;
    provider: string;
    current_period_start: string | null;
    current_period_end: string | null;
    grace_ends_at: string | null;
    cancel_at: string | null;
    plan: {
      id: string;
      code: string;
      name: string;
      version: number;
      features: PlanFeatures;
      limits: Record<string, number>;
      monthly_price_minor: number;
      currency: string;
      is_active: boolean;
    };
  };
  entitlements: Array<{
    id: string;
    key: string;
    enabled: boolean;
    limit: number | null;
    source: string;
  }>;
  invoices: Array<{
    id: string;
    status: string;
    currency: string;
    amount_minor: number;
    due_at: string | null;
    hosted_url: string;
    created_at: string;
  }>;
  counts: {
    memberships: number;
    units: number;
    students: number;
    professionals: number;
  };
}

export interface PlatformPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AccountFilters {
  search?: string;
  profile?: string;
  is_active?: string;
  plan?: string;
  limit?: number;
  offset?: number;
}

/** Published feature flags. The API returns a fixed set of `has_*` booleans. */
export interface PlanFeatures {
  has_student_app: boolean;
  has_workouts: boolean;
  has_assessments: boolean;
  has_nutrition: boolean;
  has_reports_metrics: boolean;
  has_priority_support: boolean;
  has_multiple_units: boolean;
  has_landing_page: boolean;
  has_landing_page_custom: boolean;
}

export interface PlatformPlanVersion {
  id: string;
  version: number;
  features: PlanFeatures;
  limits: Record<string, number>;
  price_reference: string;
  monthly_price_minor: number;
  currency: string;
  published_at: string;
}

export interface PlatformPlan {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  versions: PlatformPlanVersion[];
  sort_order: number;
}

export interface SupportTicket {
  id: string; subject: string; requester_name: string; requester_email: string;
  requester_phone: string; status: "open" | "pending" | "closed";
  priority: "low" | "normal" | "high" | "urgent"; tenant_id: string | null;
  contact_request_id: string | null; assignee_id: string | null; closed_at: string | null;
  created_at: string;
  messages: Array<{ id: string; channel: "email" | "whatsapp"; body: string; outbound: boolean; created_at: string }>;
  notes: Array<{ id: string; body: string; author_id: string; created_at: string }>;
}

export interface PlatformDashboard {
  period: { start: string; end: string; updated_at: string };
  financial: { mrr: Record<string, number>; received: Record<string, number>; overdue: Record<string, number> };
  accounts: { total: number; active: number };
  memberships: { total: number; active: number };
  subscriptions: { total: number; by_status: Record<string, number> };
  invoices: { total: number; amount_minor: number; by_status: Record<string, number> };
  support: { open: number; urgent: number };
  limitations: string[];
}

export interface PlatformInvitation {
  id: string; email: string; role: PlatformMembership["role"];
  capabilities: PlatformCapability[]; expires_at: string; accepted_at: string | null;
  invited_by_email: string; created_at: string;
}

export interface PlatformAuditEvent {
  id: string; created_at: string; actor_email: string | null; action: string;
  target_type: string; target_id: string; tenant_id: string | null;
  tenant_name: string | null; metadata: Record<string, unknown>; ip_address: string | null;
}

export interface MeasurementProtocolRecord {
  id: string;
  name: string;
  version: string;
  method: string;
  sites: string[];
  equation_metadata: Record<string, unknown>;
  is_active: boolean;
}

export type MeasurementProtocolInput = Omit<MeasurementProtocolRecord, "id">;

export interface PlatformUserRecord { id: string; email: string; name: string; is_active: boolean; last_login: string | null; date_joined: string; memberships: Array<{ id: string; tenant_id: string; tenant_name: string; status: string; roles: string[] }> }
export interface PlatformSubscriptionRecord {
  id: string; account_id: string; account_name: string; account_is_active: boolean;
  modality: "paid" | "trial" | "beta"; status: string; billing_cycle: string;
  plan_version: { id: string; version: number; price_reference: string; monthly_price_minor: number; currency: string; features: PlanFeatures; limits: Record<string, number>; plan: { id: string; code: string; name: string } };
  cycle_start: string | null; cycle_end: string | null; current_period_start: string | null;
  current_period_end: string | null; paid_through: string | null; next_due_date: string | null;
  cancel_at: string | null; renewal_state: string; collection_mode: string; invoice_count: number;
}
export interface PlatformCommercial { beta: Array<{ tenant_id: string; tenant_name: string; plan: string; status: string; enabled: boolean }>; trials: Array<{ id: string; tenant_id: string; tenant_name: string; status: string; ends_at: string | null; retention_state: string }> }
export interface PlatformFinance { charges: Array<{ id: string; tenant_id: string; tenant_name: string; status: string; currency: string; amount_minor: number; due_at: string | null; hosted_url: string; created_at: string; attempts: Array<{ id: string; status: string; failure_code: string; processed_at: string | null }> }>; received: Record<string, number>; overdue: Record<string, number> }
export interface PlatformOperations { alerts: { billing_errors: number; failed_payments: number; unread_contacts: number }; events: Array<{ id: string; provider: string; event_type: string; tenant_name: string | null; processed_at: string | null; error: string; created_at: string }>; failed_payments: Array<{ id: string; tenant_name: string; invoice_id: string; status: string; failure_code: string; processed_at: string | null }> }
export interface PlatformLegal { documents: Array<{ id: string; kind: "terms" | "privacy"; version: number; text: string; published_at: string }>; data_requests: Array<{ id: string; tenant_name: string; subject_email: string; kind: string; status: string; retention_reason: string; created_at: string }> }
export interface PlatformIntegrations { billing_providers: Array<{ provider: string; accounts: number }>; email: { configured: boolean; transport: string | null; host: string }; webhooks: { events_total: number; errors: number } }
export interface PlatformContact { id: string; name: string; email: string; phone: string; subject: string; contact_type: string; message: string; status: string; is_read: boolean; read_at: string | null; read_by: string | null; source: string; page_url: string; referrer: string; user_agent: string; ip_address: string | null; consent_given_at: string | null; created_at: string; updated_at: string }
export interface ManagedFaq { id: string; question: string; answer: string; category: string; audience: string; locale: string; sort_order: number; is_published: boolean; updated_at: string }
export interface SupportContactSettings { whatsapp_number: string; whatsapp_enabled: boolean; whatsapp_prefill_default: string }

interface ApiErrorPayload {
  detail?: string;
  mfa_required?: boolean;
  [key: string]: unknown;
}

function errorText(
  payload: ApiErrorPayload,
  status: number,
  fallback: Record<number, string>,
) {
  if (typeof payload.detail === "string" && payload.detail) return payload.detail;
  const parts: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (key === "dependencies" || key === "mfa_required") continue;
    if (typeof value === "string" && value) parts.push(`${key}: ${value}`);
    if (!Array.isArray(value)) continue;
    const text = value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "message" in item) {
          return String((item as { message: unknown }).message);
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
    if (text) parts.push(`${key}: ${text}`);
  }
  return parts.join(" ") || fallback[status] || "A solicitação não foi concluída.";
}

export class PlatformApiError extends Error {
  uncertain = false;
  body: unknown = null;

  constructor(
    public status: number,
    message: string,
    public mfaRequired = false,
  ) {
    super(message);
    this.name = "PlatformApiError";
  }
}

const sessionKey = "bota-o-shape:platform-session";
const browserOrigin = () =>
  typeof window === "undefined" ? "" : window.location.origin;

function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now() + 5_000;
  } catch {
    return true;
  }
}

export class PlatformApi {
  private tokens: PlatformTokens | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(
    private baseUrl = browserOrigin(),
    private fetcher: typeof fetch = (...args) => fetch(...args),
    private storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null =
      typeof window === "undefined" ? null : window.sessionStorage,
  ) {}

  get authenticated() {
    return this.tokens !== null;
  }

  restore() {
    const stored = this.storage?.getItem(sessionKey);
    if (!stored) return false;
    try {
      this.tokens = JSON.parse(stored) as PlatformTokens;
      return Boolean(this.tokens.access && this.tokens.refresh);
    } catch {
      this.clearSession();
      return false;
    }
  }

  clearSession() {
    this.tokens = null;
    this.refreshPromise = null;
    this.storage?.removeItem(sessionKey);
  }

  private saveSession(tokens: PlatformTokens) {
    this.tokens = tokens;
    this.storage?.setItem(sessionKey, JSON.stringify(tokens));
  }

  async login(
    email: string,
    password: string,
    secondFactor: { otp?: string; recovery_code?: string } = {},
  ) {
    this.clearSession();
    const tokens = await this.request<PlatformTokens>(
      "/api/v1/platform/auth/login/",
      {
        method: "POST",
        body: JSON.stringify({ email, password, ...secondFactor }),
      },
      false,
    );
    this.saveSession(tokens);
  }

  async logout() {
    const refresh = this.tokens?.refresh;
    try {
      if (refresh) {
        await this.request(
          "/api/v1/platform/auth/logout/",
          { method: "POST", body: JSON.stringify({ refresh }) },
          true,
          false,
        );
      }
    } catch {
      // Local logout must still complete when the server session already expired.
    } finally {
      this.clearSession();
    }
  }

  me() {
    return this.request<PlatformMembership>("/api/v1/platform/auth/me/");
  }

  dashboard(period?: { start: string; end: string }) {
    const query = period ? `?${new URLSearchParams(period)}` : "";
    return this.request<PlatformDashboard>(`/api/v1/platform/dashboard/${query}`);
  }

  memberships() {
    return this.request<PlatformMembership[]>("/api/v1/platform/auth/memberships/");
  }

  invitations() {
    return this.request<PlatformInvitation[]>("/api/v1/platform/auth/invitations/");
  }

  invite(payload: { email: string; role: PlatformMembership["role"]; capabilities: PlatformCapability[] }) {
    return this.request<{ id: string }>("/api/v1/platform/auth/invitations/", {
      method: "POST", body: JSON.stringify(payload),
    });
  }

  acceptInvitation(payload: { token: string; password: string; first_name: string; last_name: string }) {
    return this.request<PlatformMembership>("/api/v1/platform/auth/invitations/accept/", {
      method: "POST", body: JSON.stringify(payload),
    }, false);
  }

  updateMembership(id: string, payload: Partial<Pick<PlatformMembership, "role" | "capabilities" | "is_active">>) {
    return this.request<PlatformMembership>(`/api/v1/platform/auth/memberships/${id}/`, {
      method: "PATCH", body: JSON.stringify(payload),
    });
  }

  audit(filters: { search?: string; action?: string; limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
    return this.request<PlatformPage<PlatformAuditEvent>>(`/api/v1/platform/audit/?${query}`);
  }

  users() { return this.request<PlatformUserRecord[]>("/api/v1/platform/users/"); }
  subscriptions(filters: { account_id?: string; status?: string; modality?: string; plan_id?: string; limit?: number; offset?: number } = {}) {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value !== undefined && value !== "" && query.set(key, String(value)));
    return this.request<PlatformPage<PlatformSubscriptionRecord>>(`/api/v1/platform/subscriptions/?${query}`);
  }
  subscription(id: string) { return this.request<PlatformSubscriptionRecord>(`/api/v1/platform/subscriptions/${id}/`); }
  commercial() { return this.request<PlatformCommercial>("/api/v1/platform/commercial/"); }
  updateBeta(tenantId: string, enabled: boolean, reason: string) { return this.request<{ tenant_id: string; enabled: boolean }>("/api/v1/platform/commercial/", { method: "POST", body: JSON.stringify({ tenant_id: tenantId, enabled, reason }) }); }
  finance() { return this.request<PlatformFinance>("/api/v1/platform/finance/"); }
  receivables() { return this.request<PlatformFinance>("/api/v1/platform/receivables/"); }
  operations() { return this.request<PlatformOperations>("/api/v1/platform/operations/"); }
  legal() { return this.request<PlatformLegal>("/api/v1/platform/legal/"); }
  publishLegal(payload: { kind: "terms" | "privacy"; version: number; text: string }) { return this.request<{ id: string; kind: string; version: number }>("/api/v1/platform/legal/", { method: "POST", body: JSON.stringify(payload) }); }
  integrations() { return this.request<PlatformIntegrations>("/api/v1/platform/integrations/"); }
  contacts() { return this.request<PlatformContact[]>("/api/v1/platform/contacts/"); }
  contact(id: string) { return this.request<PlatformContact>(`/api/v1/platform/contacts/${id}/`); }
  markContactRead(id: string) { return this.request<PlatformContact>(`/api/v1/platform/contacts/${id}/`, { method: "POST" }); }
  faq() { return this.request<ManagedFaq[]>("/api/v1/platform/support/faq/"); }
  saveFaq(id: string | null, payload: Omit<ManagedFaq, "id" | "updated_at">) { return this.request<ManagedFaq>(`/api/v1/platform/support/faq/${id ? `${id}/` : ""}`, { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) }); }
  supportContact() { return this.request<SupportContactSettings>("/api/v1/platform/support/contact-settings/"); }
  saveSupportContact(payload: SupportContactSettings) { return this.request<SupportContactSettings>("/api/v1/platform/support/contact-settings/", { method: "PATCH", body: JSON.stringify(payload) }); }

  setupMfa() {
    return this.request<{ secret: string; otpauth_uri: string }>(
      "/api/v1/platform/auth/mfa/setup/",
      { method: "POST" },
    );
  }

  confirmMfa(code: string) {
    return this.request<{ recovery_codes: string[] }>(
      "/api/v1/platform/auth/mfa/confirm/",
      { method: "POST", body: JSON.stringify({ code }) },
    );
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request<void>("/api/v1/platform/auth/password/", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  accounts(filters: AccountFilters = {}) {
    const parameters = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") parameters.set(key, String(value));
    }
    const query = parameters.size ? `?${parameters.toString()}` : "";
    return this.request<PlatformPage<PlatformAccount>>(
      `/api/v1/platform/accounts/${query}`,
    );
  }

  account(id: string) {
    return this.request<PlatformAccount>(`/api/v1/platform/accounts/${id}/`);
  }

  measurementProtocols() {
    return this.request<MeasurementProtocolRecord[]>("/api/v1/platform/protocols/");
  }

  saveMeasurementProtocol(payload: MeasurementProtocolInput, protocolId?: string) {
    return this.request<MeasurementProtocolRecord>(
      protocolId
        ? `/api/v1/platform/protocols/${protocolId}/`
        : "/api/v1/platform/protocols/",
      { method: protocolId ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );
  }

  plans() {
    return this.request<PlatformPlan[]>("/api/v1/platform/plans/");
  }

  publishPlan(
    id: string,
    payload: {
      reason: string;
      features: PlanFeatures;
      limits: Record<string, number>;
      price_reference: string;
      monthly_price_minor: number;
      currency: string;
    },
  ) {
    return this.request<PlatformPlan>(`/api/v1/platform/plans/${id}/publish/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  accountCommand(
    id: string,
    command: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ) {
    return this.request<{
      command: string;
      account_id: string;
      state: Record<string, unknown>;
      operation?: BillingOperation;
    }>(
      `/api/v1/platform/accounts/${id}/commands/${command}/`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      },
    );
  }

  providerConfigurations() {
    return this.request<ProviderConfiguration[]>("/api/v1/platform/integrations/providers/");
  }

  saveProviderConfiguration(payload: ProviderWrite, id?: string) {
    return this.request<ProviderConfiguration>(
      id
        ? `/api/v1/platform/integrations/providers/${id}/`
        : "/api/v1/platform/integrations/providers/",
      { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );
  }

  deleteProviderConfiguration(id: string) {
    return this.request<void>(`/api/v1/platform/integrations/providers/${id}/`, {
      method: "DELETE",
    });
  }

  validateProviderConfiguration(id: string) {
    return this.request<ProviderConfiguration>(
      `/api/v1/platform/integrations/providers/${id}/validate/`,
      { method: "POST" },
    );
  }

  setDefaultProviderConfiguration(id: string) {
    return this.request<ProviderConfiguration>(
      `/api/v1/platform/integrations/providers/${id}/default/`,
      { method: "POST" },
    );
  }

  queryProviderBalance(id: string, reason: string, idempotencyKey: string) {
    return this.request<ProviderBalance>(
      `/api/v1/platform/integrations/providers/${id}/balance/`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ reason }),
      },
    );
  }

  providerReceivables(id: string, filters: { offset?: number; limit?: number; status?: string } = {}) {
    const parameters = new URLSearchParams();
    if (filters.offset != null) parameters.set("offset", String(filters.offset));
    if (filters.limit != null) parameters.set("limit", String(filters.limit));
    if (filters.status) parameters.set("status", filters.status);
    const query = parameters.size ? `?${parameters.toString()}` : "";
    return this.request<ProviderReceivablesPage>(
      `/api/v1/platform/integrations/providers/${id}/receivables/${query}`,
    );
  }

  billingOperations(filters: {
    operation_type?: string;
    status?: string;
    tenant_id?: string;
    invoice_id?: string;
    needs_reconciliation?: boolean;
  } = {}) {
    const parameters = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === "" || value === false) continue;
      parameters.set(key, value === true ? "1" : String(value));
    }
    const query = parameters.size ? `?${parameters.toString()}` : "";
    return this.request<BillingOperation[]>(`/api/v1/platform/billing/operations/${query}`);
  }

  reconcileOperation(id: string) {
    return this.request<BillingOperation>(`/api/v1/platform/billing/operations/${id}/reconcile/`, {
      method: "POST",
    });
  }

  platformInvoice(id: string) {
    return this.request<PlatformInvoiceDetail>(`/api/v1/platform/billing/invoices/${id}/`);
  }

  refundInvoice(
    id: string,
    payload: { amount_minor: number; reason: string },
    idempotencyKey: string,
  ) {
    return this.request<BillingOperation>(`/api/v1/platform/billing/invoices/${id}/refund/`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    });
  }

  syncPlatformInvoice(id: string, idempotencyKey: string) {
    return this.request<BillingOperation>(`/api/v1/platform/billing/invoices/${id}/sync/`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    });
  }

  issueFiscalDocument(id: string, reason: string) {
    return this.request<FiscalDocument & { detail?: string }>(
      `/api/v1/platform/billing/invoices/${id}/fiscal/`,
      {
        method: "POST",
        body: JSON.stringify({ reason }),
      },
    );
  }

  syncFiscalDocument(id: string) {
    return this.request<FiscalDocument>(`/api/v1/platform/billing/invoices/${id}/fiscal/sync/`, {
      method: "POST",
    });
  }

  supportTickets(filters: { status?: string; priority?: string; search?: string } = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request<PlatformPage<SupportTicket>>(`/api/v1/platform/support/tickets/${query ? `?${query}` : ""}`);
  }

  supportTicket(id: string) {
    return this.request<SupportTicket>(`/api/v1/platform/support/tickets/${id}/`);
  }

  supportAction(id: string, action: string, payload: Record<string, unknown>, idempotencyKey?: string) {
    return this.request<SupportTicket>(`/api/v1/platform/support/tickets/${id}/${action}/`, {
      method: "POST",
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
      body: JSON.stringify(payload),
    });
  }

  private async rotate() {
    const refresh = this.tokens?.refresh;
    if (!refresh) throw new PlatformApiError(401, "Sua sessão terminou. Entre novamente.");
    try {
      const tokens = await this.request<PlatformTokens>(
        "/api/v1/platform/auth/refresh/",
        { method: "POST", body: JSON.stringify({ refresh }) },
        false,
      );
      this.saveSession(tokens);
    } catch (error) {
      this.clearSession();
      throw error;
    }
  }

  private async ensureFreshToken() {
    if (!this.tokens || !tokenExpired(this.tokens.access)) return;
    this.refreshPromise ??= this.rotate().finally(() => {
      this.refreshPromise = null;
    });
    await this.refreshPromise;
  }

  private async request<T = void>(
    path: string,
    options: RequestInit = {},
    authenticated = true,
    retry = true,
  ): Promise<T> {
    if (authenticated) {
      if (!this.tokens) throw new PlatformApiError(401, "Entre para acessar a plataforma.");
      await this.ensureFreshToken();
    }
    const headers = new Headers(options.headers);
    if (options.body) headers.set("Content-Type", "application/json");
    if (authenticated && this.tokens) headers.set("Authorization", `Bearer ${this.tokens.access}`);
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
        ...options,
        headers,
        cache: "no-store",
        signal: options.signal ?? AbortSignal.timeout(15_000),
      });
    } catch (error) {
      const uncertain =
        error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      const apiError = new PlatformApiError(
        0,
        uncertain
          ? "A API não respondeu a tempo. O resultado permanece incerto até uma nova consulta com a mesma chave."
          : "Não foi possível conectar à API.",
      );
      apiError.uncertain = uncertain;
      throw apiError;
    }
    if (response.status === 401 && authenticated && retry) {
      await this.rotate();
      return this.request<T>(path, options, true, false);
    }
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
      if (response.status === 401 && authenticated) this.clearSession();
      const fallback: Record<number, string> = {
        400: "Confira os dados informados.",
        401: "Credenciais inválidas ou sessão encerrada.",
        403: "Você não tem acesso a esta área.",
        429: "Muitas tentativas. Aguarde e tente novamente.",
      };
      const apiError = new PlatformApiError(
        response.status,
        errorText(payload, response.status, fallback),
        Boolean(payload.mfa_required),
      );
      apiError.body = payload;
      throw apiError;
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }
}

export const platformApi = new PlatformApi();
