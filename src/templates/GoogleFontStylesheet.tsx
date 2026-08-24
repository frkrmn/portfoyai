type FontSelection = {
  heading: string;
  body: string;
  headingWeight?: number;
  headingItalic?: boolean;
  bodyWeight?: number;
  bodyItalic?: boolean;
};

const familyName = (value: string) => value.split(",")[0].replace(/["']/g, "").trim();

const googleFontsStylesheetUrl = (fonts: FontSelection) => {
  const selections = [
    { family: familyName(fonts.heading), weight: fonts.headingWeight || 400, italic: fonts.headingItalic === true },
    { family: familyName(fonts.body), weight: fonts.bodyWeight || 400, italic: fonts.bodyItalic === true },
  ];
  const grouped = new Map<string, Set<string>>();
  for (const selection of selections) {
    if (!selection.family) continue;
    const variants = grouped.get(selection.family) || new Set<string>();
    variants.add(`${selection.italic ? 1 : 0},${selection.weight}`);
    grouped.set(selection.family, variants);
  }
  const families = [...grouped.entries()].map(([family, variants]) => {
    const encodedFamily = encodeURIComponent(family).replace(/%20/g, "+");
    return `family=${encodedFamily}:ital,wght@${[...variants].sort().join(";")}`;
  });
  return families.length ? `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap` : "";
};

export function GoogleFontStylesheet({ fonts }: { fonts: FontSelection }) {
  const href = googleFontsStylesheetUrl(fonts);
  return href ? <link data-portfoyai-google-fonts rel="stylesheet" href={href} /> : null;
}
