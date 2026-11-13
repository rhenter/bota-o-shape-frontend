export type BillingOperationStatus = "processing" | "unknown" | "succeeded" | "failed";

export interface BillingOperation {
  id: string;
  operation_type: string;
  status: BillingOperationStatus | string;
  invoice_id: string | null;
  subscription_id: string | null;
  amount_minor: number | null;
  currency: string;
  external_reference: string;
  result_data: Record<string, unknown>;
  error_message: string;
  correlation_id: string;
  sent_at: string | null;
  last_checked_at: string | null;
  created_at: string;
}

export interface FiscalSettings {
  municipalServiceId?: string;
  municipalServiceCode?: string;
  municipalServiceName?: string;
  serviceDescription?: string;
  observations?: string;
  taxes?: Record<string, unknown>;
  deductions?: string;
}

export interface ProviderConfiguration {
  id: string;
  provider_code: "asaas" | "mercado_pago" | string;
  environment: "sandbox" | "production" | string;
  is_active: boolean;
  is_default: boolean;
  api_key_configured: boolean;
  webhook_configured: boolean;
  fiscal_enabled: boolean;
  fiscal_settings: FiscalSettings;
  capabilities: Record<string, boolean>;
  validation_status: string;
  validation_error_code: string;
  last_checked_at: string | null;
  credential_revision: number;
  created_at: string;
  updated_at: string;
}

export interface ProviderBalance {
  id: string;
  status: string;
  currency: string;
  available_minor: number | null;
  pending_minor: number | null;
  error_message: string;
  checked_at: string;
  correlation_id: string;
}

export interface ProviderReceivable {
  external_id: string;
  status: string;
  provider_status: string;
  amount_minor: number;
  amount_paid_minor: number;
  amount_refunded_minor: number;
  fee_minor: number | null;
  net_minor: number | null;
  currency: string;
  payment_method: string;
  due_at: string | null;
  paid_at: string | null;
  external_reference: string;
}

export interface ProviderReceivablesPage {
  items: ProviderReceivable[];
  has_more: boolean;
  next_offset: number | null;
}

export interface BillingMovement {
  id: string;
  movement_type: "payment" | "refund" | "chargeback" | string;
  external_id: string;
  state: string;
  amount_minor: number;
  currency: string;
  occurred_at: string | null;
  provider_updated_at: string | null;
  first_observed_at: string | null;
  last_observed_at: string | null;
}

export interface FiscalDocument {
  id: string;
  status: string;
  external_id: string;
  number: string;
  pdf_url: string;
  xml_url: string;
  error_message: string;
  last_checked_at: string | null;
  invoice?: string;
}

export interface PlatformInvoiceDetail {
  id: string;
  subscription: string;
  provider_configuration: string | null;
  external_id: string;
  status: string;
  currency: string;
  amount_minor: number;
  amount_paid_minor: number;
  amount_refunded_minor: number;
  fee_minor: number | null;
  net_minor: number | null;
  payment_method: string;
  provider_status: string;
  due_at: string | null;
  paid_at: string | null;
  available_at: string | null;
  hosted_url: string;
  metadata: Record<string, unknown>;
  fiscal_document: FiscalDocument | null;
  tenant_id: string;
  tenant_name: string;
  subscription_id: string;
  movements: BillingMovement[];
}

export interface ProviderWrite {
  provider_code: string;
  environment: string;
  is_active: boolean;
  is_default: boolean;
  fiscal_enabled: boolean;
  fiscal_settings: FiscalSettings;
  api_key?: string;
  webhook_secret?: string;
}

const MASKED = /^(?:\*+|•+|·+)$/;

export function credentialToSend(value: string): string | undefined {
  if (!value.trim() || MASKED.test(value.trim())) return undefined;
  return value;
}

export function formatMinor(value: number | null | undefined, currency = "BRL") {
  if (value == null || Number.isNaN(value)) return "Não informado";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value / 100);
  } catch {
    return `${value} ${currency}`;
  }
}

export function safeHttps(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function refundableMinor(invoice: Pick<PlatformInvoiceDetail, "amount_paid_minor" | "amount_refunded_minor">) {
  return Math.max(0, invoice.amount_paid_minor - invoice.amount_refunded_minor);
}

export function refundAmountError(amount: number, refundable: number) {
  if (!Number.isInteger(amount) || amount < 1) {
    return "Informe um valor inteiro em centavos, maior que zero.";
  }
  if (amount > refundable) {
    return "O valor passa do saldo residual confirmado pela API.";
  }
  return "";
}

export function idempotencyKey(store: Map<string, string>, operation: string) {
  const current = store.get(operation);
  if (current) return current;
  const created = crypto.randomUUID();
  store.set(operation, created);
  return created;
}

export function operationIsUncertain(status: string | undefined) {
  return status === "unknown" || status === "processing";
}

export function fiscalSettingsError(enabled: boolean, settings: FiscalSettings, taxesText: string) {
  if (!enabled) return "";
  if (!settings.municipalServiceName?.trim()) return "Informe municipalServiceName.";
  if (!settings.serviceDescription?.trim()) return "Informe serviceDescription.";
  if (!settings.municipalServiceId?.trim() && !settings.municipalServiceCode?.trim()) {
    return "Informe municipalServiceId ou municipalServiceCode.";
  }
  if (!taxesText.trim()) return "Informe o objeto taxes. O painel não cria alíquotas.";
  try {
    const taxes = JSON.parse(taxesText) as unknown;
    if (!taxes || typeof taxes !== "object" || Array.isArray(taxes) || !Object.keys(taxes).length) {
      return "taxes precisa ser um objeto com os impostos definidos por vocês.";
    }
  } catch {
    return "O JSON de taxes é inválido.";
  }
  if (settings.deductions && Number.isNaN(Number(settings.deductions))) {
    return "Deduções precisam ser um número não negativo.";
  }
  if (settings.deductions && Number(settings.deductions) < 0) {
    return "Deduções precisam ser um número não negativo.";
  }
  return "";
}

export function buildFiscalSettings(settings: FiscalSettings, taxesText: string, enabled: boolean): FiscalSettings {
  if (!enabled) return {};
  const taxes = JSON.parse(taxesText) as Record<string, unknown>;
  const next: FiscalSettings = {
    municipalServiceName: settings.municipalServiceName?.trim(),
    serviceDescription: settings.serviceDescription?.trim(),
    taxes,
  };
  if (settings.municipalServiceId?.trim()) next.municipalServiceId = settings.municipalServiceId.trim();
  if (settings.municipalServiceCode?.trim()) next.municipalServiceCode = settings.municipalServiceCode.trim();
  if (settings.observations?.trim()) next.observations = settings.observations.trim();
  if (settings.deductions?.trim()) next.deductions = settings.deductions.trim();
  return next;
}
