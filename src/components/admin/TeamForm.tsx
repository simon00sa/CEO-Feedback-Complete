'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Define the type for the error response
interface ErrorResponse {
  error?: string;
}

export function TeamForm() {
  const [teamName, setTeamName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: teamName }),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json(); // Explicitly type errorData
        throw new Error(errorData.error || 'Failed to add team');
      }

      toast.success('Team added successfully!');
      setTeamName(''); // Clear the input field on success
    } catch (error: any) {
      console.error('Error adding team:', error);
      toast.error(error.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="teamName" className="block text-sm font-medium text-gray-700">
          Team Name
        </label>
        <Input
          id="teamName"
          name="teamName"
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Team'}
      </Button>
    </form>
  );
}
