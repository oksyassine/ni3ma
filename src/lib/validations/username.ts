// Shared username validation + Arabic→Latin transliteration suggestion.
// Used by both the invite acceptance flow and the admin grant-access flow.

const USERNAME_RE = /^[a-z][a-z0-9._-]*[a-z0-9]$/;

export function validateUsernameFormat(input: string): string | null {
  const u = (input ?? "").trim();
  if (!u) return "اسم المستخدم مطلوب";
  if (u.length < 3) return "اسم المستخدم قصير جدا (الحد الأدنى 3 أحرف)";
  if (u.length > 30) return "اسم المستخدم طويل جدا (الحد الأقصى 30 حرفا)";
  if (!USERNAME_RE.test(u)) {
    return "اسم المستخدم يجب أن يبدأ بحرف لاتيني صغير (a-z) ويحتوي فقط على a-z و 0-9 والرموز . _ -";
  }
  // Disallow consecutive specials like ".." or "--"
  if (/[._-]{2,}/.test(u)) return "لا يُسمح بتكرار الرموز (.. مثلا)";
  return null;
}

// Maghrebi-friendly transliteration map. Optimized for usernames (recognizable
// rather than phonetically perfect). Users can override the suggestion.
const AR_LATIN: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "i", "آ": "a",
  "ب": "b", "ت": "t", "ث": "th",
  "ج": "j", "ح": "h", "خ": "kh",
  "د": "d", "ذ": "dh",
  "ر": "r", "ز": "z",
  "س": "s", "ش": "ch",
  "ص": "s", "ض": "d",
  "ط": "t", "ظ": "z",
  "ع": "a", "غ": "gh",
  "ف": "f", "ق": "q",
  "ك": "k", "ل": "l",
  "م": "m", "ن": "n",
  "ه": "h", "و": "w", "ي": "y",
  "ى": "a", "ة": "a",
  "ء": "", "ؤ": "w", "ئ": "y",
};

// Strip Arabic diacritics, tatweel, and bidi marks so they don't pollute output.
const ARABIC_DIACRITICS_RE = /[ً-ْٰـ‎‏]/g;

export function suggestUsernameFromName(fullName: string): string {
  if (!fullName) return "";
  const cleaned = fullName.normalize("NFC").replace(ARABIC_DIACRITICS_RE, "").trim();
  const out: string[] = [];
  for (const ch of cleaned) {
    if (ch === " " || ch === "\t") {
      out.push(".");
      continue;
    }
    const mapped = AR_LATIN[ch];
    if (mapped !== undefined) {
      out.push(mapped);
      continue;
    }
    if (/[a-zA-Z0-9]/.test(ch)) {
      out.push(ch.toLowerCase());
      continue;
    }
    if (/[._-]/.test(ch)) {
      out.push(ch);
      continue;
    }
    // skip everything else (punctuation, symbols, etc.)
  }
  return out
    .join("")
    .replace(/[._-]{2,}/g, ".")           // collapse runs of separators
    .replace(/^[._\d-]+/, "")              // ensure starts with a letter
    .replace(/[._-]+$/, "")                // no trailing separator
    .slice(0, 30);
}
