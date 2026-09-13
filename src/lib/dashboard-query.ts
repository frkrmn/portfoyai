import type { QueryClientConfig } from "@tanstack/react-query";
import { readApiJson } from "@/lib/api";

export const dashboardQueryKeys = {
  root: ["dashboard"] as const,
  sites: (userId: string) => ["dashboard", "sites", userId] as const,
  leads: (userId: string) => ["dashboard", "leads", userId] as const,
  listings: (siteId: string) => ["dashboard", "sites", siteId, "listings"] as const,
  team: (siteId: string) => ["dashboard", "sites", siteId, "team"] as const,
  analytics: (siteId: string) => ["dashboard", "sites", siteId, "analytics"] as const,
  notifications: (userId: string) => ["dashboard", "lead-notifications", userId] as const,
  fonts: ["dashboard", "fonts"] as const,
  adminAccess: (userId: string) => ["dashboard", "admin-access", userId] as const,
};

export class DashboardApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function dashboardRequest<T>(url: string, headers: Record<string, string>, signal?: AbortSignal, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...init.headers }, signal });
  const payload = await readApiJson<T & { error?: string }>(response);
  if (!response.ok) throw new DashboardApiError(payload.error || `Request failed (${response.status})`, response.status);
  return payload;
}

export const dashboardQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => !(error instanceof DashboardApiError && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) && failureCount < 2,
    },
    mutations: { retry: false },
  },
};
