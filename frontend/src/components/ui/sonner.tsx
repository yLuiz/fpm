import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

// Toast do design system: superfície #252530, raio 0.5vh e borda esquerda grossa na cor do status
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-success-text" />,
        info: <InfoIcon className="size-4 text-accent-solid" />,
        warning: <TriangleAlertIcon className="size-4 text-warning-text" />,
        error: <OctagonXIcon className="size-4 text-danger-text" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--ds-surface)",
          "--normal-text": "var(--ds-text)",
          "--normal-border": "var(--ds-surface)",
          "--border-radius": "5px",
          "--width": "400px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "!border-l-[6px] !shadow-none !font-sans",
          title: "!text-base !font-semibold",
          description: "!text-sm !font-light !text-text-soft",
          success: "!border-l-success",
          error: "!border-l-danger",
          warning: "!border-l-warning",
          info: "!border-l-accent-solid",
          closeButton: "!border-border !bg-surface !text-foreground hover:!bg-accent-solid",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
