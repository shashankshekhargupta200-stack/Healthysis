export type ReportStatus = "NORMAL" | "HIGH" | "LOW" | "CRITICAL";

export type ReportStatusFlag = {
  biomarker: string;
  value: number | string | null;
  status: ReportStatus;
};

export type ReportExtractedDetail = {
  category?: "lab_report" | "prescription";
  extracted_data: Record<string, unknown>;
  status_flags: ReportStatusFlag[];
  title: string;
  patient_summary: string;
  vaultRecord?: Record<string, unknown>;
  detectedPatientName?: string | null;
};

export const reportExtractedEventName = "healthysis:report-extracted";

export function dispatchReportExtracted(detail: ReportExtractedDetail): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<ReportExtractedDetail>(reportExtractedEventName, { detail }));
  }
}

export function toMetricInput(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match?.[0] ?? "";
  }
  return "";
}
