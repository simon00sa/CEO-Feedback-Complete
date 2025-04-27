"use client"

import { cn } from "@/lib/utils"

interface MessageBubbleProps {
  content: string
  sender: 'user' | 'ai' | 'system'
  timestamp: string
  status?: 'new' | 'in-progress' | 'resolved' | 'escalated'
  className?: string
}

export function MessageBubble({ 
  content, 
  sender, 
  timestamp, 
  status,
  className 
}: MessageBubbleProps) {
  return (
    <div className={cn(
      "flex flex-col rounded-lg p-4 mb-4 shadow-sm",
      sender === 'user' && "bg-primary text-white self-end rounded-br-none",
      sender === 'ai' && "bg-slate-800 text-white self-start rounded-bl-none border border-slate-700",
      sender === 'system' && "bg-slate-900 text-slate-300 self-start italic border border-slate-800",
      className
    )}>
      <div className="text-sm mb-1">{content}</div>
      <div className="flex items-center justify-between mt-2">
        <div className="text-xs opacity-70">{timestamp}</div>
        {status && (
          <div className={cn(
            "text-xs px-2 py-0.5 rounded-full ml-2",
            status === 'new' && "bg-primary/20 text-primary-foreground",
            status === 'in-progress' && "bg-warning/20 text-warning",
            status === 'resolved' && "bg-success/20 text-success",
            status === 'escalated' && "bg-alert/20 text-alert"
          )}>
            {status}
          </div>
        )}
      </div>
    </div>
  )
}
