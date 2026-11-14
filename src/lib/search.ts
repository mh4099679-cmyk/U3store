/**
 * U3 STORE - Bilingual Arabic/English Search Normalization Engine
 * Provides instant, accent-agnostic, tokenized cross-language matching for:
 * Storefront Search, Shop Filters, Admin Inventory, Products, Orders, and Customers.
 */

// Transliteration / synonym dictionary for common streetwear and footwear terms
const BILINGUAL_SYNONYMS: Record<string, string[]> = {
  nike: ["نايك", "نايكي"],
  نايك: ["nike", "نايكي"],
  نايكي: ["nike", "نايك"],
  jordan: ["جوردان", "اير جوردان"],
  جوردان: ["jordan"],
  dunk: ["دانك"],
  دانك: ["dunk"],
  shoes: ["شوز", "حذاء", "احذية", "كوتشي"],
  حذاء: ["shoes", "sneaker", "sneakers"],
  احذية: ["shoes", "sneakers"],
  كوتشي: ["shoes", "sneakers"],
  clothing: ["ملابس", "لبس", "هدوم"],
  ملابس: ["clothing", "apparel"],
  hoodie: ["هودي", "سويت شيرت"],
  هودي: ["hoodie", "sweatshirt"],
  shirt: ["قميص", "تيشيرت"],
  tshirt: ["تيشيرت", "تشرت"],
  tee: ["تيشيرت", "تشرت"],
  تيشيرت: ["tshirt", "tee", "shirt"],
  black: ["اسود", "سودا", "سوداء"],
  اسود: ["black"],
  white: ["ابيض", "بيضا", "بيضاء"],
  ابيض: ["white"],
  red: ["احمر", "حمرا", "حمراء"],
  احمر: ["red"],
  blue: ["ازرق", "زرقا", "زرقاء"],
  ازرق: ["blue"],
  grey: ["رمادي", "رصاصي", "gray"],
  gray: ["رمادي", "رصاصي", "grey"],
  رمادي: ["grey", "gray"],
  green: ["اخضر", "خضرا"],
  اخضر: ["green"],
  beige: ["بيج"],
  بيج: ["beige", "sail"],
  cream: ["كريمي", "بيج", "sail"],
  sail: ["بيج", "كريمي", "sail", "offwhite"],
};

/**
 * Normalizes text for robust bilingual search:
 * - Unifies Arabic variations (أ / إ / آ -> ا, ة -> ه, ى -> ي)
 * - Strips Arabic diacritics (tashkeel)
 * - Converts to lowercase and normalizes whitespace/symbols
 */
export function normalizeBilingualSearch(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";
  let s = String(text).toLowerCase().trim();

  // Strip Arabic Tashkeel / diacritics
  s = s.replace(/[\u064B-\u065F\u0670]/g, "");

  // Unify Arabic Alif variations
  s = s.replace(/[أإآآٱ]/g, "ا");

  // Unify Taa Marbuta with Haa
  s = s.replace(/[ة]/g, "ه");

  // Unify Yaa / Alif Maqsura
  s = s.replace(/[ى]/g, "ي");

  // Normalize Hamza variations
  s = s.replace(/[ؤئ]/g, "ء");

  // Replace punctuation and dashes with spaces
  s = s.replace(/[-_.,/\\|+]+/g, " ");

  // Collapse multiple whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Expands query tokens to include common bilingual synonyms.
 */
function getExpandedTokens(token: string): string[] {
  const norm = normalizeBilingualSearch(token);
  if (!norm) return [];
  const set = new Set<string>([norm]);
  const syns = BILINGUAL_SYNONYMS[norm];
  if (syns) {
    for (const syn of syns) {
      set.add(normalizeBilingualSearch(syn));
    }
  }
  return Array.from(set);
}

/**
 * Returns true if all tokens of the query match at least one of the target fields.
 * Supports cross-language queries (e.g. searching "نايك 42" or "nike اسود" or "AF1").
 */
export function matchesBilingualSearch(
  query: string,
  ...fields: (string | number | null | undefined)[]
): boolean {
  if (!query || !query.trim()) return true;

  const normalizedQuery = normalizeBilingualSearch(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  if (queryTokens.length === 0) return true;

  // Combine and normalize all target fields into one unified search haystack
  const combinedHaystack = fields
    .map((f) => normalizeBilingualSearch(f))
    .filter(Boolean)
    .join(" ");

  // Every token (or its bilingual synonym) must appear in the combined haystack
  return queryTokens.every((token) => {
    const candidates = getExpandedTokens(token);
    return candidates.some((cand) => combinedHaystack.includes(cand));
  });
}

export interface ColorSwatchItem {
  en: string;
  ar: string;
  hex: string;
}

export const STANDARD_COLORS: ColorSwatchItem[] = [
  { en: "Black", ar: "أسود", hex: "#111111" },
  { en: "White", ar: "أبيض", hex: "#FFFFFF" },
  { en: "Triple White", ar: "أبيض ناصع", hex: "#F8F9FA" },
  { en: "Panda (B&W)", ar: "أبيض وأسود", hex: "#1E1E1E" },
  { en: "Sail / Cream", ar: "بيج كريمي", hex: "#EBE5D8" },
  { en: "Grey", ar: "رمادي", hex: "#8A8D91" },
  { en: "Navy Blue", ar: "كحلي", hex: "#001F3F" },
  { en: "Royal Blue", ar: "أزرق ملكي", hex: "#1B4F72" },
  { en: "Chicago Red", ar: "أحمر", hex: "#B03A2E" },
  { en: "Pine Green", ar: "أخضر", hex: "#196F3D" },
  { en: "Olive", ar: "زيتي", hex: "#556B2F" },
  { en: "Mocha Brown", ar: "بني موكا", hex: "#5D4037" },
  { en: "Beige", ar: "بيج", hex: "#D2B48C" },
  { en: "Pink", ar: "وردي", hex: "#E8A598" },
  { en: "Purple", ar: "بنفسجي", hex: "#5B2C6F" },
];

export function isColorLight(hex: string): boolean {
  if (!hex) return false;
  const clean = hex.replace("#", "");
  if (clean.length < 6) return false;
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return (r * 299 + g * 587 + b * 114) / 1000 > 180;
}

