"use client";

import { Cache } from "lru-cache";
import { CounterSchema } from "@/types";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cache = new Cache<string, CounterSchema>({ max: 100, ttl: 1000 * 60 * 60 });

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export async function isUserAdmin(userId: string): Promise<boolean> {
  const res = await fetch(`/api/admin/check?userId=${userId}`);
  if (!res.ok) throw new Error("Failed to check admin status");
  const { isAdmin } = await res.json();
  return isAdmin;
}

export const addCounter = async (name: string, display: string) => {
  const cacheKey = `counter_${name}`;
  const counterData = { name, display, count: (cache.get(cacheKey)?.count || 0) + 1 };
  cache.set(cacheKey, counterData);
  await fetch("/api/data/counter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, display, count: counterData.count }) });
  return counterData;
};

export const getCounter = async (name: string): Promise<CounterSchema | undefined> => {
  const cacheKey = `counter_${name}`;
  const cachedCounter = cache.get(cacheKey);
  if (cachedCounter) return cachedCounter;
  const res = await fetch(`/api/data/counter?name=${name}`);
  if (!res.ok) throw new Error("Failed to fetch counter");
  const counterData = await res.json();
  cache.set(cacheKey, counterData);
  return counterData;
};

export const getCache = (): CounterSchema[] => Array.from(cache.values());
export const clearCache = (): void => cache.clear();
