import { AssessmentReport } from "@/components/assessments/assessment-report";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <AssessmentReport assessmentId={id} />;
}
