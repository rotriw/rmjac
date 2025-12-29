import { Badge } from "../ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

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
      <Card className={`mb-2 p-0 rounded-sm gap-0 ${className} text-neutral-800 shadow-sm border-0`} {...props}>
        <span className="text-xs font-bold px-3 pt-2 text-neutral-600">
          {title}
        </span>
        <div className="pb-5 pt-5 px-3">
          {children}
        </div>
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