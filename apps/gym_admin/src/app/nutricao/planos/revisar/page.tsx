import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { MealPlanEditor } from "@/components/nutrition/meal-plan-editor";
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return (
    <AppShell>
      <PageHeader
        title="Revisar e publicar"
        description="Confira aluno, consentimento, registro profissional e versão."
      />
      <MealPlanEditor planId={id} />
    </AppShell>
  );
}
