"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SegmentedProgressProps {
  value: number // Progress value from 0-100
  total: number // Total number of segments (e.g., 175)
  className?: string
  segmentClassName?: string
  completedSegmentClassName?: string
}

function SegmentedProgress({
  value,
  total,
  className,
  segmentClassName,
  completedSegmentClassName
}: SegmentedProgressProps) {
  const completedSegments = Math.floor((value / 100) * total)
  
  return (
    <div className={cn("flex gap-[1px] h-2 w-full", className)}>
      {Array.from({ length: total }, (_, index) => (
        <div
          key={index}
          className={cn(
            "flex-1 rounded-[1px] transition-colors duration-200",
            index < completedSegments
              ? completedSegmentClassName || "bg-green-500"
              : "bg-muted/30",
            segmentClassName
          )}
        />
      ))}
    </div>
  )
}

export { SegmentedProgress }
