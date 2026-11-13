"use client";
import { useState } from "react";
import type {
  ApiMembership,
  ApiRole,
  ApiUser,
  ApiCredential,
} from "@/lib/api-client";
type CredentialKind = ApiCredential["kind"];
import { Dialog } from "../ui/dialog";
import { RowMenu } from "../ui/row-menu";
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
  onSaveCredential,
  onVerifyCredential,
}: {
  members: ApiMembership[];
  users: ApiUser[];
  credentials: ApiCredential[];
  onRoles?: (member: ApiMembership, roles: ApiRole[]) => Promise<void>;
  onReset?: (member: ApiMembership) => Promise<void>;
  onArchive?: (member: ApiMembership) => Promise<void>;
  onSaveCredential?: (
    member: ApiMembership,
    kind: CredentialKind,
    registrationNumber: string,
    state: string,
  ) => Promise<void>;
  onVerifyCredential?: (id: string) => Promise<void>;
}) {
  const [rolesTarget, setRolesTarget] = useState<ApiMembership | null>(null),
    [roles, setRoles] = useState<ApiRole[]>([]),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [archiveTarget, setArchiveTarget] = useState<ApiMembership | null>(null),
    [credentialTarget, setCredentialTarget] =
      useState<ApiMembership | null>(null);
  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
      setRolesTarget(null);
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
              <th>Registro</th>
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
                const u = users.find((u) => u.id === m.user);
                const recordKinds: CredentialKind[] = [
                  ...(m.roles.includes("dietitian") ? ["crn" as const] : []),
                  ...(m.roles.includes("coach") ? ["cref" as const] : []),
                ];
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
                      {recordKinds.length
                        ? recordKinds.map((kind) => {
                            const credential = credentials.find(
                              (item) =>
                                item.professional === m.user &&
                                item.kind === kind,
                            );
                            const label = kind === "crn" ? "CRN" : "CREF";
                            return (
                              <span key={kind}>
                                {credential
                                  ? `${label} ${credential.registration_number}/${credential.state} · ${credential.verified_at ? "Verificado" : "Pendente"}`
                                  : `${label} não informado`}
                                <br />
                              </span>
                            );
                          })
                        : "Não se aplica"}
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td>
                      <RowMenu
                        label={`Ações de ${u ? `${u.first_name} ${u.last_name}`.trim() : m.email}`}
                        actions={[
                          ...(onSaveCredential && recordKinds.length > 0
                            ? [
                                {
                                  label: "Registro profissional",
                                  onSelect: () => setCredentialTarget(m),
                                },
                              ]
                            : []),
                          ...(onRoles
                            ? [
                                {
                                  label: "Editar funções",
                                  onSelect: () => {
                                    setRolesTarget(m);
                                    setRoles(m.roles);
                                  },
                                },
                              ]
                            : []),
                          ...(onReset
                            ? [
                                {
                                  label: "Enviar redefinição de senha",
                                  onSelect: () =>
                                    void run(
                                      () => onReset(m),
                                      "Instruções de redefinição solicitadas por e-mail.",
                                    ),
                                },
                              ]
                            : []),
                          ...(onArchive
                            ? [
                                {
                                  label:
                                    m.status === "archived"
                                      ? "Restaurar vínculo"
                                      : "Arquivar vínculo",
                                  danger: m.status !== "archived",
                                  onSelect: () => setArchiveTarget(m),
                                },
                              ]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {rolesTarget && onRoles && (
        <Dialog
          title="Editar funções"
          onClose={() => setRolesTarget(null)}
        >
          <p className="muted">{rolesTarget.email}</p>
          <RoleFields roles={roles} onChange={setRoles} />
          <div className="form-actions">
            <button
              className="button"
              type="button"
              onClick={() => setRolesTarget(null)}
            >
              Cancelar
            </button>
            <button
              className="button button-primary"
              type="button"
              disabled={busy || !roles.length}
              onClick={() =>
                void run(
                  () => onRoles(rolesTarget, roles),
                  "Funções atualizadas.",
                )
              }
            >
              {busy ? "Aguarde…" : "Salvar funções"}
            </button>
          </div>
        </Dialog>
      )}
      {credentialTarget && onSaveCredential && (
        <CredentialDialog
          member={credentialTarget}
          credentials={credentials.filter(
            (item) => item.professional === credentialTarget.user,
          )}
          busy={busy}
          onClose={() => setCredentialTarget(null)}
          onSave={async (kind, number, state) => {
            await run(
              () =>
                onSaveCredential(credentialTarget, kind, number, state),
              kind === "crn"
                ? "CRN cadastrado como pendente."
                : "CREF cadastrado como pendente.",
            );
          }}
          onVerify={
            onVerifyCredential
              ? async (id) => {
                  await run(
                    () => onVerifyCredential(id),
                    "Registro verificado.",
                  );
                }
              : undefined
          }
        />
      )}
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

function CredentialDialog({
  member,
  credentials,
  busy,
  onClose,
  onSave,
  onVerify,
}: {
  member: ApiMembership;
  credentials: ApiCredential[];
  busy: boolean;
  onClose: () => void;
  onSave: (
    kind: CredentialKind,
    registrationNumber: string,
    state: string,
  ) => Promise<void>;
  onVerify?: (id: string) => Promise<void>;
}) {
  const kinds: CredentialKind[] = [
    ...(member.roles.includes("dietitian") ? ["crn" as const] : []),
    ...(member.roles.includes("coach") ? ["cref" as const] : []),
  ];
  return (
    <Dialog title="Registro profissional" onClose={onClose}>
      <p className="muted">{member.email}</p>
      <p className="notice">
        Confira a documentação antes de verificar. O papel de administrador não
        autoriza prescrição.
      </p>
      {kinds.map((kind) => (
        <CredentialForm
          key={kind}
          kind={kind}
          credential={credentials.find((item) => item.kind === kind)}
          busy={busy}
          onSave={onSave}
          onVerify={onVerify}
        />
      ))}
    </Dialog>
  );
}

function CredentialForm({
  kind,
  credential,
  busy,
  onSave,
  onVerify,
}: {
  kind: CredentialKind;
  credential?: ApiCredential;
  busy: boolean;
  onSave: (
    kind: CredentialKind,
    registrationNumber: string,
    state: string,
  ) => Promise<void>;
  onVerify?: (id: string) => Promise<void>;
}) {
  const label = kind === "crn" ? "CRN" : "CREF";
  const [number, setNumber] = useState(credential?.registration_number ?? "");
  const [state, setState] = useState(credential?.state ?? "");
  if (credential) {
    return (
      <section className="credential-block">
        <h3>
          {label} {credential.registration_number}/{credential.state}
        </h3>
        <p className="muted">
          {credential.verified_at
            ? "Verificado"
            : "Verificação pendente"}
        </p>
        {!credential.verified_at && onVerify && (
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Conferi a documentação e confirmo a verificação deste ${label}.`,
                )
              )
                void onVerify(credential.id);
            }}
          >
            Confirmar verificação documental
          </button>
        )}
      </section>
    );
  }
  return (
    <form
      className="credential-block"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(kind, number.trim(), state.toUpperCase());
      }}
    >
      <h3>{label}</h3>
      <label className="field">
        Número
        <input
          required
          value={number}
          onChange={(event) => setNumber(event.target.value)}
        />
      </label>
      <label className="field">
        UF
        <input
          required
          minLength={2}
          maxLength={2}
          pattern="[A-Za-z]{2}"
          value={state}
          onChange={(event) => setState(event.target.value)}
        />
      </label>
      <button className="button button-primary" disabled={busy}>
        {busy ? "Aguarde…" : `Cadastrar ${label}`}
      </button>
    </form>
  );
}
