
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TeamFormProps {
  onTeamAdded?: () => void; // Optional callback to refresh list
}

export function TeamForm({ onTeamAdded }: TeamFormProps) {
  const [name, setName] = useState('');
  const [displayGroup, setDisplayGroup] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    if (!name.trim()) {
      setError('Team name cannot be empty.');
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Only include displayGroup if it's not empty
        body: JSON.stringify({ 
          name: name.trim(),
          ...(displayGroup.trim() && { displayGroup: displayGroup.trim() })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add team');
      }

      // Clear form and show success
      setName('');
      setDisplayGroup('');
      toast.success(`Team "${name.trim()}" added successfully!`);
      
      // Call the callback if provided
      if (onTeamAdded) {
        onTeamAdded();
      }

    } catch (err) {
      console.error("Error adding team:", err);
      setError(err.message || 'An unexpected error occurred while saving.');
      toast.error(err.message || 'Failed to add team.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="teamName">Team Name *</Label>
        <Input
          id="teamName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Engineering, Marketing"
          required
          disabled={isSaving}
        />
        <p className="text-sm text-muted-foreground">
          The official name of the team or department.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayGroup">Display Group Name (Optional)</Label>
        <Input
          id="displayGroup"
          value={displayGroup}
          onChange={(e) => setDisplayGroup(e.target.value)}
          placeholder="(Defaults to Team Name if blank)"
          disabled={isSaving}
        />
        <p className="text-sm text-muted-foreground">
          Optional name used for reporting to ensure anonymity. If left blank, the Team Name will be used.
        </p>
      </div>

      {error && (
         <p className="text-sm text-red-500">Error: {error}</p>
      )}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Adding Team...' : 'Add Team'}
      </Button>
    </form>
  );
}

