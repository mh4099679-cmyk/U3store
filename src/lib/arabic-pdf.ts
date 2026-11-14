/**
 * Arabic Text Reshaper & Bidirectional Reorderer for PDF rendering (pdf-lib)
 * Converts raw Arabic Unicode characters to presentation forms (connected glyphs)
 * and reverses RTL runs so that Left-to-Right PDF engines render correct connected Arabic.
 */

// [isolated, final, initial, medial]
const ARABIC_GLYPHS: Record<number, number[]> = {
  0x0621: [0xfe80, 0xfe80, 0xfe80, 0xfe80], // ء
  0x0622: [0xfe81, 0xfe82, 0xfe81, 0xfe82], // آ
  0x0623: [0xfe83, 0xfe84, 0xfe83, 0xfe84], // أ
  0x0624: [0xfe85, 0xfe86, 0xfe85, 0xfe86], // ؤ
  0x0625: [0xfe87, 0xfe88, 0xfe87, 0xfe88], // إ
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], // ئ
  0x0627: [0xfe8d, 0xfe8e, 0xfe8d, 0xfe8e], // ا
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92], // ب
  0x0629: [0xfe93, 0xfe94, 0xfe93, 0xfe94], // ة
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98], // ت
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c], // ث
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], // ج
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4], // ح
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8], // خ
  0x062f: [0xfea9, 0xfeaa, 0xfea9, 0xfeaa], // د
  0x0630: [0xfeab, 0xfeac, 0xfeab, 0xfeac], // ذ
  0x0631: [0xfead, 0xfeae, 0xfead, 0xfeae], // ر
  0x0632: [0xfeaf, 0xfeb0, 0xfeaf, 0xfeb0], // ز
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], // س
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], // ش
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc], // ص
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0], // ض
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4], // ط
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8], // ظ
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc], // ع
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0], // غ
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4], // ف
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8], // ق
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc], // ك
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0], // ل
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4], // م
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8], // ن
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec], // ه
  0x0648: [0xfeed, 0xfeee, 0xfeed, 0xfeee], // و
  0x0649: [0xfeef, 0xfef0, 0xfeef, 0xfef0], // ى
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4], // ي
};

// Letters that do not connect to the following letter
const NON_CONNECTING = new Set([
  0x0621, 0x0622, 0x0623, 0x0624, 0x0625, 0x0627,
  0x062f, 0x0630, 0x0631, 0x0632, 0x0648, 0x0649,
  0x0629,
]);

export function isArabicChar(code: number): boolean {
  return (code >= 0x0600 && code <= 0x06ff) || (code >= 0xfb50 && code <= 0xfdff) || (code >= 0xfe70 && code <= 0xfeff);
}

export function containsArabic(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    if (isArabicChar(str.charCodeAt(i))) return true;
  }
  return false;
}

/**
 * Reshapes connected Arabic characters into Presentation Forms-B glyphs
 */
function reshapeArabicWord(word: string): string {
  // First handle Lam-Alif ligatures
  let s = word
    .replace(/\u0644\u0622/g, "\uFEF5") // ل + آ
    .replace(/\u0644\u0623/g, "\uFEF7") // ل + أ
    .replace(/\u0644\u0625/g, "\uFEF9") // ل + إ
    .replace(/\u0644\u0627/g, "\uFEFB"); // ل + ا

  const codes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    codes.push(s.charCodeAt(i));
  }

  const reshaped: string[] = [];

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const forms = ARABIC_GLYPHS[code];

    if (!forms) {
      // Non-standard or already ligature
      reshaped.push(String.fromCharCode(code));
      continue;
    }

    const prevCode = i > 0 ? codes[i - 1] : 0;
    const nextCode = i < codes.length - 1 ? codes[i + 1] : 0;

    const connectsWithPrev = prevCode && ARABIC_GLYPHS[prevCode] && !NON_CONNECTING.has(prevCode);
    const connectsWithNext = nextCode && ARABIC_GLYPHS[nextCode];

    let formIndex = 0; // isolated
    if (connectsWithPrev && connectsWithNext) {
      formIndex = 3; // medial
    } else if (connectsWithPrev && !connectsWithNext) {
      formIndex = 1; // final
    } else if (!connectsWithPrev && connectsWithNext) {
      formIndex = 2; // initial
    } else {
      formIndex = 0; // isolated
    }

    reshaped.push(String.fromCharCode(forms[formIndex] || code));
  }

  return reshaped.join("");
}

/**
 * Formats a full string for PDF rendering:
 * If it contains Arabic, reshapes each Arabic segment and reverses RTL characters
 * so that standard Left-to-Right PDF text rendering displays it right-to-left connected.
 */
export function formatArabicForPdf(text: string | null | undefined): string {
  if (!text) return "";
  const str = String(text);
  if (!containsArabic(str)) return str;

  // If there's an English/Latin label prefix like "Street: " or "Landmark: ", keep prefix on left
  const labelMatch = str.match(/^([A-Za-z0-9#\-_/ ]+:\s*)([\s\S]+)$/);
  if (labelMatch) {
    return labelMatch[1] + formatArabicForPdf(labelMatch[2]);
  }

  // Split into tokens (words and whitespace/punctuation)
  const tokens = str.split(/(\s+|[-:,./\\()]+)/);

  // Reshape and reverse Arabic segments while preserving overall segment layout
  const processed = tokens.map((tok) => {
    if (containsArabic(tok)) {
      const reshaped = reshapeArabicWord(tok);
      // Reverse reshaped Arabic word so LTR rendering draws it RTL
      return reshaped.split("").reverse().join("");
    }
    return tok;
  });

  // For predominantly Arabic phrases, reverse word order as well
  return processed.reverse().join("");
}
