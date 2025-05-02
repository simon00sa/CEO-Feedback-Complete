import { Sidebar } from "@/components/layout/sidebar"
import { StaffChatClient } from "@/components/staff/staff-chat-client"

export default function FeedbackPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <h1 className="text-lg font-medium">Anonymous Feedback</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <StaffChatClient />
        </div>
      </div>
    </div>
  )
}
