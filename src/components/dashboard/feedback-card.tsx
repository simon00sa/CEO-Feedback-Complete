"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface FeedbackCardProps {
  id: string
  content: string
  category: string
  priority: number
  department: string
  status: 'new' | 'in-progress' | 'resolved' | 'escalated'
  createdAt: string
  className?: string
  onClick?: () => void
}

export function FeedbackCard({
  id,
  content,
  category,
  priority,
  department,
  status,
  createdAt,
  className,
  onClick
}: FeedbackCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer hover:bg-muted/10 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base">{category}</CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "ml-2",
              status === 'new' && "border-primary text-primary",
              status === 'in-progress' && "border-warning text-warning",
              status === 'resolved' && "border-success text-success",
              status === 'escalated' && "border-alert text-alert"
            )}
          >
            {status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span>{department}</span>
          <span>•</span>
          <span>{createdAt}</span>
          <span>•</span>
          <span className="flex items-center">
            Priority: 
            <span className={cn(
              "ml-1",
              priority === 1 && "text-muted-foreground",
              priority === 2 && "text-primary",
              priority === 3 && "text-warning",
              priority === 4 && "text-alert"
            )}>
              {priority}
            </span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm line-clamp-3">{content}</p>
      </CardContent>
    </Card>
  )
}
