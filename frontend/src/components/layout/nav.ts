import type { LucideIcon } from 'lucide-react'
import { LayoutDashboard, Cog, Settings, OctagonAlert } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** Grupos do menu lateral (rótulo precedido de um ponto no acento). */
export const navGroups: NavGroup[] = [
  {
    label: 'FPM',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Equipamentos', href: '/equipment', icon: Cog },
      { name: 'Paradas', href: '/downtime', icon: OctagonAlert },
    ],
  },
]

/** Itens fixos no rodapé do menu, junto de usuário e sair. */
export const footerNavItems: NavItem[] = [
  { name: 'Configurações', href: '/settings', icon: Settings },
]

export function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  if (href === '/equipment') return pathname.startsWith('/equipment') || pathname.startsWith('/maintenance')
  return pathname.startsWith(href)
}
