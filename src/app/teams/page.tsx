"use client"

import dynamic from 'next/dynamic';
import '@/lib/cache-fix'; // Import the cache fix to ensure it's loaded

// Use dynamic imports with SSR disabled for the TeamsComponent
const TeamsComponent = dynamic(
  () => import('@/components/teams/TeamsComponent'),  // Updated to match the actual file name
  { 
    ssr: false,
    loading: () => <div className="py-6">Loading teams...</div>
  }
);

export default function TeamsPage() {
  // This wrapper component will only render the actual Teams component on the client side
  return <TeamsComponent />;
}
