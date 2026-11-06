"use client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { FoodSearch } from "@/components/nutrition/food-search";
import { FoodCatalog } from "@/components/nutrition/food-catalog";
export default function CatalogPage() {
  return (
    <AppShell>
      <PageHeader
        title="Catálogo de alimentos"
        description="Confira origem, versão e estado de preparo antes de usar."
      />
      <p className="notice">
        Dados oficiais são somente leitura. Importação, aprovação de
        correspondência e histórico de lotes ainda não são expostos pela API.
      </p>
      <FoodCatalog>{(foods) => <FoodSearch foods={foods} />}</FoodCatalog>
    </AppShell>
  );
}
