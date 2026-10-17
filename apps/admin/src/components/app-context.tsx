"use client";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiClient, type ApiMuscle } from "@/lib/api-client";
import {
  demoIds,
  demoRepository,
  type DemoRepository,
} from "@/lib/demo-repository";
import type {
  Equipment,
  Exercise,
  Membership,
  RepositoryContext,
  Student,
  Tenant,
  User,
} from "@/lib/domain";

type Repository = Omit<DemoRepository, "mode"> & { mode: "demo" | "api" };
interface Snapshot {
  user: User;
  membership?: Membership;
  students: Student[];
  exercises: Exercise[];
  equipment: Equipment[];
  team: User[];
  muscles: ApiMuscle[];
}
const emptyUser: User = { id: "", name: "", email: "" };
const emptyTenant: Tenant = {
  id: "",
  name: "Selecione uma academia",
  legalName: "",
  cnpj: "",
};
const emptySnapshot: Snapshot = {
  user: emptyUser,
  students: [],
  exercises: [],
  equipment: [],
  team: [],
  muscles: [],
};
export const configuredMode =
  process.env.NEXT_PUBLIC_DATA_MODE === "demo" &&
  process.env.NODE_ENV !== "production"
    ? "demo"
    : "api";

function useAppValue(mode: "demo" | "api") {
  const [tenantId, selectTenant] = useState<string>(
    mode === "demo" ? demoIds.tenant : "",
  );
  const [liveTenants, setTenants] = useState<Tenant[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const demoUser = demoRepository.getUser(demoIds.user)!;
  const user = mode === "demo" ? demoUser : snapshot.user;
  const tenants =
    mode === "demo" ? demoRepository.getTenants(demoUser.id) : liveTenants;
  const tenant = tenants.find((item) => item.id === tenantId) ?? emptyTenant;
  const context: RepositoryContext = { userId: user.id, tenantId: tenant.id };
  const membership =
    mode === "demo"
      ? demoRepository.getMembership(context)
      : snapshot.membership;

  async function loadTenant(id: string, currentUserId = user.id) {
    const requestGeneration = ++generation.current;
    setSnapshot(emptySnapshot);
    selectTenant(id);
    setLoading(true);
    setError("");
    try {
      const [users, memberships, exercises, equipment, muscles] =
        await Promise.all([
          apiClient.getUsers(id),
          apiClient.getMemberships(id),
          apiClient.getExercises(id),
          apiClient.getEquipment(id),
          apiClient.getMuscles(id),
        ]);
      const current = memberships.find(
        (item) => item.user === currentUserId && item.status === "active",
      );
      if (!current)
        throw new Error("Vínculo ativo não encontrado nesta academia.");
      const admin = current.roles.some(
        (role) => role === "admin" || role === "owner",
      );
      if (
        !admin &&
        !current.roles.some((role) => role === "coach" || role === "dietitian")
      ) {
        throw new Error(
          "O painel é exclusivo para profissionais e administração. Alunos utilizam o aplicativo da academia.",
        );
      }
      const assignments = admin ? await apiClient.getCoachAssignments(id) : [];
      const team = users.map((item) => ({
        id: item.id,
        name: `${item.first_name} ${item.last_name}`.trim() || item.email,
        email: item.email,
      }));
      const currentUser = team.find((item) => item.id === currentUserId);
      if (!currentUser)
        throw new Error("Perfil não encontrado nesta academia.");
      const roles: Membership["roles"] = [
        ...(admin ? ["admin" as const] : []),
        ...(current.roles.includes("coach") ? ["professor" as const] : []),
        ...(current.roles.includes("dietitian")
          ? ["nutritionist" as const]
          : []),
        ...(current.roles.includes("student") ? ["student" as const] : []),
      ];
      const muscleName = (muscleId: string) =>
        muscles.find((item) => item.id === muscleId)?.name ?? "Não informado";
      const next: Snapshot = {
        user: currentUser,
        team,
        muscles,
        membership: {
          id: current.id,
          userId: current.user,
          tenantId: id,
          status: "active",
          roles,
          permissions: current.roles.includes("billing.manage")
            ? ["billing.manage"]
            : [],
        },
        students: memberships
          .filter((item) => item.roles.includes("student"))
          .map((item) => ({
            id: item.user,
            membershipId: item.id,
            tenantId: id,
            name:
              team.find((person) => person.id === item.user)?.name ??
              item.email,
            email: item.email,
            status: item.status,
            coachIds: assignments
              .filter(
                (assignment) =>
                  assignment.student === item.user && assignment.is_active,
              )
              .map((assignment) => assignment.coach),
            dietitianIds: [],
            nutritionConsent: false,
          })),
        equipment: equipment.map((item) => ({
          id: item.id,
          tenantId: id,
          name: item.name,
          description: item.description,
          location: "Não informado pela API",
          status: item.is_active ? "available" : "inactive",
        })),
        exercises: exercises.map((item) => ({
          id: item.id,
          tenantId: id,
          name: item.name,
          primaryMuscle: item.primary_muscles.map(muscleName).join(", "),
          secondaryMuscles: item.secondary_muscles.map(muscleName),
          equipmentIds: item.equipment,
          recordType: item.tracking_type,
          preparation:
            typeof item.instructions.preparation === "string"
              ? item.instructions.preparation
              : "",
          instructions: Array.isArray(item.instructions.steps)
            ? item.instructions.steps.filter(
                (step): step is string => typeof step === "string",
              )
            : [],
          breathing:
            typeof item.instructions.breathing === "string"
              ? item.instructions.breathing
              : "",
          commonMistakes: Array.isArray(item.instructions.commonMistakes)
            ? item.instructions.commonMistakes.filter(
                (step): step is string => typeof step === "string",
              )
            : [],
          status: item.review_status,
        })),
      };
      if (generation.current === requestGeneration) setSnapshot(next);
    } catch (failure) {
      if (generation.current === requestGeneration)
        setError(
          failure instanceof Error
            ? failure.message
            : "Não foi possível carregar a academia.",
        );
    } finally {
      if (generation.current === requestGeneration) setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setError("");
    await apiClient.login(email, password);
    try {
      const available = await apiClient.getTenants();
      const mapped = available.map((item) => ({
        id: item.id,
        name: item.name,
        legalName: item.legal_name,
        cnpj: item.cnpj ?? "CNPJ não informado",
      }));
      if (!mapped.length || !apiClient.userId)
        throw new Error(
          "Nenhuma academia vinculada disponível para esta conta.",
        );
      setTenants(mapped);
      await loadTenant(mapped[0].id, apiClient.userId);
    } catch (failure) {
      apiClient.clearSession();
      setTenants([]);
      setSnapshot(emptySnapshot);
      throw failure;
    }
  }
  function setTenantId(id: string) {
    if (!tenants.some((item) => item.id === id)) return;
    if (mode === "demo") selectTenant(id);
    else void loadTenant(id, apiClient.userId);
  }
  async function logout() {
    generation.current++;
    setSnapshot(emptySnapshot);
    setTenants([]);
    selectTenant("");
    setError("");
    setLoading(false);
    if (mode === "api") await apiClient.logout();
  }
  const allowed = (scope: RepositoryContext) =>
    Boolean(
      membership?.status === "active" &&
      scope.userId === user.id &&
      scope.tenantId === tenant.id,
    );
  const repository: Repository =
    mode === "demo"
      ? demoRepository
      : {
          mode: "api",
          getUser: (id) => snapshot.team.find((item) => item.id === id),
          getTenants: (id) => (id === user.id ? tenants : []),
          getMembership: (scope) => (allowed(scope) ? membership : undefined),
          getStudents: (scope) => (allowed(scope) ? snapshot.students : []),
          getExercises: (scope) => (allowed(scope) ? snapshot.exercises : []),
          getEquipment: (scope) => (allowed(scope) ? snapshot.equipment : []),
          getTeam: (scope) =>
            allowed(scope) && membership?.roles.includes("admin")
              ? snapshot.team
              : [],
          // Later task adapters add these resources; never replace missing API data with fixtures.
          getWorkouts: () => [],
          getAssessments: () => [],
          getFoods: () => [],
          getMealPlans: () => [],
          getSubscription: () => undefined,
        };
  return {
    context,
    tenant,
    tenants,
    user,
    membership,
    setTenantId,
    repository,
    mode,
    loading,
    error,
    login,
    logout,
    reload: () => loadTenant(tenant.id, apiClient.userId),
    api: apiClient,
    muscles: snapshot.muscles,
    authenticated: mode === "demo" || apiClient.authenticated,
  };
}

const AppContext = createContext<ReturnType<typeof useAppValue> | null>(null);
export function DemoProvider({
  children,
  mode = configuredMode,
}: {
  children: ReactNode;
  mode?: "demo" | "api";
}) {
  return (
    <AppContext.Provider value={useAppValue(mode)}>
      {children}
    </AppContext.Provider>
  );
}
export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("Use DemoProvider para abrir o painel.");
  return value;
}
export const useDemoContext = useAppContext;
