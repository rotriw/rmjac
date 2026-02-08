import { TicketDetailContent } from "./client-page"

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <TicketDetailContent taskId={id} />
    </div>
  )
}
