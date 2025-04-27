"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  MessageSquare, 
  BarChart3, 
  Users, 
  Settings, 
  User,
  Menu,
  X
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

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
  }

  const navItems = [
    {
      title: "Feedback",
      href: "/feedback",
      icon: MessageSquare,
      variant: "default",
      role: "staff"
    },
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: BarChart3,
      variant: "default",
      role: "leadership"
    },
    {
      title: "Team Management",
      href: "/teams",
      icon: Users,
      variant: "default",
      role: "admin"
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      variant: "default",
      role: "all"
    },
    {
      title: "Profile",
      href: "/profile",
      icon: User,
      variant: "default",
      role: "all"
    }
  ]

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
            <span className="text-xl font-bold text-sidebar-primary">Speak Up</span>
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
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                "hover:bg-sidebar-accent hover:text-white",
                pathname === item.href 
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
