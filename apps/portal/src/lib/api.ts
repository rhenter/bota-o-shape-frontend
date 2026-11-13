import { ptBR, type Messages } from "@/i18n/pt-BR";

/** The API returns a fixed `has_*` feature-flag map instead of a code list. */
export type PlanFeatureFlags = Record<
  | "has_student_app"
  | "has_workouts"
  | "has_assessments"
  | "has_nutrition"
  | "has_reports_metrics"
  | "has_priority_support"
  | "has_multiple_units"
  | "has_landing_page"
  | "has_landing_page_custom",
  boolean
>;

export type Plan = {
  id: string;
  code: string;
  name: string;
  features: string[];
  limits: Record<string, unknown>;
  price_reference: string;
};

type PlanPayload = Omit<Plan, "features" | "limits" | "price_reference"> & {
  features?: PlanFeatureFlags | string[];
  limits?: Record<string, unknown>;
  price_reference?: string;
  current_version?: {
    features?: PlanFeatureFlags | string[];
    limits?: Record<string, unknown>;
    price_reference?: string;
    monthly_price_minor?: number;
    currency?: string;
  } | null;
};

/** Reads enabled feature codes from the new `has_*` flag map, tolerating a legacy code list. */
function featureCodesFrom(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string" && value.trim() !== "");
  }
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw as Record<string, unknown>)
    .filter(([, value]) => value === true)
    .map(([key]) => (key.startsWith("has_") ? key.slice(4) : key));
}

/** Published commercial fields live on current_version; older payloads put them on the plan. */
function normalizePlan(plan: PlanPayload): Plan {
  const version = plan.current_version;
  const features = featureCodesFrom(version?.features ?? plan.features);
  const limits = version?.limits ?? plan.limits;
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    features,
    limits: limits && typeof limits === "object" ? limits : {},
    price_reference: version?.price_reference ?? plan.price_reference ?? "",
  };
}

export const API_BASE_URL = (process.env.API_BASE_URL ?? "http://127.0.0.1:8006").replace(/\/$/, "");
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3000";

