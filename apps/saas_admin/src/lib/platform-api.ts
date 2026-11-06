export interface PlatformTokens {
  access: string;
  refresh: string;
}

export type PlatformCapability =
  | "platform.manage"
  | "accounts.read"
  | "billing.manage"
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
      features: string[];
      limits: Record<string, number>;
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

export interface PlatformPlanVersion {
  id: string;
  version: number;
  features: string[];
  limits: Record<string, number>;
  price_reference: string;
  published_at: string;
}

export interface PlatformPlan {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  versions: PlatformPlanVersion[];
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

interface ApiErrorPayload {
  detail?: string;
  mfa_required?: boolean;
}

export class PlatformApiError extends Error {
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
    } finally {
      this.clearSession();
    }
  }

  me() {
    return this.request<PlatformMembership>("/api/v1/platform/auth/me/");
  }

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

  plans() {
    return this.request<PlatformPlan[]>("/api/v1/platform/plans/");
  }

  publishPlan(
    id: string,
    payload: {
      reason: string;
      features: string[];
      limits: Record<string, number>;
      price_reference: string;
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
    return this.request<{ command: string; account_id: string; state: Record<string, unknown> }>(
      `/api/v1/platform/accounts/${id}/commands/${command}/`,
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      },
    );
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
    } catch {
      throw new PlatformApiError(0, "Não foi possível conectar à API.");
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
      throw new PlatformApiError(
        response.status,
        payload.detail ?? fallback[response.status] ?? "A solicitação não foi concluída.",
        Boolean(payload.mfa_required),
      );
    }
    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }
}

export const platformApi = new PlatformApi();
