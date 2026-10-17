"use client";
import { useState } from "react";
import type {
  ApiMembership,
  ApiRole,
  ApiUser,
  ApiCredential,
} from "@/lib/api-client";
import { Dialog } from "../ui/dialog";
import { StatusBadge } from "../ui/status-badge";
export const roleLabels: Record<ApiRole, string> = {
  owner: "Titular",
  admin: "Administrador",
  coach: "Professor",
  dietitian: "Nutricionista",
  student: "Aluno",
  "billing.manage": "Gerenciar cobrança",
};
export function RoleFields({
  roles,
  onChange,
}: {
  roles: ApiRole[];
  onChange: (roles: ApiRole[]) => void;
}) {
  return (
    <fieldset>
      <legend>Funções combináveis</legend>
      {(Object.keys(roleLabels) as ApiRole[])
        .filter((r) => r !== "student")
        .map((role) => (
          <label className="checkbox-field" key={role}>
            <input
              type="checkbox"
              checked={roles.includes(role)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...roles, role]
                    : roles.filter((r) => r !== role),
                )
              }
            />
            {roleLabels[role]}
          </label>
        ))}
    </fieldset>
  );
}
export function TeamTable({
  members,
  users,
  credentials,
  onRoles,
  onReset,
  onArchive,
}: {
  members: ApiMembership[];
  users: ApiUser[];
  credentials: ApiCredential[];
  onRoles?: (member: ApiMembership, roles: ApiRole[]) => Promise<void>;
  onReset?: (member: ApiMembership) => Promise<void>;
  onArchive?: (member: ApiMembership) => Promise<void>;
}) {
  const [editing, setEditing] = useState(""),
    [roles, setRoles] = useState<ApiRole[]>([]),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [archiveTarget, setArchiveTarget] = useState<ApiMembership | null>(null);
  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      setEditing("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ação não concluída.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <label className="field">
        Buscar por nome ou e-mail
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <p className="notice">
        A pessoa recebe instruções de redefinição no próprio e-mail. A
        administração nunca vê ou define sua senha.
      </p>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="table-scroll">
        <table>
          <caption>Membros e permissões da academia ativa</caption>
          <thead>
            <tr>
              <th>Nome / e-mail</th>
              <th>Funções</th>
              <th>CRN / UF</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {members
              .filter((m) => !m.roles.includes("student"))
              .filter((m) => {
                const u = users.find((u) => u.id === m.user);
                return `${u?.first_name ?? ""} ${u?.last_name ?? ""} ${m.email}`
                  .toLowerCase()
                  .includes(query.toLowerCase());
              })
              .map((m) => {
                const u = users.find((u) => u.id === m.user),
                  credential = credentials.find(
                    (c) => c.professional === m.user && c.kind === "crn",
                  );
                return (
                  <tr key={m.id}>
                    <td>
                      <strong>
                        {u ? `${u.first_name} ${u.last_name}` : m.email}
                      </strong>
                      <br />
                      {m.email}
                    </td>
                    <td>
                      {m.roles.map((r) => (
                        <span className="status-badge" key={r}>
                          {roleLabels[r]}
                        </span>
                      ))}
                    </td>
                    <td>
                      {credential
                        ? `${credential.registration_number}/${credential.state} · ${credential.verified_at ? "Verificado" : "Pendente"}`
                        : "Não informado"}
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        {onRoles && (
                          <button
                            className="button"
                            disabled={busy}
                            onClick={() => {
                              setEditing(m.id);
                              setRoles(m.roles);
                            }}
                          >
                            Editar funções
                          </button>
                        )}
                        {onReset && (
                          <button
                            className="button"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () => onReset(m),
                                "Instruções de redefinição solicitadas por e-mail.",
                              )
                            }
                          >
                            Enviar redefinição de senha
                          </button>
                        )}
                        {onArchive && (
                          <button
                            className="button"
                            disabled={busy}
                            onClick={() => setArchiveTarget(m)}
                          >
                            {m.status === "archived"
                              ? "Restaurar vínculo"
                              : "Arquivar vínculo"}
                          </button>
                        )}
                      </div>
                      {editing === m.id && onRoles && (
                        <>
                          <RoleFields roles={roles} onChange={setRoles} />
                          <button
                            className="button button-primary"
                            disabled={busy || !roles.length}
                            onClick={() =>
                              void run(
                                () => onRoles(m, roles),
                                "Funções atualizadas.",
                              )
                            }
                          >
                            Salvar funções
                          </button>
                          <button
                            className="button"
                            onClick={() => setEditing("")}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {archiveTarget && onArchive && (
        <Dialog
          title={
            archiveTarget.status === "archived"
              ? "Restaurar vínculo"
              : "Arquivar vínculo"
          }
          onClose={() => setArchiveTarget(null)}
        >
          <p>
            {archiveTarget.status === "archived"
              ? `Restaurar o acesso de ${archiveTarget.email} a esta academia?`
              : `Arquivar o vínculo de ${archiveTarget.email}? O histórico e a trilha de auditoria permanecem preservados.`}
          </p>
          <div className="form-actions">
            <button className="button" onClick={() => setArchiveTarget(null)}>
              Cancelar
            </button>
            <button
              className="button button-primary"
              disabled={busy}
              onClick={() => {
                const member = archiveTarget;
                setArchiveTarget(null);
                void run(
                  () => onArchive(member),
                  member.status === "archived"
                    ? "Vínculo restaurado."
                    : "Vínculo arquivado; histórico preservado.",
                );
              }}
            >
              Confirmar
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
