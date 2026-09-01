import type { ComponentType, ReactNode } from 'react'

type ExternalUiProps = {
  children?: ReactNode
  [property: string]: unknown
}

declare const externalUiComponent: ComponentType<ExternalUiProps>

export {
  externalUiComponent as Button,
  externalUiComponent as Card,
  externalUiComponent as CardContent,
  externalUiComponent as CardHeader,
  externalUiComponent as CardTitle,
  externalUiComponent as Input,
  externalUiComponent as Select,
  externalUiComponent as SelectContent,
  externalUiComponent as SelectItem,
  externalUiComponent as SelectTrigger,
  externalUiComponent as SelectValue,
}
