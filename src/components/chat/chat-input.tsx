"use client"
import { useRef } from "react"
import { Send, Paperclip, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  isLoading?: boolean
  className?: string
  placeholder?: string
}

export function ChatInput({ 
  value,
  onChange,
  onSend,
  isLoading = false,
  className,
  placeholder = "Type your message..." 
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }
  
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }
  
  return (
    <div className={cn(
      "flex flex-col p-4 border-t bg-card",
      className
    )}>
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[60px] max-h-[200px] resize-none bg-muted"
          rows={2}
        />
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="text-muted-foreground hover:text-foreground"
          >
            <Paperclip size={18} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            className="text-muted-foreground hover:text-foreground"
          >
            <Mic size={18} />
          </Button>
          <Button 
            onClick={onSend} 
            disabled={!value.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 h-10"
          >
            <Send size={18} className="mr-2" />
            Send
          </Button>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Your feedback will be anonymized before being shared with leadership.
      </div>
    </div>
  )
}
