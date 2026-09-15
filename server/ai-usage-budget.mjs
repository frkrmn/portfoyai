const usage = (result) => {
  const value = result?.usageMetadata || result?.usage || {};
  return Number(value.totalTokenCount || value.totalTokens || (Number(value.promptTokenCount || value.inputTokens || 0) + Number(value.candidatesTokenCount || value.outputTokens || 0))) || 0;
};

export const idempotencyKey = (request) => {
  const value = request.headers?.["x-idempotency-key"];
  const key = Array.isArray(value) ? value[0] : value;
  return typeof key === "string" && key.length >= 16 && key.length <= 128 ? key : null;
};

export async function runBudgetedAiCall({ supabase, workspaceId, userId, key, provider, model, operation, reservedTokens, call }) {
  if (!key) throw new Error("VALIDATION:An idempotency key is required.");
  const reserved = await supabase.rpc("reserve_ai_usage", { p_workspace_id: workspaceId, p_user_id: userId, p_idempotency_key: key, p_provider: provider, p_model: model, p_operation: operation, p_reserved_tokens: reservedTokens });
  if (reserved.error) throw new Error(`AI usage could not be reserved: ${reserved.error.message}`);
  if (!reserved.data?.allowed) throw new Error(reserved.data?.reason || "AI_DAILY_BUDGET");
  if (reserved.data.cached) return reserved.data.response;
  try {
    const result = await call();
    const cachedResponse = { text: result?.text || null, modelVersion: result?.modelVersion || model, usageMetadata: result?.usageMetadata || result?.usage || null };
    const settled = await supabase.rpc("settle_ai_usage", { p_reservation_id: reserved.data.reservation_id, p_actual_tokens: usage(result), p_outcome: "completed", p_cached_response: cachedResponse, p_error_code: null });
    if (settled.error || settled.data !== true) throw new Error(`AI usage could not be settled: ${settled.error?.message || "reservation missing"}`);
    return result;
  } catch (error) {
    await supabase.rpc("settle_ai_usage", { p_reservation_id: reserved.data.reservation_id, p_actual_tokens: 0, p_outcome: "failed", p_cached_response: null, p_error_code: error instanceof Error ? error.name : "AI_ERROR" });
    throw error;
  }
}
