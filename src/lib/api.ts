export async function readApiJson<T = Record<string, unknown>>(response: Response): Promise<T> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const receivedHtml = /^\s*</.test(text);
    throw new Error(receivedHtml
      ? "API yerine uygulama HTML'i döndü. PortföyAI'yi doğrudan Vite ile değil `npm run dev` komutuyla çalıştırın ve sunucuyu yeniden başlatın."
      : `API geçersiz bir yanıt döndürdü (${response.status}).`);
  }
  try {
    return JSON.parse(text || "{}") as T;
  } catch {
    throw new Error(`API geçersiz JSON döndürdü (${response.status}).`);
  }
}
