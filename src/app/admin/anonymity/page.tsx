"use client";

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Import the cache fix to ensure Cache constructor is available
import '@/lib/cache-fix';

// Use dynamic import with SSR disabled for the AnonymitySettingsForm component
// This helps prevent the "Cache is not a constructor" error during server-side rendering
const AnonymitySettingsForm = dynamic(
  () => import('@/components/admin/AnonymitySettingsForm').then(mod => mod.AnonymitySettingsForm),
  { 
    ssr: false, 
    loading: () => <div className="py-6">Loading anonymity settings...</div> 
  }
);

// This page should be protected by middleware to ensure only Admins can access it.
export default function AdminAnonymityPage() {
  // Use effect to ensure we're in the browser environment
  useEffect(() => {
    // Nothing needed here, just ensuring client-side execution
  }, []);
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin - Anonymity Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Configure Anonymity Rules</CardTitle>
          <CardDescription>
            Define the rules for grouping teams and ensuring feedback anonymity.
            Changes here may affect how feedback is displayed and attributed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnonymitySettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}
