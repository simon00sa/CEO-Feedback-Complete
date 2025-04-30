
import React from 'react';
import { AnonymitySettingsForm } from '@/components/admin/AnonymitySettingsForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// This page should be protected by middleware to ensure only Admins can access it.

export default function AdminAnonymityPage() {
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

