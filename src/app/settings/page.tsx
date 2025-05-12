"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <h1 className="text-lg font-medium">Settings</h1>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure your anonymous feedback platform</CardDescription>
            </CardHeader>
            <div className="p-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="privacy">Privacy</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input id="company-name" defaultValue="Example Company" />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="language">Default Language</Label>
                      <Select defaultValue="en">
                        <SelectTrigger id="language">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select defaultValue="utc">
                        <SelectTrigger id="timezone">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utc">UTC</SelectItem>
                          <SelectItem value="est">Eastern Time (ET)</SelectItem>
                          <SelectItem value="cst">Central Time (CT)</SelectItem>
                          <SelectItem value="mst">Mountain Time (MT)</SelectItem>
                          <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Dark Mode</h3>
                        <p className="text-sm text-muted-foreground">Enable dark mode for all users</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <Button>Save General Settings</Button>
                  </div>
                </TabsContent>

                <TabsContent value="privacy" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Anonymization Level</h3>
                        <p className="text-sm text-muted-foreground">Control how thoroughly feedback is anonymized</p>
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
                        <h3 className="font-medium">Feedback Preview</h3>
                        <p className="text-sm text-muted-foreground">Allow users to preview anonymized feedback</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Data Retention</h3>
                        <p className="text-sm text-muted-foreground">How long to keep feedback data</p>
                      </div>
                      <Select defaultValue="6months">
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1month">1 Month</SelectItem>
                          <SelectItem value="3months">3 Months</SelectItem>
                          <SelectItem value="6months">6 Months</SelectItem>
                          <SelectItem value="1year">1 Year</SelectItem>
                          <SelectItem value="forever">Forever</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button>Save Privacy Settings</Button>
                  </div>
                </TabsContent>

                <TabsContent value="notifications" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Email Notifications</h3>
                        <p className="text-sm text-muted-foreground">Send notifications via email</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">New Feedback Alerts</h3>
                        <p className="text-sm text-muted-foreground">Notify leadership when new feedback is received</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Status Change Notifications</h3>
                        <p className="text-sm text-muted-foreground">Notify users when feedback status changes</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Response Notifications</h3>
                        <p className="text-sm text-muted-foreground">Notify users when leadership responds to feedback</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <Button>Save Notification Settings</Button>
                  </div>
                </TabsContent>

                <TabsContent value="security" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Two-Factor Authentication</h3>
                        <p className="text-sm text-muted-foreground">Require 2FA for all admin users</p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Session Timeout</h3>
                        <p className="text-sm text-muted-foreground">Automatically log out inactive users</p>
                      </div>
                      <Select defaultValue="30min">
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Timeout" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15min">15 Minutes</SelectItem>
                          <SelectItem value="30min">30 Minutes</SelectItem>
                          <SelectItem value="1hour">1 Hour</SelectItem>
                          <SelectItem value="4hours">4 Hours</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">API Access</h3>
                        <p className="text-sm text-muted-foreground">Allow API access to the platform</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <Button>Save Security Settings</Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
