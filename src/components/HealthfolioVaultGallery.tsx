"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, FileImage, FileText, FolderOpen, LoaderCircle, Upload, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePulse } from "@/context/PulseContext";
import { getSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase";
import { isNetworkError, readUserLocalData, writeUserLocalData } from "@/lib/localUserData";
import { dispatchReportExtracted, reportExtractedEventName, type ReportExtractedDetail } from "@/lib/reportExtraction";

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

function statusFor(record: VaultRecord, label: string): string {
  const flags = Array.isArray(record.extracted_data.status_flags) ? record.extracted_data.status_flags : [];
  const flag = flags.find((entry) => isRecord(entry)
    && typeof entry.biomarker === "string"
    && entry.biomarker.toLowerCase().includes(label.toLowerCase()));
  return isRecord(flag) && typeof flag.status === "string" ? flag.status : "";
}

function RecordCard({
  record,
  onView
}: {
  record: VaultRecord;
  onView: (record: VaultRecord) => void;
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
      <button
        className="inline-flex items-center gap-2 rounded-xl border border-[#DCEAEC] px-3 py-2 text-xs font-bold text-[#076584] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-teal-300"
        disabled={!record.file_url}
        onClick={() => onView(record)}
        type="button"
      >
        {record.file_url?.toLowerCase().includes(".pdf") || record.file_url?.startsWith("data:application/pdf")
          ? <FileText className="h-4 w-4" />
          : <FileImage className="h-4 w-4" />}
        View Original Scan
      </button>
    </article>
  );
}

export function HealthfolioVaultGallery({ compact = false }: { compact?: boolean }) {
  const { user, session } = useAuth();
  const { setActiveTab } = usePulse();
  const userId = user?.id ?? "";
  const [records, setRecords] = useState<VaultRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<VaultRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecords = useCallback(async () => {
    await Promise.resolve();
    if (!userId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }
    const localRecords = readUserLocalData<unknown[]>(userId, "patient_memory_vault", [])
      .map(normalizeRecord)
      .filter((record): record is VaultRecord => record !== null);
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
      const cloudRecords = (data ?? []).map(normalizeRecord).filter((record): record is VaultRecord => record !== null);
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
      setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      if (userId) {
        const existing = readUserLocalData<VaultRecord[]>(userId, "patient_memory_vault", []);
        writeUserLocalData(userId, "patient_memory_vault", [record, ...existing.filter((item) => item.id !== record.id)].slice(0, 100));
      }
    };
    window.addEventListener(reportExtractedEventName, onReportExtracted);
    return () => window.removeEventListener(reportExtractedEventName, onReportExtracted);
  }, [loadRecords, userId]);

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setUploadError("Choose an image or PDF report.");
      event.target.value = "";
      return;
    }
    if (!userId) {
      setUploadError("Sign in or continue as guest before uploading a report.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("userId", userId);
      formData.set("message", "Please extract report metrics and medication details for Healthfolio.");
      const response = await fetch("/api/agent/vault-ingest", {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        body: formData
      });
      const text = await response.text();
      let result: {
        success?: boolean;
        error?: string;
        vaultRecord?: unknown;
        extracted_data?: Record<string, unknown>;
        status_flags?: ReportExtractedDetail["status_flags"];
        category?: string;
        patientSummary?: string;
      } = {};
      try {
        result = text ? JSON.parse(text) as typeof result : {};
      } catch {
        throw new Error("The document service returned an unreadable response.");
      }
      const record = normalizeRecord(result.vaultRecord);
      if (!response.ok || !result.success || !record) {
        throw new Error(result.error || response.statusText || "Could not analyze this report.");
      }

      setRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
      if (user?.isGuest || !record.file_url || record.file_url.startsWith("data:")) {
        const existing = readUserLocalData<VaultRecord[]>(userId, "patient_memory_vault", []);
        writeUserLocalData(userId, "patient_memory_vault", [record, ...existing.filter((item) => item.id !== record.id)].slice(0, 100));
      }
      if (result.category === "lab_report" || result.category === "prescription") {
        dispatchReportExtracted({
          category: result.category,
          extracted_data: result.extracted_data ?? record.extracted_data,
          status_flags: result.status_flags ?? [],
          title: record.title,
          patient_summary: result.patientSummary ?? record.patient_summary,
          vaultRecord: record as unknown as Record<string, unknown>
        });
      }
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : "Could not analyze this report.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const openOriginal = async (record: VaultRecord) => {
    setUploadError("");
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
        setUploadError(error instanceof Error ? error.message : "Could not open the original scan.");
      }
    }
    setSelectedRecord(record);
  };
  const visibleRecords = records.filter((record) => activeFilter === "all" || record.storage_folder === activeFilter);
  const reportRecords = records.filter((record) => record.storage_folder === "lab-reports");
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
            {isUploading ? "Analyzing report…" : "Upload Report"}
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
            onChange={(event) => void upload(event)}
            ref={fileInputRef}
            type="file"
          />
        </>
      )}
      {uploadError && <p className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800" role="alert"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{uploadError}</p>}
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
          {recordsToShow.map((record) => <RecordCard key={record.id} onView={openOriginal} record={record} />)}
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
            <a
              className="m-4 inline-flex w-fit items-center gap-2 rounded-xl bg-[#04939D] px-4 py-2 text-sm font-bold text-white"
              download={`${selectedRecord.title.replace(/[^a-z0-9-_]+/gi, "-")}.${originalFileExtension(selectedRecord)}`}
              href={selectedRecord.file_url ?? ""}
            >
              Download Original
            </a>
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
