"use client";

import React from 'react';
import { TeamForm } from '@/components/admin/TeamForm';
import { TeamList } from '@/components/admin/TeamList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// This page should be protected by middleware to ensure only Admins can access it.

export default function AdminTeamsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin - Manage Teams / Departments</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Team</CardTitle>
        </CardHeader>
        <CardContent>
          {/* We might need to pass a function to reload the list after adding */}
          <TeamForm /> 
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamList />
        </CardContent>
      </Card>
    </div>
  );
}

