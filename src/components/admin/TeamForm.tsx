'use client';

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Define the expected shape of the team object
interface Team {
  id: string;
  name: string;
}

// Define the expected shape of the error response
interface ErrorResponse {
  error?: string;
}

export function TeamList() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      setIsLoading(true);

      try {
        const response = await fetch('/api/admin/teams');

        if (!response.ok) {
          const errorData: ErrorResponse = await response.json(); // Explicitly type errorData
          throw new Error(errorData.error || 'Failed to fetch teams');
        }

        const data: Team[] = await response.json();
        setTeams(data);
      } catch (error: any) {
        console.error('Error fetching teams:', error);
        toast.error(error.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeams();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Teams</h1>
      {isLoading ? (
        <p>Loading teams...</p>
      ) : (
        <ul className="list-disc pl-5">
          {teams.map((team) => (
            <li key={team.id}>{team.name}</li>
          ))}
        </ul>
      )}
      <Button onClick={() => toast.success('Feature coming soon!')} disabled={isLoading}>
        Add New Team
      </Button>
    </div>
  );
}
