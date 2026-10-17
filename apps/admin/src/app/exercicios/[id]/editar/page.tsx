"use client";
import { use } from "react";
import { AppShell, useAppContext } from "@/components/app-shell";
import { ExerciseEditor } from "@/components/exercise-editor";

export default function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <ExerciseEditor key={`${tenant.id}:${id}`} exerciseId={id} />
    </AppShell>
  );
}
