export type ImageSlotDescriptor = { key: `media.${string}`; label: string; type: "single" | "gallery"; recommendedSize: string; maxImages?: number };
export const imageSlots = (slots: ImageSlotDescriptor[]) => slots;
export const getMediaValue = (media: Record<string, string | string[]>, key: string) => media[key.replace(/^media\./, "")];
