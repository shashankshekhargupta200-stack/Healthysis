"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePulse } from "@/context/PulseContext";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase";
import { isNetworkError, readUserLocalData, writeUserLocalData } from "@/lib/localUserData";
import { createEmptyHealthResume } from "@/lib/healthResumeDefaults";
import { HealthfolioVaultGallery } from "@/components/HealthfolioVaultGallery";
import { reportExtractedEventName, type ReportExtractedDetail } from "@/lib/reportExtraction";
import {
  HealthResumeData,
  HealthDiagnosisItem,
  HealthMedicationItem,
  HealthAllergyItem,
  HealthTestReportItem,
  HealthTimelineItem,
  HealthImmunizationItem,
  HealthSurgeryItem
} from "@/types";
import {
  FileText,
  Download,
  Lock,
  Eye,
  CheckCircle2,
  Plus,
  Trash2,
  Edit,
  ShieldCheck,
  Activity,
  Heart,
  Droplet,
  Ruler,
  Weight,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  Stethoscope,
  Pill,
  Syringe,
  QrCode,
  Check,
  ChevronDown,
  ChevronUp,
  Key,
  ShieldAlert
} from "lucide-react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

type MedicalHistoryType = "diagnosis" | "medication" | "surgery";

interface MedicalHistoryRecord {
  id: string;
  type: MedicalHistoryType;
  date: string | null;
  details: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function reportText(value: unknown): string {
  return typeof value === "number" ? String(value) : stringValue(value);
}

function reportNumber(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  return value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0] ?? "";
}

function isRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function hydrateResumeFromVault(resume: HealthResumeData, records: unknown[]): HealthResumeData {
  let next = resume;
  for (const record of records.filter(isRecord)) {
    const extracted = isRecord(record.extracted_data) ? record.extracted_data : {};
    const title = stringValue(record.title) || "Health report";
    const date = typeof record.created_at === "string" ? record.created_at.slice(0, 10) : "";
    const folder = stringValue(record.storage_folder);
    if (folder === "lab-reports") {
      const reportMetricNames: Record<string, string> = {
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
        hemoglobin: "Hemoglobin"
      };
      const markers = isRecordArray(extracted.biomarkers);
      const reportMetrics = { ...next.reportMetrics };
      for (const [key, label] of Object.entries(reportMetricNames)) {
        const directValue = extracted[key];
        const marker = markers.find((item) => stringValue(item.name).toLowerCase().includes(label.toLowerCase()));
        const value = directValue ?? marker?.value;
        if (typeof value === "number" || typeof value === "string") {
          reportMetrics[label] = `${value}${marker?.unit ? ` ${reportText(marker.unit)}` : ""}`;
        }
      }
      const systolic = reportNumber(extracted.systolic_bp);
      const diastolic = reportNumber(extracted.diastolic_bp);
      const heartRate = reportNumber(extracted.heart_rate);
      const metrics = [
        ["Blood glucose", extracted.blood_glucose],
        ["HbA1c", extracted.hba1c],
        ["Total cholesterol", extracted.total_cholesterol],
        ["LDL", extracted.ldl],
        ["HDL", extracted.hdl],
        ["Triglycerides", extracted.triglycerides],
        ["Vitamin D", extracted.vitamin_d],
        ["Vitamin B12", extracted.vitamin_b12],
        ["TSH", extracted.tsh],
        ["Hemoglobin", extracted.hemoglobin]
      ].filter((entry): entry is [string, string | number] => typeof entry[1] === "string" || typeof entry[1] === "number")
        .map(([name, value]) => `${name}: ${value}`);
      const findings = isRecordArray(extracted.biomarkers).map((marker) =>
        `${reportText(marker.name)}: ${reportText(marker.value)} ${reportText(marker.unit)}${marker.reference_range ? ` (ref ${reportText(marker.reference_range)})` : ""}${marker.status ? ` · ${reportText(marker.status)}` : ""}`
      );
      const flags = isRecordArray(extracted.status_flags).map((flag) =>
        `${reportText(flag.biomarker)}: ${reportText(flag.value)} · ${reportText(flag.status)}`
      );
      const result = [
        ...((systolic && diastolic) ? [`Blood pressure: ${systolic}/${diastolic} mmHg`] : []),
        ...(heartRate ? [`Heart rate: ${heartRate} bpm`] : []),
        ...metrics,
        ...findings,
        ...flags,
        stringValue(record.patient_summary)
      ].filter(Boolean).join("\n");
      next = {
        ...next,
        vitals: {
          ...next.vitals,
          ...(systolic && diastolic ? { bloodPressure: `${systolic}/${diastolic}` } : {}),
          ...(heartRate ? { heartRate } : {})
        },
        reportMetrics,
        testReports: [
          {
            id: stringValue(record.id) || `vault-${title}-${date}`,
            date,
            testName: title,
            result,
            ...(typeof record.document_url === "string" ? { file: record.document_url } : {})
          },
          ...next.testReports.filter((item) => item.id !== record.id && !(item.testName === title && item.date === date))
        ]
      };
    } else if (folder === "prescriptions") {
      const medications = isRecordArray(extracted.medications).map((medication) => ({
        id: next.medications.find((existing) =>
          existing.medicine.toLowerCase() === stringValue(medication.name).toLowerCase()
        )?.id ?? crypto.randomUUID(),
        medicine: stringValue(medication.name) || title,
        dose: stringValue(medication.dosage) || stringValue(medication.dose),
        frequency: stringValue(medication.frequency),
        purpose: stringValue(record.patient_summary)
      })).filter((medication) => medication.medicine.trim());
      next = {
        ...next,
        medications: [
          ...medications,
          ...next.medications.filter((item) => !medications.some((medication) =>
            medication.medicine.toLowerCase() === item.medicine.toLowerCase()
          ))
        ],
        testReports: [
          {
            id: stringValue(record.id) || `vault-${title}-${date}`,
            date,
            testName: title,
            result: stringValue(record.patient_summary),
            ...(typeof record.document_url === "string" ? { file: record.document_url } : {})
          },
          ...next.testReports.filter((item) => item.id !== record.id && !(item.testName === title && item.date === date))
        ]
      };
    }
  }
  return next;
}

