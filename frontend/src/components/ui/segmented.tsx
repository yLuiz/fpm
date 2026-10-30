import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  /** Classe aplicada quando a opção está selecionada (padrão: acento) */
  activeClassName?: string
}

interface SegmentedProps<T extends string> {
  value: T | undefined
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  'aria-label': string
  className?: string
}

/**
 * Select Button do design system: segmentos colados, borda e texto #6B6B6B,
 * selecionado com fundo no acento e texto escuro.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  ...props
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={props['aria-label']}
      className={cn('inline-flex shrink-0 overflow-hidden rounded-lg border border-[#6b6b6b]', className)}
    >
      {options.map((option, i) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 min-w-14 px-3 text-sm font-normal transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset',
              i > 0 && 'border-l border-[#6b6b6b]',
              selected
                ? (option.activeClassName ?? 'bg-accent-solid text-background')
                : 'bg-transparent text-[#a3a3a3] hover:bg-accent-solid/30 hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
