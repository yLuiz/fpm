import { cn } from '@/lib/utils'

/**
 * Marca do FPM: engrenagem (o equipamento) com o check recortado (inspeção OK).
 * Mesmo arquivo do favicon, para a identidade ser uma só.
 */
export function BrandMark({ className }: { className?: string }) {
  return <img src="/favicon.svg" alt="" aria-hidden className={cn('shrink-0 select-none', className)} draggable={false} />
}
