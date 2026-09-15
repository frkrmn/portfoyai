import { getSupabaseClient, handleKnownError, methodNotAllowed, readJsonBody, resolveSubscription, sendJson } from "../api-utils.mjs";
import { claimExperimentBudget } from "../analytics-protection.mjs";

const eventTypes = new Set(["pricing_view", "upgrade_click", "paywall_view", "prompt_suggestion_click", "prompt_quality_ready", "onboarding_generation_start"]);

export default async function handler(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  try {
    const body = await readJsonBody(request);
    const eventType = typeof body.event_type === "string" ? body.event_type.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim() : "";
    if (!eventTypes.has(eventType)) return sendJson(response, 400, { error: "Invalid experiment event type." });
    if (context.length > 120) return sendJson(response, 400, { error: "Experiment context must be 120 characters or fewer." });

    const supabase = getSupabaseClient();
    if (!await claimExperimentBudget(supabase, request)) { response.setHeader("Retry-After", "600"); return sendJson(response, 429, { error: "Experiment event budget exceeded." }); }
    const subscription = await resolveSubscription(request, response, { assignVariant: true });
    const { data: event, error } = await supabase.from("experiment_events").insert({
      subject_id: subscription.subject_id,
      variant: subscription.pricing_variant,
      event_type: eventType,
      context: context || null,
    }).select("id, created_at").single();
    if (error) throw new Error(`Failed to record experiment event: ${error.message}`);

    response.setHeader("Cache-Control", "no-store");
    return sendJson(response, 201, {
      variant: subscription.pricing_variant,
      plan: subscription.plan,
      event_id: event.id,
      created_at: event.created_at,
    });
  } catch (error) {
    return handleKnownError(response, error, "[experiment] Event recording failed");
  }
}
