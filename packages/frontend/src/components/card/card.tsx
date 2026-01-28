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
  childrenClassName?: string,
  children: React.ReactNode | React.ReactNode[]
}) {
  return (
    <>
      <Card className={`shadow-none border-1 mb-2 p-0 rounded-md gap-0 ${className} text-neutral-800`} {...props}>
        <div className="border-b-1 py-1">
          <span className="text-xs font-bold px-3 text-neutral-600">
            {title}
          </span>
        </div>
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