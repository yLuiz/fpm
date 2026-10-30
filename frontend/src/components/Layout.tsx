import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './layout/sidebar'

export default function Layout() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="h-full bg-background">
      <Sidebar expanded={expanded} onToggle={() => setExpanded((v) => !v)} />

      {/* Menu expandido fica sobreposto; o conteúdo mantém o recuo do menu recolhido */}
      {expanded && (
        <div className="fixed inset-0 z-[999] bg-bg-deep/40 print:hidden" onClick={() => setExpanded(false)} aria-hidden />
      )}

      <main className="h-full overflow-y-auto pl-16 sm:pl-20 print:h-auto print:overflow-visible print:pl-0">
        <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-4 sm:px-6 print:p-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
