'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { toast } from "sonner";

// Define the expected shape of an invitation object from the API
interface Invitation {
  id: string;
  email: string;
  role: { name: string };
  expires: string; // ISO date string
  used: boolean;
  createdAt: string; // ISO date string
}

export function InvitationList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvitations() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/invitations');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch invitations');
        }
        const data: Invitation[] = await response.json();
        setInvitations(data);
      } catch (err) {
        console.error("Error fetching invitations:", err);
        setError(err.message || 'An unexpected error occurred.');
        toast.error(err.message || 'Failed to load invitations.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvitations();
  }, []); // Empty dependency array means this runs once on mount

  if (isLoading) {
    return <p>Loading invitations...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error loading invitations: {error}</p>;
  }

  return (
    <Table>
      <TableCaption>A list of sent invitations.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center">No invitations found.</TableCell>
          </TableRow>
        ) : (
          invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium">{invitation.email}</TableCell>
              <TableCell>{invitation.role.name}</TableCell>
              <TableCell>
                {invitation.used ? (
                  <Badge variant="secondary">Used</Badge>
                ) : new Date(invitation.expires) < new Date() ? (
                  <Badge variant="outline">Expired</Badge>
                ) : (
                  <Badge variant="default">Pending</Badge>
                )}
              </TableCell>
              <TableCell>{format(new Date(invitation.expires), 'PPp')}</TableCell>
              <TableCell>{format(new Date(invitation.createdAt), 'PPp')}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

