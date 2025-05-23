'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from 'date-fns';

// Define the expected shape of a Team object from the API
interface Team {
  id: string;
  name: string;
  displayGroup?: string | null;
  memberCount: number;
  activeUserCount: number;
  isAnonymous: boolean;
  requiresMerging: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Define the expected shape of the error response
interface ErrorResponse {
  error?: string;
}

export function TeamList() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch teams
  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/teams');
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to fetch teams');
      }
      const data: Team[] = await response.json();
      setTeams(data);
    } catch (err) {
      console.error("Error fetching teams:", err);
      if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred.');
        toast.error(err.message || 'Failed to load teams.');
      } else {
        setError('An unexpected error occurred.');
        toast.error('Failed to load teams.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch teams on component mount
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  if (isLoading) {
    return <p>Loading teams...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error loading teams: {error}</p>;
  }

  if (teams.length === 0) {
    return <p>No teams created yet.</p>;
  }

  return (
    <Table>
      <TableCaption>A list of configured teams/departments.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Display Group (Anonymity)</TableHead>
          <TableHead>Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teams.map((team) => (
          <TableRow key={team.id}>
            <TableCell className="font-medium">{team.name}</TableCell>
            <TableCell>{team.displayGroup || team.name}</TableCell>
            <TableCell>{format(new Date(team.createdAt), 'PP')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
