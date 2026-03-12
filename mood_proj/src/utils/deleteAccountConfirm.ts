/**
 * Pure helpers for Delete Account confirmation logic.
 * Kept framework-free so we can unit test it reliably.
 */

export function normalizeConfirmWord(raw: unknown, fallback = "DELETE"): string {
  const candidate = typeof raw === "string" ? raw : fallback;
  const normalized = candidate.trim().toUpperCase();
  return normalized.length > 0 ? normalized : fallback;
}

/**
 * Returns true if the user typed the confirmation word.
 * Also accepts "DELETE" as a universal fallback when the UI is localized.
 */
export function canDeleteAccount(typedRaw: string, confirmWord: string): boolean {
  const typed = (typedRaw ?? "").trim().toUpperCase();
  const expected = normalizeConfirmWord(confirmWord);

  if (typed === expected) return true;
  if (expected !== "DELETE" && typed === "DELETE") return true;
  return false;
}
