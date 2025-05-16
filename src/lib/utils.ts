"use client";

import { Cache } from "lru-cache";
import { CounterSchema } from "@/types";

// Initialize cache
const cache = new Cache<string, CounterSchema>({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour
});

// Add counter value
export const addCounter = async (name: string, display: string) => {
  try {
    const cacheKey = `counter_${name}`;
    const counterData = { name, display, count: (cache.get(cacheKey)?.count || 0) + 1 };
    cache.set(cacheKey, counterData);

    // Call API to update database
    await fetch("/api/data/counter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, display, count: counterData.count }),
    });

    return counterData;
  } catch (error) {
    console.error("Error adding counter:", error);
    throw error;
  }
};

// Get counter value
export const getCounter = async (name: string): Promise<CounterSchema | undefined> => {
  try {
    const cacheKey = `counter_${name}`;
    const cachedCounter = cache.get(cacheKey);

    if (cachedCounter) {
      return cachedCounter;
    }

    // Fetch from API if not in cache
    const res = await fetch(`/api/data/counter?name=${name}`);
    if (!res.ok) throw new Error("Failed to fetch counter");
    const counterData = await res.json();
    cache.set(cacheKey, counterData);
    return counterData;
  } catch (error) {
    console.error("Error getting counter:", error);
    throw error;
  }
};

// Get all cached counters
export const getCache = (): CounterSchema[] => {
  return Array.from(cache.values());
};

// Clear cache
export const clearCache = (): void => {
  cache.clear();
};
