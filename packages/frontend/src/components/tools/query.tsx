/* eslint-disable @typescript-eslint/no-explicit-any */
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { StandardCard } from "../card/card"
import { TagsInput } from "../ui/tags-input"
import { Select, SelectItem } from "../ui/select"
import { cn } from "@/lib/utils"

interface BaseFormField {
  type: "input" | "group" | "custom" | "button" | "tags" | "select" | "choice-card" | "info"
  title?: string
}

interface InputField extends BaseFormField {
  type: "input"
  name: string
  title?: string
  inputType?: string
}

interface SelectField extends BaseFormField {
  type: "select"
  name: string
  title?: string
  options: { label: string; value: string }[]
}

interface ChoiceCardField extends BaseFormField {
  type: "choice-card"
  name: string
  title?: string
  options: { label: string; value: string; description?: string }[]
  cols?: number
}

interface GroupField extends BaseFormField {
  type: "group"
  children?: FormField[]
}

interface CustomField extends BaseFormField {
  type: "custom"
  children?: React.ComponentType<any>
  props?: any
  key?: string
}

interface ButtonField extends BaseFormField {
  type: "button"
  onClick?: any
}

interface TagsField extends BaseFormField {
  type: "tags"
  name: string
  title?: string
  suggestions?: string[]
}

interface InfoFiled extends BaseFormField {
  type: "info"
  content: string
  color: "default" | "success" | "warning" | "error"
}

type FormField = InputField | GroupField | CustomField | ButtonField | TagsField | SelectField | ChoiceCardField | InfoFiled


interface FormQueryProps extends React.ComponentProps<"form"> {
  fields?: FormField[]
  values?: Record<string, string | string[]>
  onChange?: any
}

function FormQuery({
  fields = [],
  values = {},
  onChange,
  ...props
}: FormQueryProps) {
  const handleChange = (name: string, value: string) => {
    const newValues = { ...values, [name]: value }
    onChange?.(newValues)
  }

  const renderField = (field: FormField, index: number) => {
    switch (field.type) {
      case "input":
        return (
          <div key={index} className="space-y-2">
            <Label htmlFor={field.name}>{field.title}</Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.inputType || "text"}
              value={values[field.name] || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.title}
            />
          </div>
        )

      case "select":
        return (
          <div key={index} className="space-y-2">
            <Label htmlFor={field.name}>{field.title}</Label>
            <Select
              id={field.name}
              name={field.name}
              value={values[field.name] as string || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
            >
              <SelectItem value="" disabled>选择...</SelectItem>
              {field.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </div>
        )

      case "choice-card":
        return (
          <div key={index} className="space-y-2">
            <Label>{field.title}</Label>
            <div className={cn("grid gap-4", field.cols === 1 ? "grid-cols-1" : "grid-cols-2")}>
              {field.options.map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "cursor-pointer rounded-lg border p-4 hover:bg-accent hover:text-accent-foreground peer-checked:border-primary [&:has([data-state=checked])]:border-primary",
                    values[field.name] === opt.value ? "border-primary bg-accent" : "border-muted"
                  )}
                  onClick={() => handleChange(field.name, opt.value)}
                >
                  <div className="font-semibold">{opt.label}</div>
                  {opt.description && (
                    <div className="text-sm text-muted-foreground">{opt.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )

      case "group":
        return (
          <StandardCard key={index} title={field.title}>
            <div className="space-y-4">
              {Array.isArray(field.children) && field.children.map((child, childIndex) => renderField(child, childIndex))}
            </div>
          </StandardCard>
        )

      case "button":
        return (
          <Button key={index} onClick={field.onClick} className="" size="sm">
            {field.title}
          </Button>
        )

      case "tags":
        return (
          <div key={index} className="space-y-2">
            <Label>{field.title}</Label>
            <TagsInput
              value={values[field.name] as string[] || []}
              onChange={(tags) => handleChange(field.name, tags)}
              suggestions={field.suggestions}
              placeholder="输入标签后按回车添加"
            />
          </div>
        )

      case "custom":
        if (field.children) {
          const CustomComponent = field.children
          const componentKey = field.key || `custom-${index}`
          return <CustomComponent key={componentKey} values={values} onChange={onChange} {...(field.props || {})} />
        }
        return null

      case "info":
        let colorClass = "text-gray-800"
        switch (field.color) {
          case "success":
            colorClass = "text-green-800"
            break
          case "warning":
            colorClass = "text-yellow-800"
            break
          case "error":
            colorClass = "text-red-800"
            break
          default:
            colorClass = "text-gray-800"
        }
        return (
          <div
            key={index}
            className={cn("text-sm", colorClass)}
          >
            {field.content}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <form {...props}>
      <div className="space-y-6">
        {fields.map((field, index) => renderField(field, index))}
      </div>
    </form>
  )
}

export {
  FormQuery,
  type FormField
}