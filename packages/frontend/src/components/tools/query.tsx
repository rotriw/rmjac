/* eslint-disable @typescript-eslint/no-explicit-any */
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"
import { StandardCard } from "../card/card"
import { TagsInput } from "../ui/tags-input"

interface BaseFormField {
  type: "input" | "group" | "custom" | "button" | "tags"
  title?: string
}

interface InputField extends BaseFormField {
  type: "input"
  name: string
  title?: string
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

type FormField = InputField | GroupField | CustomField | ButtonField | TagsField

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
              value={values[field.name] || ""}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.title}
            />
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