"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[26px] data-[size=default]:w-11 data-[size=sm]:h-5 data-[size=sm]:w-9 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:border-transparent data-[state=unchecked]:bg-[var(--fog-mork)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-background shadow-md ring-0 transition-transform data-[state=checked]:translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
