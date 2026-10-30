import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: ReactNode
  /** Contexto exibido ao lado do título (período, data, subtítulo curto) */
  context?: ReactNode
  /** Ações alinhadas à direita */
  actions?: ReactNode
  back?: { to: string; label: string }
}

/** Topo da página: título · contexto à esquerda e ações à direita. */
export function PageHeader({ title, context, actions, back }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link
            to={back.to}
            className="mb-1 inline-flex items-center gap-1 text-sm text-label transition-colors duration-300 hover:text-accent-solid"
          >
            <ArrowLeft className="size-4" />
            {back.label}
          </Link>
        )}
        <h1 className="flex flex-wrap items-baseline gap-x-2 text-2xl leading-tight font-semibold">
          <span className="truncate">{title}</span>
          {context && (
            <span className="text-lg font-normal text-label">
              <span className="mr-2 text-border">·</span>
              {context}
            </span>
          )}
        </h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
