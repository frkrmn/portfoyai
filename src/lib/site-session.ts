const siteSessionCookie = "portfoyai_session_id";

export const getSiteSessionId = () => {
  const existing = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${siteSessionCookie}=`))
    ?.split("=")[1];
  if (existing) return decodeURIComponent(existing);

  const sessionId = crypto.randomUUID();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${siteSessionCookie}=${encodeURIComponent(sessionId)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  return sessionId;
};
