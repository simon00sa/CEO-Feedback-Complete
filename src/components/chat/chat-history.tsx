"use client"
import { MessageBubble } from "./message-bubble"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai' | 'system'
  timestamp: string
  status?: 'new' | 'in-progress' | 'resolved' | 'escalated'
}

interface ChatHistoryProps {
  messages: Message[]
  className?: string
}

export function ChatHistory({ 
  messages,
  className 
}: ChatHistoryProps) {
  return (
    <ScrollArea className={className}>
      <div className="flex flex-col p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="text-muted-foreground text-center">
              <p className="mb-2">No messages yet</p>
              <p className="text-sm">Start a conversation to provide anonymous feedback</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col-reverse">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                content={message.content}
                sender={message.sender}
                timestamp={message.timestamp}
                status={message.status}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
