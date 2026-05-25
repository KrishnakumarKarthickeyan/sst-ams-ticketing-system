"use client"

import * as React from "react"
import { cn } from "../../lib/utils"

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    color?: string
    icon?: React.ComponentType
  }
>

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactElement
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, config, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs font-mono text-zinc-950",
          className
        )}
        style={
          {
            ...Object.entries(config).reduce(
              (acc, [key, value]) => ({
                ...acc,
                [`--color-${key}`]: value.color,
              }),
              {}
            ),
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

interface ChartTooltipContentProps {
  active?: boolean
  payload?: any[]
  label?: string
  hideLabel?: boolean
  indicator?: "line" | "dot"
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(({ active, payload, label, hideLabel = false, indicator = "dot" }, ref) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div
      ref={ref}
      className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-md font-mono text-[10px] space-y-1.5 text-zinc-950 min-w-[120px]"
    >
      {!hideLabel && <div className="font-bold text-zinc-550 border-b border-zinc-100 pb-1">{label}</div>}
      <div className="space-y-1">
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-zinc-600">
              {indicator === "dot" && (
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || item.payload.fill || "var(--color-primary)" }}
                />
              )}
              {item.name}
            </span>
            <span className="font-bold text-zinc-950">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartTooltip = ({ ...props }: any) => {
  return <div {...props} />
}
ChartTooltip.displayName = "ChartTooltip"

export { ChartContainer, ChartTooltip, ChartTooltipContent }
