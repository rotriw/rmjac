import { VjudgePageContent } from "./client-page";
import { AddTaskCard } from "./add-task";

export default async function ViewVjudgePage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const params = await searchParams;
  const isNew = params.new === "1";

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      {isNew ? <AddTaskCard /> : <VjudgePageContent />}
    </div>
  );
}