export type PatientNameVerificationStatus = "match" | "mismatch" | "missing";

export interface PatientNameVerificationResult {
  status: PatientNameVerificationStatus;
  detectedPatientName: string | null;
  expectedPatientName: string;
}

const HONORIFIC_PREFIXES = /^(?:mr|mrs|ms|miss|dr|prof|master|shri|smt|pt|patient)\.?\s+/i;
const PLACEHOLDER_NAMES = /^(?:unknown|null|none|n\/?a|unspecified|not specified|patient|sample|anonymous|test|demo)$/i;

/**
 * Normalizes a patient name string for comparison:
 * - Trims whitespace and collapses internal multiple spaces
 * - Lowercases the string
 * - Strips common medical report honorifics (Mr., Mrs., Dr., etc.)
 * - Strips common punctuation characters
 */
export function normalizePatientName(name: string | null | undefined): string {
  if (!name || typeof name !== "string") return "";
  let clean = name.trim();
  if (PLACEHOLDER_NAMES.test(clean)) return "";
  clean = clean.replace(/\s+/g, " ");
  clean = clean.replace(HONORIFIC_PREFIXES, "");
  clean = clean.replace(/[.,'"`\-_/\\#()]/g, " ").replace(/\s+/g, " ").trim();
  return clean.toLowerCase();
}

/**
 * Cleans raw detected text into a validated patient name or returns null if illegible/absent.
 */
export function cleanDetectedPatientName(rawName: unknown): string | null {
  if (typeof rawName !== "string") return null;
  let trimmed = rawName.trim();
  if (!trimmed || PLACEHOLDER_NAMES.test(trimmed)) return null;

  // Strip common leading labels like "Patient Name:", "Name:", "Pt Name -", etc.
  trimmed = trimmed.replace(/^(?:patient(?:\s*name)?|name|pt\.?\s*name)\s*[:\-]\s*/i, "").trim();
  if (!trimmed || PLACEHOLDER_NAMES.test(trimmed)) return null;

  // Strip surrounding quotes or parentheses
  trimmed = trimmed.replace(/^["'([{]+|[)"'\]}]+$/g, "").trim();
  if (!trimmed || PLACEHOLDER_NAMES.test(trimmed)) return null;

  return trimmed;
}

/**
 * Compares detected report name against the active user's profile/auth name.
 * Returns:
 * - "match": Names are equal (case-insensitive, whitespace-normalized, or matching tokens)
 * - "missing": No legible patient name was detected on the report
 * - "mismatch": A distinct, non-matching patient name was found on the report
 */
export function verifyPatientName(
  detectedName: string | null | undefined,
  expectedName: string | null | undefined
): PatientNameVerificationResult {
  const cleanedDetected = cleanDetectedPatientName(detectedName);
  const cleanExpected = typeof expectedName === "string" ? expectedName.trim() : "";

  if (!cleanedDetected) {
    return {
      status: "missing",
      detectedPatientName: null,
      expectedPatientName: cleanExpected
    };
  }

  const normDetected = normalizePatientName(cleanedDetected);
  const normExpected = normalizePatientName(cleanExpected);

  if (!normDetected) {
    return {
      status: "missing",
      detectedPatientName: null,
      expectedPatientName: cleanExpected
    };
  }

  if (!normExpected) {
    return {
      status: "mismatch",
      detectedPatientName: cleanedDetected,
      expectedPatientName: cleanExpected
    };
  }

  // Exact normalized match
  if (normDetected === normExpected) {
    return {
      status: "match",
      detectedPatientName: cleanedDetected,
      expectedPatientName: cleanExpected
    };
  }

  const detectedTokens = normDetected.split(" ").filter((t) => t.length > 0);
  const expectedTokens = normExpected.split(" ").filter((t) => t.length > 0);

  // Set-based token comparison (handles "Last First" vs "First Last")
  const expectedSet = new Set(expectedTokens);
  if (
    detectedTokens.length === expectedTokens.length &&
    detectedTokens.every((token) => expectedSet.has(token))
  ) {
    return {
      status: "match",
      detectedPatientName: cleanedDetected,
      expectedPatientName: cleanExpected
    };
  }

  // Substring / Subset token comparison (e.g. "Rahul S Sharma" vs "Rahul Sharma")
  const commonTokens = detectedTokens.filter((token) => expectedSet.has(token) && token.length > 1);
  const minTokens = Math.min(
    detectedTokens.filter((t) => t.length > 1).length,
    expectedTokens.filter((t) => t.length > 1).length
  );
  if (minTokens >= 2 && commonTokens.length >= minTokens) {
    return {
      status: "match",
      detectedPatientName: cleanedDetected,
      expectedPatientName: cleanExpected
    };
  }

  return {
    status: "mismatch",
    detectedPatientName: cleanedDetected,
    expectedPatientName: cleanExpected
  };
}
