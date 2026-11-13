"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { useAuth } from "./auth-context";
import { CapabilityGuard } from "./capability-guard";
import {
  platformApi,
  type MeasurementProtocolInput,
  type MeasurementProtocolRecord,
} from "@/lib/platform-api";

const METHODS = [
  ["circumference", "Perímetros"],
  ["skinfold", "Dobras cutâneas"],
  ["bioimpedance", "Bioimpedância"],
  ["anthropometry", "Massa e estatura"],
] as const;

const emptyDraft = (): MeasurementProtocolInput => ({
  name: "",
  version: "1",
  method: "circumference",
  sites: [],
  equation_metadata: {},
  is_active: true,
});

function methodLabel(method: string) {
  return METHODS.find(([value]) => value === method)?.[1] ?? method;
}

function parseSites(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ProtocolsConsole() {
  const { membership } = useAuth();
  const [protocols, setProtocols] = useState<MeasurementProtocolRecord[] | null>(null);
  const [editor, setEditor] = useState<"new" | string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [sitesText, setSitesText] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingId, setPendingId] = useState("");

  const loadProtocols = useCallback(async () => {
    setProtocols(await platformApi.measurementProtocols());
  }, []);

  useEffect(() => {
    if (!membership) return;
    void loadProtocols().catch((caught) => {
      setProtocols([]);
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os protocolos.");
    });
  }, [loadProtocols, membership]);

  function closeEditor() {
    setEditor(null);
    setDraft(emptyDraft());
    setSitesText("");
  }

  function openNew() {
    setError("");
    setDraft(emptyDraft());
    setSitesText("");
    setEditor("new");
  }

  function openEdit(protocol: MeasurementProtocolRecord) {
    setError("");
    setDraft({
      name: protocol.name,
      version: protocol.version,
      method: protocol.method,
      sites: protocol.sites,
      equation_metadata: protocol.equation_metadata ?? {},
      is_active: protocol.is_active,
    });
    setSitesText(protocol.sites.join("\n"));
    setEditor(protocol.id);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor) return;
    setPending(true);
    setError("");
    try {
      await platformApi.saveMeasurementProtocol(
        { ...draft, sites: parseSites(sitesText) },
        editor === "new" ? undefined : editor,
      );
      closeEditor();
      await loadProtocols();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o protocolo.");
    } finally {
      setPending(false);
    }
  }

  async function toggle(protocol: MeasurementProtocolRecord) {
    setError("");
    setPendingId(protocol.id);
    try {
      await platformApi.saveMeasurementProtocol(
        {
          name: protocol.name,
          version: protocol.version,
          method: protocol.method,
          sites: protocol.sites,
          equation_metadata: protocol.equation_metadata ?? {},
          is_active: !protocol.is_active,
        },
        protocol.id,
      );
      await loadProtocols();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível atualizar o protocolo.");
    } finally {
      setPendingId("");
    }
  }

  if (!membership) return null;

  const knownMethod = METHODS.some(([value]) => value === draft.method);

  return (
    <CapabilityGuard membership={membership} capability="accounts.read">
      <section className="accounts-page protocol-page">
        <header className="protocol-toolbar">
          <div>
            <p className="eyebrow">Avaliações</p>
            <h1>Protocolos</h1>
          </div>
          <div className="protocol-toolbar-actions">
            <button className="button button-primary" type="button" onClick={openNew}>
              Novo
            </button>
          </div>
        </header>

        {error && !editor && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {protocols === null ? (
          <p role="status">Carregando protocolos…</p>
        ) : !protocols.length ? (
          <p>Nenhum protocolo cadastrado.</p>
        ) : (
          <div className="table-wrap">
            <table className="protocol-table">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Método</th>
                  <th>Sítios Anatómicos</th>
                  <th>Coleta</th>
                  <th>Editar</th>
                  <th>Desativar</th>
                </tr>
              </thead>
              <tbody>
                {protocols.map((protocol) => (
                  <tr key={protocol.id}>
                    <td>{protocol.name}</td>
                    <td>{methodLabel(protocol.method)}</td>
                    <td className="protocol-sites">{protocol.sites.join(", ") || "—"}</td>
                    <td>
                      <span className={`status-pill ${protocol.is_active ? "active" : "inactive"}`}>
                        {protocol.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <button className="text-button" type="button" onClick={() => openEdit(protocol)}>
                        Editar
                      </button>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        type="button"
                        disabled={pendingId === protocol.id}
                        onClick={() => void toggle(protocol)}
                      >
                        {protocol.is_active ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {editor && (
          <div className="modal-backdrop" role="presentation" onMouseDown={closeEditor}>
            <section
              className="editor-modal protocol-editor-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="protocol-editor-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header>
                <h2 id="protocol-editor-title">{editor === "new" ? "Novo protocolo" : "Editar protocolo"}</h2>
                <button className="icon-button" type="button" aria-label="Fechar" onClick={closeEditor}>
                  ×
                </button>
              </header>
              <form onSubmit={(event) => void save(event)}>
                <label>
                  Protocolo
                  <input
                    required
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </label>
                <label>
                  Método
                  <select
                    aria-label="Método"
                    value={knownMethod ? draft.method : "other"}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        method: event.target.value === "other" ? "" : event.target.value,
                      })
                    }
                  >
                    {METHODS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                    <option value="other">Outro</option>
                  </select>
                </label>
                {!knownMethod && (
                  <label>
                    Método informado
                    <input
                      required
                      value={draft.method}
                      onChange={(event) => setDraft({ ...draft, method: event.target.value })}
                    />
                  </label>
                )}
                <label>
                  Sítios anatômicos
                  <textarea
                    rows={4}
                    value={sitesText}
                    onChange={(event) => setSitesText(event.target.value)}
                    placeholder="Um sítio por linha"
                  />
                </label>
                <label className="protocol-check">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })}
                  />
                  Ativo para coleta
                </label>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="modal-actions">
                  <button className="button" type="button" onClick={closeEditor}>
                    Cancelar
                  </button>
                  <button className="button button-primary" disabled={pending} type="submit">
                    {pending ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </section>
    </CapabilityGuard>
  );
}
