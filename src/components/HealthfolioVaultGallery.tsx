"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, Check, Edit3, FileImage, FileText, FolderOpen, LoaderCircle, Trash2, Upload, UserCheck, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePulse } from "@/context/PulseContext";
import { useVaultUpload } from "@/context/VaultUploadContext";
import { getSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase";
import { isNetworkError, readUserLocalData, writeUserLocalData } from "@/lib/localUserData";
import { reportExtractedEventName, type ReportExtractedDetail } from "@/lib/reportExtraction";

type VaultRecord = {
  id: string;
  user_id: string;
  category: string;
  storage_folder: string;
  title: string;
  extracted_data: Record<string, unknown>;
  patient_summary: string;
  clinical_alerts: string[];
  file_url: string | null;
  document_url: string | null;
  storage_path: string | null;
  created_at: string;
};

const filters = [
  { value: "all", label: "All Records" },
  { value: "lab-reports", label: "Lab Reports" },
  { value: "prescriptions", label: "Prescriptions" },
  { value: "diet-meals", label: "Meal Snaps" },
  { value: "symptoms", label: "Symptom Logs" }
] as const;

const metricLabels: Record<string, string> = {
  systolic_bp: "Systolic BP",
  diastolic_bp: "Diastolic BP",
  blood_glucose: "Blood glucose",
  heart_rate: "Heart rate",
  hba1c: "HbA1c",
  total_cholesterol: "Total cholesterol",
  ldl: "LDL",
  hdl: "HDL",
  triglycerides: "Triglycerides",
  vitamin_d: "Vitamin D",
  vitamin_b12: "Vitamin B12",
  tsh: "TSH",
  hemoglobin: "Hemoglobin",
  calories: "Calories",
  protein: "Protein",
  carbs: "Carbs",
  fats: "Fat"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function statusColor(status: unknown): string {
  const normalized = typeof status === "string" ? status.toUpperCase() : "";
  if (normalized === "NORMAL") return "bg-emerald-100 text-emerald-800";
  if (normalized === "BORDERLINE") return "bg-amber-100 text-amber-900";
  if (normalized === "HIGH" || normalized === "LOW" || normalized === "CRITICAL") return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

function printable(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function originalFileExtension(record: VaultRecord): string {
  const dataMime = record.file_url?.match(/^data:([^;,]+)/)?.[1];
  if (dataMime === "application/pdf") return "pdf";
  if (dataMime === "image/png") return "png";
  if (dataMime === "image/webp") return "webp";
  const source = record.storage_path || record.file_url || "";
  const extension = source.split("?")[0].match(/\.([a-z0-9]+)$/i)?.[1];
  return extension?.toLowerCase() ?? "jpg";
}

function normalizeRecord(value: unknown): VaultRecord | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.title !== "string") return null;
  return {
    id: value.id,
    user_id: typeof value.user_id === "string" ? value.user_id : "",
    category: typeof value.category === "string" ? value.category : "other",
    storage_folder: typeof value.storage_folder === "string" ? value.storage_folder : "misc",
    title: value.title,
    extracted_data: isRecord(value.extracted_data) ? value.extracted_data : {},
    patient_summary: typeof value.patient_summary === "string" ? value.patient_summary : "",
    clinical_alerts: Array.isArray(value.clinical_alerts)
      ? value.clinical_alerts.filter((alert): alert is string => typeof alert === "string")
      : [],
    file_url: typeof value.file_url === "string"
      ? value.file_url
      : typeof value.document_url === "string" ? value.document_url : null,
    document_url: typeof value.file_url === "string"
      ? value.file_url
      : typeof value.document_url === "string" ? value.document_url : null,
    storage_path: typeof value.storage_path === "string" ? value.storage_path : null,
    created_at: typeof value.created_at === "string" ? value.created_at : new Date().toISOString()
  };
}

function sortNewestFirst(records: VaultRecord[]): VaultRecord[] {
  return [...records].sort((a, b) => {
    const tA = new Date(a.created_at || 0).getTime();
    const tB = new Date(b.created_at || 0).getTime();
    if (tB !== tA) return tB - tA;
    return (b.id || "").localeCompare(a.id || "");
  });
}

function statusFor(record: VaultRecord, label: string): string {
  const flags = Array.isArray(record.extracted_data.status_flags) ? record.extracted_data.status_flags : [];
  const flag = flags.find((entry) => isRecord(entry)
    && typeof entry.biomarker === "string"
    && entry.biomarker.toLowerCase().includes(label.toLowerCase()));
  return isRecord(flag) && typeof flag.status === "string" ? flag.status : "";
}

function RecordCard({
  record,
  onView,
  onDelete
}: {
  record: VaultRecord;
  onView: (record: VaultRecord) => void;
  onDelete?: (record: VaultRecord) => void;
}) {
  const biomarkers = Array.isArray(record.extracted_data.biomarkers)
    ? record.extracted_data.biomarkers.filter(isRecord)
    : [];
  const directMetrics = Object.entries(record.extracted_data)
    .filter(([key, value]) => key in metricLabels && value !== null && value !== undefined && typeof value !== "object")
    .slice(0, 10);
  const medications = Array.isArray(record.extracted_data.medications)
    ? record.extracted_data.medications.filter(isRecord)
    : [];
  const statusFlags = Array.isArray(record.extracted_data.status_flags)
    ? record.extracted_data.status_flags.filter(isRecord)
    : [];

  return (
    <article className="space-y-4 rounded-2xl border border-[#DCEAEC] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-[#123F55] dark:text-slate-100">{record.title}</h3>
          <p className="mt-1 text-xs text-[#537783] dark:text-slate-400">{new Date(record.created_at).toLocaleString()}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold text-teal-800">
          <FolderOpen className="h-3 w-3" />{record.storage_folder}
        </span>
      </header>

      {(directMetrics.length > 0 || biomarkers.length > 0 || medications.length > 0 || statusFlags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {statusFlags.slice(0, 8).map((flag, index) => (
            <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusColor(flag.status)}`} key={`flag-${index}`}>
              {printable(flag.biomarker)}: {printable(flag.value)} · {printable(flag.status)}
            </span>
          ))}
          {directMetrics.map(([key, value]) => (
            <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusColor(statusFor(record, metricLabels[key]))}`} key={key}>
              {metricLabels[key]}: {printable(value)}
            </span>
          ))}
          {biomarkers.slice(0, 8).map((marker, index) => (
            <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${statusColor(marker.status)}`} key={`marker-${index}`}>
              {printable(marker.name)}: {printable(marker.value)} {printable(marker.unit)}
            </span>
          ))}
          {medications.slice(0, 6).map((medication, index) => (
            <span className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-800" key={`medication-${index}`}>
              {printable(medication.name)}{medication.dosage ? ` · ${printable(medication.dosage)}` : ""}{medication.frequency ? ` · ${printable(medication.frequency)}` : ""}
            </span>
          ))}
        </div>
      )}

      {record.patient_summary && <p className="text-sm leading-relaxed text-[#537783] dark:text-slate-300">{record.patient_summary}</p>}
      {record.clinical_alerts.length > 0 && (
        <ul className="space-y-1">
          {record.clinical_alerts.slice(0, 4).map((alert, index) => (
            <li className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100" key={`${index}-${alert}`}>{alert}</li>
          ))}
        </ul>
      )}
      <footer className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-[#DCEAEC] px-3 py-2 text-xs font-bold text-[#076584] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-teal-300 hover:bg-[#F0F8F9] dark:hover:bg-slate-800 transition-colors"
          disabled={!record.file_url}
          onClick={() => onView(record)}
          type="button"
        >
          {record.file_url?.toLowerCase().includes(".pdf") || record.file_url?.startsWith("data:application/pdf")
            ? <FileText className="h-4 w-4" />
            : <FileImage className="h-4 w-4" />}
          View Original Scan
        </button>
        {onDelete && (
          <button
            aria-label={`Delete ${record.title}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
            onClick={() => onDelete(record)}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </footer>
    </article>
  );
}

export function HealthfolioVaultGallery({ compact = false }: { compact?: boolean }) {
  const { user, session } = useAuth();
  const { setActiveTab } = usePulse();
  const userId = user?.id ?? "";

  const {
    activeJob,
    isUploading,
    uploadProgress,
    uploadError,
    startUpload,
    cancelUpload,
    confirmAndSave,
    saveDuplicateAnyway,
    dismissVerification,
    dismissDuplicate,
    editedProfileName,
    setEditedProfileName,
    isEditingProfileName,
    setIsEditingProfileName,
    nameUpdateSuccess,
    isUpdatingName,
    updateProfileNameInJob
  } = useVaultUpload();

  const pendingVerification = activeJob?.pendingVerification;
  const pendingDuplicate = activeJob?.pendingDuplicate;
  const isSavingJob = activeJob?.status === "saving";

  const [records, setRecords] = useState<VaultRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<VaultRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<VaultRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecords = useCallback(async () => {
    await Promise.resolve();
    if (!userId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }
    const localRecords = sortNewestFirst(
      readUserLocalData<unknown[]>(userId, "patient_memory_vault", [])
        .map(normalizeRecord)
        .filter((record): record is VaultRecord => record !== null)
    );
    if (user?.isGuest) {
      setRecords(localRecords);
      setIsLoading(false);
      return;
    }
    try {
      const supabase = getSupabaseClient();
      const authenticatedUserId = await requireAuthenticatedUser(supabase, session?.user.id);
      const { data, error } = await supabase.from("patient_memory_vault")
        .select("id, user_id, category, storage_folder, title, extracted_data, patient_summary, clinical_alerts, document_url, file_url, storage_path, created_at")
        .eq("user_id", authenticatedUserId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const cloudRecords = sortNewestFirst(
        (data ?? []).map(normalizeRecord).filter((record): record is VaultRecord => record !== null)
      );
      setRecords(cloudRecords.length > 0 ? cloudRecords : localRecords);
      if (cloudRecords.length > 0) writeUserLocalData(userId, "patient_memory_vault", cloudRecords);
      setLoadError("");
    } catch (error: unknown) {
      if (isNetworkError(error)) {
        setRecords(localRecords);
        setLoadError(localRecords.length ? "" : "Network unavailable; no saved local vault records were found.");
      } else {
        setLoadError(error instanceof Error ? error.message : "Could not load your vault records.");
        setRecords(localRecords);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session, user?.isGuest, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecords(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  useEffect(() => {
    const onReportExtracted = (event: Event) => {
      const detail = (event as CustomEvent<ReportExtractedDetail>).detail;
      const record = normalizeRecord(detail?.vaultRecord);
      if (!record) {
        void loadRecords();
        return;
      }
      setRecords((current) => sortNewestFirst([record, ...current.filter((item) => item.id !== record.id)]));
      if (userId) {
        const existing = readUserLocalData<VaultRecord[]>(userId, "patient_memory_vault", []);
        writeUserLocalData(userId, "patient_memory_vault", sortNewestFirst([record, ...existing.filter((item) => item.id !== record.id)]).slice(0, 100));
      }
    };
    window.addEventListener(reportExtractedEventName, onReportExtracted);
    return () => window.removeEventListener(reportExtractedEventName, onReportExtracted);
  }, [loadRecords, userId]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void startUpload(file);
    }
    event.target.value = "";
  };

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/agent/vault-ingest", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          recordId: recordToDelete.id,
          storagePath: recordToDelete.storage_path,
          userId
        })
      });

      const text = await response.text();
      let result: { success?: boolean; error?: string } = {};
      try {
        result = text ? (JSON.parse(text) as typeof result) : {};
      } catch {
        // proceed
      }

      if (!response.ok || result.success === false) {
        throw new Error(result.error || response.statusText || "Could not delete this report.");
      }

      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      if (userId) {
        const existing = readUserLocalData<VaultRecord[]>(userId, "patient_memory_vault", []);
        writeUserLocalData(
          userId,
          "patient_memory_vault",
          existing.filter((r) => r.id !== recordToDelete.id)
        );
      }
      if (selectedRecord?.id === recordToDelete.id) {
        setSelectedRecord(null);
      }
      setRecordToDelete(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete this report.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openOriginal = async (record: VaultRecord) => {
    if (record.storage_path && !record.file_url?.startsWith("data:") && !user?.isGuest) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.storage
          .from("healthysis_vault")
          .createSignedUrl(record.storage_path, 60 * 60);
        if (error) throw error;
        setSelectedRecord({ ...record, file_url: data.signedUrl, document_url: data.signedUrl });
        return;
      } catch (error: unknown) {
        console.warn("Could not open the original scan signed URL:", error);
      }
    }
    setSelectedRecord(record);
  };

  const visibleRecords = sortNewestFirst(records.filter((record) => activeFilter === "all" || record.storage_folder === activeFilter));
  const reportRecords = sortNewestFirst(records.filter((record) => record.storage_folder === "lab-reports"));
  const recordsToShow = compact ? reportRecords.slice(0, 2) : visibleRecords;

  return (
    <section className={`space-y-5 rounded-3xl border border-[#DCEAEC] bg-white p-6 dark:border-slate-800 dark:bg-slate-900 ${compact ? "" : "shadow-sm"}`}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#04939D]">{compact ? "Latest report scan" : "Healthfolio archive"}</p>
          <h2 className="mt-1 text-xl font-black">{compact ? "Extracted Biomarkers & Report Summary" : "Healthfolio Vault"}</h2>
        </div>
        {compact ? (
          <button className="text-sm font-bold text-[#04939D] hover:underline" onClick={() => setActiveTab("healthfolio")} type="button">View all records</button>
        ) : (
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-[#04939D] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isUploading ? uploadProgress : "Upload Report"}
          </button>
        )}
      </header>
      {!compact && (
        <>
          <p className="text-sm text-[#537783] dark:text-slate-400">Reports, prescriptions, meal snaps, and symptom records are organized by storage folder.</p>
          <nav aria-label="Vault categories" className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => (
              <button
                aria-pressed={activeFilter === filter.value}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${activeFilter === filter.value ? "bg-[#04939D] text-white" : "border border-[#DCEAEC] text-[#315D68] dark:border-slate-700 dark:text-slate-300"}`}
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >{filter.label}</button>
            ))}
          </nav>
          <input
            accept="image/*,application/pdf"
            className="hidden"
            onChange={onFileChange}
            ref={fileInputRef}
            type="file"
          />
        </>
      )}
      {isUploading && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 p-4 text-sm font-semibold text-[#076584] dark:border-teal-900/50 dark:bg-teal-950/40 dark:text-teal-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <LoaderCircle className="h-5 w-5 animate-spin shrink-0 text-[#04939D]" />
            <div>
              <p className="font-extrabold text-[#123F55] dark:text-slate-100">{uploadProgress}</p>
              <p className="text-xs font-normal text-[#537783] dark:text-slate-400 mt-0.5">
                AI document analysis runs persistently in the background. Safe to switch tabs.
              </p>
            </div>
          </div>
          <button
            className="self-end sm:self-auto rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            onClick={cancelUpload}
            type="button"
          >
            Cancel Upload
          </button>
        </div>
      )}
      {uploadError && <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{uploadError}</p>}
      {deleteError && <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{deleteError}</p>}
      {loadError && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{loadError}</p>}
      {isLoading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-[#537783]" role="status"><LoaderCircle className="h-4 w-4 animate-spin" />Loading your vault…</p>
      ) : recordsToShow.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C7DADD] p-6 text-center">
          <p className="font-bold text-[#315D68]">{compact ? "No lab reports scanned yet" : "No records in this category yet"}</p>
          {!compact && <p className="mt-1 text-sm text-[#537783]">Upload a report or use the Copilot camera to add a record.</p>}
        </div>
      ) : (
        <div className={`grid gap-4 ${compact ? "" : "lg:grid-cols-2"}`}>
          {recordsToShow.map((record) => (
            <RecordCard
              key={record.id}
              onDelete={(rec) => {
                setDeleteError("");
                setRecordToDelete(rec);
              }}
              onView={openOriginal}
              record={record}
            />
          ))}
        </div>
      )}

      {/* Pre-Save Duplicate Report Detection Modal */}
      {pendingDuplicate && (
        <div
          aria-labelledby="duplicate-alert-title"
          aria-modal="true"
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
        >
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-amber-300 bg-white shadow-2xl dark:border-amber-900/60 dark:bg-slate-900">
            <div className="border-b border-amber-200 bg-amber-50/80 p-5 dark:border-amber-950 dark:bg-amber-950/30 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-950 dark:text-amber-100" id="duplicate-alert-title">
                    Duplicate Report Detected
                  </h3>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Pre-save Database Duplicate Check
                  </p>
                </div>
              </div>
              <button
                aria-label="Cancel and close"
                className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                disabled={isSavingJob}
                onClick={dismissDuplicate}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 text-sm">
              <p className="text-[#315D68] dark:text-slate-300 leading-relaxed">
                This document appears to match a report already saved in your Healthfolio vault:
              </p>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <span>Existing Report In Vault</span>
                  <span>{pendingDuplicate.duplicateReason === "hash" ? "Identical File Fingerprint" : "Matching Test & Date"}</span>
                </div>
                <p className="text-base font-extrabold text-amber-950 dark:text-amber-100">
                  {pendingDuplicate.existingRecord.title}
                </p>
                <p className="text-xs text-[#537783] dark:text-slate-400">
                  Uploaded on: {new Date(pendingDuplicate.existingRecord.created_at).toLocaleString()}
                </p>
                <p className="text-xs italic text-amber-900 dark:text-amber-200">
                  {pendingDuplicate.duplicateDetails}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 space-y-1.5">
                <p className="font-bold">What would you like to do?</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Keep Existing Report:</strong> Discard this duplicate upload to keep your vault clean.</li>
                  <li><strong>Save Anyway:</strong> Upload and save a new copy to your vault regardless.</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-[#DCEAEC] bg-[#F8FBFC] p-4 dark:border-slate-800 dark:bg-slate-950 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                className="w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={isSavingJob}
                onClick={() => {
                  dismissDuplicate();
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                type="button"
              >
                Keep Existing (Cancel Upload)
              </button>
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#04939D] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#037c85] disabled:opacity-60"
                disabled={isSavingJob}
                onClick={() => void saveDuplicateAnyway()}
                type="button"
              >
                {isSavingJob ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving anyway…
                  </>
                ) : (
                  "Save Anyway"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div
          aria-labelledby="delete-dialog-title"
          aria-modal="true"
          className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
        >
          <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-2xl dark:border-rose-950 dark:bg-slate-900">
            <div className="border-b border-rose-100 bg-rose-50/70 p-5 dark:border-rose-950 dark:bg-rose-950/30 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-rose-950 dark:text-rose-100" id="delete-dialog-title">
                    Delete Report Record?
                  </h3>
                  <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <button
                aria-label="Close"
                className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                disabled={isDeleting}
                onClick={() => setRecordToDelete(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this report from your vault?
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="font-extrabold text-[#123F55] dark:text-slate-100">{recordToDelete.title}</p>
                <p className="mt-1 text-xs text-[#537783] dark:text-slate-400">
                  Uploaded {new Date(recordToDelete.created_at).toLocaleString()} · {recordToDelete.storage_folder}
                </p>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                The stored report file in cloud storage and its extracted biomarkers will be permanently removed.
              </p>
            </div>

            <div className="border-t border-slate-100 bg-[#F8FBFC] p-4 dark:border-slate-800 dark:bg-slate-950 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                className="w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={isDeleting}
                onClick={() => setRecordToDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => void confirmDeleteRecord()}
                type="button"
              >
                {isDeleting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Save Patient Name Verification Confirmation Modal */}
      {pendingVerification && (
        <div
          aria-labelledby="patient-verification-title"
          aria-modal="true"
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
        >
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[#DCEAEC] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div
              className={`border-b p-5 flex items-start justify-between gap-4 ${
                pendingVerification.verificationStatus === "mismatch"
                  ? "border-rose-200 bg-rose-50/70 dark:border-rose-950 dark:bg-rose-950/30"
                  : "border-teal-200 bg-teal-50/60 dark:border-teal-950 dark:bg-teal-950/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                    pendingVerification.verificationStatus === "mismatch"
                      ? "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-900/60 dark:text-rose-200"
                      : "border-teal-200 bg-teal-100 text-teal-800 dark:border-teal-800 dark:bg-teal-900/60 dark:text-teal-200"
                  }`}
                >
                  {pendingVerification.verificationStatus === "mismatch" ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    <UserCheck className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3
                    className={`text-lg font-black ${
                      pendingVerification.verificationStatus === "mismatch"
                        ? "text-rose-900 dark:text-rose-200"
                        : "text-[#123F55] dark:text-slate-100"
                    }`}
                    id="patient-verification-title"
                  >
                    {pendingVerification.verificationStatus === "mismatch"
                      ? "Patient Name Mismatch Detected"
                      : "Confirm Report Ownership"}
                  </h3>
                  <p className="text-xs text-[#537783] dark:text-slate-400 font-medium">
                    Pre-save AI Verification Check
                  </p>
                </div>
              </div>
              <button
                aria-label="Cancel and close"
                className="rounded-xl p-2 text-slate-400 hover:bg-white/80 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                disabled={isSavingJob}
                onClick={dismissVerification}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-6 space-y-5 text-sm">
              {pendingVerification.verificationStatus === "mismatch" ? (
                <>
                  <p className="text-[#315D68] dark:text-slate-300 leading-relaxed">
                    The patient name detected on this lab report does not match the active name on your account:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/20">
                      <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 block">
                        Detected on Report
                      </span>
                      <span className="mt-1 block text-base font-extrabold text-rose-950 dark:text-rose-100">
                        {pendingVerification.detectedPatientName || "Unknown"}
                      </span>
                    </div>
                    <div className="rounded-2xl border border-[#DCEAEC] bg-[#F8FBFC] p-3.5 dark:border-slate-800 dark:bg-slate-950">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#076584] dark:text-teal-400 block">
                        Active Account Name
                      </span>
                      <span className="mt-1 block text-base font-extrabold text-[#123F55] dark:text-slate-100">
                        {pendingVerification.expectedPatientName || "No name set"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200 space-y-1.5">
                    <p className="font-bold">Please verify how you would like to proceed:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Does this report belong to you under an alternate or family name?</li>
                      <li>Did you enter a different name or typo when setting up your account?</li>
                      <li>Or did you accidentally select someone else&apos;s lab report?</li>
                    </ul>
                  </div>

                  {/* Optional Quick Edit for Typo in Profile Name */}
                  <div className="rounded-2xl border border-[#DCEAEC] p-4 bg-[#F8FBFC] dark:border-slate-800 dark:bg-slate-950/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#123F55] dark:text-slate-200 flex items-center gap-1.5">
                        <Edit3 className="h-3.5 w-3.5 text-[#04939D]" />
                        Typo in your profile name?
                      </span>
                      {!isEditingProfileName && (
                        <button
                          className="text-xs font-bold text-[#04939D] hover:underline"
                          onClick={() => setIsEditingProfileName(true)}
                          type="button"
                        >
                          Quick edit
                        </button>
                      )}
                    </div>
                    {isEditingProfileName && (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded-xl border border-[#DCEAEC] bg-white px-3 py-2 text-xs font-semibold text-[#123F55] focus:border-[#04939D] focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            onChange={(e) => setEditedProfileName(e.target.value)}
                            placeholder="Enter your correct full name"
                            type="text"
                            value={editedProfileName}
                          />
                          <button
                            className="inline-flex items-center gap-1 rounded-xl bg-[#076584] px-3 py-2 text-xs font-bold text-white hover:bg-[#06546e] disabled:opacity-50"
                            disabled={isUpdatingName || !editedProfileName.trim()}
                            onClick={() => void updateProfileNameInJob()}
                            type="button"
                          >
                            {isUpdatingName ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Update
                          </button>
                        </div>
                        {nameUpdateSuccess && (
                          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            Profile name updated to &quot;{editedProfileName.trim()}&quot;!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[#315D68] dark:text-slate-300 leading-relaxed">
                    No legible patient name could be detected on this lab report (it may be cropped, unprinted, or handwritten).
                  </p>
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 dark:border-teal-900/50 dark:bg-teal-950/20">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#076584] dark:text-teal-400 block">
                      Active Account Name
                    </span>
                    <span className="mt-1 block text-base font-extrabold text-[#123F55] dark:text-slate-100">
                      {pendingVerification.expectedPatientName || "Active User"}
                    </span>
                    <p className="mt-2 text-xs text-[#537783] dark:text-slate-400">
                      Please confirm that this report belongs to you before saving to your Healthfolio.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer with Explicit Actions */}
            <div className="border-t border-[#DCEAEC] bg-[#F8FBFC] p-4 dark:border-slate-800 dark:bg-slate-950 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                className="w-full sm:w-auto rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={isSavingJob}
                onClick={dismissVerification}
                type="button"
              >
                Cancel Upload
              </button>
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#04939D] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#037c85] disabled:opacity-60"
                disabled={isSavingJob}
                onClick={() => void confirmAndSave()}
                type="button"
              >
                {isSavingJob ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Saving to Healthfolio…
                  </>
                ) : (
                  "Save to My Healthfolio"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div aria-modal="true" className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4" role="dialog">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
            <header className="flex items-center justify-between gap-4 border-b border-[#DCEAEC] p-4 dark:border-slate-800">
              <div className="min-w-0">
                <h3 className="truncate font-black">{selectedRecord.title}</h3>
                <p className="text-xs text-[#537783]">{selectedRecord.storage_folder}</p>
              </div>
              <button aria-label="Close original scan" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setSelectedRecord(null)} type="button"><X className="h-5 w-5" /></button>
            </header>
            <div className="m-4 flex flex-wrap items-center gap-3">
              <a
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#04939D] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#037c85]"
                download={`${selectedRecord.title.replace(/[^a-z0-9-_]+/gi, "-")}.${originalFileExtension(selectedRecord)}`}
                href={selectedRecord.file_url ?? ""}
              >
                Download Original
              </a>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                onClick={() => {
                  setDeleteError("");
                  setRecordToDelete(selectedRecord);
                }}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                Delete Report
              </button>
            </div>
            {selectedRecord.file_url?.toLowerCase().includes(".pdf") || selectedRecord.file_url?.startsWith("data:application/pdf") ? (
              <iframe className="min-h-[65vh] w-full flex-1" src={selectedRecord.file_url ?? ""} title={`${selectedRecord.title} original document`} />
            ) : (
              <div className="flex min-h-[50vh] items-center justify-center overflow-auto bg-slate-100 p-3 dark:bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={`${selectedRecord.title} original scan`} className="max-h-[75vh] max-w-full object-contain" src={selectedRecord.file_url ?? ""} />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
