"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  buildFiscalSettings,
  credentialToSend,
  fiscalSettingsError,
  type FiscalSettings,
  type ProviderConfiguration,
} from "@/lib/billing";
import { PlatformApiError, platformApi } from "@/lib/platform-api";

import { useAuth } from "./auth-context";
import { hasCapability } from "./capability-guard";

const EMPTY_FISCAL: FiscalSettings = {
  municipalServiceId: "",
  municipalServiceCode: "",
  municipalServiceName: "",
  serviceDescription: "",
  observations: "",
  deductions: "",
};

export function ProviderConfigPanel() {
  const { membership } = useAuth();
  const allowed = Boolean(membership && hasCapability(membership, "integrations.manage"));
  const [configurations, setConfigurations] = useState<ProviderConfiguration[]>([]);
  const [selectedId, setSelectedId] = useState("new");
  const [providerCode, setProviderCode] = useState("asaas");
  const [environment, setEnvironment] = useState("sandbox");
  const [active, setActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [fiscalEnabled, setFiscalEnabled] = useState(false);
  const [fiscal, setFiscal] = useState<FiscalSettings>(EMPTY_FISCAL);
  const [taxesText, setTaxesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState<Record<string, number> | null>(null);
  const [editor, setEditor] = useState<string | null>(null);

  const selected = configurations.find((item) => item.id === selectedId);

  function openEditor(configuration: ProviderConfiguration | undefined) {
    setSelectedId(configuration?.id ?? "new");
    applyConfiguration(configuration);
    setError("");
    setEditor(configuration?.id ?? "new");
  }

  function closeEditor() {
    if (pending) return;
    setEditor(null);
    setApiKey("");
    setWebhookSecret("");
  }

  function applyConfiguration(configuration: ProviderConfiguration | undefined) {
    setApiKey("");
    setWebhookSecret("");
    setBlocked(null);
    if (!configuration) {
      setProviderCode("asaas");
      setEnvironment("sandbox");
      setActive(true);
      setIsDefault(false);
      setFiscalEnabled(false);
      setFiscal(EMPTY_FISCAL);
      setTaxesText("");
      return;
    }
    setProviderCode(configuration.provider_code);
    setEnvironment(configuration.environment);
    setActive(configuration.is_active);
    setIsDefault(configuration.is_default);
    setFiscalEnabled(configuration.fiscal_enabled);
    setFiscal({ ...EMPTY_FISCAL, ...configuration.fiscal_settings, taxes: undefined });
    setTaxesText(
      configuration.fiscal_settings.taxes ? JSON.stringify(configuration.fiscal_settings.taxes) : "",
    );
  }

  async function load(preferred = selectedId) {
    const list = await platformApi.providerConfigurations();
    setConfigurations(list);
    const next = list.some((item) => item.id === preferred) ? preferred : list[0]?.id ?? "new";
    setSelectedId(next);
    applyConfiguration(next === "new" ? undefined : list.find((item) => item.id === next));
  }

  useEffect(() => {
    if (!allowed) return;
    let activeRequest = true;
    platformApi
      .providerConfigurations()
      .then((list) => {
        if (!activeRequest) return;
        setConfigurations(list);
        const first = list[0];
        if (first) {
          setSelectedId(first.id);
          setProviderCode(first.provider_code);
          setEnvironment(first.environment);
          setActive(first.is_active);
          setIsDefault(first.is_default);
          setFiscalEnabled(first.fiscal_enabled);
          setFiscal({ ...EMPTY_FISCAL, ...first.fiscal_settings, taxes: undefined });
          setTaxesText(first.fiscal_settings.taxes ? JSON.stringify(first.fiscal_settings.taxes) : "");
        }
      })
      .catch((caught) => {
        if (activeRequest) setError(caught instanceof Error ? caught.message : "Erro ao carregar integrações.");
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });
    return () => {
      activeRequest = false;
    };
  }, [allowed]);

  if (!membership) return null;
  if (!allowed) {
    return (
      <section className="state-card" role="alert">
        <h2>Você não tem acesso às credenciais de integração</h2>
        <p>A capability integrations.manage é exigida pela API.</p>
      </section>
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const settingsError = fiscalSettingsError(fiscalEnabled, fiscal, taxesText);
    if (settingsError) {
      setError(settingsError);
      return;
    }
    const apiKeyValue = credentialToSend(apiKey);
    const webhookValue = credentialToSend(webhookSecret);
    if (!selected && (!apiKeyValue || !webhookValue)) {
      setError("Informe a chave e o segredo do webhook. Uma máscara não substitui a credencial.");
      return;
    }
    let fiscalSettings: FiscalSettings;
    try {
      fiscalSettings = buildFiscalSettings(fiscal, taxesText, fiscalEnabled);
    } catch {
      setError("O JSON de taxes é inválido.");
      return;
    }
    const payload = {
      provider_code: providerCode,
      environment,
      is_active: active,
      is_default: isDefault,
      fiscal_enabled: fiscalEnabled,
      fiscal_settings: fiscalSettings,
      ...(apiKeyValue ? { api_key: apiKeyValue } : {}),
      ...(webhookValue ? { webhook_secret: webhookValue } : {}),
    };
    setPending(true);
    setError("");
    setMessage("");
    try {
      const saved = await platformApi.saveProviderConfiguration(payload, selected?.id);
      setMessage(selected ? "Configuração atualizada. Segredos não são exibidos." : "Configuração criada.");
      setApiKey("");
      setWebhookSecret("");
      setEditor(null);
      await load(saved.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A API recusou a configuração.");
    } finally {
      setPending(false);
    }
  }

  async function validate(id = selected?.id) {
    if (!id || pending) return;
    setPending(true);
    setError("");
    try {
      const updated = await platformApi.validateProviderConfiguration(id);
      setMessage(
        updated.validation_status === "valid"
          ? "Credenciais validadas no provedor."
          : "A validação não confirmou as credenciais.",
      );
      await load(id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "O provedor não validou as credenciais.");
      await load(id).catch(() => undefined);
    } finally {
      setPending(false);
    }
  }

  async function makeDefault(id = selected?.id) {
    if (!id || pending) return;
    if (!window.confirm("Definir esta configuração como padrão para novas vendas?")) return;
    setPending(true);
    setError("");
    try {
      await platformApi.setDefaultProviderConfiguration(id);
      setMessage("Provedor padrão atualizado. Contratos antigos não são migrados.");
      await load(id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A API recusou a troca de padrão.");
    } finally {
      setPending(false);
    }
  }

  async function remove(id = selected?.id) {
    if (!id || pending) return;
    if (!window.confirm("Excluir esta configuração de provedor?")) return;
    setPending(true);
    setError("");
    try {
      await platformApi.deleteProviderConfiguration(id);
      setMessage("Configuração excluída.");
      setBlocked(null);
      await load("new");
    } catch (caught) {
      const dependencies =
        caught instanceof PlatformApiError &&
        caught.body &&
        typeof caught.body === "object" &&
        "dependencies" in caught.body
          ? (caught.body as { dependencies?: Record<string, number> }).dependencies
          : undefined;
      if (dependencies) setBlocked(dependencies);
      setError(caught instanceof Error ? caught.message : "A API recusou a exclusão.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="integration-panel">
      <header className="panel-heading">
        <div>
          <h2>Configurações salvas</h2>
          <p>A chave salva não aparece nesta lista. O formulário abre só ao adicionar ou editar.</p>
        </div>
        <button className="button button-primary" type="button" onClick={() => openEditor(undefined)}>
          Adicionar
        </button>
      </header>
      {loading ? <p role="status">Carregando configurações…</p> : null}
      {!loading && !configurations.length ? (
        <div className="empty-panel">
          <h2>Nenhuma configuração salva</h2>
          <p>Adicione Asaas ou Mercado Pago quando for usar o provedor.</p>
        </div>
      ) : null}
      {configurations.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Provedor</th>
                <th>Ambiente</th>
                <th>Credenciais</th>
                <th>Validação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {configurations.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.provider_code === "mercado_pago" ? "Mercado Pago" : "Asaas"}</strong>
                    <small>{item.is_default ? "Padrão para novas vendas" : item.is_active ? "Habilitada" : "Desabilitada"}</small>
                  </td>
                  <td>{item.environment === "production" ? "Produção" : "Sandbox"}</td>
                  <td>
                    Chave da API: {item.api_key_configured ? "configurada" : "ausente"}. Webhook:{" "}
                    {item.webhook_configured ? "configurado" : "ausente"}.
                  </td>
                  <td>
                    <span className={`status-pill ${item.validation_status === "valid" ? "active" : item.validation_status === "invalid" ? "danger" : "inactive"}`}>
                      {item.validation_status === "valid" ? "Válida" : item.validation_status === "invalid" ? "Recusada" : "Não validada"}
                    </span>
                  </td>
                  <td className="row-actions">
                    <button className="button" type="button" onClick={() => openEditor(item)}>Editar</button>
                    <button className="button" type="button" disabled={pending || editor !== null} onClick={() => { setSelectedId(item.id); void validate(item.id); }}>Validar</button>
                    <button className="button" type="button" disabled={pending || editor !== null || item.is_default} onClick={() => { setSelectedId(item.id); void makeDefault(item.id); }}>Tornar padrão</button>
                    <button className="button" type="button" disabled={pending || editor !== null} onClick={() => { setSelectedId(item.id); void remove(item.id); }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {editor ? (
        <div className="modal-backdrop" role="presentation">
          <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="provider-editor-title">
            <header>
              <h2 id="provider-editor-title">{editor === "new" ? "Adicionar provedor" : "Editar provedor"}</h2>
              <button className="icon-button" type="button" aria-label="Fechar" disabled={pending} onClick={closeEditor}>×</button>
            </header>
            <form className="integration-form" onSubmit={(event) => void save(event)}>
          <div className="integration-fields">
            <label>
              Provedor
              <select aria-label="Provedor" value={providerCode} onChange={(event) => setProviderCode(event.target.value)}>
                <option value="asaas">Asaas</option>
                <option value="mercado_pago">Mercado Pago</option>
              </select>
            </label>
            <label>
              Ambiente
              <select aria-label="Ambiente" value={environment} onChange={(event) => setEnvironment(event.target.value)}>
                <option value="sandbox">Sandbox</option>
                <option value="production">Produção</option>
              </select>
            </label>
            <div className="integration-checks span-2">
              <label className="check-label">
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
                Habilitada
              </label>
              <label className="check-label">
                <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
                Padrão para novas vendas
              </label>
              <label className="check-label">
                <input type="checkbox" checked={fiscalEnabled} onChange={(event) => setFiscalEnabled(event.target.checked)} />
                Habilitar NFS-e
              </label>
            </div>
            <p className="span-2 credential-status">
              Chave da API: {selected?.api_key_configured ? "configurada" : "ausente"}. Webhook:{" "}
              {selected?.webhook_configured ? "configurado" : "ausente"}.
            </p>
            <label>
              Substituir chave da API
              <input
                aria-label="Substituir chave da API"
                type="password"
                autoComplete="off"
                placeholder={selected?.api_key_configured ? "Deixe em branco para manter" : "Obrigatória na criação"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>
            <label>
              Substituir segredo do webhook
              <input
                aria-label="Substituir segredo do webhook"
                type="password"
                autoComplete="off"
                placeholder={selected?.webhook_configured ? "Deixe em branco para manter" : "Obrigatório na criação"}
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
              />
            </label>
          </div>
          {fiscalEnabled ? (
            <fieldset className="integration-fields">
              <legend className="span-2">Dados fiscais enviados ao provedor</legend>
              <label>
                Nome do serviço municipal
                <input
                  aria-label="Nome do serviço municipal"
                  value={fiscal.municipalServiceName ?? ""}
                  onChange={(event) => setFiscal({ ...fiscal, municipalServiceName: event.target.value })}
                />
              </label>
              <label>
                Descrição do serviço
                <input
                  aria-label="Descrição do serviço"
                  value={fiscal.serviceDescription ?? ""}
                  onChange={(event) => setFiscal({ ...fiscal, serviceDescription: event.target.value })}
                />
              </label>
              <label>
                Código municipal
                <input
                  aria-label="Código municipal"
                  value={fiscal.municipalServiceCode ?? ""}
                  onChange={(event) => setFiscal({ ...fiscal, municipalServiceCode: event.target.value })}
                />
              </label>
              <label>
                Identificador municipal
                <input
                  aria-label="Identificador municipal"
                  value={fiscal.municipalServiceId ?? ""}
                  onChange={(event) => setFiscal({ ...fiscal, municipalServiceId: event.target.value })}
                />
              </label>
              <label>
                Deduções
                <input
                  aria-label="Deduções"
                  value={fiscal.deductions ?? ""}
                  onChange={(event) => setFiscal({ ...fiscal, deductions: event.target.value })}
                />
              </label>
              <label>
                Observações
                <input
                  aria-label="Observações fiscais"
                  value={fiscal.observations ?? ""}
                  onChange={(event) => setFiscal({ ...fiscal, observations: event.target.value })}
                />
              </label>
              <label className="span-2">
                Impostos em JSON
                <textarea
                  aria-label="Impostos em JSON"
                  rows={4}
                  value={taxesText}
                  onChange={(event) => setTaxesText(event.target.value)}
                />
              </label>
              <p className="span-2">A NFS-e é independente da cobrança. Este formulário não emite nota.</p>
            </fieldset>
          ) : null}
          <div className="modal-actions">
            <button className="button" type="button" disabled={pending} onClick={closeEditor}>Cancelar</button>
            <button className="button button-primary" disabled={pending}>
              Salvar configuração
            </button>
            <button className="button" type="button" disabled={!selected || pending} onClick={() => void validate()}>
              Validar credenciais
            </button>
            <button className="button" type="button" disabled={!selected || pending} onClick={() => void makeDefault()}>
              Tornar padrão
            </button>
          </div>
          {selected ? (
            <div className="integration-diagnosis">
              <span className={`status-pill ${selected.validation_status === "valid" ? "active" : selected.validation_status === "invalid" ? "danger" : "inactive"}`}>
                {selected.validation_status === "valid"
                  ? "Credenciais válidas"
                  : selected.validation_status === "invalid"
                    ? "Credenciais recusadas"
                    : "Ainda não validada"}
              </span>
              <span>{selected.validation_error_code || "Sem erro de validação"}</span>
              <span>
                {selected.last_checked_at
                  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
                      new Date(selected.last_checked_at),
                    )
                  : "Sem consulta"}
              </span>
              <div className="provider-pills">
                {Object.entries(selected.capabilities).map(([key, enabled]) => (
                  <span key={key} className={`status-pill ${enabled ? "active" : "inactive"}`}>
                    {key.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p>Trocar o padrão não migra assinaturas nem faturas já emitidas.</p>
          )}
            </form>
          </section>
        </div>
      ) : null}
      {blocked ? (
        <p role="alert" className="form-error">
          Exclusão bloqueada por contratos ou histórico:{" "}
          {Object.entries(blocked)
            .map(([key, value]) => `${key} ${value}`)
            .join(", ")}
          .
        </p>
      ) : null}
      {message ? <p role="status" className="status">{message}</p> : null}
      {error ? <p role="alert" className="form-error">{error}</p> : null}
    </section>
  );
}
