import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-normal text-foreground transition-colors outline-none placeholder:text-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:border-border-disabled disabled:text-border-disabled aria-invalid:border-error-form",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
