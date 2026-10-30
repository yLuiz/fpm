import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { BrandMark } from '@/components/brand-mark'
import { navGroups, footerNavItems, isActive, type NavItem } from './nav'

function initials(name?: string) {
  if (!name) return '??'
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Mostra o rótulo em tooltip apenas com o menu recolhido. */
function WithTooltip({ label, show, children }: { label: string; show: boolean; children: ReactNode }) {
  if (!show) return <>{children}</>
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

const itemBase =
  'flex h-11 items-center gap-3 rounded-l-xl pl-4 text-[0.95rem] transition-colors duration-100 ease-in sm:pl-5'

function SidebarLink({ item, expanded, onNavigate }: { item: NavItem; expanded: boolean; onNavigate: () => void }) {
  const { pathname } = useLocation()
  const active = isActive(pathname, item.href)
  const Icon = item.icon

  return (
    <WithTooltip label={item.name} show={!expanded}>
      <Link
        to={item.href}
        onClick={onNavigate}
        aria-label={item.name}
        aria-current={active ? 'page' : undefined}
        className={cn(
          itemBase,
          // Item ativo: fundo da aplicação + ícone no acento, fundindo-se ao conteúdo como uma aba
          active ? 'bg-background text-foreground' : 'text-foreground hover:bg-menu-hover'
        )}
      >
        <Icon className={cn('size-5 shrink-0 transition-colors duration-300', active && 'text-accent-solid')} />
        {expanded && <span className="truncate">{item.name}</span>}
      </Link>
    </WithTooltip>
  )
}

export function Sidebar({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { user, logout } = useAuth()
  const collapse = () => expanded && onToggle()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-[1000] flex flex-col bg-sidebar py-4 pl-2 text-sidebar-foreground transition-[width] duration-100 ease-in sm:pl-3 print:hidden',
        expanded ? 'w-60' : 'w-16 sm:w-20'
      )}
    >
      {/* Botão de expandir: círculo no acento */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
        className="absolute top-7 -right-3 flex size-6 items-center justify-center rounded-full bg-accent-solid text-white transition-colors duration-100 hover:bg-accent-hover"
      >
        {expanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
      </button>

      {/* Logo */}
      <div className="flex h-12 items-center gap-3 pr-3 pl-1.5 sm:pl-2.5">
        <BrandMark className="size-9" />
        {expanded && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-base font-bold">FPM</span>
            <span className="truncate text-xs font-normal text-label">Manutenção Preventiva</span>
          </div>
        )}
      </div>

      <nav className="mt-6 flex-1 space-y-5 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p
              className={cn(
                'flex items-center gap-1.5 pb-1 text-xs font-semibold tracking-wide text-label',
                expanded ? 'pl-5' : 'justify-center pr-3'
              )}
            >
              {group.label}
              <span className="size-1.5 rounded-full bg-accent-solid" />
            </p>
            {group.items.map((item) => (
              <SidebarLink key={item.href} item={item} expanded={expanded} onNavigate={collapse} />
            ))}
          </div>
        ))}
      </nav>

      {/* Rodapé: configurações, usuário e sair */}
      <div className="space-y-1 border-t border-sidebar-border pt-3">
        {footerNavItems.map((item) => (
          <SidebarLink key={item.href} item={item} expanded={expanded} onNavigate={collapse} />
        ))}

        <WithTooltip label={user?.name ?? 'Usuário'} show={!expanded}>
          <div className={cn(itemBase, 'cursor-default pl-4')}>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-[0.7rem] font-bold">
              {initials(user?.name)}
            </span>
            {expanded && (
              <div className="min-w-0 pr-3 leading-tight">
                <p className="truncate text-sm">{user?.name}</p>
                <p className="truncate text-xs font-normal text-label">
                  {user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                </p>
              </div>
            )}
          </div>
        </WithTooltip>

        <WithTooltip label="Sair" show={!expanded}>
          <button
            type="button"
            onClick={logout}
            aria-label="Sair"
            className={cn(itemBase, 'w-full text-foreground hover:bg-menu-hover')}
          >
            <LogOut className="size-5 shrink-0" />
            {expanded && <span>Sair</span>}
          </button>
        </WithTooltip>
      </div>
    </aside>
  )
}
