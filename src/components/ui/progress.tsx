"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number; indicatorClassName?: string }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800",
      className
    )}
    {...props}
  >
    <div
      className={cn("h-full w-full flex-1 bg-zinc-900 transition-all dark:bg-zinc-50", indicatorClassName)}
      style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value || 0))}%)` }}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
