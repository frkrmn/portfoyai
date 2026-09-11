import type { FormEvent } from "react";

export function protectedLeadPayload(event: FormEvent<HTMLFormElement>, payload: Record<string, unknown>) {
  const fields = new FormData(event.currentTarget);
  const pageField = (name: string) => (document.querySelector(`[name="${name}"]`) as HTMLInputElement | null)?.value || "";
  return { ...payload, website: String(fields.get("website") || pageField("website")), turnstile_token: String(fields.get("cf-turnstile-response") || pageField("cf-turnstile-response")) };
}
