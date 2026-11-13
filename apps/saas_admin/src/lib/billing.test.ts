import { describe, expect, it } from "vitest";

import {
  buildFiscalSettings,
  credentialToSend,
  fiscalSettingsError,
  idempotencyKey,
  refundAmountError,
} from "./billing";

describe("billing helpers", () => {
  it("drops blank and masked credentials", () => {
    expect(credentialToSend("")).toBeUndefined();
    expect(credentialToSend("****")).toBeUndefined();
    expect(credentialToSend("••••••••")).toBeUndefined();
    expect(credentialToSend("live-key")).toBe("live-key");
  });

  it("rejects a partial refund above the residual balance", () => {
    expect(refundAmountError(0, 1000)).toMatch(/centavos/);
    expect(refundAmountError(1001, 1000)).toMatch(/saldo residual/);
    expect(refundAmountError(400, 1000)).toBe("");
  });

  it("reuses one idempotency key until the operation changes", () => {
    const store = new Map<string, string>();
    const first = idempotencyKey(store, "refund:1:400");
    expect(idempotencyKey(store, "refund:1:400")).toBe(first);
    expect(idempotencyKey(store, "refund:1:500")).not.toBe(first);
  });

  it("requires explicit fiscal fields and does not invent taxes", () => {
    expect(fiscalSettingsError(true, {}, "")).toMatch(/municipalServiceName/);
    const settings = {
      municipalServiceName: "Serviço",
      serviceDescription: "Assinatura",
      municipalServiceCode: "01.01",
      deductions: "0",
    };
    expect(fiscalSettingsError(true, settings, "{}")).toMatch(/objeto/);
    expect(fiscalSettingsError(true, settings, '{"iss":2}')).toBe("");
    expect(buildFiscalSettings(settings, '{"iss":2}', true).taxes).toEqual({ iss: 2 });
  });
});
