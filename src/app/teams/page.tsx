"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, UserPlus, Users, Building } from "lucide-react";

export default function TeamsPage() {
  const [activeTab, setActiveTab] = useState("members");

  // Mock team members data
  const teamMembers = [
    { id: 1, name: "John Doe", email: "john.doe@company.com", department: "Engineering", role: "Manager" },
    { id: 2, name: "Jane Smith", email: "jane.smith@company.com", department: "Marketing", role: "Staff" },
    { id: 3, name: "Michael Johnson", email: "michael.johnson@company.com", department: "Executive", role: "Executive" },
    { id: 4, name: "Sarah Williams", email: "sarah.williams@company.com", department: "HR", role: "Manager" },
    { id: 5, name: "Robert Brown", email: "robert.brown@company.com", department: "Sales", role: "Staff" },
  ];

  // Mock departments data
  const departments = [
    { id: 1, name: "Engineering", memberCount: 12, leadName: "John Doe" },
    { id: 2, name: "Marketing", memberCount: 8, leadName: "Sarah Williams" },
    { id: 3, name: "Sales", memberCount: 10, leadName: "Robert Brown" },
    { id: 4, name: "HR", memberCount: 5, leadName: "Jane Smith" },
    { id: 5, name: "Executive", memberCount: 3, leadName: "Michael Johnson" },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <h1 className="text-lg font-medium">Team Management</h1>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>Manage your organization's structure and members</CardDescription>
                </div>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="members">
                    <Users className="h-4 w-4 mr-2" />
                    Team Members
                  </TabsTrigger>
                  <TabsTrigger value="departments">
                    <Building className="h-4 w-4 mr-2" />
                    Departments
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="members" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input placeholder="Search members..." className="max-w-sm" />
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Departments</SelectItem>
                          <SelectItem value="engineering">Engineering</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="hr">HR</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border rounded-md divide-y">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <User className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">{member.department}</div>
                            <Select defaultValue={member.role.toLowerCase()}>
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
                            <Button variant="outline" size="sm">Edit</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="departments" className="mt-4">
                  <div className="space-y-4">
                    <Button>
                      <Building className="h-4 w-4 mr-2" />
                      Add Department
                    </Button>

                    <div className="border rounded-md divide-y">
                      {departments.map((dept) => (
                        <div key={dept.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building className="h-8 w-8 p-1.5 bg-primary/10 text-primary rounded-full" />
                            <div>
                              <div className="font-medium">{dept.name}</div>
                              <div className="text-sm text-muted-foreground">{dept.memberCount} members</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-sm">
                              Lead: <span className="font-medium">{dept.leadName}</span>
                            </div>
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm" className="text-destructive">Delete</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
