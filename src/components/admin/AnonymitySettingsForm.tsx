'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; // For boolean settings
import { toast } from "sonner";

// Define the expected shape of the AnonymitySettings object
interface AnonymitySettingsData {
  id?: string;
  minGroupSize: number;
  minActiveUsers: number;
  activityThresholdDays: number;
  combinationLogic: string;
  enableGrouping: boolean;
  activityRequirements?: any | null; // JSON field
}

export function AnonymitySettingsForm() {
  const [settings, setSettings] = useState<Partial<AnonymitySettingsData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings function
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/anonymity-settings');
      if (!response.ok) {
        const errorData: { error?: string } = await response.json();
        throw new Error(errorData.error || 'Failed to fetch anonymity settings');
      }
      const data: AnonymitySettingsData = await response.json();
      setSettings(data);
    } catch (err: any) {
      console.error("Error fetching anonymity settings:", err);
      setError(err.message || 'An unexpected error occurred.');
      toast.error(err.message || 'Failed to load anonymity settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle input changes (generic for text/number inputs)
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = event.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  // Handle switch changes (for boolean)
  const handleSwitchChange = (checked: boolean, name: keyof AnonymitySettingsData) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: checked,
    }));
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      // Prepare only the fields we want to update
      const updatePayload: Partial<AnonymitySettingsData> = {
        minGroupSize: settings.minGroupSize,
        minActiveUsers: settings.minActiveUsers,
        activityThresholdDays: settings.activityThresholdDays,
        combinationLogic: settings.combinationLogic,
        enableGrouping: settings.enableGrouping,
      };

      const response = await fetch('/api/admin/anonymity-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData: { error?: string } = await response.json();
        throw new Error(errorData.error || 'Failed to save anonymity settings');
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings); // Update state with saved settings
      toast.success("Anonymity settings saved successfully!");

    } catch (err: any) {
      console.error("Error saving anonymity settings:", err);
      setError(err.message || 'An unexpected error occurred while saving.');
      toast.error(err.message || 'Failed to save anonymity settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p>Loading anonymity settings...</p>;
  }

  if (error && !isSaving) {
    return <p className="text-red-500">Error loading settings: {error}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="minGroupSize">Minimum Group Size for Reporting</Label>
        <Input
          id="minGroupSize"
          name="minGroupSize"
          type="number"
          min="2" // Sensible minimum
          value={settings.minGroupSize || ''}
          onChange={handleInputChange}
          disabled={isSaving}
        />
        <p className="text-sm text-muted-foreground">
          Minimum number of people required in a team/group for its feedback to be reported separately. Groups smaller than this will be merged.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="minActiveUsers">Minimum Active Users for Reporting</Label>
        <Input
          id="minActiveUsers"
          name="minActiveUsers"
          type="number"
          min="1"
          value={settings.minActiveUsers || ''}
          onChange={handleInputChange}
          disabled={isSaving}
        />
        <p className="text-sm text-muted-foreground">
          Minimum number of *active* users required in a group (that meets the size threshold) for separate reporting. Helps prevent identification via inactive accounts.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="activityThresholdDays">User Activity Threshold (Days)</Label>
        <Input
          id="activityThresholdDays"
          name="activityThresholdDays"
          type="number"
          min="1"
          value={settings.activityThresholdDays || ''}
          onChange={handleInputChange}
          disabled={isSaving}
        />
        <p className="text-sm text-muted-foreground">
          Number of days within which a user must perform an action (e.g., login, submit feedback) to be considered "active".
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="combinationLogic">Small Group Combination Logic</Label>
        <Input
          id="combinationLogic"
          name="combinationLogic"
          value={settings.combinationLogic || ''}
          onChange={handleInputChange}
          placeholder="e.g., DEPARTMENT, HIERARCHY"
          disabled={isSaving}
        />
        <p className="text-sm text-muted-foreground">
          Strategy used to merge small or inactive groups (e.g., merge by parent department).
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Switch 
          id="enableGrouping"
          checked={settings.enableGrouping || false}
          onCheckedChange={(checked) => handleSwitchChange(checked, 'enableGrouping')}
          disabled={isSaving}
        />
        <Label htmlFor="enableGrouping">Enable Dynamic Grouping/Merging</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        If enabled, the system will automatically merge groups based on the rules above. If disabled, all teams report separately (use with caution).
      </p>

      {error && isSaving && (
        <p className="text-sm text-red-500">Error saving: {error}</p>
      )}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Anonymity Settings'}
      </Button>
    </form>
  );
}
