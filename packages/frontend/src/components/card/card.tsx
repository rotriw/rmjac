import { Card, CardContent, CardDescription, CardTitle } from "../ui/card"

function StandardCard({
  title,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  title?: string
}) {
  return (
    <>
      <Card className="mb-2 shadow-none rounded-sm p-0" {...props}>
        <CardContent className="p-2">
          <CardTitle className="text-sm mb-2">{title}</CardTitle>
          {children}
        </CardContent>
      </Card>
    </>
  )
}

function TitleCard({
  title,
  description,
}: React.ComponentProps<"div"> & {
  title?: string,
  description?: string
}) {
  return (
    <>
      <CardTitle>{title}</CardTitle>
      <CardDescription className="text-xs text-muted-foreground mb-2">
          {description}
      </CardDescription>
    </>
  )
}

export {
  StandardCard,
  TitleCard
}