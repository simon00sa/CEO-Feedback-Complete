"use client";

import { useState } from "react";
import {
  User,
  Users,
  Settings,
  Building,
  Shield,
  ChevronDown,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface AdminPanelProps {
  className?: string;
}

export function AdminPanel({ className }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState("organization");

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Admin Settings</CardTitle>
        <CardDescription>
          Configure organization structure, user roles, and system settings
        </CardDescription>
      </CardHeader>
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
                {["Engineering", "Marketing", "Sales"].map((department) => (
                  <div
                    key={department}
                    className="flex items-center justify-between"
                  >
                    <div className="font-medium">{department}</div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
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
              {[
                { name: "John Doe", role: "manager", department: "Engineering" },
                { name: "Jane Smith", role: "staff", department: "Marketing" },
              ].map((user) => (
                <div
                  key={user.name}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.department} • {user.role.charAt(0).toUpperCase() +
                          user.role.slice(1)}
                      </div>
                    </div>
                  </div>
                  <Select defaultValue={user.role}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {["staff", "manager", "executive", "admin"].map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="roles" className="pt-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Role Permissions</Label>
              <div className="border rounded-md divide-y">
                {[
                  {
                    role: "Staff",
                    permissions: [
                      { id: "staff-submit", label: "Submit Feedback" },
                      { id: "staff-view", label: "View Own Feedback" },
                    ],
                  },
                  {
                    role: "Manager",
                    permissions: [
                      { id: "manager-view", label: "View Department Feedback" },
                      { id: "manager-respond", label: "Respond to Feedback" },
                    ],
                  },
                  {
                    role: "Executive",
                    permissions: [
                      { id: "exec-view", label: "View All Feedback" },
                      { id: "exec-analytics", label: "Access Analytics" },
                    ],
                  },
                ].map(({ role, permissions }) => (
                  <div key={role} className="p-4">
                    <div className="font-medium mb-2">{role}</div>
                    <div className="space-y-2">
                      {permissions.map(({ id, label }) => (
                        <div
                          key={id}
                          className="flex items-center justify-between"
                        >
                          <Label htmlFor={id} className="text-sm">
                            {label}
                          </Label>
                          <Switch id={id} defaultChecked />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>System Settings</Label>
              <div className="space-y-4">
                {[
                  {
                    label: "Anonymization Level",
                    description: "Control how thoroughly feedback is anonymized",
                    type: "select",
                    options: ["Low", "Medium", "High"],
                    defaultValue: "high",
                  },
                  {
                    label: "AI Follow-up Questions",
                    description: "Allow AI to ask clarifying questions",
                    type: "switch",
                  },
                  {
                    label: "Feedback Preview",
                    description: "Allow users to preview anonymized feedback",
                    type: "switch",
                  },
                  {
                    label: "Auto-categorization",
                    description: "Use AI to categorize feedback",
                    type: "switch",
                  },
                ].map((setting, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{setting.label}</div>
                      <div className="text-sm text-muted-foreground">
                        {setting.description}
                      </div>
                    </div>
                    {setting.type === "select" ? (
                      <Select defaultValue={setting.defaultValue}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                        <SelectContent>
                          {setting.options?.map((option) => (
                            <SelectItem key={option} value={option.toLowerCase()}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Switch defaultChecked />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
