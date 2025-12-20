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
      <Card className={`mb-2 p-0 shadow-none rounded-sm gap-0 ${className} relative`} {...props}>
        <span className="text-xs font-bold text-border px-1 position-sticky top-0 z-2 absolute w-fit bg-background" style={{ top: -7, left: 10 }}>
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