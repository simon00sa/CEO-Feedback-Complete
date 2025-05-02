"use client";

import { useIdleTimeout } from "@/hooks/useIdleTimeout";

export default function IdleTimeoutHandler({ children }: { children: React.ReactNode }) {
  useIdleTimeout(10 * 60 * 1000); // Use 10 minutes timeout
  return <>{children}</>;
}
