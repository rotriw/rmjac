import { Badge } from "../ui/badge"
import { Card, CardContent, CardDescription, CardTitle } from "../ui/card"

function StandardCard({
  title,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  title?: string
  className?: string
}) {
  return (
    <>
      <Card className={`mb-2 shadow-none rounded-sm p-2 gap-3 ${className}`} {...props}>
        <CardContent className="p-0">
          <Badge className="text-sm mb-1 bg-gray-200 text-neutral-900 font-bold">{title}</Badge>
        </CardContent>
          {children}
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