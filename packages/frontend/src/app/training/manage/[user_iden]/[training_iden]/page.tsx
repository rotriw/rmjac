import { TrainingManageTool } from "./manage_tool";

export default async function TrainingManagePage({
  params,
}: {
  params: Promise<{ user_iden: string; training_iden: string }>;
}) {
  const { user_iden, training_iden } = await params;
  return (
    <TrainingManageTool user_iden={user_iden} training_iden={training_iden} />
  )
}