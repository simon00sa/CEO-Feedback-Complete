"use client"
import { useState } from "react"
import { ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Export ALL three chart icons so they can be used by parent components
export { BarChart3, PieChart, LineChart } from "lucide-react"

interface AnalyticsCardProps {
  title: string
  description?: string
  tabs?: {
    id: string
    label: string
    icon: React.ElementType
  }[]
  defaultTab?: string
  children?: React.ReactNode
  className?: string
  footerText?: string
  footerLink?: {
    label: string
    href: string
  }
}

export function AnalyticsCard({
  title,
  description,
  tabs,
  defaultTab,
  children,
  className,
  footerText,
  footerLink
}: AnalyticsCardProps) {
  // Ensure activeTab is always a string by providing a fallback empty string
  const [activeTab, setActiveTab] = useState<string>(
    defaultTab || (tabs && tabs[0]?.id) || ""
  );
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {tabs && tabs.length > 0 && (
          <Tabs
            defaultValue={activeTab}
            onValueChange={setActiveTab}
            className="mt-2"
          >
            <TabsList className="grid grid-cols-3 h-9">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-1"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={activeTab} className="pt-4">
              {children}
            </TabsContent>
          </Tabs>
        )}
      </CardHeader>
      {!tabs && <CardContent>{children}</CardContent>}
      {(footerText || footerLink) && (
        <CardFooter className="pt-2 border-t">
          {footerText && (
            <p className="text-xs text-muted-foreground">{footerText}</p>
          )}
          {footerLink && (
            <Button
              variant="link"
              size="sm"
              className="ml-auto p-0 h-auto text-xs"
              asChild
            >
              <a href={footerLink.href} className="flex items-center">
                {footerLink.label}
                <ArrowUpRight className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
