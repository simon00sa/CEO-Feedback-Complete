"use client"

import { useState } from "react"
import { 
  User, 
  Users, 
  Settings, 
  Building, 
  Shield, 
  ChevronDown
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface AdminPanelProps {
  className?: string
}

export function AdminPanel({ className }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState("organization")

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Admin Settings</CardTitle>
        <CardDescription>
          Configure organization structure, user roles, and system settings
        </CardDescription>
        <Tabs
          defaultValue={activeTab}
          onValueChange={setActiveTab}
          className="mt-4"
        >
          <TabsList className="grid grid-cols-4 h-9">
            <TabsTrigger value="organization">
              <Building className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Organization</span>
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="roles">
              <Shield className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="organization" className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" placeholder="Enter company name" />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="departments">Departments</Label>
                <div className="border rounded-md p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Engineering</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm" className="text-destructive">Delete</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Marketing</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm" className="text-destructive">Delete</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Sales</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">Edit</Button>
                      <Button variant="outline" size="sm" className="text-destructive">Delete</Button>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-2">
                    Add Department
                  </Button>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Organization Hierarchy</Label>
                <div className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ChevronDown className="h-4 w-4" />
                    <div className="font-medium">CEO</div>
                  </div>
                  <div className="ml-6">
                    <div className="flex items-center gap-2 mb-2">
                      <ChevronDown className="h-4 w-4" />
                      <div className="font-medium">CTO</div>
                    </div>
                    <div className="ml-6">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">Engineering Manager</div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    Edit Hierarchy
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="users" className="pt-4">
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <Label>User Management</Label>
                <Button>Add User</Button>
              </div>
              <div className="border rounded-md divide-y">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                    <div>
                      <div className="font-medium">John Doe</div>
                      <div className="text-sm text-muted-foreground">Engineering • Manager</div>
                    </div>
                  </div>
                  <Select defaultValue="manager">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                    <div>
                      <div className="font-medium">Jane Smith</div>
                      <div className="text-sm text-muted-foreground">Marketing • Staff</div>
                    </div>
                  </div>
                  <Select defaultValue="staff">
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="roles" className="pt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Role Permissions</Label>
                <div className="border rounded-md divide-y">
                  <div className="p-4">
                    <div className="font-medium mb-2">Staff</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="staff-submit" className="text-sm">Submit Feedback</Label>
                        <Switch id="staff-submit" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="staff-view" className="text-sm">View Own Feedback</Label>
                        <Switch id="staff-view" defaultChecked />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-medium mb-2">Manager</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="manager-view" className="text-sm">View Department Feedback</Label>
                        <Switch id="manager-view" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="manager-respond" className="text-sm">Respond to Feedback</Label>
                        <Switch id="manager-respond" defaultChecked />
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-medium mb-2">Executive</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="exec-view" className="text-sm">View All Feedback</Label>
                        <Switch id="exec-view" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="exec-analytics" className="text-sm">Access Analytics</Label>
                        <Switch id="exec-analytics" defaultChecked />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="pt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>System Settings</Label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Anonymization Level</div>
                      <div className="text-sm text-muted-foreground">Control how thoroughly feedback is anonymized</div>
                    </div>
                    <Select defaultValue="high">
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">AI Follow-up Questions</div>
                      <div className="text-sm text-muted-foreground">Allow AI to ask clarifying questions</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Feedback Preview</div>
                      <div className="text-sm text-muted-foreground">Allow users to preview anonymized feedback</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto-categorization</div>
                      <div className="text-sm text-muted-foreground">Use AI to categorize feedback</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  )
}
