"use client";
import { AppShell, useAppContext } from "@/components/app-shell";
import { ExerciseEditor } from "@/components/exercise-editor";

export default function NewExercisePage() {
  const { tenant } = useAppContext();
  return (
    <AppShell>
      <ExerciseEditor key={tenant.id} />
    </AppShell>
  );
}