export function HealthResumeBuilderTabView() {
  const { healthResume, updateHealthResume, updateProfile } = usePulse();
  const { user, session } = useAuth();
  const userId = user?.id;

  // Local live editing state
  const [formData, setFormData] = useState<HealthResumeData>(healthResume);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeFormSection, setActiveFormSection] = useState<string>("personal");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [enteredPass, setEnteredPass] = useState("");
  const [passError, setPassError] = useState("");
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Hidden references for PDF capture
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadHealthResume = async () => {
      await Promise.resolve();
      const restoreLocalResume = () => {
        if (!userId) return;
        const localResume = readUserLocalData<HealthResumeData | null>(userId, "healthfolio", null);
        const baseResume = localResume ?? createEmptyHealthResume(user?.name ?? "", user?.phone ?? "");
        const nextResume = hydrateResumeFromVault(
          baseResume,
          readUserLocalData<unknown[]>(userId, "patient_memory_vault", [])
        );
        setFormData(nextResume);
        updateHealthResume(nextResume);
        updateProfile({
          name: nextResume.fullName || user?.name || "",
          phone: nextResume.phone || user?.phone || "",
          uniqueId: userId,
          age: Number(nextResume.age) || 0,
          dob: nextResume.dob,
          gender: nextResume.gender,
          height: nextResume.heightCm ? `${nextResume.heightCm} cm` : "",
          weight: nextResume.weightKg ? `${nextResume.weightKg} kg` : "",
          bmi: Number(nextResume.bmi) || undefined,
          bmiCategory: nextResume.bmiCategory
        });
      };
      try {
        if (user?.isGuest) {
          if (active) restoreLocalResume();
          return;
        }
        const supabase = getSupabaseClient();
        const authenticatedUserId = await requireAuthenticatedUser(supabase, session?.user.id);
        const [profileResult, historyResult, vaultResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, phone, dob, blood_group, abha_id, details, blood_pressure_latest, heart_rate_latest")
            .eq("id", authenticatedUserId)
            .maybeSingle(),
          supabase
            .from("medical_history")
            .select("id, type, date, details")
            .eq("user_id", authenticatedUserId),
          supabase
            .from("patient_memory_vault")
            .select("id, category, storage_folder, title, extracted_data, patient_summary, document_url, created_at")
            .eq("user_id", authenticatedUserId)
            .in("category", ["lab_report", "prescription"])
            .order("created_at", { ascending: false })
            .limit(50)
        ]);
        if (profileResult.error) throw profileResult.error;
        if (historyResult.error) throw historyResult.error;
        if (vaultResult.error) {
          console.warn("Could not load vault data into the Healthfolio form.", vaultResult.error.message);
        }

        const profileDetails = isRecord(profileResult.data?.details) ? profileResult.data.details : {};
        const base = createEmptyHealthResume(user?.name ?? "", authenticatedUserId);
        const diagnoses: HealthResumeData["diagnoses"] = [];
        const medications: HealthResumeData["medications"] = [];
        const surgeries: HealthResumeData["surgeries"] = [];
        const testReports: HealthResumeData["testReports"] = Array.isArray(profileDetails.testReports)
          ? profileDetails.testReports.filter(isRecord).map((report, index) => ({
            id: stringValue(report.id) || `saved-report-${index}`,
            date: stringValue(report.date),
            testName: stringValue(report.testName),
            result: stringValue(report.result),
            ...(typeof report.file === "string" ? { file: report.file } : {})
          }))
          : [];

        for (const rawRecord of historyResult.data ?? []) {
          if (!isRecord(rawRecord) || !isRecord(rawRecord.details)) continue;
          const record = rawRecord as unknown as MedicalHistoryRecord;
          const details = record.details;
          if (record.type === "diagnosis") {
            if (details.report_summary === true) {
              const extractedMetrics = isRecord(details.extracted_metrics) ? details.extracted_metrics : {};
              testReports.push({
                id: record.id,
                date: record.date ?? "",
                testName: stringValue(details.condition) || "Lab report",
                result: stringValue(details.details) || JSON.stringify(extractedMetrics)
              });
              continue;
            }
            diagnoses.push({
              id: record.id,
              date: record.date ?? "",
              condition: stringValue(details.condition),
              details: stringValue(details.details),
              status: details.status === "Ongoing" || details.status === "Normal" ? details.status : "Resolved"
            });
          } else if (record.type === "medication") {
            medications.push({
              id: record.id,
              medicine: stringValue(details.medicine),
              dose: stringValue(details.dose),
              frequency: stringValue(details.frequency),
              purpose: stringValue(details.purpose)
            });
          } else if (record.type === "surgery") {
            surgeries.push({
              id: record.id,
              date: record.date ?? "",
              procedure: stringValue(details.procedure),
              details: stringValue(details.details)
            });
          }
        }

        const fullName = profileResult.data?.full_name || user?.name || "";
        const nextResume: HealthResumeData = {
          ...base,
          reportMetrics: isRecord(profileDetails.reportMetrics)
            ? Object.fromEntries(Object.entries(profileDetails.reportMetrics).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
            : base.reportMetrics,
          age: typeof profileDetails.age === "number" || typeof profileDetails.age === "string" ? profileDetails.age : "",
          gender: stringValue(profileDetails.gender),
          dob: profileResult.data?.dob ?? "",
          dobRaw: profileResult.data?.dob ?? "",
          bloodGroup: profileResult.data?.blood_group ?? "",
          abhaId: profileResult.data?.abha_id ?? "",
          fullName,
          patientId: authenticatedUserId,
          phone: profileResult.data?.phone ?? user?.phone ?? "",
          email: stringValue(profileDetails.email) || user?.email || "",
          location: stringValue(profileDetails.location),
          heightCm: typeof profileDetails.heightCm === "number" || typeof profileDetails.heightCm === "string" ? profileDetails.heightCm : "",
          weightKg: typeof profileDetails.weightKg === "number" || typeof profileDetails.weightKg === "string" ? profileDetails.weightKg : "",
          bmi: typeof profileDetails.bmi === "number" || typeof profileDetails.bmi === "string" ? profileDetails.bmi : "",
          bmiCategory: stringValue(profileDetails.bmiCategory),
          diagnoses,
          medications,
          surgeries,
          testReports,
          vitals: {
            ...base.vitals,
            bloodPressure: profileResult.data?.blood_pressure_latest ?? base.vitals.bloodPressure,
            heartRate: profileResult.data?.heart_rate_latest !== null && profileResult.data?.heart_rate_latest !== undefined
              ? String(profileResult.data.heart_rate_latest)
              : base.vitals.heartRate
          }
        };
        const hydratedResume = hydrateResumeFromVault(nextResume, vaultResult.data ?? []);
        if (active) {
          setFormData(hydratedResume);
          updateHealthResume(hydratedResume);
          updateProfile({
            name: fullName,
            phone: profileResult.data?.phone ?? user?.phone ?? "",
            uniqueId: authenticatedUserId,
            age: Number(hydratedResume.age) || 0,
            dob: hydratedResume.dob,
            gender: hydratedResume.gender,
            height: hydratedResume.heightCm ? `${hydratedResume.heightCm} cm` : "",
            weight: hydratedResume.weightKg ? `${hydratedResume.weightKg} kg` : "",
            bmi: Number(hydratedResume.bmi) || undefined,
            bmiCategory: hydratedResume.bmiCategory
          });
        }
      } catch (error: unknown) {
        console.error("Could not load the user's health resume.", error);
        if (isNetworkError(error)) {
          if (active) restoreLocalResume();
        } else if (active) {
          setLoadError(error instanceof Error ? error.message : "Could not load your health data.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadHealthResume();
    return () => {
      active = false;
    };
  }, [user?.name, user?.phone, user?.email, user?.isGuest, session?.user.id, userId, updateHealthResume, updateProfile]);

  useEffect(() => {
    const handleReportExtracted = (event: Event) => {
      const { detail } = event as CustomEvent<ReportExtractedDetail>;
      if (!detail?.title) return;
      const recordId = detail.vaultRecord && typeof detail.vaultRecord.id === "string"
        ? detail.vaultRecord.id
        : `scan-${Date.now()}`;
      const next = hydrateResumeFromVault(formData, [{
        id: recordId,
        category: detail.category ?? (isRecordArray(detail.extracted_data.medications).length > 0 ? "prescription" : "lab_report"),
        storage_folder: detail.category === "prescription" || isRecordArray(detail.extracted_data.medications).length > 0
          ? "prescriptions"
          : "lab-reports",
        title: detail.title,
        extracted_data: {
          ...detail.extracted_data,
          status_flags: detail.status_flags
        },
        patient_summary: detail.patient_summary,
        document_url: typeof detail.vaultRecord?.document_url === "string" ? detail.vaultRecord.document_url : null,
        created_at: new Date().toISOString()
      }]);
      setFormData(next);
      updateHealthResume(next);
      if (userId) writeUserLocalData(userId, "healthfolio", next);
      const isPrescription = detail.category === "prescription" || isRecordArray(detail.extracted_data.medications).length > 0;
      setActiveFormSection(isPrescription ? "medications" : "personal");
      setSaveMessage(isPrescription
        ? "Prescription details auto-filled in Medications & Allergies. Review before saving."
        : "Report readings and summary auto-filled in Personal & Vitals and Medical Events & Tests.");
    };
    window.addEventListener(reportExtractedEventName, handleReportExtracted);
    return () => window.removeEventListener(reportExtractedEventName, handleReportExtracted);
  }, [formData, updateHealthResume, userId]);

  // Compute 8-digit DOB passphrase
  const computePasscode = (): string => {
    if (formData.dobRaw && /^\d{4}-\d{2}-\d{2}$/.test(formData.dobRaw)) {
      const [y, m, d] = formData.dobRaw.split("-");
      return `${d}${m}${y}`;
    }
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    const parts = (formData.dob || "").trim().split(/\s+/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const mStr = parts[1].slice(0, 3).toLowerCase();
      const month = months[mStr];
      if (!month) return "";
      const year = parts[2];
      return `${day}${month}${year}`;
    }
    return "";
  };

  const expectedPasscode = computePasscode();

  // Handle field changes
  const handleFieldChange = <K extends keyof HealthResumeData>(
    field: K,
    val: HealthResumeData[K]
  ) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
  };

  // Recalculate BMI when height or weight change
  const handleHeightWeightChange = (field: "heightCm" | "weightKg", val: number | string) => {
    const h = field === "heightCm" ? Number(val) : Number(formData.heightCm);
    const w = field === "weightKg" ? Number(val) : Number(formData.weightKg);
    let calculatedBmi: number | string = formData.bmi;
    let cat = formData.bmiCategory;

    if (h > 0 && w > 0) {
      const meter = h / 100;
      calculatedBmi = Number((w / (meter * meter)).toFixed(1));
      if (calculatedBmi < 18.5) cat = "Underweight";
      else if (calculatedBmi < 25) cat = "Normal";
      else if (calculatedBmi < 30) cat = "Overweight";
      else cat = "High";
    }

    const updated = {
      ...formData,
      [field]: val,
      bmi: calculatedBmi,
      bmiCategory: cat
    };
    setFormData(updated);
  };

  // Handlers for dynamic list rows (Diagnoses, Medications, etc.)
  const addDiagnosisRow = () => {
    const newRow: HealthDiagnosisItem = {
      id: crypto.randomUUID(),
      date: "",
      condition: "",
      details: "",
      status: "Resolved"
    };
    handleFieldChange("diagnoses", [...formData.diagnoses, newRow]);
  };

  const updateDiagnosisRow = <K extends keyof HealthDiagnosisItem>(
    index: number,
    key: K,
    val: HealthDiagnosisItem[K]
  ) => {
    const list = [...formData.diagnoses];
    list[index] = { ...list[index], [key]: val };
    handleFieldChange("diagnoses", list);
  };

  const removeDiagnosisRow = (index: number) => {
    const list = formData.diagnoses.filter((_, i) => i !== index);
    handleFieldChange("diagnoses", list);
  };

  const saveDossier = async () => {
    if (!userId) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      if (user?.isGuest) {
        const saved = {
          ...formData,
          fullName: formData.fullName.trim() || user.name,
          phone: formData.phone || user.phone || "",
          patientId: userId
        };
        if (!writeUserLocalData(userId, "healthfolio", saved)) {
          throw new Error("Could not save your dossier on this device.");
        }
        setFormData(saved);
        updateHealthResume(saved);
        updateProfile({
          name: saved.fullName,
          phone: saved.phone,
          uniqueId: userId,
          age: Number(saved.age) || 0,
          dob: saved.dob,
          gender: saved.gender,
          height: saved.heightCm ? `${saved.heightCm} cm` : "",
          weight: saved.weightKg ? `${saved.weightKg} kg` : "",
          bmi: Number(saved.bmi) || undefined,
          bmiCategory: saved.bmiCategory
        });
        setSaveMessage("Dossier saved on this device.");
        return;
      }
      if (!session) throw new Error("A signed-in user is required to save medical history.");
      const supabase = getSupabaseClient();
      const authenticatedUserId = await requireAuthenticatedUser(supabase, session.user.id);
      const savedName = formData.fullName.trim() || user?.name || "User";
      const reportMetricValues = formData.reportMetrics ?? {};
      const metricValue = (label: string) => {
        const numeric = reportNumber(reportMetricValues[label]);
        return numeric ? Number(numeric) : null;
      };
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: authenticatedUserId,
        full_name: savedName,
        phone: formData.phone || user?.phone || null,
        patient_id: formData.phone || user?.phone || null,
        dob: formData.dobRaw || (/^\d{4}-\d{2}-\d{2}$/.test(formData.dob) ? formData.dob : null),
        blood_group: formData.bloodGroup.trim() || null,
        abha_id: formData.abhaId?.trim() || null,
        blood_pressure_latest: formData.vitals.bloodPressure || null,
        heart_rate_latest: reportNumber(formData.vitals.heartRate)
          ? Number(reportNumber(formData.vitals.heartRate))
          : null,
        blood_glucose_latest: metricValue("Blood glucose"),
        hba1c_latest: metricValue("HbA1c"),
        cholesterol_latest: metricValue("Total cholesterol"),
        ldl_latest: metricValue("LDL"),
        hdl_latest: metricValue("HDL"),
        triglycerides_latest: metricValue("Triglycerides"),
        vitamin_d_latest: metricValue("Vitamin D"),
        vitamin_b12_latest: metricValue("Vitamin B12"),
        thyroid_tsh_latest: metricValue("TSH"),
        hemoglobin_latest: metricValue("Hemoglobin"),
        details: {
          age: formData.age,
          gender: formData.gender,
          heightCm: formData.heightCm,
          weightKg: formData.weightKg,
          bmi: formData.bmi,
          bmiCategory: formData.bmiCategory,
          email: formData.email,
          location: formData.location,
          abhaAddress: formData.abhaAddress,
          allergiesSummary: formData.allergiesSummary,
          vitals: formData.vitals,
          reportMetrics: formData.reportMetrics ?? {},
          importantInfo: formData.importantInfo,
          allergiesList: formData.allergiesList,
          testReports: formData.testReports,
          immunizations: formData.immunizations,
          medicalTimeline: formData.medicalTimeline,
          lifestyle: formData.lifestyle,
          confirmation: formData.confirmation
        },
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      if (profileError) throw profileError;

      const { data: existingRows, error: existingError } = await supabase
        .from("medical_history")
        .select("id, type, details")
        .eq("user_id", authenticatedUserId);
      if (existingError) throw existingError;

      const records = [
        ...formData.diagnoses.filter((row) => row.condition.trim()).map((row) => ({
          id: row.id,
          user_id: authenticatedUserId,
          type: "diagnosis" as const,
          date: row.date || null,
          details: { condition: row.condition, details: row.details, status: row.status }
        })),
        ...formData.medications.filter((row) => row.medicine.trim()).map((row) => ({
          id: row.id,
          user_id: authenticatedUserId,
          type: "medication" as const,
          date: null,
          details: { medicine: row.medicine, dose: row.dose, frequency: row.frequency, purpose: row.purpose }
        })),
        ...formData.surgeries.filter((row) => row.procedure.trim()).map((row) => ({
          id: row.id,
          user_id: authenticatedUserId,
          type: "surgery" as const,
          date: row.date || null,
          details: { procedure: row.procedure, details: row.details }
        }))
      ];
      if (records.length > 0) {
        const { error } = await supabase.from("medical_history").upsert(records, { onConflict: "id" });
        if (error) throw error;
      }

      const savedIds = new Set(records.map((record) => record.id));
      const removedIds = (existingRows ?? [])
        .filter((row) => !(row.type === "diagnosis" && isRecord(row.details) && row.details.report_summary === true))
        .map((row) => row.id as string)
        .filter((id) => !savedIds.has(id));
      if (removedIds.length > 0) {
        const { error } = await supabase
          .from("medical_history")
          .delete()
          .eq("user_id", authenticatedUserId)
          .in("id", removedIds);
        if (error) throw error;
      }

      const saved = { ...formData, fullName: savedName, patientId: authenticatedUserId };
      setFormData(saved);
      writeUserLocalData(userId, "healthfolio", saved);
      updateHealthResume(saved);
      updateProfile({
        name: saved.fullName,
        phone: saved.phone,
        uniqueId: authenticatedUserId,
        age: Number(saved.age) || 0,
        dob: saved.dob,
        gender: saved.gender,
        height: saved.heightCm ? `${saved.heightCm} cm` : "",
        weight: saved.weightKg ? `${saved.weightKg} kg` : "",
        bmi: Number(saved.bmi) || undefined,
        bmiCategory: saved.bmiCategory
      });
      setSaveMessage("Personal and clinical dossier saved.");
    } catch (error: unknown) {
      console.error("Could not save the user's Healthfolio dossier.", error);
      if (isNetworkError(error)) {
        if (writeUserLocalData(userId, "healthfolio", formData)) {
          updateHealthResume(formData);
          setSaveMessage("Network unavailable. Dossier saved on this device.");
        } else {
          setSaveError("Network unavailable, and the dossier could not be saved on this device.");
        }
      } else {
        setSaveError(error instanceof Error ? error.message : "Could not save your dossier.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Medications
  const addMedicationRow = () => {
    const newRow: HealthMedicationItem = {
      id: crypto.randomUUID(),
      medicine: "",
      dose: "",
      frequency: "",
      purpose: ""
    };
    handleFieldChange("medications", [...formData.medications, newRow]);
  };

  const updateMedicationRow = (index: number, key: keyof HealthMedicationItem, val: string) => {
    const list = [...formData.medications];
    list[index] = { ...list[index], [key]: val };
    handleFieldChange("medications", list);
  };

  const removeMedicationRow = (index: number) => {
    const list = formData.medications.filter((_, i) => i !== index);
    handleFieldChange("medications", list);
  };

  // Allergies
  const addAllergyRow = () => {
    const newRow: HealthAllergyItem = {
      id: `alg-${Date.now()}`,
      allergen: "",
      reaction: ""
    };
    handleFieldChange("allergiesList", [...formData.allergiesList, newRow]);
  };

  const updateAllergyRow = (index: number, key: keyof HealthAllergyItem, val: string) => {
    const list = [...formData.allergiesList];
    list[index] = { ...list[index], [key]: val };
    handleFieldChange("allergiesList", list);
  };

  const removeAllergyRow = (index: number) => {
    const list = formData.allergiesList.filter((_, i) => i !== index);
    handleFieldChange("allergiesList", list);
  };

  // Test Reports
  const addTestReportRow = () => {
    const newRow: HealthTestReportItem = {
      id: `test-${Date.now()}`,
      date: "",
      testName: "",
      result: "Normal"
    };
    handleFieldChange("testReports", [...formData.testReports, newRow]);
  };

  const updateTestReportRow = (index: number, key: keyof HealthTestReportItem, val: string) => {
    const list = [...formData.testReports];
    list[index] = { ...list[index], [key]: val };
    handleFieldChange("testReports", list);
  };

  const removeTestReportRow = (index: number) => {
    const list = formData.testReports.filter((_, i) => i !== index);
    handleFieldChange("testReports", list);
  };

  // Timeline
  const addTimelineRow = () => {
    const newRow: HealthTimelineItem = {
      id: `tl-${Date.now()}`,
      date: "",
      title: "",
      facility: "",
      status: "Resolved"
    };
    handleFieldChange("medicalTimeline", [...formData.medicalTimeline, newRow]);
  };

  const updateTimelineRow = <K extends keyof HealthTimelineItem>(
    index: number,
    key: K,
    val: HealthTimelineItem[K]
  ) => {
    const list = [...formData.medicalTimeline];
    list[index] = { ...list[index], [key]: val };
    handleFieldChange("medicalTimeline", list);
  };

  const removeTimelineRow = (index: number) => {
    const list = formData.medicalTimeline.filter((_, i) => i !== index);
    handleFieldChange("medicalTimeline", list);
  };

  // Immunizations
  const addImmunizationRow = () => {
    const newRow: HealthImmunizationItem = {
      id: `imm-${Date.now()}`,
      vaccine: "",
      date: ""
    };
    handleFieldChange("immunizations", [...formData.immunizations, newRow]);
  };

  const updateImmunizationRow = (index: number, key: keyof HealthImmunizationItem, val: string) => {
    const list = [...formData.immunizations];
    list[index] = { ...list[index], [key]: val };
    handleFieldChange("immunizations", list);
  };

  const removeImmunizationRow = (index: number) => {
    const list = formData.immunizations.filter((_, i) => i !== index);
    handleFieldChange("immunizations", list);
  };

  // Trigger Passphrase Barrier Modal
  const initiateDownload = () => {
    setEnteredPass("");
    setPassError("");
    setShowPassModal(true);
  };

  // Execute PDF generation upon correct passphrase entry
  const handleVerifyAndDownload = async () => {
    const cleanEntered = enteredPass.trim();
    if (!expectedPasscode) {
      setPassError("Add and save your date of birth before generating the PDF.");
      return;
    }
    if (cleanEntered !== expectedPasscode) {
      setPassError("The passphrase does not match your saved date of birth.");
      return;
    }

    setShowPassModal(false);
    setIsGeneratingPdf(true);

    // CRITICAL PDF GUARDRAIL: Ensure documentElement temporarily does NOT have 'dark' during capture
    const wasDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    if (wasDark) {
      document.documentElement.classList.remove("dark");
    }

    try {
      if (!page1Ref.current || !page2Ref.current) {
        throw new Error("Target PDF layout templates are not mounted yet. Please try again.");
      }

      // Capture Page 1 via html-to-image (strictly light mode)
      const dataUrl1 = await toPng(page1Ref.current, {
        cacheBust: true,
        backgroundColor: "#ffffff"
      });

      // Capture Page 2 via html-to-image (strictly light mode)
      const dataUrl2 = await toPng(page2Ref.current, {
        cacheBust: true,
        backgroundColor: "#ffffff"
      });

      // Create PDF Document (A4 format)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add Page 1
      pdf.addImage(dataUrl1, "PNG", 0, 0, pdfWidth, pdfHeight);

      // Add Page 2
      pdf.addPage();
      pdf.addImage(dataUrl2, "PNG", 0, 0, pdfWidth, pdfHeight);

      // Save PDF
      pdf.save("Healthysis_Resume.pdf");

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err: unknown) {
      console.error("PDF generation failed with html-to-image, falling back to window.print():", err);
      // Fallback: Browser native Save to PDF
      if (typeof window !== "undefined") {
        window.print();
      }
    } finally {
      if (wasDark) {
        document.documentElement.classList.add("dark");
      }
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div role="status" className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-[#537783]">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#DCEAEC] border-t-[#04939D]" />
        Loading your Healthfolio…
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & DOWNLOAD ACTION BAR                          */}
      {/* ============================================================ */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#DCEAEC] dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-healthysis-signature text-white flex items-center justify-center font-bold text-sm shadow-xs">
              📄
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#123F55] dark:text-slate-100 tracking-tight">
              Personal &amp; Clinical Dossier
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#537783] dark:text-slate-400">
            Review your personal and clinical information, then save the complete dossier once.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => void saveDossier()}
            disabled={isSaving}
            className="flex-1 sm:flex-none rounded-2xl bg-healthysis-signature px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-[#04939D]/25 disabled:opacity-50"
          >
            {isSaving ? "Saving Dossier…" : "Save Dossier"}
          </button>
          {/* Preview Layout Button */}
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="flex-1 sm:flex-none py-3.5 px-5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-800 hover:bg-[#DDF2F0] border border-[#DCEAEC] dark:border-slate-800 text-[#076584] dark:text-[#77C86F] font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Eye className="w-4 h-4 stroke-[2.2]" />
            <span>Preview Resume</span>
          </button>

          {/* Download PDF Button */}
          <button
            type="button"
            onClick={initiateDownload}
            disabled={isGeneratingPdf || !expectedPasscode}
            className="btn-healthysis-primary flex-1 sm:flex-none py-3.5 px-6 rounded-2xl text-white font-black text-sm shadow-lg shadow-[#04939D]/25 transition-all flex items-center justify-center gap-2 touch-target disabled:opacity-50"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isGeneratingPdf ? "Generating PDF..." : "Download Health Resume (PDF)"}</span>
          </button>
        </div>
      </section>

      {/* Success Notification Banner */}
      {pdfSuccess && (
        <div className="p-4 rounded-2xl bg-[#CBEFE0] border border-[#2CAC7F]/40 text-[#076584] flex items-center gap-3 animate-in fade-in zoom-in-95">
          <CheckCircle2 className="w-5 h-5 text-[#2CAC7F] shrink-0" />
          <div className="text-xs sm:text-sm font-bold">
            Health Resume downloaded successfully! The document is password-protected with your DOB ({expectedPasscode}).
          </div>
        </div>
      )}
      {loadError && (
        <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Could not load Healthfolio data: {loadError}
        </div>
      )}
      {saveError && (
        <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {saveError}
        </div>
      )}
      {saveMessage && (
        <div role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          {saveMessage}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. CATEGORY TABS / STEP SELECTOR                             */}
      {/* ============================================================ */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "personal", label: "1. Personal & Vitals", icon: User },
          { id: "diagnoses", label: "2. Diagnoses & History", icon: Stethoscope },
          { id: "medications", label: "3. Medications & Allergies", icon: Pill },
          { id: "timeline", label: "4. Medical Events & Tests", icon: Calendar },
          { id: "lifestyle", label: "5. Lifestyle & Signature", icon: CheckCircle2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeFormSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFormSection(tab.id)}
              className={`px-4 py-3 rounded-2xl font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                isActive
                  ? "bg-healthysis-signature text-white border-transparent shadow-md"
                  : "bg-white dark:bg-slate-900 text-[#123F55] dark:text-slate-100 border-[#DCEAEC] dark:border-slate-800 hover:bg-[#F8FBFC]"
              }`}
            >
              <Icon className="w-4 h-4 stroke-[2.2]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </section>

      {/* ============================================================ */}
      {/* 3. MULTI-SECTION FORM CONTAINER                             */}
      {/* ============================================================ */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#DCEAEC] dark:border-slate-800 shadow-sm space-y-6">
        {/* TAB 1: PERSONAL & VITALS */}
        {activeFormSection === "personal" && (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-[#123F55] dark:text-slate-100 flex items-center gap-2">
              <User className="w-5 h-5 text-[#04939D]" />
              <span>Personal Demographics &amp; Biometrics</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleFieldChange("fullName", e.target.value)}
                  placeholder="Your full name"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleFieldChange("age", e.target.value)}
                  placeholder="e.g. 21"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleFieldChange("gender", e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Date of Birth (Display)</label>
                <input
                  type="text"
                  value={formData.dob}
                  onChange={(e) => handleFieldChange("dob", e.target.value)}
                  placeholder="Date of birth"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">
                  DOB Raw (For Passcode)
                </label>
                <input
                  type="date"
                  value={formData.dobRaw || ""}
                  onChange={(e) => handleFieldChange("dobRaw", e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Blood Group</label>
                <input
                  type="text"
                  value={formData.bloodGroup}
                  onChange={(e) => handleFieldChange("bloodGroup", e.target.value)}
                placeholder="Blood group"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Patient ID</label>
                <input
                  type="text"
                  value={formData.patientId}
                  readOnly
                  placeholder="Phone number ID"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={formData.heightCm}
                  onChange={(e) => handleHeightWeightChange("heightCm", e.target.value)}
                  placeholder="e.g. 178"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weightKg}
                  onChange={(e) => handleHeightWeightChange("weightKg", e.target.value)}
                  placeholder="e.g. 72"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Calculated BMI</label>
                <div className="p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-[#F8FBFC] dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-black text-sm flex items-center justify-between">
                  <span>{formData.bmi}</span>
                  {formData.bmiCategory && <span className="text-xs text-[#2CAC7F] font-bold">({formData.bmiCategory})</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  readOnly
                  placeholder="Phone number ID"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  placeholder="Email address"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleFieldChange("location", e.target.value)}
                  placeholder="City, country"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-[#123F55] dark:text-slate-100 font-semibold text-sm"
                />
              </div>
            </div>

            {Object.keys(formData.reportMetrics ?? {}).length > 0 && (
              <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 dark:border-teal-900 dark:bg-teal-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-[#123F55] dark:text-slate-100">Auto-filled report biomarkers</h4>
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-[10px] font-bold text-teal-800">From latest scan · review before saving</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {Object.entries(formData.reportMetrics ?? {}).map(([label, value]) => (
                    <label className="grid gap-1 text-[11px] font-bold text-[#537783]" key={label}>
                      {label}
                      <input
                        className="w-full rounded-xl border border-[#DCEAEC] bg-white px-3 py-2.5 text-xs font-semibold text-[#123F55] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        onChange={(event) => handleFieldChange("reportMetrics", {
                          ...(formData.reportMetrics ?? {}),
                          [label]: event.target.value
                        })}
                        value={value}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#DCEAEC] dark:border-slate-800">
              <h4 className="text-sm font-black text-[#123F55] dark:text-slate-100 mb-3">
                Latest Key Vitals (Key Health Indicators)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#537783] block mb-1">Blood Pressure</label>
                  <input
                    type="text"
                    value={formData.vitals.bloodPressure}
                    onChange={(e) =>
                      handleFieldChange("vitals", { ...formData.vitals, bloodPressure: e.target.value })
                    }
                    placeholder="118/76 mmHg"
                    className="w-full p-2.5 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#537783] block mb-1">Heart Rate</label>
                  <input
                    type="text"
                    value={formData.vitals.heartRate}
                    onChange={(e) =>
                      handleFieldChange("vitals", { ...formData.vitals, heartRate: e.target.value })
                    }
                    placeholder="72 bpm"
                    className="w-full p-2.5 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#537783] block mb-1">SpO2</label>
                  <input
                    type="text"
                    value={formData.vitals.spo2}
                    onChange={(e) =>
                      handleFieldChange("vitals", { ...formData.vitals, spo2: e.target.value })
                    }
                    placeholder="98 %"
                    className="w-full p-2.5 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#537783] block mb-1">Temperature</label>
                  <input
                    type="text"
                    value={formData.vitals.temperature}
                    onChange={(e) =>
                      handleFieldChange("vitals", { ...formData.vitals, temperature: e.target.value })
                    }
                    placeholder="36.6 °C"
                    className="w-full p-2.5 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: DIAGNOSES & MEDICAL HISTORY */}
        {activeFormSection === "diagnoses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCEAEC] dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-[#123F55] dark:text-slate-100">
                  Diagnoses &amp; Medical History
                </h3>
                <p className="text-xs text-[#537783]">Chronological conditions, interventions &amp; resolutions</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addDiagnosisRow}
                  className="px-3.5 py-1.5 rounded-xl bg-[#DDF2F0] dark:bg-[#133a46] text-[#076584] dark:text-[#77C86F] font-bold text-xs flex items-center gap-1.5 hover:bg-[#CBEFE0]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Diagnosis</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {formData.diagnoses.length === 0 && (
                <p className="rounded-xl bg-[#F8FBFC] p-4 text-sm text-[#537783] dark:bg-slate-950">
                  No diagnoses have been added to this profile.
                </p>
              )}
              {formData.diagnoses.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-[#829AA3] block mb-0.5">Date</label>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateDiagnosisRow(idx, "date", e.target.value)}
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold uppercase text-[#829AA3] block mb-0.5">Condition</label>
                    <input
                      type="text"
                      value={row.condition}
                      onChange={(e) => updateDiagnosisRow(idx, "condition", e.target.value)}
                      placeholder="Condition name"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold uppercase text-[#829AA3] block mb-0.5">Details</label>
                    <input
                      type="text"
                      value={row.details}
                      onChange={(e) => updateDiagnosisRow(idx, "details", e.target.value)}
                      placeholder="Symptoms or treatment"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase text-[#829AA3] block mb-0.5">Status</label>
                      <select
                        value={row.status}
                        onChange={(e) => updateDiagnosisRow(idx, "status", e.target.value as HealthDiagnosisItem["status"])}
                        className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                      >
                        <option value="Resolved">Resolved</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Normal">Normal</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeDiagnosisRow(idx)}
                      className="p-2 text-rose-500 hover:text-rose-700 mt-4"
                      title="Remove Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MEDICATIONS & ALLERGIES */}
        {activeFormSection === "medications" && (
          <div className="space-y-6">
            {/* Medications Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#DCEAEC] dark:border-slate-800">
                <h3 className="text-base font-black text-[#123F55] dark:text-slate-100">
                  Current Medications
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addMedicationRow}
                    className="px-3 py-1 rounded-xl bg-[#DDF2F0] text-[#076584] font-bold text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medication</span>
                  </button>
                </div>
              </div>

              {formData.medications.length === 0 && (
                <p className="rounded-xl bg-[#F8FBFC] p-4 text-sm text-[#537783] dark:bg-slate-950">
                  No medications have been added to this profile.
                </p>
              )}
              {formData.medications.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-3 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={row.medicine}
                      onChange={(e) => updateMedicationRow(idx, "medicine", e.target.value)}
                      placeholder="Medicine Name"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={row.dose}
                      onChange={(e) => updateMedicationRow(idx, "dose", e.target.value)}
                      placeholder="Dose (e.g. 100 mcg)"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={row.frequency}
                      onChange={(e) => updateMedicationRow(idx, "frequency", e.target.value)}
                      placeholder="Frequency (e.g. Daily)"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={row.purpose}
                      onChange={(e) => updateMedicationRow(idx, "purpose", e.target.value)}
                      placeholder="Purpose"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeMedicationRow(idx)}
                      className="p-1 text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Allergies & Sensitivities */}
            <div className="space-y-3 pt-4 border-t border-[#DCEAEC] dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-[#DCEAEC] dark:border-slate-800">
                <h3 className="text-base font-black text-[#123F55] dark:text-slate-100">
                  Allergies &amp; Sensitivities
                </h3>
                <button
                  type="button"
                  onClick={addAllergyRow}
                  className="px-3 py-1 rounded-xl bg-[#DDF2F0] text-[#076584] font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Allergen</span>
                </button>
              </div>

              {formData.allergiesList.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-3 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={row.allergen}
                      onChange={(e) => updateAllergyRow(idx, "allergen", e.target.value)}
                      placeholder="Allergen (e.g. Penicillin)"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      value={row.reaction}
                      onChange={(e) => updateAllergyRow(idx, "reaction", e.target.value)}
                      placeholder="Reaction (e.g. Mild rash)"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeAllergyRow(idx)}
                      className="p-1 text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MEDICAL EVENTS & TIMELINE */}
        {activeFormSection === "timeline" && (
          <div className="space-y-6">
            {/* Medical Timeline Events */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#DCEAEC] dark:border-slate-800">
                <h3 className="text-base font-black text-[#123F55] dark:text-slate-100">
                  Medical Timeline (Chronological Highlights)
                </h3>
                <button
                  type="button"
                  onClick={addTimelineRow}
                  className="px-3 py-1 rounded-xl bg-[#DDF2F0] text-[#076584] font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Timeline Event</span>
                </button>
              </div>

              {formData.medicalTimeline.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-3 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={row.date}
                      onChange={(e) => updateTimelineRow(idx, "date", e.target.value)}
                      placeholder="Aug 2025"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={row.title}
                      onChange={(e) => updateTimelineRow(idx, "title", e.target.value)}
                      placeholder="Event Title"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={row.facility}
                      onChange={(e) => updateTimelineRow(idx, "facility", e.target.value)}
                      placeholder="Facility or Details"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between">
                    <select
                      value={row.status}
                      onChange={(e) => updateTimelineRow(idx, "status", e.target.value as HealthTimelineItem["status"])}
                      className="p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                    >
                      <option value="Resolved">Resolved</option>
                      <option value="Normal">Normal</option>
                      <option value="Ongoing">Ongoing</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTimelineRow(idx)}
                      className="p-1 text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Test Reports */}
            <div className="space-y-3 pt-4 border-t border-[#DCEAEC] dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-[#DCEAEC] dark:border-slate-800">
                <h3 className="text-base font-black text-[#123F55] dark:text-slate-100">
                  Recent Test Reports &amp; Labs
                </h3>
                <button
                  type="button"
                  onClick={addTestReportRow}
                  className="px-3 py-1 rounded-xl bg-[#DDF2F0] text-[#076584] font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lab Test</span>
                </button>
              </div>

              {formData.testReports.map((row, idx) => (
                <div
                  key={row.id}
                  className="p-3 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={row.date}
                      onChange={(e) => updateTestReportRow(idx, "date", e.target.value)}
                      placeholder="Aug 2025"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={row.testName}
                      onChange={(e) => updateTestReportRow(idx, "testName", e.target.value)}
                      placeholder="Test Name (e.g. CBC)"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      value={row.result}
                      onChange={(e) => updateTestReportRow(idx, "result", e.target.value)}
                      placeholder="Result (e.g. Normal)"
                      className="w-full p-2 rounded-lg border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeTestReportRow(idx)}
                      className="p-1 text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: LIFESTYLE & CONFIRMATION */}
        {activeFormSection === "lifestyle" && (
          <div className="space-y-6">
            <h3 className="text-base font-black text-[#123F55] dark:text-slate-100">
              Lifestyle &amp; Family History
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Smoking</label>
                <input
                  type="text"
                  value={formData.lifestyle.smoking}
                  onChange={(e) =>
                    handleFieldChange("lifestyle", { ...formData.lifestyle, smoking: e.target.value })
                  }
                  placeholder="No / Occasional / Yes"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Alcohol</label>
                <input
                  type="text"
                  value={formData.lifestyle.alcohol}
                  onChange={(e) =>
                    handleFieldChange("lifestyle", { ...formData.lifestyle, alcohol: e.target.value })
                  }
                  placeholder="Occasional / None / Social"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Exercise Frequency</label>
                <input
                  type="text"
                  value={formData.lifestyle.exercise}
                  onChange={(e) =>
                    handleFieldChange("lifestyle", { ...formData.lifestyle, exercise: e.target.value })
                  }
                  placeholder="3-4 times per week"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">Family History</label>
                <input
                  type="text"
                  value={formData.lifestyle.familyHistory}
                  onChange={(e) =>
                    handleFieldChange("lifestyle", { ...formData.lifestyle, familyHistory: e.target.value })
                  }
                  placeholder="e.g. Diabetes (father), Hypertension (Grandparent)"
                  className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold"
                />
              </div>
            </div>

            {/* Confirmation & Signature Block */}
            <div className="p-6 rounded-3xl bg-[#F8FBFC] dark:bg-slate-950 border-2 border-[#DCEAEC] dark:border-slate-800 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-health-data"
                  checked={formData.confirmation.isConfirmed}
                  onChange={(e) =>
                    handleFieldChange("confirmation", {
                      ...formData.confirmation,
                      isConfirmed: e.target.checked
                    })
                  }
                  className="mt-1 w-5 h-5 rounded-md accent-[#0EA6B7] cursor-pointer"
                />
                <label
                  htmlFor="confirm-health-data"
                  className="text-xs sm:text-sm font-bold text-[#123F55] dark:text-slate-100 cursor-pointer italic"
                >
                  &ldquo;I confirm the following data is my personal health records and I shared it with the trustable person&rdquo;
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#DCEAEC] dark:border-slate-800">
                <div>
                  <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">
                    Patient Signature (Text Signature)
                  </label>
                  <input
                    type="text"
                    value={formData.confirmation.patientSignature}
                    onChange={(e) =>
                      handleFieldChange("confirmation", {
                        ...formData.confirmation,
                        patientSignature: e.target.value
                      })
                    }
                    placeholder="Type Full Legal Name"
                    className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 font-serif italic text-sm text-[#076584]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#123F55] dark:text-slate-100 block mb-1">
                    Date of Signature
                  </label>
                  <input
                    type="text"
                    value={formData.confirmation.signatureDate}
                    onChange={(e) =>
                      handleFieldChange("confirmation", {
                        ...formData.confirmation,
                        signatureDate: e.target.value
                      })
                    }
                    className="w-full p-3 rounded-xl border border-[#DCEAEC] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <HealthfolioVaultGallery />

      {/* ============================================================ */}
      {/* 4. PASSPHRASE DECRYPTION MODAL BARRIER                       */}
      {/* ============================================================ */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 border border-[#DCEAEC] dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-[#DDF2F0] dark:bg-[#133a46] text-[#076584] dark:text-[#77C86F] flex items-center justify-center mx-auto shadow-md">
              <Key className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-xl font-black text-[#123F55] dark:text-slate-100">
                Passphrase Decryption Gate
              </h3>
              <p className="text-xs text-[#537783] dark:text-slate-400">
                This PDF is encrypted under DPDP Act provisions. Please confirm your 8-digit Date of Birth (<span className="font-mono font-bold">DDMMYYYY</span>) to decrypt and download.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#076584] dark:text-[#77C86F] block">
                Enter 8-Digit DOB Passphrase
              </label>
              <input
                type="text"
                maxLength={8}
                value={enteredPass}
                onChange={(e) => {
                  setEnteredPass(e.target.value);
                  setPassError("");
                }}
                placeholder="e.g. 14022005"
                className="w-full p-3.5 rounded-2xl border-2 border-[#0EA6B7] bg-[#F8FBFC] dark:bg-slate-950 text-center font-mono font-black text-xl tracking-widest text-[#123F55] dark:text-slate-100"
              />

              <div className="text-[11px] text-[#537783] dark:text-slate-400 flex items-center justify-between">
                <span>Hint: Based on DOB &quot;{formData.dob}&quot;</span>
                <span className="font-mono font-bold text-[#076584] dark:text-[#77C86F]">{expectedPasscode}</span>
              </div>

              {passError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{passError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#DCEAEC] text-[#537783] font-bold text-sm hover:bg-[#F8FBFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyAndDownload}
                className="flex-1 py-3 rounded-xl bg-healthysis-signature text-white font-black text-sm shadow-md"
              >
                Unlock &amp; Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. PREVIEW MODAL (ON-SCREEN HIGH-FIDELITY VIEWER)             */}
      {/* ============================================================ */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-4 flex flex-col items-center">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 mb-4 flex items-center justify-between sticky top-4 z-20 shadow-xl border border-[#DCEAEC]">
            <div className="flex items-center gap-2.5">
              <Eye className="w-5 h-5 text-[#04939D]" />
              <span className="font-black text-[#123F55] dark:text-slate-100 text-base">
                Health Resume (2-Page Live Preview)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={initiateDownload}
                className="px-4 py-2 rounded-xl bg-healthysis-signature text-white text-xs font-black flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-[#F8FBFC] border border-[#DCEAEC] text-[#123F55] text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>

          {/* Visual Container rendering Page 1 & Page 2 */}
          <div className="w-full max-w-3xl space-y-8 pb-12">
            <div className="rounded-2xl shadow-2xl overflow-hidden bg-white">
              {renderResumePage1(formData)}
            </div>
            <div className="rounded-2xl shadow-2xl overflow-hidden bg-white">
              {renderResumePage2(formData)}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. HIDDEN OFF-SCREEN PDF CAPTURE CONTAINERS (EXACT A4 DIMS)   */}
      {/* ============================================================ */}
      <div
        aria-hidden="true"
        className="pdf-capture-light"
        style={{
          position: "fixed",
          top: 0,
          left: "-9999px",
          width: "800px",
          pointerEvents: "none",
          zIndex: -9999,
          backgroundColor: "#ffffff"
        }}
      >
        <div ref={page1Ref} style={{ width: "800px", minHeight: "1131px", backgroundColor: "#ffffff" }}>
          {renderResumePage1(formData)}
        </div>
        <div ref={page2Ref} style={{ width: "800px", minHeight: "1131px", backgroundColor: "#ffffff" }}>
          {renderResumePage2(formData)}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================== */
/* RENDER FUNCTIONS FOR PAGE 1 & PAGE 2 (MATCHING IMAGE 21 LAYOUT)      */
/* ==================================================================== */

function renderResumePage1(d: HealthResumeData) {
  return (
    <div className="p-8 bg-white text-[#123F55] font-sans text-xs leading-relaxed flex flex-col justify-between" style={{ minHeight: "1131px" }}>
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[#DCEAEC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#076584] to-[#0EA6B7] text-white flex items-center justify-center font-black text-lg">
              ♥
            </div>
            <div>
              <div className="text-2xl font-black text-[#076584] tracking-tight">Healthysis</div>
              <div className="text-[10px] font-semibold text-[#537783]">Your Health Journey, Simplified</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-black text-[#076584] tracking-wider">HEALTH RESUME</div>
            <div className="text-[10px] text-[#537783] font-medium">Personal • Organized • Always With You</div>
          </div>
        </div>

        {/* Hero Bio Card */}
        <div className="mt-5 p-5 rounded-2xl bg-[#F0F8FA] border border-[#DCEAEC] space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#0EA6B7] bg-white shrink-0 flex items-center justify-center">
                {(d.userProfilePic || d.profilePhotoUrl) ? (
                  <img
                    src={d.userProfilePic || d.profilePhotoUrl}
                    alt={d.fullName}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-[#DDF2F0] flex items-center justify-center text-[#076584]">
                    <User className="w-10 h-10 stroke-[1.8]" />
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-xl font-black text-[#123F55]">{d.fullName || "—"}</h2>
                <div className="text-xs font-semibold text-[#537783] mt-0.5">
                  {d.age ? `${d.age} years` : ""} {d.gender ? `• ${d.gender}` : ""} {d.dob ? `• ${d.dob}` : ""}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#DCEAEC] font-bold text-[11px] text-[#123F55] flex items-center gap-1">
                    <span className="text-[#f43f5e]">🩸</span> Blood Group <span className="font-black text-[#076584]">{d.bloodGroup || "—"}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#DCEAEC] font-bold text-[11px] text-[#123F55] flex items-center gap-1">
                    <span>📏</span> Height <span className="font-black text-[#076584]">{d.heightCm ? `${d.heightCm} cm` : "—"}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#DCEAEC] font-bold text-[11px] text-[#123F55] flex items-center gap-1">
                    <span>⚖️</span> Weight <span className="font-black text-[#076584]">{d.weightKg ? `${d.weightKg} kg` : "—"}</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-[#DCEAEC] font-bold text-[11px] text-[#123F55] flex items-center gap-1">
                    <span>📊</span> BMI <span className="font-black text-[#2CAC7F]">{d.bmi || "—"} {d.bmiCategory && `(${d.bmiCategory})`}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code & ID */}
            <div className="text-center shrink-0">
              <div className="w-16 h-16 p-1.5 bg-white rounded-xl border border-[#DCEAEC] mx-auto flex items-center justify-center">
                <svg className="w-full h-full text-[#076584]" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="5" y="5" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="13" y="13" width="12" height="12" rx="2" fill="currentColor" />
                  <rect x="67" y="5" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="75" y="13" width="12" height="12" rx="2" fill="currentColor" />
                  <rect x="5" y="67" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="13" y="75" width="12" height="12" rx="2" fill="currentColor" />
                  <rect x="42" y="8" width="8" height="8" fill="currentColor" />
                  <rect x="54" y="8" width="6" height="6" fill="currentColor" />
                  <rect x="42" y="22" width="6" height="12" fill="currentColor" />
                  <rect x="54" y="20" width="8" height="8" fill="currentColor" />
                  <rect x="8" y="42" width="10" height="6" fill="currentColor" />
                  <rect x="24" y="42" width="12" height="8" fill="currentColor" />
                  <rect x="42" y="42" width="16" height="16" rx="2" fill="#04939D" />
                  <rect x="66" y="42" width="10" height="8" fill="currentColor" />
                  <rect x="82" y="42" width="10" height="6" fill="currentColor" />
                  <rect x="42" y="66" width="8" height="12" fill="currentColor" />
                  <rect x="56" y="66" width="6" height="8" fill="currentColor" />
                  <rect x="68" y="58" width="12" height="8" fill="currentColor" />
                  <rect x="84" y="58" width="8" height="12" fill="currentColor" />
                  <rect x="68" y="74" width="8" height="18" fill="currentColor" />
                  <rect x="82" y="78" width="10" height="14" fill="currentColor" />
                  <rect x="42" y="84" width="20" height="8" fill="currentColor" />
                </svg>
              </div>
              <div className="text-[9px] font-bold text-[#829AA3] mt-1">Patient ID</div>
              <div className="text-[10px] font-mono font-black text-[#076584]">{d.patientId || "—"}</div>
            </div>
          </div>

          {/* Contact Ribbon */}
          <div className="pt-3 border-t border-[#DCEAEC] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#537783] font-semibold">
            <span>📞 {d.phone || ""}</span>
            <span>✉️ {d.email || ""}</span>
            <span>📍 {d.location || ""}</span>
            <span>⚠️ Allergies: {d.allergiesSummary || ""}</span>
          </div>
        </div>

        {/* Row 2: Important Info & Key Health Indicators (2 Columns) */}
        <div className="grid grid-cols-2 gap-4 mt-5">
          {/* Left Column: Important Information */}
          <div className="rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
            <div className="bg-[#123F55] text-white p-3 font-black text-xs flex items-center gap-1.5">
              <span>❗</span> Important Information
            </div>
            <div className="p-3.5 space-y-2.5 text-[11px]">
              <div>
                <span className="font-black text-[#e11d48] block">Allergies</span>
                <span className="text-[#537783]">{d.importantInfo.allergies || ""}</span>
              </div>
              <div>
                <span className="font-black text-[#076584] block">Chronic Conditions</span>
                <span className="text-[#537783]">{d.importantInfo.chronicConditions || ""}</span>
              </div>
              <div>
                <span className="font-black text-[#04939D] block">Current Medications</span>
                <span className="text-[#537783]">{d.importantInfo.currentMedications || ""}</span>
              </div>
              <div>
                <span className="font-black text-[#2CAC7F] block">Lifestyle Notes</span>
                <span className="text-[#537783]">{d.importantInfo.lifestyleNotes || ""}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Key Health Indicators (Latest) */}
          <div className="rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
            <div className="bg-[#076584] text-white p-3 font-black text-xs flex items-center gap-1.5">
              <span>🩺</span> Key Health Indicators (Latest)
            </div>
            <div className="p-3.5 grid grid-cols-2 gap-3 text-center">
              <div className="p-2 rounded-xl bg-[#F0F8FA] border border-[#DCEAEC]">
                <div className="text-[10px] text-[#829AA3] font-bold">Blood Pressure</div>
                <div className="text-sm font-black text-[#076584]">{d.vitals.bloodPressure || "—"}</div>
                <div className="text-[9px] text-[#2CAC7F] font-bold">Normal</div>
              </div>
              <div className="p-2 rounded-xl bg-[#F0F8FA] border border-[#DCEAEC]">
                <div className="text-[10px] text-[#829AA3] font-bold">Heart Rate</div>
                <div className="text-sm font-black text-[#076584]">{d.vitals.heartRate || "—"}</div>
                <div className="text-[9px] text-[#2CAC7F] font-bold">Normal</div>
              </div>
              <div className="p-2 rounded-xl bg-[#F0F8FA] border border-[#DCEAEC]">
                <div className="text-[10px] text-[#829AA3] font-bold">SpO2</div>
                <div className="text-sm font-black text-[#076584]">{d.vitals.spo2 || "—"}</div>
                <div className="text-[9px] text-[#2CAC7F] font-bold">Normal</div>
              </div>
              <div className="p-2 rounded-xl bg-[#F0F8FA] border border-[#DCEAEC]">
                <div className="text-[10px] text-[#829AA3] font-bold">Temperature</div>
                <div className="text-sm font-black text-[#076584]">{d.vitals.temperature || "—"}</div>
                <div className="text-[9px] text-[#2CAC7F] font-bold">Normal</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Medical Timeline */}
        <div className="mt-5 rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
          <div className="bg-[#123F55] text-white p-3 font-black text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>⏱️</span> Medical Timeline
            </span>
            <span className="text-[10px] font-normal text-white/80">A quick view of your major health events</span>
          </div>

          <div className="p-4 space-y-3">
            {d.medicalTimeline.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-[#F0F8FA] pb-2 text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#829AA3] w-16">{item.date}</span>
                  <span className="w-2 h-2 rounded-full bg-[#2CAC7F]" />
                  <div>
                    <div className="font-black text-[#123F55]">{item.title}</div>
                    <div className="text-[10px] text-[#537783]">{item.facility}</div>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#CBEFE0] text-[#076584] font-bold text-[10px]">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Page 1 Footer */}
      <div className="pt-4 border-t border-[#DCEAEC] flex items-center justify-between text-[10px] text-[#829AA3] font-bold">
        <span>Healthysis Sovereign Health Stack</span>
        <span>Page 1 of 2</span>
      </div>
    </div>
  );
}

function renderResumePage2(d: HealthResumeData) {
  return (
    <div className="p-8 bg-white text-[#123F55] font-sans text-xs leading-relaxed flex flex-col justify-between" style={{ minHeight: "1131px" }}>
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[#DCEAEC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#076584] to-[#0EA6B7] text-white flex items-center justify-center font-black text-lg">
              ♥
            </div>
            <div>
              <div className="text-2xl font-black text-[#076584] tracking-tight">Healthysis</div>
              <div className="text-[10px] font-semibold text-[#537783]">Your Health Journey, Simplified</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-black text-[#076584] tracking-wider">HEALTH RESUME</div>
            <div className="text-[10px] text-[#537783] font-medium">Personal • Organized • Always With You</div>
          </div>
        </div>

        {/* Section 1: Diagnoses & Medical History */}
        <div className="mt-5 rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
          <div className="bg-[#123F55] text-white p-3 font-black text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>🩺</span> Diagnoses &amp; Medical History
            </span>
            <span className="text-[10px] text-white/80 font-normal">List of major and ongoing conditions</span>
          </div>

          <table className="w-full text-left text-[11px]">
            <thead className="bg-[#F0F8FA] border-b border-[#DCEAEC] text-[#537783] font-bold">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Condition / Diagnosis</th>
                <th className="p-2.5">Details</th>
                <th className="p-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {d.diagnoses.map((diag) => (
                <tr key={diag.id} className="border-b border-[#F0F8FA]">
                  <td className="p-2.5 font-bold text-[#829AA3]">{diag.date}</td>
                  <td className="p-2.5 font-black text-[#123F55]">{diag.condition}</td>
                  <td className="p-2.5 text-[#537783]">{diag.details}</td>
                  <td className="p-2.5 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        diag.status === "Ongoing"
                          ? "bg-[#fef3c7] text-[#92400e]"
                          : "bg-[#CBEFE0] text-[#076584]"
                      }`}
                    >
                      {diag.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2: Current Medications & Allergies (2 Columns) */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Current Medications */}
          <div className="rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
            <div className="bg-[#076584] text-white p-2.5 font-black text-xs flex items-center gap-1.5">
              <span>💊</span> Current Medications
            </div>
            <table className="w-full text-left text-[10px]">
              <thead className="bg-[#F0F8FA] text-[#537783] font-bold border-b border-[#DCEAEC]">
                <tr>
                  <th className="p-2">Medicine</th>
                  <th className="p-2">Dose</th>
                  <th className="p-2">Frequency</th>
                  <th className="p-2">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {d.medications.map((m) => (
                  <tr key={m.id} className="border-b border-[#F0F8FA]">
                    <td className="p-2 font-black text-[#123F55]">{m.medicine}</td>
                    <td className="p-2">{m.dose}</td>
                    <td className="p-2">{m.frequency}</td>
                    <td className="p-2 text-[#537783]">{m.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Allergies & Sensitivities */}
          <div className="rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
            <div className="bg-[#076584] text-white p-2.5 font-black text-xs flex items-center gap-1.5">
              <span>⚠️</span> Allergies &amp; Sensitivities
            </div>
            <table className="w-full text-left text-[10px]">
              <thead className="bg-[#F0F8FA] text-[#537783] font-bold border-b border-[#DCEAEC]">
                <tr>
                  <th className="p-2">Allergen</th>
                  <th className="p-2">Reaction</th>
                </tr>
              </thead>
              <tbody>
                {d.allergiesList.map((a) => (
                  <tr key={a.id} className="border-b border-[#F0F8FA]">
                    <td className="p-2 font-black text-[#123F55]">{a.allergen}</td>
                    <td className="p-2 text-[#537783]">{a.reaction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Recent Test Reports & Immunizations (2 Columns) */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Recent Test Reports */}
          <div className="rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
            <div className="bg-[#123F55] text-white p-2.5 font-black text-xs flex items-center gap-1.5">
              <span>📋</span> Recent Test Reports
            </div>
            <table className="w-full text-left text-[10px]">
              <thead className="bg-[#F0F8FA] text-[#537783] font-bold border-b border-[#DCEAEC]">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Test Name</th>
                  <th className="p-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {d.testReports.map((t) => (
                  <tr key={t.id} className="border-b border-[#F0F8FA]">
                    <td className="p-2 text-[#829AA3]">{t.date}</td>
                    <td className="p-2 font-black text-[#123F55]">{t.testName}</td>
                    <td className="p-2">
                      <span className="px-1.5 py-0.5 rounded-full bg-[#CBEFE0] text-[#076584] font-bold text-[9px]">
                        {t.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Immunizations */}
          <div className="rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
            <div className="bg-[#123F55] text-white p-2.5 font-black text-xs flex items-center gap-1.5">
              <span>💉</span> Immunizations
            </div>
            <table className="w-full text-left text-[10px]">
              <thead className="bg-[#F0F8FA] text-[#537783] font-bold border-b border-[#DCEAEC]">
                <tr>
                  <th className="p-2">Vaccine</th>
                  <th className="p-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {d.immunizations.map((imm) => (
                  <tr key={imm.id} className="border-b border-[#F0F8FA]">
                    <td className="p-2 font-black text-[#123F55]">{imm.vaccine}</td>
                    <td className="p-2 text-[#829AA3]">{imm.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Lifestyle & Family History (Left) and Signature Block (Right) */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Left: Surgeries & Lifestyle */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
              <div className="bg-[#076584] text-white p-2 font-black text-xs flex items-center gap-1.5">
                <span>🏥</span> Past Surgeries / Procedures
              </div>
              <div className="p-2.5 text-[10px] text-[#537783] min-h-[32px]">
                {d.surgeries.length > 0
                  ? d.surgeries.map((s) => `${s.date}: ${s.procedure} (${s.details})`).join(" • ")
                  : ""}
              </div>
            </div>

            <div className="rounded-2xl border border-[#DCEAEC] overflow-hidden bg-white">
              <div className="bg-[#076584] text-white p-2 font-black text-xs flex items-center gap-1.5">
                <span>🧬</span> Lifestyle &amp; Family History
              </div>
              <div className="p-2.5 space-y-1 text-[10px]">
                <div><span className="font-bold text-[#123F55]">Smoking:</span> {d.lifestyle.smoking || ""}</div>
                <div><span className="font-bold text-[#123F55]">Alcohol:</span> {d.lifestyle.alcohol || ""}</div>
                <div><span className="font-bold text-[#123F55]">Exercise:</span> {d.lifestyle.exercise || ""}</div>
                <div><span className="font-bold text-[#123F55]">Family History:</span> {d.lifestyle.familyHistory || ""}</div>
              </div>
            </div>
          </div>

          {/* Right: Confirmation & Signature Box */}
          <div className="p-4 rounded-2xl border-2 border-dashed border-[#0EA6B7] bg-[#F0F8FA] flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#123F55] italic leading-snug">
                &ldquo;I confirm the following data is my personal health records and I shared it with the trustable person.&rdquo;
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#DCEAEC] space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-[#829AA3]">Patient Signature:</span>
                <span className="font-serif italic font-black text-sm text-[#076584] border-b border-[#076584] pb-0.5">
                  {d.confirmation.patientSignature || ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-[#829AA3]">Date:</span>
                <span className="font-bold text-[#123F55]">{d.confirmation.signatureDate || ""}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page 2 Footer */}
      <div className="pt-4 border-t border-[#DCEAEC] flex items-center justify-between text-[10px] text-[#829AA3] font-bold">
        <span>Healthysis Sovereign Health Stack</span>
        <span>Page 2 of 2</span>
      </div>
    </div>
  );
}
