import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm font-normal text-foreground transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground placeholder:text-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-border-disabled disabled:text-border-disabled aria-invalid:border-error-form [color-scheme:dark]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
