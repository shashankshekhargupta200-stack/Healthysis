"use client";

import React, { createContext, useContext, useState, useRef, ReactNode, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePulse } from "@/context/PulseContext";
import { getSupabaseClient } from "@/lib/supabase";
import { readUserLocalData, writeUserLocalData } from "@/lib/localUserData";
import { compressImage } from "@/lib/compressImage";
import { dispatchReportExtracted, type ReportExtractedDetail } from "@/lib/reportExtraction";
import { verifyPatientName } from "@/lib/patientNameVerification";
import type { HealthResumeData } from "@/types";

export type VaultRecord = {
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

export type PendingVerification = {
  file: File;
  analysis: Record<string, unknown>;
  detectedPatientName: string | null;
  expectedPatientName: string;
  verificationStatus: "mismatch" | "missing" | "match";
};

export type PendingDuplicate = {
  file: File;
  fileHash?: string;
  duplicateReason: "hash" | "metadata";
  existingRecord: {
    id: string;
    title: string;
    created_at: string;
    storage_folder?: string;
  };
  duplicateDetails: string;
  analysis?: Record<string, unknown>;
  detectedPatientName?: string | null;
};

export interface ActiveVaultJob {
  id: string;
  file: File;
  fileName: string;
  status: "uploading" | "requires_confirmation" | "duplicate_detected" | "saving" | "completed" | "error";
  progressText: string;
  error?: string;
  abortController: AbortController | null;
  startedAt: number;
  pendingVerification?: PendingVerification;
  pendingDuplicate?: PendingDuplicate;
  savedRecord?: VaultRecord;
}

export interface CompletionNotice {
  id: string;
  title: string;
  category?: string;
  at: string;
}

interface VaultUploadContextType {
  activeJob: ActiveVaultJob | null;
  isUploading: boolean;
  uploadProgress: string;
  uploadError: string;
  completionNotice: CompletionNotice | null;
  startUpload: (file: File) => Promise<void>;
  cancelUpload: () => void;
  confirmAndSave: () => Promise<void>;
  saveDuplicateAnyway: () => Promise<void>;
  dismissVerification: () => void;
  dismissDuplicate: () => void;
  dismissNotice: () => void;
  editedProfileName: string;
  setEditedProfileName: (name: string) => void;
  isEditingProfileName: boolean;
  setIsEditingProfileName: (val: boolean) => void;
  nameUpdateSuccess: boolean;
  isUpdatingName: boolean;
  updateProfileNameInJob: () => Promise<void>;
}

const VaultUploadContext = createContext<VaultUploadContextType | undefined>(undefined);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

export function VaultUploadProvider({ children }: { children: ReactNode }) {
  const { user, session, updateAuthUser } = useAuth();
  const { profile, updateProfile, updateHealthResume } = usePulse();
  const userId = user?.id ?? "";
  const activeUserName = (profile?.name || user?.name || "").trim();

  const [activeJob, setActiveJob] = useState<ActiveVaultJob | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [completionNotice, setCompletionNotice] = useState<CompletionNotice | null>(null);

  const [isEditingProfileName, setIsEditingProfileName] = useState(false);
  const [editedProfileName, setEditedProfileName] = useState("");
  const [nameUpdateSuccess, setNameUpdateSuccess] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Timers ref to update progress text progressively
  const progressTimersRef = useRef<NodeJS.Timeout[]>([]);

  const clearProgressTimers = () => {
    progressTimersRef.current.forEach((t) => clearTimeout(t));
    progressTimersRef.current = [];
  };

  const cancelUpload = useCallback(() => {
    clearProgressTimers();
    if (activeJob?.abortController) {
      activeJob.abortController.abort();
    }
    setActiveJob(null);
    setUploadError("");
    setIsEditingProfileName(false);
    setNameUpdateSuccess(false);
  }, [activeJob]);

  const dismissVerification = useCallback(() => {
    cancelUpload();
  }, [cancelUpload]);

  const dismissDuplicate = useCallback(() => {
    cancelUpload();
  }, [cancelUpload]);

  const dismissNotice = useCallback(() => {
    setCompletionNotice(null);
  }, []);

  const startUpload = useCallback(async (file: File) => {
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setUploadError("Please choose a valid image or PDF report.");
      return;
    }
    if (!userId) {
      setUploadError("Sign in or continue as guest before uploading a report.");
      return;
    }

    clearProgressTimers();
    const abortController = new AbortController();
    const jobId = `job-${Date.now()}`;

    setActiveJob({
      id: jobId,
      file,
      fileName: file.name,
      status: "uploading",
      progressText: "Uploading & scanning document...",
      abortController,
      startedAt: Date.now()
    });

    // Progressive non-blocking status updates (no timeout cutoff)
    const t1 = setTimeout(() => {
      setActiveJob((prev) => (prev?.id === jobId ? { ...prev, progressText: "Analyzing report contents..." } : prev));
    }, 2800);
    const t2 = setTimeout(() => {
      setActiveJob((prev) => (prev?.id === jobId ? { ...prev, progressText: "Extracting clinical values & biomarkers..." } : prev));
    }, 12000);
    const t3 = setTimeout(() => {
      setActiveJob((prev) => (prev?.id === jobId ? { ...prev, progressText: "Finalizing report summary & verification..." } : prev));
    }, 24000);
    progressTimersRef.current = [t1, t2, t3];

    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.set("file", compressedFile);
      formData.set("userId", userId);
      formData.set("storageFolder", "lab-reports");
      formData.set("expectedPatientName", activeUserName);
      formData.set("checkPatientName", "true");
      if (user?.isGuest) {
        const guestRecords = readUserLocalData<unknown[]>(userId, "patient_memory_vault", []).slice(0, 50);
        formData.set("guestVault", JSON.stringify(guestRecords));
      }
      formData.set("message", "Please extract report metrics and medication details for Healthfolio.");

      const response = await fetch("/api/agent/vault-ingest", {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        body: formData,
        signal: abortController.signal
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
        requiresConfirmation?: boolean;
        verificationStatus?: "mismatch" | "missing";
        detectedPatientName?: string | null;
        expectedPatientName?: string;
        analysis?: Record<string, unknown>;
        isDuplicate?: boolean;
        duplicateReason?: "hash" | "metadata";
        existingRecord?: {
          id: string;
          title: string;
          created_at: string;
          storage_folder?: string;
        };
        duplicateDetails?: string;
        fileHash?: string;
      } = {};

      try {
        result = text ? (JSON.parse(text) as typeof result) : {};
      } catch {
        throw new Error("The document service returned an unreadable response.");
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || response.statusText || "Could not analyze this report.");
      }

      // 1. Pre-save Duplicate Check Alert
      if (result.isDuplicate && result.existingRecord) {
        clearProgressTimers();
        setActiveJob({
          id: jobId,
          file: compressedFile,
          fileName: file.name,
          status: "duplicate_detected",
          progressText: "Duplicate report detected.",
          abortController: null,
          startedAt: Date.now(),
          pendingDuplicate: {
            file: compressedFile,
            fileHash: result.fileHash,
            duplicateReason: result.duplicateReason || "hash",
            existingRecord: result.existingRecord,
            duplicateDetails: result.duplicateDetails || "A report with matching details already exists in your vault.",
            analysis: result.analysis,
            detectedPatientName: result.detectedPatientName ?? null
          }
        });
        return;
      }

      // 2. Pre-save Patient Name Verification Check
      if (result.requiresConfirmation && result.analysis) {
        clearProgressTimers();
        setActiveJob({
          id: jobId,
          file: compressedFile,
          fileName: file.name,
          status: "requires_confirmation",
          progressText: "Please confirm report ownership.",
          abortController: null,
          startedAt: Date.now(),
          pendingVerification: {
            file: compressedFile,
            analysis: result.analysis,
            detectedPatientName: result.detectedPatientName ?? null,
            expectedPatientName: result.expectedPatientName || activeUserName,
            verificationStatus: result.verificationStatus || (result.detectedPatientName ? "mismatch" : "missing")
          }
        });
        setEditedProfileName(activeUserName);
        setIsEditingProfileName(false);
        setNameUpdateSuccess(false);
        return;
      }

      // 3. Normal Success Path
      const record = normalizeRecord(result.vaultRecord);
      if (!record) {
        throw new Error(result.error || response.statusText || "Could not analyze this report.");
      }

      // Save locally (newest first)
      const existing = readUserLocalData<VaultRecord[]>(userId, "patient_memory_vault", []);
      writeUserLocalData(
        userId,
        "patient_memory_vault",
        sortNewestFirst([record, ...existing.filter((item) => item.id !== record.id)]).slice(0, 100)
      );

      // Dispatch event to sync any active views
      if (result.category === "lab_report" || result.category === "prescription") {
        dispatchReportExtracted({
          category: result.category,
          extracted_data: result.extracted_data ?? record.extracted_data,
          status_flags: result.status_flags ?? [],
          title: record.title,
          patient_summary: result.patientSummary ?? record.patient_summary,
          vaultRecord: record as unknown as Record<string, unknown>,
          detectedPatientName: result.detectedPatientName ?? null
        });
      }

      clearProgressTimers();
      setActiveJob({
        id: jobId,
        file,
        fileName: file.name,
        status: "completed",
        progressText: "Analysis complete!",
        abortController: null,
        startedAt: Date.now(),
        savedRecord: record
      });

      setCompletionNotice({
        id: record.id,
        title: record.title,
        category: record.category,
        at: new Date().toISOString()
      });

      // Clear completed job after a brief moment
      setTimeout(() => {
        setActiveJob((prev) => (prev?.id === jobId && prev.status === "completed" ? null : prev));
      }, 4000);
    } catch (error: unknown) {
      clearProgressTimers();
      if (abortController.signal.aborted) {
        setActiveJob(null);
        return;
      }
      const msg = error instanceof Error ? error.message : "Could not analyze this report.";
      setUploadError(msg);
      setActiveJob({
        id: jobId,
        file,
        fileName: file.name,
        status: "error",
        progressText: "Analysis failed.",
        error: msg,
        abortController: null,
        startedAt: Date.now()
      });
    }
  }, [activeUserName, session, user, userId]);

  const confirmAndSave = useCallback(async () => {
    const pending = activeJob?.pendingVerification;
    if (!pending) return;

    setActiveJob((prev) => (prev ? { ...prev, status: "saving", progressText: "Saving report to your Healthfolio..." } : null));
    setUploadError("");

    try {
      const formData = new FormData();
      formData.set("file", pending.file);
      formData.set("userId", userId);
      formData.set("storageFolder", "lab-reports");
      formData.set("confirmed", "true");
      formData.set("allowDuplicate", "true");
      formData.set("cachedAnalysis", JSON.stringify(pending.analysis));
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
        detectedPatientName?: string | null;
      } = {};

      try {
        result = text ? (JSON.parse(text) as typeof result) : {};
      } catch {
        throw new Error("The document service returned an unreadable response.");
      }

      const record = normalizeRecord(result.vaultRecord);
      if (!response.ok || !result.success || !record) {
        throw new Error(result.error || response.statusText || "Could not save this report.");
      }

      // Save locally (newest first)
      const existing = readUserLocalData<VaultRecord[]>(userId, "patient_memory_vault", []);
      writeUserLocalData(
        userId,
        "patient_memory_vault",
        sortNewestFirst([record, ...existing.filter((item) => item.id !== record.id)]).slice(0, 100)
      );

      if (result.category === "lab_report" || result.category === "prescription") {
        dispatchReportExtracted({
          category: result.category,
          extracted_data: result.extracted_data ?? record.extracted_data,
          status_flags: result.status_flags ?? [],
          title: record.title,
          patient_summary: result.patientSummary ?? record.patient_summary,
          vaultRecord: record as unknown as Record<string, unknown>,
          detectedPatientName: result.detectedPatientName ?? pending.detectedPatientName
        });
      }

      setCompletionNotice({
        id: record.id,
        title: record.title,
        category: record.category,
        at: new Date().toISOString()
      });

      setActiveJob(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Could not complete saving the report.";
      setUploadError(msg);
      setActiveJob((prev) => (prev ? { ...prev, status: "error", error: msg } : null));
    }
  }, [activeJob, session, userId]);

  const saveDuplicateAnyway = useCallback(async () => {
    const pending = activeJob?.pendingDuplicate;
    if (!pending) return;

    setActiveJob((prev) => (prev ? { ...prev, status: "saving", progressText: "Saving report to Healthfolio..." } : null));
    setUploadError("");

    try {
      const formData = new FormData();
      formData.set("file", pending.file);
      formData.set("userId", userId);
      formData.set("storageFolder", "lab-reports");
      formData.set("allowDuplicate", "true");
      if (pending.analysis) {
        formData.set("cachedAnalysis", JSON.stringify(pending.analysis));
        formData.set("confirmed", "true");
      }
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
        detectedPatientName?: string | null;
      } = {};

      try {
        result = text ? (JSON.parse(text) as typeof result) : {};
      } catch {
        throw new Error("The document service returned an unreadable response.");
      }

      const record = normalizeRecord(result.vaultRecord);
      if (!response.ok || !result.success || !record) {
        throw new Error(result.error || response.statusText || "Could not save duplicate report.");
      }

      // Save locally (newest first)
      const existing = readUserLocalData<VaultRecord[]>(userId, "patient_memory_vault", []);
      writeUserLocalData(
        userId,
        "patient_memory_vault",
        sortNewestFirst([record, ...existing.filter((item) => item.id !== record.id)]).slice(0, 100)
      );

      if (result.category === "lab_report" || result.category === "prescription") {
        dispatchReportExtracted({
          category: result.category,
          extracted_data: result.extracted_data ?? record.extracted_data,
          status_flags: result.status_flags ?? [],
          title: record.title,
          patient_summary: result.patientSummary ?? record.patient_summary,
          vaultRecord: record as unknown as Record<string, unknown>,
          detectedPatientName: result.detectedPatientName ?? pending.detectedPatientName
        });
      }

      setCompletionNotice({
        id: record.id,
        title: record.title,
        category: record.category,
        at: new Date().toISOString()
      });

      setActiveJob(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Could not complete saving the duplicate report.";
      setUploadError(msg);
      setActiveJob((prev) => (prev ? { ...prev, status: "error", error: msg } : null));
    }
  }, [activeJob, session, userId]);

  const updateProfileNameInJob = useCallback(async () => {
    const trimmed = editedProfileName.trim();
    if (!trimmed) return;
    setIsUpdatingName(true);
    try {
      updateAuthUser({ name: trimmed });
      updateProfile({ name: trimmed });
      updateHealthResume({ fullName: trimmed });
      if (!user?.isGuest && session?.user.id) {
        const supabase = getSupabaseClient();
        await supabase.from("profiles").upsert({
          id: session.user.id,
          full_name: trimmed
        });
      } else if (userId) {
        const resume = readUserLocalData<HealthResumeData | null>(userId, "healthfolio", null);
        if (resume) {
          writeUserLocalData(userId, "healthfolio", { ...resume, fullName: trimmed });
        }
      }
      setNameUpdateSuccess(true);
      if (activeJob?.pendingVerification) {
        const recheck = verifyPatientName(activeJob.pendingVerification.detectedPatientName, trimmed);
        setActiveJob((prev) => {
          if (!prev || !prev.pendingVerification) return prev;
          return {
            ...prev,
            pendingVerification: {
              ...prev.pendingVerification,
              expectedPatientName: trimmed,
              verificationStatus: recheck.status === "match" ? "match" : prev.pendingVerification.verificationStatus
            }
          };
        });
      }
    } catch (err: unknown) {
      console.warn("Could not update profile name in quick edit.", err);
    } finally {
      setIsUpdatingName(false);
    }
  }, [activeJob, editedProfileName, session, updateHealthResume, updateProfile, user, userId]);

  const isUploading = activeJob?.status === "uploading" || activeJob?.status === "saving";
  const uploadProgress = activeJob?.progressText || "Processing document...";

  return (
    <VaultUploadContext.Provider
      value={{
        activeJob,
        isUploading,
        uploadProgress,
        uploadError,
        completionNotice,
        startUpload,
        cancelUpload,
        confirmAndSave,
        saveDuplicateAnyway,
        dismissVerification,
        dismissDuplicate,
        dismissNotice,
        editedProfileName,
        setEditedProfileName,
        isEditingProfileName,
        setIsEditingProfileName,
        nameUpdateSuccess,
        isUpdatingName,
        updateProfileNameInJob
      }}
    >
      {children}
    </VaultUploadContext.Provider>
  );
}

export function useVaultUpload() {
  const context = useContext(VaultUploadContext);
  if (!context) {
    throw new Error("useVaultUpload must be used within a VaultUploadProvider");
  }
  return context;
}
