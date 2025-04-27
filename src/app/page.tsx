"use client"

import { useState } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          <h1 className="text-lg font-medium">Speak Up</h1>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-2xl">Welcome to Speak Up</CardTitle>
                <CardDescription>
                  An anonymous feedback platform that enables honest communication with leadership
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Speak Up allows you to provide honest feedback to leadership through natural conversations 
                  rather than traditional forms. Your feedback is intelligently routed to the appropriate 
                  leadership level based on priority, source, and content.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">For Staff</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span>Submit anonymous feedback</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span>Preview anonymized content</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span>Track feedback status</span>
                        </li>
                      </ul>
                      <Button className="w-full mt-4" asChild>
                        <Link href="/feedback">Start Conversation</Link>
                      </Button>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">For Leadership</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span>View prioritized feedback</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span>Analyze feedback trends</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span>Respond anonymously</span>
                        </li>
                      </ul>
                      <Button className="w-full mt-4" asChild>
                        <Link href="/dashboard">View Dashboard</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
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
  )
}
