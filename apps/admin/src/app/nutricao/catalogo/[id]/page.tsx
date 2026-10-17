import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { FoodDetail } from "@/components/nutrition/food-catalog";
export default async function FoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <PageHeader
        title="Revisar alimento"
        description="Fonte oficial, composição e medidas documentadas."
      />
      <FoodDetail id={id} />
    </AppShell>
  );
}
