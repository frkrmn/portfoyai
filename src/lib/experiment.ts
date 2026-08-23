import { readApiJson } from "./api";
import { getSiteSessionId } from "./site-session";

export type PricingVariant = "A" | "B";
export type ExperimentEventType = "pricing_view" | "upgrade_click" | "paywall_view";

export type ExperimentResult = {
  variant: PricingVariant;
  plan: "free" | "pro";
  event_id: string;
  created_at: string;
};

export async function trackExperimentEvent(
  accessToken: string | undefined,
  eventType: ExperimentEventType,
  context: string,
) {
  const response = await fetch("/api/experiment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-ID": getSiteSessionId(),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ event_type: eventType, context }),
  });
  const payload = await readApiJson<ExperimentResult & { error?: string }>(response);
  if (!response.ok) throw new Error(payload.error || "Deney olayı kaydedilemedi.");
  return payload;
}

