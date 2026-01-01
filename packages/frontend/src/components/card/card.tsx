import { Badge } from "../ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

function StandardCard({
  title,
  children,
  className,
  childrenClassName = "pt-5 pb-5 px-3",
  ...props
}: React.ComponentProps<"div"> & {
  title?: string
  className?: string
  childrenClassName?: string
}) {
  return (
    <>
      <Card className={`mb-2 p-0 rounded-sm gap-0 ${className} text-neutral-800 shadow-sm border-1 border-neutral-100`} {...props}>
        <span className="text-xs font-bold px-3 pt-2 text-neutral-600">
          {title}
        </span>
        <div className={`${childrenClassName}`}>
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