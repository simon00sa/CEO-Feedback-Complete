"use client"
import { Sidebar } from "@/components/layout/sidebar"
import { AdminPanel } from "@/components/admin/admin-panel"
import { useEffect, useState } from "react"

export default function AdminPage() {
  // State to track when component is mounted (helps with hydration issues)
  const [isMounted, setIsMounted] = useState(false)
  
  // Add error boundary to handle component failures gracefully
  const [error, setError] = useState<Error | null>(null)
  
  // Handle initial client-side rendering to avoid hydration mismatches
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Error handling for AdminPanel component
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Caught runtime error:", error)
      setError(error.error)
    }
    
    // Listen for unhandled errors
    window.addEventListener('error', handleError)
    
    return () => {
      window.addEventListener('error', handleError)
    }
  }, [])
  
  // Fallback content in case of error
  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between h-14 px-4 border-b">
            <h1 className="text-lg font-medium">Admin Settings</h1>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="p-4 border border-red-300 bg-red-50 rounded-md">
              <h2 className="text-lg font-medium text-red-800">Something went wrong</h2>
              <p className="mt-2 text-sm text-red-700">
                The admin panel encountered an error. Please try refreshing the page.
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-sm"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Show loading state during hydration to avoid flickering
  if (!isMounted) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-64 border-r bg-gray-50" aria-hidden="true"></div>
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between h-14 px-4 border-b">
            <div className="h-6 w-36 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="h-full w-full flex items-center justify-center">
              <div className="h-8 w-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Main component render
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-14 px-4 border-b">
          <h1 className="text-lg font-medium">Admin Settings</h1>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {/* Wrap AdminPanel in error boundary */}
          <div className="h-full">
            <AdminPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
