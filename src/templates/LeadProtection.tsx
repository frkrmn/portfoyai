import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const scriptId = "cloudflare-turnstile-script";
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

export function LeadProtection() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !container.current) return;
    let widgetId = "";
    let cancelled = false;
    const render = () => {
      if (cancelled || widgetId || !container.current || !window.turnstile) return;
      widgetId = window.turnstile.render(container.current, { sitekey: siteKey, action: "lead_submit", theme: "auto", size: "flexible", "response-field-name": "cf-turnstile-response" });
    };
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    render();
    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, []);
  return <><div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div><div ref={container} data-lead-turnstile />{!siteKey ? <p className="text-xs opacity-60">Güvenlik doğrulaması yapılandırılmadı.</p> : null}</>;
}
