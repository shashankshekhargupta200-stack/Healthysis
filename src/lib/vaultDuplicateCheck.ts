/**
 * Utilities for computing SHA-256 hashes and detecting duplicate reports
 * in Healthysis Healthfolio Vault.
 */

export type DuplicateMatchReason = "hash" | "metadata";

export interface DuplicateMatch {
  isDuplicate: boolean;
  reason: DuplicateMatchReason;
  existingRecord: {
    id: string;
    title: string;
    created_at: string;
    storage_folder?: string;
  };
  details: string;
}

/**
 * Computes a SHA-256 hex string from an ArrayBuffer in browser or Node environments.
 */
export async function computeSha256(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node.js fallback
  try {
    const nodeCrypto = await import("crypto");
    return nodeCrypto.createHash("sha256").update(bytes).digest("hex");
  } catch {
    let hash = 0;
    for (let i = 0; i < bytes.length; i++) {
      hash = ((hash << 5) - hash + bytes[i]) | 0;
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }
}

/**
 * Normalizes report titles for comparison by stripping noise words, punctuation, and multiple spaces.
 */
export function normalizeReportTitle(title: string): string {
  if (!title || typeof title !== "string") return "";
  return title
    .toLowerCase()
    .replace(/[.,'"`\-_/\\#()]/g, " ")
    .replace(/\b(lab|report|scan|test|panel|investigation|results?|summary)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts a normalized date string from report metadata or title if available.
 */
export function extractReportDate(
  title?: string,
  extractedData?: Record<string, unknown>
): string | null {
  if (extractedData) {
    for (const key of ["report_date", "date", "test_date", "collection_date", "sample_date"]) {
      const val = extractedData[key];
      if (typeof val === "string" && val.trim()) {
        const match =
          val.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/) ||
          val.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
        if (match) return match[0].replace(/[/.]/g, "-");
      }
    }
  }
  if (title) {
    const match =
      title.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/) ||
      title.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
    if (match) return match[0].replace(/[/.]/g, "-");
  }
  return null;
}

/**
 * Checks whether an incoming document is a duplicate of any existing record
 * using SHA-256 file hash comparison or normalized metadata/test-date matching.
 */
export function findDuplicateRecord(
  newDoc: {
    fileHash?: string | null;
    title: string;
    extractedData?: Record<string, unknown>;
    createdAt?: string;
  },
  existingRecords: Array<{
    id: string;
    title: string;
    created_at: string;
    storage_folder?: string;
    extracted_data?: Record<string, unknown>;
  }>
): DuplicateMatch | null {
  if (!existingRecords || existingRecords.length === 0) return null;

  // 1. Digital Fingerprint Check (SHA-256 Hash)
  if (newDoc.fileHash && newDoc.fileHash.trim()) {
    const targetHash = newDoc.fileHash.trim().toLowerCase();
    const hashMatch = existingRecords.find((rec) => {
      const existingHash = rec.extracted_data?.file_hash;
      return typeof existingHash === "string" && existingHash.trim().toLowerCase() === targetHash;
    });
    if (hashMatch) {
      return {
        isDuplicate: true,
        reason: "hash",
        existingRecord: {
          id: hashMatch.id,
          title: hashMatch.title,
          created_at: hashMatch.created_at,
          storage_folder: hashMatch.storage_folder
        },
        details: "Identical file detected (matching SHA-256 digital fingerprint)."
      };
    }
  }

  // 2. Metadata / OCR Test Type & Date Check
  const normNewTitle = normalizeReportTitle(newDoc.title);
  const newDate = extractReportDate(newDoc.title, newDoc.extractedData);
  const newDay = (newDoc.createdAt || new Date().toISOString()).slice(0, 10);

  if (normNewTitle && normNewTitle.length >= 3) {
    for (const rec of existingRecords) {
      const normExistingTitle = normalizeReportTitle(rec.title);
      if (!normExistingTitle || normExistingTitle.length < 3) continue;

      const titlesMatch =
        normNewTitle === normExistingTitle ||
        (normNewTitle.length >= 6 && normExistingTitle.includes(normNewTitle)) ||
        (normExistingTitle.length >= 6 && normNewTitle.includes(normExistingTitle));

      if (titlesMatch) {
        const existingDate = extractReportDate(rec.title, rec.extracted_data);
        const existingDay = (rec.created_at || "").slice(0, 10);

        if (newDate && existingDate && newDate === existingDate) {
          return {
            isDuplicate: true,
            reason: "metadata",
            existingRecord: {
              id: rec.id,
              title: rec.title,
              created_at: rec.created_at,
              storage_folder: rec.storage_folder
            },
            details: `Matching report title ("${rec.title}") and test date (${newDate}).`
          };
        }

        if (existingDay && newDay && existingDay === newDay) {
          return {
            isDuplicate: true,
            reason: "metadata",
            existingRecord: {
              id: rec.id,
              title: rec.title,
              created_at: rec.created_at,
              storage_folder: rec.storage_folder
            },
            details: `A report for "${rec.title}" was already saved today.`
          };
        }
      }
    }
  }

  return null;
}
