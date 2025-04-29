"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { 
  MessageSquare, 
  BarChart3, 
  Users, 
  Settings, 
  User,
  Menu,
  X,
  Shield,
  UserPlus,
  Lock
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { data: session, status } = useSession()
  const [appName, setAppName] = useState("Speak Up") // Default app name

  // TODO: Fetch appName from settings API when available
  // useEffect(() => {
  //   async function fetchAppName() {
  //     try {
  //       const response = await fetch("/api/settings");
  //       if (response.ok) {
  //         const settings = await response.json();
  //         if (settings.appName) {
  //           setAppName(settings.appName);
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Failed to fetch app name:", error);
  //     }
  //   }
  //   fetchAppName();
  // }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
  }

  const isAuthenticated = status === "authenticated"
  const userRole = session?.user?.role?.toUpperCase() || "" // Default to empty string if undefined
  const isAdmin = userRole === "ADMIN"
  const isLeadership = userRole === "LEADERSHIP" || userRole === "ADMIN" // Admin can see leadership views

  // Base navigation items available to all authenticated users
  const baseNavItems = [
    {
      title: "Home",
      href: "/",
      icon: Menu,
      variant: "default",
      showWhen: "always" // Always show home link
    },
    {
      title: "Submit Feedback",
      href: "/feedback",
      icon: MessageSquare,
      variant: "default",
      showWhen: "authenticated" // Show to all authenticated users
    },
    {
      title: "Profile",
      href: "/profile",
      icon: User,
      variant: "default",
      showWhen: "authenticated" // Show to all authenticated users
    }
  ]

  // Leadership-specific navigation items
  const leadershipNavItems = [
    {
      title: "Feedback Dashboard",
      href: "/dashboard/feedback",
      icon: BarChart3,
      variant: "default",
      showWhen: "leadership" // Only show to leadership and admin
    }
  ]

  // Admin-specific navigation items
  const adminNavItems = [
    {
      title: "Admin",
      href: "/admin",
      icon: Shield,
      variant: "default",
      showWhen: "admin" // Only show to admin
    },
    {
      title: "Invitations",
      href: "/admin/invitations",
      icon: UserPlus,
      variant: "default",
      showWhen: "admin" // Only show to admin
    },
    {
      title: "Teams",
      href: "/admin/teams",
      icon: Users,
      variant: "default",
      showWhen: "admin" // Only show to admin
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Settings,
      variant: "default",
      showWhen: "admin" // Only show to admin
    },
    {
      title: "Anonymity",
      href: "/admin/anonymity",
      icon: Lock,
      variant: "default",
      showWhen: "admin" // Only show to admin
    }
  ]

  // Combine all navigation items
  const allNavItems = [
    ...baseNavItems,
    ...leadershipNavItems,
    ...adminNavItems
  ]

  // Filter navigation items based on user role and authentication status
  const visibleNavItems = allNavItems.filter(item => {
    if (item.showWhen === "always") return true;
    if (item.showWhen === "authenticated" && isAuthenticated) return true;
    if (item.showWhen === "leadership" && isLeadership) return true;
    if (item.showWhen === "admin" && isAdmin) return true;
    return false;
  });

  return (
    <div
      className={cn(
        "relative flex flex-col h-screen bg-sidebar border-r border-sidebar-border",
        collapsed ? "w-16" : "resizable-sidebar",
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-sidebar-primary">{appName}</span>
          </Link>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-auto text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={toggleSidebar}
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </Button>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-1 px-2">
          {visibleNavItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                "hover:bg-sidebar-accent hover:text-white",
                pathname === item.href || pathname?.startsWith(item.href + "/")
                  ? "bg-sidebar-accent text-white" 
                  : "text-gray-400",
                collapsed && "justify-center px-0"
              )}
            >
              <item.icon className={cn("h-5 w-5", collapsed && "h-6 w-6")} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          ))}
        </nav>
      </ScrollArea>
      <div className="flex items-center justify-center h-14 px-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          {!collapsed && (
            <div className="text-xs text-gray-400">
              Anonymous Feedback
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
