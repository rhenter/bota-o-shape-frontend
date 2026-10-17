import { WorkoutAssignment } from "@/components/workouts/workout-assignment";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <WorkoutAssignment templateId={id} />;
}
