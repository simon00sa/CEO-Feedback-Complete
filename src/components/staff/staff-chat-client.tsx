"use client"

import { useState, useEffect, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import { ChatHistory } from "@/components/chat/chat-history"
import { ChatInput } from "@/components/chat/chat-input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai' | 'system'
  timestamp: string
  metadata?: {
    category?: string
    priority?: number
    isQuestion?: boolean
    anonymized?: string
  }
}

export function StaffChatClient() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      content: "Hello! I'm here to help you provide anonymous feedback to leadership. Your identity will be protected through our anonymization process. What would you like to share today?",
      sender: "ai",
      timestamp: new Date().toLocaleTimeString()
    }
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showAnonymizationInfo, setShowAnonymizationInfo] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      content: inputValue,
      sender: "user",
      timestamp: new Date().toLocaleTimeString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    
    try {
      // In a real implementation, this would call the API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          conversation: messages
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      const data = await response.json()
      
      // If this is the final response, show the anonymized preview
      if (messages.length >= 5) {
        // Add AI response
        const aiMessage: Message = {
          id: uuidv4(),
          content: data.response,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString(),
          metadata: data.metadata
        }
        
        setMessages(prev => [...prev, aiMessage])
        
        // Add anonymized preview
        setTimeout(() => {
          const anonymizedMessage: Message = {
            id: uuidv4(),
            content: `"${data.anonymized || 'The person is experiencing challenges with workload and team resources. They mentioned that deadlines are often unrealistic for the current team size. They suggested adding more team members or adjusting project timelines to better match capacity.'}"`,
            sender: "system",
            timestamp: new Date().toLocaleTimeString(),
            metadata: {
              category: data.metadata?.category,
              priority: data.metadata?.priority,
              anonymized: "true"
            }
          }
          
          setMessages(prev => [...prev, anonymizedMessage])
          setShowAnonymizationInfo(true)
        }, 1000)
      } else {
        // Add AI response
        const aiMessage: Message = {
          id: uuidv4(),
          content: data.response,
          sender: "ai",
          timestamp: new Date().toLocaleTimeString(),
          metadata: data.metadata
        }
        
        setMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Fallback AI response
      const fallbackMessage: Message = {
        id: uuidv4(),
        content: "I'm sorry, I'm having trouble processing your message. Could you try again?",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString()
      }
      
      setMessages(prev => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Card className="flex flex-col h-full border-none">
        <CardHeader className="pb-4">
          <CardTitle>Anonymous Feedback</CardTitle>
          <CardDescription>
            Share your thoughts and concerns anonymously with leadership
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0 relative">
          <ChatHistory messages={messages} className="h-full pb-20" />
          <div ref={messagesEndRef} />
          
          {showAnonymizationInfo && (
            <div className="absolute bottom-20 left-4 right-4">
              <Alert variant="default" className="bg-blue-900/30 border-blue-800">
                <InfoIcon className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-400">How anonymization works</AlertTitle>
                <AlertDescription className="text-blue-300 text-xs">
                  Your feedback is processed by our AI to remove identifying information. Personal pronouns, names, and specific details are generalized. The CEO sees only the anonymized version shown above, not your original messages.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            isLoading={isLoading}
            placeholder="Type your message..."
          />
        </CardFooter>
      </Card>
    </div>
  )
}
