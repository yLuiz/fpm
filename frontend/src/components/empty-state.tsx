import type { ElementType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ElementType
  children?: ReactNode
}

/** Estado vazio centralizado: ícone pequeno, título e descrição em branco. */
export function EmptyState({ title, description, icon: Icon = Inbox, children }: EmptyStateProps) {
  return (
    <div className="flex animate-fade-in flex-col items-center justify-center gap-2 py-10 text-center text-foreground">
      <Icon className="size-6" />
      <p className="text-xl font-semibold">{title}</p>
      {description && <p className="text-base font-normal">{description}</p>}
      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