/** Public plans; "pilot" is provisioned automatically on signup, so it is not for sale. */
export async function fetchPlans(fetcher: typeof fetch = fetch): Promise<Plan[] | null> {
  try {
    const response = await fetcher(`${API_BASE_URL}/api/billing/plans/`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const body = (await response.json()) as { results?: PlanPayload[] } | PlanPayload[];
    const plans = Array.isArray(body) ? body : (body.results ?? []);
    return plans.filter((plan) => plan.code !== "pilot").map(normalizePlan);
  } catch {
    return null;
  }
}

export type FaqEntry = { id: string; question: string; answer: string };

/** Published FAQ for the marketing site. Drafts stay on the platform API. */
export async function fetchFaq(locale: string, fetcher: typeof fetch = fetch): Promise<FaqEntry[] | null> {
  try {
    const params = new URLSearchParams({ locale });
    const response = await fetcher(`${API_BASE_URL}/api/v1/support/faq/?${params}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { results?: FaqEntry[] } | FaqEntry[];
    const rows = Array.isArray(body) ? body : (body.results ?? []);
    return rows.flatMap((item) =>
      item && typeof item.question === "string" && item.question.trim() && typeof item.answer === "string"
        ? [{ id: String(item.id), question: item.question, answer: item.answer }]
        : [],
    );
  } catch {
    return null;
  }
}

export const PRO_PLAN_CODE = "pro";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

export type PublicLanding = {
  mode: "standard" | "custom";
  title: string;
  logo: string | null;
  phone: string;
  email: string;
  whatsapp: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  theme: "lime" | "graphite" | "ocean" | "black" | "white";
  background: "none" | "gym_floor" | "studio" | "outdoor" | "weights" | "machines" | "group_class" | "nutrition";
};
export type Academy = {
  name: string;
  legal_name?: string;
  slug: string;
  profile: { tagline?: string; logo_url?: string; services?: string[]; whatsapp?: string; address?: string; phone?: string };
  landing?: PublicLanding | null;
};

/** WhatsApp link from digits only; null when absent or implausible. */
export function whatsappUrl(value: string | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}
export type AcademyResult = { status: "ok"; academy: Academy } | { status: "not_found" } | { status: "error" };

/** Public academy by slug, or by verified custom host when `host` is given. Inactive tenants are 404 on the API. */
export async function fetchAcademy(
  key: { slug: string } | { host: string },
  fetcher: typeof fetch = fetch,
): Promise<AcademyResult> {
  const path =
    "slug" in key
      ? `/api/tenancy/public/academies/${encodeURIComponent(key.slug)}/`
      : `/api/tenancy/public/resolve/?host=${encodeURIComponent(key.host)}`;
  try {
    const response = await fetcher(`${API_BASE_URL}${path}`, { next: { revalidate: 60 } });
    if (response.status === 404) return { status: "not_found" };
    if (!response.ok) return { status: "error" };
    return { status: "ok", academy: (await response.json()) as Academy };
  } catch {
    return { status: "error" };
  }
}

export type OwnerRegistration = {
  tenant_name: string;
  person_type: "individual" | "legal_entity";
  tax_id: string;
  profile: "gym" | "personal_trainer" | "nutritionist" | "multidisciplinary";
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  plan_code?: string;
  unit_name?: string;
  legal_name?: string;
  phone?: string;
  services?: string[];
  address: {
    postal_code: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
  };
};

export type RegistrationErrors = { fields: Record<string, string[]>; general: string[] };

export type PublicContact = {
  whatsapp: string;
  email: string;
  social_urls: Record<string, string>;
  privacy_url?: string | null;
  terms_url?: string | null;
  portal_url?: string | null;
};

export type PlatformLinks = {
  privacyUrl: string | null;
  termsUrl: string | null;
  portalUrl: string | null;
};

/** https URLs from platform settings only. Anything else is treated as missing. */
export function httpsUrl(value: unknown): string | null {
  return typeof value === "string" && /^https:\/\/\S+$/.test(value) ? value : null;
}

export function platformLinks(contact: PublicContact | null): PlatformLinks {
  return {
    privacyUrl: httpsUrl(contact?.privacy_url),
    termsUrl: httpsUrl(contact?.terms_url),
    portalUrl: httpsUrl(contact?.portal_url),
  };
}

export type ContactRequest = {
  name: string;
  email: string;
  phone: string;
  contact_type: "demonstration" | "plans" | "quote" | "other";
  message: string;
  consent: boolean;
  page_url?: string;
  academy_slug?: string;
};

export async function fetchPublicContact(fetcher: typeof fetch = fetch): Promise<PublicContact | null> {
  try {
    const response = await fetcher(`${API_BASE_URL}/api/core/public-contact/`, {
      next: { revalidate: 300 },
    });
    return response.ok ? ((await response.json()) as PublicContact) : null;
  } catch {
    return null;
  }
}

export async function submitContact(
  data: ContactRequest,
  fetcher: typeof fetch = fetch,
  copy: Messages["errors"] = ptBR.errors,
): Promise<RegistrationErrors | null> {
  try {
    const response = await fetcher("/api/core/contact-requests/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) return null;
    if (response.status === 400) {
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const fields = Object.fromEntries(
        Object.entries(body).flatMap(([key, value]) =>
          Array.isArray(value) ? [[key, value.map(String)]] : [],
        ),
      );
      return { fields, general: [] };
    }
  } catch {
    return { fields: {}, general: [copy.offline] };
  }
  return { fields: {}, general: [copy.contactFailed] };
}

export type PostalCodeAddress = {
  postal_code: string;
  street: string;
  district: string;
  city: string;
  state: string;
};

/** Looks up a Brazilian postal code. The portal proxies this to the API. */
export async function lookupPostalCode(
  postalCode: string,
  fetcher: typeof fetch = fetch,
): Promise<{ address: PostalCodeAddress } | { error: "invalid" | "missing" | "unavailable" }> {
  try {
    const response = await fetcher(`/api/tenancy/postal-code/${postalCode}/`);
    if (response.ok) return { address: (await response.json()) as PostalCodeAddress };
    if (response.status === 404) return { error: "missing" };
    if (response.status === 400) return { error: "invalid" };
  } catch {
    return { error: "unavailable" };
  }
  return { error: "unavailable" };
}

/** Returns null on success or the errors, split by field. */
export async function registerOwner(
  data: OwnerRegistration,
  fetcher: typeof fetch = fetch,
  copy: Messages["errors"] = ptBR.errors,
): Promise<RegistrationErrors | null> {
  let response: Response;
  try {
    response = await fetcher("/api/tenancy/owner/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    return { fields: {}, general: [copy.offline] };
  }
  if (response.ok) return null;
  if (response.status === 400) {
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const fields: Record<string, string[]> = {};
    const general: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [child, childValue] of Object.entries(value)) {
          const nested = Array.isArray(childValue)
            ? childValue.map(String)
            : typeof childValue === "string"
              ? [childValue]
              : [];
          if (nested.length) fields[`${key}.${child}`] = nested;
        }
        continue;
      }
      const messages = Array.isArray(value) ? value.map(String) : typeof value === "string" ? [value] : [];
      if (!messages.length) continue;
      if (key === "non_field_errors" || key === "detail") general.push(...messages);
      else fields[key] = messages;
    }
    if (general.length || Object.keys(fields).length) return { fields, general };
  }
  return { fields: {}, general: [copy.signupFailed] };
}
