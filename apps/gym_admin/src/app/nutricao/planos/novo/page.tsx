import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { MealPlanEditor } from "@/components/nutrition/meal-plan-editor";
export default function NewMealPlanPage() {
  return (
    <AppShell>
      <PageHeader
        title="Novo plano alimentar"
        description="Crie um rascunho e confira a prévia antes de publicar."
      />
      <MealPlanEditor />
    </AppShell>
  );
}
