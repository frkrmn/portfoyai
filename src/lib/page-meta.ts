import { useEffect } from "react";

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    if (!title || !description) return;
    document.title = title;
    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let tag = document.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attribute, key);
        document.head.appendChild(tag);
      }
      tag.content = content;
    };

    setMeta("name", "description", description);
    setMeta("name", "author", "Fastate AI");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
  }, [title, description]);
}
