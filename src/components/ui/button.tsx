import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-950 text-white shadow hover:bg-zinc-800",
        destructive:
          "bg-red-600 text-white shadow-card hover:bg-red-500",
        outline:
          "border border-line bg-surface shadow-card hover:bg-zinc-150 hover:text-ink",
        secondary:
          "bg-surface-subtle text-ink shadow-card hover:bg-zinc-200",
        ghost: "hover:bg-surface-subtle hover:text-ink",
        link: "text-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-4 py-2",
        sm: "h-7 rounded px-3 text-[11px]",
        lg: "h-9 rounded px-8",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
