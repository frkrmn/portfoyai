export const LEAD_FALLBACK_INTERVAL_MS = 60_000;

export type DashboardLead = {
  id: string;
  site_id: string;
  name: string;
  phone: string;
  message: string | null;
  created_at: string;
};

type LeadRealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE" | string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

function isLead(value: Record<string, unknown>): value is DashboardLead {
  return typeof value.id === "string"
    && typeof value.site_id === "string"
    && typeof value.name === "string"
    && typeof value.phone === "string"
    && (typeof value.message === "string" || value.message === null)
    && typeof value.created_at === "string";
}

export function applyLeadRealtimeChange(current: DashboardLead[], payload: LeadRealtimePayload): DashboardLead[] {
  if (payload.eventType === "DELETE") {
    return typeof payload.old.id === "string" ? current.filter((lead) => lead.id !== payload.old.id) : current;
  }
  if (!isLead(payload.new)) return current;
  return [payload.new, ...current.filter((lead) => lead.id !== payload.new.id)]
    .sort((left, right) => right.created_at.localeCompare(left.created_at));
}
