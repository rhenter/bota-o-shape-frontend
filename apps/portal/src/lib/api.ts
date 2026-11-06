export type Plan = {
  id: string;
  code: string;
  name: string;
  features: string[];
  limits: Record<string, unknown>;
  price_reference: string;
};

export const API_BASE_URL = (process.env.API_BASE_URL ?? "http://127.0.0.1:8006").replace(/\/$/, "");
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3000";

/** Public plans; "pilot" is provisioned automatically on signup, so it is not for sale. */
export async function fetchPlans(fetcher: typeof fetch = fetch): Promise<Plan[] | null> {
  try {
    const response = await fetcher(`${API_BASE_URL}/api/billing/plans/`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const body = (await response.json()) as { results?: Plan[] } | Plan[];
    const plans = Array.isArray(body) ? body : (body.results ?? []);
    return plans.filter((plan) => plan.code !== "pilot");
  } catch {
    return null;
  }
}

export const PRO_PLAN = { code: "pro", price: "R$ 99/mês", students: 500 } as const;
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001").replace(/\/$/, "");

export type Modality = { title: string; text: string };
export type Academy = {
  name: string;
  slug: string;
  profile: { tagline?: string; logo_url?: string; modalities?: unknown; whatsapp?: string; address?: string };
};

/** Public profile is free-form JSON; keep only well-formed modalities. */
export function modalitiesOf(profile: Academy["profile"]): Modality[] {
  if (!Array.isArray(profile.modalities)) return [];
  return profile.modalities.flatMap((item): Modality[] => {
    const { title, text } = (item ?? {}) as Record<string, unknown>;
    return typeof title === "string" && title.trim() ? [{ title: title.trim(), text: typeof text === "string" ? text : "" }] : [];
  });
}

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
};

export type RegistrationErrors = { fields: Record<string, string[]>; general: string[] };

export type PublicContact = {
  whatsapp: string;
  email: string;
  social_urls: Record<string, string>;
};

export type ContactRequest = {
  name: string;
  email: string;
  phone: string;
  contact_type: "demonstration" | "plans" | "quote" | "other";
  message: string;
  consent: boolean;
  page_url?: string;
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
    return { fields: {}, general: ["Não foi possível conectar ao servidor. Tente novamente."] };
  }
  return { fields: {}, general: ["Não foi possível enviar sua mensagem. Tente novamente."] };
}

/** Returns null on success or the errors, split by field. */
export async function registerOwner(
  data: OwnerRegistration,
  fetcher: typeof fetch = fetch,
): Promise<RegistrationErrors | null> {
  let response: Response;
  try {
    response = await fetcher("/api/tenancy/owner/register/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    return { fields: {}, general: ["Não foi possível conectar ao servidor. Tente novamente."] };
  }
  if (response.ok) return null;
  if (response.status === 400) {
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const fields: Record<string, string[]> = {};
    const general: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      const messages = Array.isArray(value) ? value.map(String) : typeof value === "string" ? [value] : [];
      if (!messages.length) continue;
      if (key === "non_field_errors" || key === "detail") general.push(...messages);
      else fields[key] = messages;
    }
    if (general.length || Object.keys(fields).length) return { fields, general };
  }
  return { fields: {}, general: ["Não foi possível concluir o cadastro. Tente novamente."] };
}
