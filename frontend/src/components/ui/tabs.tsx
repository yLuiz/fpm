import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

// Barra de abas do design system: fundo #181820, aba inativa cinza com divisor,
// aba ativa com o fundo da aplicação, texto branco e borda no acento.
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex w-full items-stretch overflow-x-auto rounded-lg bg-tabbar p-1", className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative flex h-9 items-center gap-2 rounded-md border border-transparent px-5 text-base whitespace-nowrap text-[#8a8a8a] transition-colors duration-300 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 [&:not(:first-child)]:before:absolute [&:not(:first-child)]:before:-left-px [&:not(:first-child)]:before:h-4 [&:not(:first-child)]:before:w-px [&:not(:first-child)]:before:bg-[#8a8a8a]/40 data-[state=active]:border-accent-solid/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:before:hidden [&_svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("space-y-4 outline-none data-[state=active]:animate-fade-in", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
