"use client"
import { Sidebar } from "@/components/layout/sidebar"
import { AdminPanel } from "@/components/admin/admin-panel"

export default function AdminPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-14 px-4 border-b">
          <h1 className="text-lg font-medium">Admin Settings</h1>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <AdminPanel />
        </div>
      </div>
    </div>
  )
}
