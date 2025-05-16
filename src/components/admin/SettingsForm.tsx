'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Define the expected shape of the settings object
interface AppSettings {
  siteName: string;
  feedbackEmail: string;
  allowAnonymousFeedback: boolean;
}

// Define error response interface
interface ErrorResponse {
  error?: string;
}

export function SettingsForm() {
  const [settings, setSettings] = useState<AppSettings>({
    siteName: '',
    feedbackEmail: '',
    allowAnonymousFeedback: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) {
          const errorData: ErrorResponse = await response.json();
          throw new Error(errorData.error || 'Failed to fetch settings');
        }
        const data: AppSettings = await response.json();
        setSettings(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        console.error('Error fetching settings:', errorMessage);
        setError(errorMessage);
        toast.error(errorMessage || 'Failed to load settings.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Handle input changes with proper typing
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: type === 'checkbox' ? checked : value,
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
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }

      toast.success('Settings saved successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error saving settings:', errorMessage);
      setError(errorMessage);
      toast.error(errorMessage || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <p>Loading settings...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="siteName" className="block text-sm font-medium text-gray-700">
          Site Name
        </label>
        <Input
          id="siteName"
          name="siteName"
          type="text"
          value={settings.siteName}
          onChange={handleInputChange}
          disabled={isSaving}
        />
      </div>

      <div>
        <label htmlFor="feedbackEmail" className="block text-sm font-medium text-gray-700">
          Feedback Email
        </label>
        <Input
          id="feedbackEmail"
          name="feedbackEmail"
          type="email"
          value={settings.feedbackEmail}
          onChange={handleInputChange}
          disabled={isSaving}
        />
      </div>

      <div className="flex items-center">
        <input
          id="allowAnonymousFeedback"
          name="allowAnonymousFeedback"
          type="checkbox"
          checked={settings.allowAnonymousFeedback}
          onChange={handleInputChange}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          disabled={isSaving}
        />
        <label htmlFor="allowAnonymousFeedback" className="ml-2 block text-sm text-gray-900">
          Allow Anonymous Feedback
        </label>
      </div>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}
