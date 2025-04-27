"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
    label: string
  }
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  trend,
  className
}: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <div className={cn(
              "flex items-center text-xs font-medium",
              trend.direction === 'up' && "text-success",
              trend.direction === 'down' && "text-alert"
            )}>
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trend.value}%
            </div>
            <div className="text-xs text-muted-foreground">
              {trend.label}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
