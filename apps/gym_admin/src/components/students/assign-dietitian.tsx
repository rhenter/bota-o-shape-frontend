"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useAppContext } from "@/components/app-context";
import type { ApiDietitianAssignment } from "@/lib/api-client";

export interface DietitianOption {
  id: string;
  name: string;
}

export function useDietitianDirectory() {
  const { api, mode, context, membership, repository } = useAppContext();
  const admin =
    membership?.status === "active" && membership.roles.includes("admin");
  const [dietitians, setDietitians] = useState<DietitianOption[]>([]);
  const [assignments, setAssignments] = useState<ApiDietitianAssignment[]>([]);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!admin) return;
    if (mode === "demo") {
      setDietitians(
        repository
          .getTeam(context)
          .filter((person) =>
            repository
              .getMembership({ userId: person.id, tenantId: context.tenantId })
              ?.roles.includes("nutritionist"),
          )
          .map((person) => ({ id: person.id, name: person.name })),
      );
      setAssignments(
        repository.getStudents(context).flatMap((student) =>
          student.dietitianIds.map((dietitian) => ({
            id: `${student.id}:${dietitian}`,
            student: student.id,
            dietitian,
            is_active: true,
          })),
        ),
      );
      return;
    }
    let active = true;
    Promise.all([
      api.getMemberships(context.tenantId),
      api.getUsers(context.tenantId),
      api.getDietitianAssignments(context.tenantId),
    ])
      .then(([memberships, users, links]) => {
        if (!active) return;
        const names = new Map(
          users.map((user) => [
            user.id,
            `${user.first_name} ${user.last_name}`.trim() || user.email,
          ]),
        );
        setDietitians(
          memberships
            .filter(
              (item) =>
                item.status === "active" && item.roles.includes("dietitian"),
            )
            .map((item) => ({
              id: item.user,
              name: names.get(item.user) || item.email,
            })),
        );
        setAssignments(links);
      })
      .catch(() => {
        if (active) {
          setDietitians([]);
          setAssignments([]);
        }
      });
    return () => {
      active = false;
    };
  // repository and context objects are recreated each render; reload by tenant and session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, api, context.tenantId, context.userId, mode, version]);
  return {
    admin,
    dietitians,
    assignments,
    reload: () => setVersion((value) => value + 1),
  };
}

function activeDietitianNames(
  studentId: string,
  assignments: ApiDietitianAssignment[],
  dietitians: DietitianOption[],
) {
  return assignments
    .filter((item) => item.student === studentId && item.is_active)
    .map(
      (item) =>
        dietitians.find((person) => person.id === item.dietitian)?.name ??
        "Nutricionista",
    );
}

export function dietitianNames(
  studentId: string,
  assignments: ApiDietitianAssignment[],
  dietitians: DietitianOption[],
) {
  const names = activeDietitianNames(studentId, assignments, dietitians);
  return names.length ? names.join(", ") : "Não atribuído";
}

export function dietitianSummary(
  studentId: string,
  assignments: ApiDietitianAssignment[],
  dietitians: DietitianOption[],
) {
  const names = activeDietitianNames(studentId, assignments, dietitians);
  if (!names.length) return "Não atribuído";
  if (names.length === 1) return names[0];
  return `${names.length} nutricionistas`;
}

export function AssignDietitianDialog({
  studentId,
  studentName,
  dietitians,
  assignments,
  onClose,
  onSaved,
}: {
  studentId: string;
  studentName: string;
  dietitians: DietitianOption[];
  assignments: ApiDietitianAssignment[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { api, mode, context } = useAppContext();
  const current = assignments.find(
    (item) => item.student === studentId && item.is_active,
  );
  const [dietitian, setDietitian] = useState(current?.dietitian ?? "");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const matches = dietitians.filter((person) =>
    person.name.toLocaleLowerCase("pt-BR").includes(normalized),
  );
  const windowed = normalized ? matches : matches.slice(0, 8);
  const selected = dietitians.find((person) => person.id === dietitian);
  const shown =
    selected && !windowed.some((person) => person.id === selected.id)
      ? [selected, ...windowed]
      : windowed;
  return (
    <Dialog
      title={`Nutricionista de ${studentName}`}
      onClose={onClose}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!dietitian) return;
          setBusy(true);
          setError("");
          try {
            if (mode === "demo") {
              onSaved(
                `Atribuição simulada para ${studentName}. Nenhum vínculo foi gravado.`,
              );
              onClose();
              return;
            }
            const existing = assignments.filter(
              (item) => item.student === studentId,
            );
            for (const item of existing.filter((item) => item.is_active && item.dietitian !== dietitian)) {
              await api.updateDietitianAssignment(context.tenantId, item.id, {
                is_active: false,
              });
            }
            const same = existing.find((item) => item.dietitian === dietitian);
            if (same) {
              if (!same.is_active)
                await api.updateDietitianAssignment(context.tenantId, same.id, {
                  is_active: true,
                });
            } else {
              await api.saveDietitianAssignment(context.tenantId, {
                student: studentId,
                dietitian,
                is_active: true,
              });
            }
            onSaved(`Nutricionista atribuído a ${studentName}. O consentimento do aluno continua obrigatório.`);
            onClose();
          } catch (failure) {
            setError(
              failure instanceof Error
                ? failure.message
                : "Não foi possível atribuir o nutricionista.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {dietitians.length > 0 && (
          <label className="field">
            Buscar nutricionista
            <input
              type="search"
              value={query}
              placeholder="Nome do nutricionista"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        )}
        {shown.length > 0 && (
          <div className="picker-list" role="listbox" aria-label="Nutricionistas">
            {shown.map((person) => (
              <button
                key={person.id}
                type="button"
                className="picker-option"
                role="option"
                aria-selected={person.id === dietitian}
                aria-pressed={person.id === dietitian}
                onClick={() => setDietitian(person.id)}
              >
                {person.name}
              </button>
            ))}
          </div>
        )}
        {dietitians.length > 8 && !normalized && (
          <p className="help-text">
            Mostrando 8 de {dietitians.length}. Digite para encontrar o
            nutricionista.
          </p>
        )}
        {normalized && !matches.length && (
          <p className="help-text">Nenhum nutricionista com esse nome.</p>
        )}
        {!dietitians.length && (
          <p className="help-text">
            Nenhum nutricionista ativo nesta academia. Cadastre o CRN no
            registro profissional da equipe.
          </p>
        )}
        {error && <p className="notice">{error}</p>}
        <div className="form-actions">
          <button className="button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="button button-primary"
            disabled={busy || !dietitian}
          >
            {busy ? "Aguarde…" : "Atribuir"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
