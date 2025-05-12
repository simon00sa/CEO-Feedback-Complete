"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Define the type of the settings object
type Settings = {
  appName?: string;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [appName, setAppName] = useState("Speak Up"); // Default app name

  // Fetch appName from /api/settings
  useEffect(() => {
    async function fetchAppName() {
      try {
        const response = await fetch("/api/settings"); // Assuming a public endpoint
        if (response.ok) {
          const settings: Settings = await response.json();
          if (settings.appName) {
            setAppName(settings.appName);
          }
        }
      } catch (error) {
        console.error("Failed to fetch app name:", error);
      }
    }
    fetchAppName();
  }, []);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const userRole = session?.user?.role?.toUpperCase(); // Ensure role check is case-insensitive

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <h1 className="text-lg font-medium">{appName}</h1>
          <div className="ml-auto">
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : isAuthenticated ? (
              <UserNav />
            ) : (
              <Button onClick={() => signIn()} size="sm">Sign In</Button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">Welcome to {appName}</CardTitle>
                <CardDescription>
                  An anonymous feedback platform that enables honest communication with leadership
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  {appName} allows you to provide honest feedback to leadership through natural conversations 
                  rather than traditional forms. Your feedback is intelligently routed to the appropriate 
                  leadership level based on priority, source, and content.
                </p>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : isAuthenticated ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {(userRole === "STAFF" || userRole === "LEADERSHIP" || userRole === "ADMIN") && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Submit Feedback</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">Share your thoughts anonymously.</p>
                          <Button className="w-full mt-4" asChild>
                            <Link href="/feedback">Start Conversation</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                    {(userRole === "LEADERSHIP" || userRole === "ADMIN") && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">View Dashboard</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">Review feedback summaries and trends.</p>
                          <Button className="w-full mt-4" asChild>
                            <Link href="/dashboard/feedback">View Feedback Dashboard</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                    {userRole === "ADMIN" && (
                      <Card className="md:col-span-2">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Admin Panel</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">Manage users, teams, settings, and invitations.</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <Button variant="outline" size="sm" asChild><Link href="/admin/invitations">Invitations</Link></Button>
                            <Button variant="outline" size="sm" asChild><Link href="/admin/teams">Teams</Link></Button>
                            <Button variant="outline" size="sm" asChild><Link href="/admin/settings">Settings</Link></Button>
                            <Button variant="outline" size="sm" asChild><Link href="/admin/anonymity">Anonymity</Link></Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center mt-6">
                    <p className="mb-4">Please sign in to submit feedback or view the dashboard.</p>
                    <Button onClick={() => signIn()}>Sign In</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold mb-4">1</div>
                    <h3 className="font-medium mb-2">Submit Feedback</h3>
                    <p className="text-sm text-muted-foreground">
                      Share your thoughts through a natural conversation with our AI assistant
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold mb-4">2</div>
                    <h3 className="font-medium mb-2">AI Processing</h3>
                    <p className="text-sm text-muted-foreground">
                      Your feedback is anonymized, categorized, and routed to the appropriate leadership
                    </p>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold mb-4">3</div>
                    <h3 className="font-medium mb-2">Leadership Action</h3>
                    <p className="text-sm text-muted-foreground">
                      Leadership reviews feedback, takes action, and can respond anonymously
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
