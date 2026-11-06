import { WorkoutEditor } from "@/components/workouts/workout-editor";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <WorkoutEditor templateId={id} />;
}
