import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Indicadores de status com as cores semânticas do design system
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-2 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "border-accent-solid bg-accent-solid/20 text-accent-hover",
        secondary: "border-offline bg-offline/40 text-text-soft",
        destructive: "border-danger bg-danger/25 text-danger-text",
        outline: "border-border text-foreground",
        ghost: "border-transparent hover:bg-accent-solid/50",
        link: "border-transparent text-accent-solid underline-offset-4 hover:underline",
        success: "border-success bg-success/20 text-success-text",
        warning: "border-warning/70 bg-warning/10 text-warning-text",
        info: "border-accent-solid bg-accent-solid/20 text-accent-hover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
