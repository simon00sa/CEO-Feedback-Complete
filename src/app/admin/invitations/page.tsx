
import React from 'react';
import { InvitationForm } from '@/components/admin/InvitationForm';
import { InvitationList } from '@/components/admin/InvitationList'; // Import the list component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// This page should be protected by middleware to ensure only Admins can access it.

export default function AdminInvitationsPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin - Manage Invitations</h1>
      
      <Card className="mb-8"> {/* Add margin bottom */} 
        <CardHeader>
          <CardTitle>Create New Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitationForm />
        </CardContent>
      </Card>

      {/* Add the section to list existing invitations */} 
      <Card>
        <CardHeader>
          <CardTitle>Existing Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitationList /> {/* Add the list component here */} 
        </CardContent>
      </Card>
    </div>
  );
}

