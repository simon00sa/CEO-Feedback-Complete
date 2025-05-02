"use client";

import React from 'react';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// This page should be protected by middleware to ensure only Admins can access it.

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin - Application Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Manage Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm />
        </CardContent>
      </Card>
    </div>
  );
}

