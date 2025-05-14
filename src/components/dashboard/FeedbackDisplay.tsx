'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { toast } from "sonner";

// Define the expected shape of feedback data (adjust based on API response for each role)
interface FeedbackBase {
  id: string;
  createdAt: string; // ISO date string
  status: string; // PENDING, ANALYZED, FLAGGED, ARCHIVED
  analysisSummary?: string | null;
  sentiment?: string | null;
  topics?: string[];
}

interface FeedbackAdmin extends FeedbackBase {
  content: string;
  submittedFromIP?: string | null;
  userAgent?: string | null;
  processingLog?: any | null; // Prisma Json type
}

interface FeedbackLeadership extends FeedbackBase {}

type FeedbackItem = FeedbackAdmin | FeedbackLeadership;

interface FeedbackDisplayProps {
  actualUserRole: 'Admin' | 'Leadership'; // The real role of the logged-in user
}

export function FeedbackDisplay({ actualUserRole }: FeedbackDisplayProps) {
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State for role simulation, defaults to the user's actual role
  const [viewAsRole, setViewAsRole] = useState<'Admin' | 'Leadership'>(actualUserRole);

  useEffect(() => {
    async function fetchFeedback() {
      setIsLoading(true);
      setError(null);
      try {
        // The API endpoint implicitly uses the logged-in user's role from the session
        const response = await fetch('/api/feedback'); 
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch feedback');
        }
        const data: FeedbackItem[] = await response.json();
        // Important: The fetched data structure depends on the *actual* user role used by the API
        // The viewAsRole state only controls how we *display* it
        setFeedbackList(data);
      } catch (err: any) {
        console.error("Error fetching feedback:", err);
        setError(err.message || 'An unexpected error occurred.');
        toast.error(err.message || 'Failed to load feedback.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeedback();
  }, []); // Fetch on component mount

  // Reset viewAsRole if the actual role changes (e.g., user logs out/in)
  useEffect(() => {
    setViewAsRole(actualUserRole);
  }, [actualUserRole]);

  if (isLoading) {
    return <p>Loading feedback...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error loading feedback: {error}</p>;
  }

  if (feedbackList.length === 0) {
    return <p>No feedback submitted yet.</p>;
  }

  const handleViewChange = (value: 'Admin' | 'Leadership') => {
    setViewAsRole(value);
  };

  return (
    <div className="space-y-6">
      {/* Role View Toggle - Only visible to Admins */}
      {actualUserRole === 'Admin' && (
        <div className="flex items-center space-x-2 p-4 border rounded-md bg-secondary/50">
          <Label htmlFor="role-view-select">View Feedback As:</Label>
          <Select value={viewAsRole} onValueChange={handleViewChange}>
            <SelectTrigger id="role-view-select" className="w-[180px]">
              <SelectValue placeholder="Select role view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Admin">Admin (Full Details)</SelectItem>
              <SelectItem value="Leadership">Leadership (Summaries)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">(Testing Aid)</p>
        </div>
      )}

      {/* Feedback Cards */}
      <div className="space-y-4">
        {feedbackList.map((feedback) => (
          <Card key={feedback.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Feedback ID: {feedback.id.substring(0, 8)}...</span>
                <Badge variant={feedback.status === 'PENDING' ? 'outline' : 'default'}>{feedback.status}</Badge>
              </CardTitle>
              <CardDescription>
                Received: {format(new Date(feedback.createdAt), 'PPp')}
                {feedback.sentiment && ` | Sentiment: ${feedback.sentiment}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Conditional display based on viewAsRole */}
              {viewAsRole === 'Admin' && (feedback as FeedbackAdmin).content && (
                <div className="mb-4 p-3 bg-muted rounded">
                  <h4 className="font-semibold mb-1">Raw Content (Admin View):</h4>
                  <p className="text-sm">{(feedback as FeedbackAdmin).content}</p>
                </div>
              )}
              {feedback.analysisSummary ? (
                <div className="mb-2">
                  <h4 className="font-semibold mb-1">AI Summary:</h4>
                  <p className="text-sm">{feedback.analysisSummary}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">AI analysis pending...</p>
              )}
              {feedback.topics && feedback.topics.length > 0 && (
                <div className="mt-2">
                  <h4 className="font-semibold mb-1">Detected Topics:</h4>
                  <div className="flex flex-wrap gap-1">
                    {feedback.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary">{topic}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {/* Conditional display based on viewAsRole */}
              {viewAsRole === 'Admin' && (
                <details className="mt-4 text-xs text-muted-foreground">
                  <summary>Diagnostic Info (Admin View)</summary>
                  <ul className="list-disc pl-5 mt-1">
                    <li>IP: {(feedback as FeedbackAdmin).submittedFromIP || 'N/A'}</li>
                    <li>User Agent: {(feedback as FeedbackAdmin).userAgent || 'N/A'}</li>
                    <li>Processing Log: {JSON.stringify((feedback as FeedbackAdmin).processingLog) || 'N/A'}</li>
                  </ul>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
