import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-900/80",
        secondary:
          "border-transparent bg-surface-subtle text-ink hover:bg-surface-subtle/80",
        destructive:
          "border-transparent bg-red-600 text-white shadow hover:bg-red-500",
        success:
          "border-transparent bg-success-soft text-success-strong border border-success-border",
        warning:
          "border-transparent bg-warning-soft text-amber-800 border border-warning-border",
        outline: "text-ink border-line bg-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
