// app/dashboard/page.tsx
"use client"

import dynamic from 'next/dynamic';
import '@/lib/cache-fix'; // Import the cache fix to ensure it's loaded

// Use dynamic imports with SSR disabled for dashboard components
const DashboardComponent = dynamic(
  () => import('@/components/dashboard/DashboardPage'),
  { 
    ssr: false,
    loading: () => <div className="py-6">Loading dashboard...</div>
  }
);

export default function DashboardPage() {
  return <DashboardComponent />;
}
