
import React from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { FeedbackDisplay } from '@/components/dashboard/FeedbackDisplay';
import { redirect } from 'next/navigation';

// This page should display feedback based on the user's role.
// Access control should ideally be handled by middleware, but we add a check here too.

export default async function FeedbackDashboardPage() {
  const session = await getServerSession(authOptions);

  // Redirect if user is not logged in or doesn't have a required role
  if (!session || !session.user?.role || !['Leadership', 'Admin'].includes(session.user.role)) {
    // Redirect to home or an unauthorized page
    // Note: Middleware should ideally handle this, but this is a fallback.
    redirect('/'); 
  }

  const userRole = session.user.role; // Pass the role to the client component

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Feedback Dashboard</h1>
      <p className="mb-4">Viewing as: {userRole}</p>
      
      {/* Client component to fetch and display feedback based on role */} 
      <FeedbackDisplay userRole={userRole} />
      
    </div>
  );
}

