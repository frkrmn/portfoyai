export const pendingPromptStorageKey = "portfoyai_pending_prompt";

export const getPendingPrompt = () => localStorage.getItem(pendingPromptStorageKey)?.trim() || "";

export const savePendingPrompt = (prompt: string) => {
  localStorage.setItem(pendingPromptStorageKey, prompt.trim());
};

export const clearPendingPrompt = () => {
  localStorage.removeItem(pendingPromptStorageKey);
};
