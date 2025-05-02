'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Define the expected shape of the settings object
interface AppSettings {
  appName?: string;
  // Add other expected settings keys here as needed
  // e.g., theme?: string;
  [key: string]: any; // Allow other keys
}

export function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings function
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch settings');
      }
      const data: AppSettings = await response.json();
      setSettings(data);
    } catch (err) {
      console.error("Error fetching settings:", err);
      setError(err.message || 'An unexpected error occurred.');
      toast.error(err.message || 'Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle input changes
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings); // Update state with potentially processed settings
      toast.success("Settings saved successfully!");

    } catch (err) {
      console.error("Error saving settings:", err);
      setError(err.message || 'An unexpected error occurred while saving.');
      toast.error(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p>Loading settings...</p>;
  }

  if (error && !isSaving) { // Don't show loading error if a save error occurred
    return <p className="text-red-500">Error loading settings: {error}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Example Setting: Application Name */} 
      <div className="space-y-2">
        <Label htmlFor="appName">Application Name</Label>
        <Input
          id="appName"
          name="appName" // Must match the key in the settings object
          value={settings.appName || ''}
          onChange={handleInputChange}
          placeholder="e.g., CEO Feedback Platform"
          disabled={isSaving}
        />
        <p className="text-sm text-muted-foreground">
          The name displayed in the application header or title.
        </p>
      </div>

      {/* Add more setting fields here as needed */} 
      {/* Example: 
      <div className="space-y-2">
        <Label htmlFor="theme">Theme</Label>
        <Input id="theme" name="theme" value={settings.theme || ''} onChange={handleInputChange} disabled={isSaving} />
      </div> 
      */}

      {error && isSaving && (
         <p className="text-sm text-red-500">Error saving: {error}</p>
      )}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}

