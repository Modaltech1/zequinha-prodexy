import type {
  ChangeEventHandler,
  ComponentType,
  MouseEventHandler,
  ReactNode,
} from 'react'

type ExternalUiProps = {
  children?: ReactNode
  onChange?: ChangeEventHandler<HTMLInputElement>
  onClick?: MouseEventHandler<HTMLButtonElement>
  onOpenChange?: (open: boolean) => void
  onValueChange?: (value: string) => void
  [property: string]: unknown
}

declare const externalUiComponent: ComponentType<ExternalUiProps>
declare const externalTextareaComponent: ComponentType<Omit<ExternalUiProps, 'onChange'> & {
  onChange?: ChangeEventHandler<HTMLTextAreaElement>
}>

export {
  externalUiComponent as AlertDialog,
  externalUiComponent as AlertDialogAction,
  externalUiComponent as AlertDialogCancel,
  externalUiComponent as AlertDialogContent,
  externalUiComponent as AlertDialogDescription,
  externalUiComponent as AlertDialogFooter,
  externalUiComponent as AlertDialogHeader,
  externalUiComponent as AlertDialogTitle,
  externalUiComponent as Badge,
  externalUiComponent as Button,
  externalUiComponent as Card,
  externalUiComponent as CardContent,
  externalUiComponent as CardHeader,
  externalUiComponent as Dialog,
  externalUiComponent as DialogContent,
  externalUiComponent as DialogDescription,
  externalUiComponent as DialogFooter,
  externalUiComponent as DialogHeader,
  externalUiComponent as DialogTitle,
  externalUiComponent as DropdownMenu,
  externalUiComponent as DropdownMenuContent,
  externalUiComponent as DropdownMenuItem,
  externalUiComponent as DropdownMenuLabel,
  externalUiComponent as DropdownMenuSeparator,
  externalUiComponent as DropdownMenuTrigger,
  externalUiComponent as Input,
  externalUiComponent as Label,
  externalUiComponent as Select,
  externalUiComponent as SelectContent,
  externalUiComponent as SelectItem,
  externalUiComponent as SelectTrigger,
  externalUiComponent as SelectValue,
}

export { externalTextareaComponent as Textarea }
