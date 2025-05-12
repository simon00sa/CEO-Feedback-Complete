'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Define the shape of an invitation
interface Invitation {
  id: string;
  email: string;
  roleName: string;
  status: string; // e.g., "Pending", "Accepted"
}

// Define the shape of the error data
interface ErrorData {
  error?: string;
}

export function InvitationList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch invitations from the backend
  const fetchInvitations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/invitations');
      if (!response.ok) {
        const errorData: ErrorData = await response.json(); // Properly type errorData
        throw new Error(errorData.error || 'Failed to fetch invitations');
      }

      const data: Invitation[] = await response.json(); // Properly type the invitations data
      setInvitations(data);
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
      setError(err.message || 'An unexpected error occurred.');
      toast.error(err.message || 'Failed to fetch invitations.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle invitation deletion
  const handleDelete = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/invitations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData: ErrorData = await response.json(); // Properly type errorData
        throw new Error(errorData.error || 'Failed to delete invitation');
      }

      toast.success('Invitation deleted successfully!');
      setInvitations((prev) => prev.filter((invitation) => invitation.id !== id));
    } catch (err: any) {
      console.error('Error deleting invitation:', err);
      setError(err.message || 'An unexpected error occurred.');
      toast.error(err.message || 'Failed to delete invitation.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  if (isLoading) {
    return <p>Loading invitations...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <div className="space-y-4">
      {invitations.length > 0 ? (
        invitations.map((invitation) => (
          <div key={invitation.id} className="flex items-center justify-between p-4 border rounded">
            <div>
              <p className="font-medium">{invitation.email}</p>
              <p className="text-sm text-muted-foreground">Role: {invitation.roleName}</p>
              <p className="text-sm text-muted-foreground">Status: {invitation.status}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(invitation.id)}
              disabled={isLoading}
            >
              Delete
            </Button>
          </div>
        ))
      ) : (
        <p>No invitations found.</p>
      )}
    </div>
  );
}
