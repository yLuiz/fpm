import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-colors duration-300 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none aria-invalid:border-error-form [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Sólido (primário): acento verde água
        default:
          "bg-accent-solid text-white hover:bg-accent-solid/40 active:bg-accent-pressed disabled:bg-accent-disabled disabled:text-[#d4d4d4]",
        // Outline (padrão do design system)
        outline:
          "border-border bg-transparent text-foreground hover:border-accent-solid/50 hover:bg-accent-solid/50 active:border-accent-solid active:bg-accent-solid aria-expanded:border-accent-solid/50 aria-expanded:bg-accent-solid/50 disabled:border-border-disabled disabled:text-border-disabled",
        // "Ver detalhes": outline com ícone no acento que fica branco no hover
        details:
          "border-border bg-transparent text-foreground hover:border-accent-solid/50 hover:bg-accent-solid/50 active:bg-accent-solid [&_svg]:text-accent-solid [&_svg]:transition-colors [&_svg]:duration-300 hover:[&_svg]:text-white",
        // Exportar/relatório: único botão quente da interface
        report:
          "bg-report text-on-warm hover:bg-report/85 disabled:opacity-50",
        secondary:
          "bg-surface text-foreground hover:bg-menu-hover aria-expanded:bg-menu-hover",
        ghost:
          "text-foreground hover:bg-accent-solid/50 aria-expanded:bg-accent-solid/50 disabled:text-border-disabled",
        destructive:
          "bg-danger text-white hover:bg-danger/80 disabled:opacity-50",
        link: "text-accent-solid underline-offset-4 hover:text-accent-hover hover:underline",
      },
      size: {
        default:
          "h-9 min-w-15 gap-2 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-7 text-[0.95rem]",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// forwardRef: no React 18 a ref não chega como prop; sem ela, gatilhos Radix com
// `asChild` (ex.: DropdownMenuTrigger > Button) não conseguem posicionar o popover.
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
    }
>(function Button({ className, variant = "default", size = "default", asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})

export { Button, buttonVariants }
