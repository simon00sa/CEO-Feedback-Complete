"use client"
import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics"
import { FeedbackManagement } from "@/components/dashboard/feedback-management"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("analytics")
  
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-14 px-4 border-b">
          <h1 className="text-lg font-medium">Leadership Dashboard</h1>
          <div className="w-[400px]">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <Tabs value={activeTab}>
            <TabsContent value="analytics" className="mt-0">
              <DashboardAnalytics />
            </TabsContent>
            <TabsContent value="feedback" className="mt-0">
              <FeedbackManagement />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
