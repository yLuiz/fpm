import { cn } from '@/lib/utils'

export interface LegendItem {
  key: string
  label: string
  color: string
  value?: number
}

interface ChartLegendProps {
  items: LegendItem[]
  hidden: string[]
  onToggle: (key: string) => void
}

/** Legenda do design system: marcador em anel na cor da série; clicar liga e desliga a série. */
export function ChartLegend({ items, hidden, onToggle }: ChartLegendProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      {items.map((item) => {
        const off = hidden.includes(item.key)
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggle(item.key)}
            aria-pressed={!off}
            className={cn(
              'flex cursor-pointer items-center gap-2 text-sm transition-opacity duration-300',
              off && 'opacity-40'
            )}
          >
            <span
              className="size-3.5 shrink-0 rounded-full border-[3px]"
              style={{ borderColor: item.color }}
            />
            <span className={off ? 'text-[#676767]' : 'text-foreground'}>{item.label}</span>
            {item.value !== undefined && (
              <span className={cn('font-bold', off ? 'text-[#676767]' : 'text-foreground')}>
                {item.value}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
