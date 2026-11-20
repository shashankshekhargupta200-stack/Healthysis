import crypto from "crypto";
import { GoogleGenerativeAI, type GenerateContentResult, type Part } from "@google/generative-ai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cleanDetectedPatientName, verifyPatientName } from "@/lib/patientNameVerification";
import { findDuplicateRecord } from "@/lib/vaultDuplicateCheck";

const supportedFileTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxImageBytes = 8 * 1024 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const models = ["gemini-3.5-flash"] as const;
const folders = {
  lab_report: "lab-reports",
  prescription: "prescriptions",
  diet_meal: "diet-meals",
  physical_symptom: "symptoms",
  other: "misc"
} as const;

type VaultCategory = keyof typeof folders;
type VaultAnalysis = {
  category: VaultCategory;
  title: string;
  extracted_data: Record<string, unknown>;
  patient_summary: string;
  clinical_alerts: string[];
  detected_patient_name: string | null;
};
const reportMetricKeys = [
  "systolic_bp",
  "diastolic_bp",
  "blood_glucose",
  "heart_rate",
  "hba1c",
  "total_cholesterol",
  "ldl",
  "hdl",
  "triglycerides",
  "vitamin_d",
  "vitamin_b12",
  "tsh",
  "hemoglobin"
] as const;

const metricAliases: Record<(typeof reportMetricKeys)[number], string[]> = {
  systolic_bp: ["systolic bp", "systolic blood pressure", "sbp"],
  diastolic_bp: ["diastolic bp", "diastolic blood pressure", "dbp"],
  blood_glucose: ["blood glucose", "glucose", "fasting glucose", "random glucose"],
  heart_rate: ["heart rate", "pulse"],
  hba1c: ["hba1c", "hemoglobin a1c", "glycated hemoglobin"],
  total_cholesterol: ["total cholesterol", "cholesterol"],
  ldl: ["ldl", "ldl cholesterol"],
  hdl: ["hdl", "hdl cholesterol"],
  triglycerides: ["triglycerides", "triglyceride"],
  vitamin_d: ["vitamin d", "25-oh vitamin d", "25 hydroxy vitamin d"],
  vitamin_b12: ["vitamin b12", "b12", "cobalamin"],
  tsh: ["tsh", "thyroid stimulating hormone"],
  hemoglobin: ["hemoglobin", "haemoglobin", "hb"]
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown service error";
}

function isMissingModel(error: unknown): boolean {
  const message = errorText(error).toLowerCase();
  return (isRecord(error) && error.status === 404)
    || (message.includes("model") && (message.includes("not found") || message.includes("does not exist")));
}

function isRetryableGeminiError(error: unknown): boolean {
  if (isRecord(error)) {
    if (error.status === 429 || error.status === 503 || error.status === 504 || error.status === 408) return true;
  }
  const msg = errorText(error).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("408") ||
    msg.includes("quota") ||
    msg.includes("resource exhausted") ||
    msg.includes("overloaded") ||
    msg.includes("rate limit") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("temporarily unavailable")
  );
}

async function generateWithFallback(
  apiKey: string,
  promptOrParts: string | Array<string | Part>,
  signal?: AbortSignal
): Promise<GenerateContentResult> {
  const client = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;
  for (const modelName of models) {
    if (signal?.aborted) throw new Error("Document analysis was cancelled.");
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          // Disable thinking tokens so gemini-3.5-flash responds in seconds without reasoning latency
          ...({ thinkingConfig: { thinkingBudget: 0 } } as Record<string, unknown>)
        } as Record<string, unknown>
      });
      return await model.generateContent(promptOrParts, { signal });
    } catch (error: unknown) {
      if (signal?.aborted) throw error;
      if (!isMissingModel(error)) throw error;
      lastError = error;
      console.warn(`Vault ingestion model ${modelName} not available; trying fallback.`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No supported Gemini model is available.");
}

async function runGeminiExtraction(
  apiKey: string,
  imageBytes: Uint8Array,
  mimeType: string,
  instructions: string,
  signal?: AbortSignal
): Promise<VaultAnalysis> {
  const executeExtraction = async (): Promise<VaultAnalysis> => {
    if (signal?.aborted) throw new Error("Document analysis was cancelled.");
    const result = await generateWithFallback(
      apiKey,
      [
        { inlineData: { data: Buffer.from(imageBytes).toString("base64"), mimeType } },
        instructions
      ],
      signal
    );
    let rawAnalysis: unknown;
    try {
      rawAnalysis = JSON.parse(result.response.text());
    } catch {
      throw new Error("The document analysis returned unreadable data.");
    }
    return normalizeAnalysis(rawAnalysis);
  };

  try {
    return await executeExtraction();
  } catch (firstError: unknown) {
    if (signal?.aborted) throw firstError;
    if (isRetryableGeminiError(firstError)) {
      console.warn("First Gemini extraction attempt encountered retryable error; executing single fast retry.", errorText(firstError));
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (signal?.aborted) throw new Error("Document analysis was cancelled.");
      return await executeExtraction();
    }
    throw firstError;
  }
}

function normalizeAnalysis(value: unknown): VaultAnalysis {
  if (!isRecord(value)) throw new Error("Gemini returned an invalid document analysis.");
  const validCategory = typeof value.category === "string"
    && Object.prototype.hasOwnProperty.call(folders, value.category)
    ? value.category as VaultCategory
    : "other";
  const extracted = isRecord(value.extracted_data) ? { ...value.extracted_data } : {};
  if (validCategory === "lab_report" || validCategory === "prescription") {
    const biomarkers = Array.isArray(extracted.biomarkers)
      ? extracted.biomarkers.filter(isRecord)
      : [];
    for (const key of reportMetricKeys) {
      if (extracted[key] !== undefined && extracted[key] !== null) continue;
      const match = biomarkers.find((marker) => {
        const name = typeof marker.name === "string" ? marker.name.toLowerCase().trim() : "";
        return metricAliases[key].some((alias) => name === alias || name.includes(alias));
      });
      if (match?.value !== undefined) extracted[key] = match.value;
    }
    extracted.medications = Array.isArray(extracted.medications)
      ? extracted.medications.filter(isRecord).map((medication) => ({
        name: typeof medication.name === "string" ? medication.name : "",
        dosage: typeof medication.dosage === "string"
          ? medication.dosage
          : typeof medication.dose === "string" ? medication.dose : "",
        frequency: typeof medication.frequency === "string" ? medication.frequency : ""
      }))
      : [];
    extracted.status_flags = Array.isArray(extracted.status_flags)
      ? extracted.status_flags.filter(isRecord).map((flag) => ({
        biomarker: typeof flag.biomarker === "string" ? flag.biomarker : "Unknown",
        value: typeof flag.value === "number" || typeof flag.value === "string" ? flag.value : null,
        status: typeof flag.status === "string" && ["NORMAL", "HIGH", "LOW", "CRITICAL"].includes(flag.status.toUpperCase())
          ? flag.status.toUpperCase()
          : "NORMAL"
      }))
      : [];
  }
  const alerts = Array.isArray(value.clinical_alerts)
    ? value.clinical_alerts.filter((entry): entry is string => typeof entry === "string").slice(0, 30)
    : [];
  let detectedPatientName: string | null = null;
  if (typeof value.detected_patient_name === "string") {
    detectedPatientName = cleanDetectedPatientName(value.detected_patient_name);
  } else if (isRecord(value.extracted_data) && typeof value.extracted_data.patient_name === "string") {
    detectedPatientName = cleanDetectedPatientName(value.extracted_data.patient_name);
  }
  if (detectedPatientName && !extracted.patient_name) {
    extracted.patient_name = detectedPatientName;
  }
  return {
    category: validCategory,
    title: typeof value.title === "string" && value.title.trim()
      ? value.title.trim().slice(0, 180)
      : "Uploaded health document",
    extracted_data: extracted,
    patient_summary: typeof value.patient_summary === "string" && value.patient_summary.trim()
      ? value.patient_summary.trim().slice(0, 4000)
      : "The document was reviewed. Confirm any important details with your healthcare professional.",
    clinical_alerts: alerts.map((alert) => alert.slice(0, 500)),
    detected_patient_name: detectedPatientName
  };
}

function numericValue(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number.parseFloat(value.replace(/,/g, ""))
      : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function metricNumber(value: unknown): number | null {
  return numericValue(value);
}

function mealMacros(data: Record<string, unknown>): { calories: number; protein: number; carbs: number; fats: number } | null {
  const nested = isRecord(data.macros) ? data.macros : data;
  const calories = numericValue(data.calories);
  const protein = numericValue(nested.protein);
  const carbs = numericValue(nested.carbs);
  const fats = numericValue(nested.fats);
  if (calories === null || protein === null || carbs === null) return null;
  return { calories, protein, carbs, fats: fats ?? 0 };
}

function createSupabase(url: string, key: string, token?: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {})
  });
}

export async function POST(request: Request) {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!apiKey) return Response.json({ success: false, error: "Document analysis is not configured." }, { status: 500 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ success: false, error: "Submit a valid multipart document request." }, { status: 400 });
  }

  const fileValue = formData.get("file");
  const userIdValue = formData.get("userId");
  const file = fileValue instanceof File ? fileValue : null;
  const userId = typeof userIdValue === "string" ? userIdValue.trim() : "";
  const message = typeof formData.get("message") === "string" ? String(formData.get("message")).trim().slice(0, 2000) : "";
  const expectedPatientName = typeof formData.get("expectedPatientName") === "string"
    ? String(formData.get("expectedPatientName")).trim()
    : "";
  const checkPatientName = formData.get("checkPatientName") === "true";
  const confirmed = formData.get("confirmed") === "true";
  const allowDuplicate = formData.get("allowDuplicate") === "true";
  const guestVaultRaw = typeof formData.get("guestVault") === "string"
    ? String(formData.get("guestVault")).trim()
    : "";
  const cachedAnalysisRaw = typeof formData.get("cachedAnalysis") === "string"
    ? String(formData.get("cachedAnalysis"))
    : "";
  if (!file || file.size === 0) return Response.json({ success: false, error: "Attach an image to ingest." }, { status: 400 });
  if (!userId || userId.length > 200) return Response.json({ success: false, error: "A valid user ID is required." }, { status: 400 });
  if (!supportedFileTypes.has(file.type) || file.size > maxImageBytes) {
    return Response.json({ success: false, error: "Attach a JPEG, PNG, WebP image, or PDF smaller than 8 MB." }, { status: 415 });
  }

  const isGuest = /guest/i.test(userId) || !uuidPattern.test(userId);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!isGuest && !token) return Response.json({ success: false, error: "Sign in to save documents to your vault." }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabase: SupabaseClient | null = null;
  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createSupabase(supabaseUrl, supabaseKey, token);
      if (!isGuest && token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error || data.user?.id !== userId) {
          return Response.json({ success: false, error: "The session does not match this user." }, { status: 401 });
        }
      }
    } catch (error: unknown) {
      console.warn("Could not initialize vault persistence.", errorText(error));
      supabase = null;
    }
  }

  let imageBytes: Uint8Array;
  try {
    imageBytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return Response.json({ success: false, error: "Could not read the uploaded document." }, { status: 400 });
  }

  const fileHash = crypto.createHash("sha256").update(imageBytes).digest("hex");

  // Fetch existing records for duplicate check (ordered newest first)
  let existingRecords: Array<{
    id: string;
    title: string;
    created_at: string;
    storage_folder?: string;
    extracted_data?: Record<string, unknown>;
  }> = [];

  if (supabase && !isGuest) {
    try {
      const { data: dbRows, error: dbRowsError } = await supabase
        .from("patient_memory_vault")
        .select("id, title, storage_folder, created_at, extracted_data")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!dbRowsError && dbRows) {
        existingRecords = dbRows;
      }
    } catch (err: unknown) {
      console.warn("Could not query existing vault records for duplicate check.", errorText(err));
    }
  } else if (isGuest && guestVaultRaw) {
    try {
      const parsed: unknown = JSON.parse(guestVaultRaw);
      if (Array.isArray(parsed)) {
        existingRecords = parsed.filter(isRecord) as typeof existingRecords;
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // Pre-save fast check: SHA-256 digital fingerprint duplicate check
  if (!allowDuplicate) {
    const hashMatch = findDuplicateRecord({ fileHash, title: "" }, existingRecords);
    if (hashMatch) {
      return Response.json({
        success: true,
        isDuplicate: true,
        duplicateReason: "hash",
        existingRecord: hashMatch.existingRecord,
        duplicateDetails: hashMatch.details,
        fileHash
      });
    }
  }

  const instructions = [
    "Analyze this patient-uploaded image or PDF. Classify it as exactly one of lab_report, prescription, diet_meal, physical_symptom, other.",
    "Return only valid JSON with keys category, title, extracted_data, patient_summary, clinical_alerts, detected_patient_name.",
    "For detected_patient_name, extract the patient's full name as written or printed on the document (e.g. 'John Doe', 'Mr. Amit Sharma'). If no patient name is printed or clearly readable, or if the name field is blank, obscured, or absent, return null.",
    `For lab_report or prescription, extracted_data must include these exact keys: ${reportMetricKeys.join(", ")}, medications (array of {name, dosage, frequency}), status_flags (array of {biomarker, value, status}, where status is exactly NORMAL, HIGH, LOW, or CRITICAL), and biomarkers (array of {name, value, unit, reference_range, status}). Use a number or null for each metric key. Preserve the document's exact numeric readings and units in biomarkers; do not infer missing values. For prescriptions, extract each medication name, dosage, and frequency.`,
    "Set title to a concise descriptive name. For diet_meal, include food_name, numeric calories and macros with numeric protein, carbs and fats. For physical_symptom, include symptoms as an array with name, severity and onset_duration, plus any measured value and unit. For other, retain useful extracted fields. For uncertain or unreadable values, state that explicitly; do not invent values.",
    "Use clinical_alerts for critical/out-of-range findings, scan misprints/cut-offs, or potentially high-glycemic meal alerts. Keep patient_summary clear and non-technical. Never diagnose or recommend changing a medication.",
    message ? `User context: ${message}` : ""
  ].filter(Boolean).join("\n");

  try {
    const clientStorageFolder = typeof formData.get("storageFolder") === "string"
      ? String(formData.get("storageFolder")).trim()
      : "";
    const initialFolder = clientStorageFolder
      || (checkPatientName || expectedPatientName ? "lab-reports" : message.toLowerCase().includes("meal") ? "diet-meals" : "misc");
    const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
    const safeUserId = userId.replace(/[^A-Za-z0-9_-]/g, "_");
    const storagePath = `${initialFolder}/${safeUserId}-${Date.now()}.${extension}`;
    const fileBuffer = Buffer.from(imageBytes);

    // Run Supabase Storage upload and Gemini Vision extraction in parallel with Promise.all
    const storagePromise = (async (): Promise<{ fileUrl: string; storagePath: string } | null> => {
      if (!supabase) return null;
      try {
        const { error: uploadError } = await supabase.storage
          .from("healthysis_vault")
          .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false });
        if (uploadError) {
          console.warn("Vault file upload failed; falling back to local data URL.", uploadError.message);
          return null;
        }
        const { data: publicUrl } = supabase.storage.from("healthysis_vault").getPublicUrl(storagePath);
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from("healthysis_vault")
          .createSignedUrl(storagePath, 7 * 24 * 60 * 60);
        const finalUrl = (!urlError && signedUrl?.signedUrl) ? signedUrl.signedUrl : publicUrl.publicUrl;
        return { fileUrl: finalUrl, storagePath };
      } catch (err: unknown) {
        console.warn("Vault storage upload failed; falling back to local data URL.", errorText(err));
        return null;
      }
    })();

    const extractionPromise = (async (): Promise<VaultAnalysis> => {
      if (confirmed && cachedAnalysisRaw) {
        try {
          const parsed: unknown = JSON.parse(cachedAnalysisRaw);
          return normalizeAnalysis(parsed);
        } catch {
          // fallback to live extraction if cached data is unreadable
        }
      }
      return await runGeminiExtraction(apiKey, imageBytes, file.type, instructions, request.signal);
    })();

    const [storageResult, analysis] = await Promise.all([storagePromise, extractionPromise]);

    // Store digital file hash in extracted_data
    analysis.extracted_data.file_hash = fileHash;

    // Check for metadata/OCR duplicate (same test title + report date for same user)
    if (!allowDuplicate) {
      const metaMatch = findDuplicateRecord(
        {
          fileHash,
          title: analysis.title,
          extractedData: analysis.extracted_data
        },
        existingRecords
      );
      if (metaMatch) {
        if (storageResult?.storagePath && supabase) {
          void supabase.storage.from("healthysis_vault").remove([storageResult.storagePath]).catch(() => {});
        }
        return Response.json({
          success: true,
          isDuplicate: true,
          duplicateReason: "metadata",
          existingRecord: metaMatch.existingRecord,
          duplicateDetails: metaMatch.details,
          analysis,
          fileHash,
          detectedPatientName: analysis.detected_patient_name
        });
      }
    }

    // Pre-save verification check for lab report uploads
    const shouldVerify = !confirmed && (checkPatientName || (Boolean(expectedPatientName) && analysis.category === "lab_report"));
    if (shouldVerify) {
      const verification = verifyPatientName(analysis.detected_patient_name, expectedPatientName);
      if (verification.status !== "match") {
        // If file was uploaded during parallel execution, clean it up so nothing remains in Supabase storage
        if (storageResult?.storagePath && supabase) {
          void supabase.storage.from("healthysis_vault").remove([storageResult.storagePath]).catch(() => {});
        }
        return Response.json({
          success: true,
          requiresConfirmation: true,
          verificationStatus: verification.status,
          detectedPatientName: verification.detectedPatientName,
          expectedPatientName: verification.expectedPatientName,
          category: analysis.category,
          analysis,
          fileHash
        });
      }
    }

    const storageFolder = folders[analysis.category];
    const createdAt = new Date().toISOString();
    let fileUrl = `data:${file.type};base64,${fileBuffer.toString("base64")}`;
    let finalStoragePath: string | null = null;
    if (storageResult) {
      fileUrl = storageResult.fileUrl;
      finalStoragePath = storageResult.storagePath;
    }

    const record = {
      id: crypto.randomUUID(),
      user_id: userId,
      category: analysis.category,
      storage_folder: storageFolder,
      title: analysis.title,
      extracted_data: analysis.extracted_data,
      patient_summary: analysis.patient_summary,
      clinical_alerts: analysis.clinical_alerts,
      file_url: fileUrl,
      document_url: fileUrl,
      storage_path: finalStoragePath,
      created_at: createdAt
    };

    if (supabase) {
      try {
        const fileUrlForClient = fileUrl;
        const storedFileUrl = fileUrl.startsWith("data:") ? null : fileUrl;
        const { data, error } = await supabase
          .from("patient_memory_vault")
          .insert({
            user_id: userId,
            category: analysis.category,
            storage_folder: storageFolder,
            title: analysis.title,
            extracted_data: analysis.extracted_data,
            patient_summary: analysis.patient_summary,
            clinical_alerts: analysis.clinical_alerts,
            document_url: storedFileUrl,
            file_url: storedFileUrl,
            storage_path: record.storage_path
          })
          .select("id, user_id, category, storage_folder, title, extracted_data, patient_summary, clinical_alerts, document_url, file_url, storage_path, created_at")
          .single();
        if (error) console.warn("Vault record was not persisted.", error.message);
        else {
          Object.assign(record, data);
          if (fileUrlForClient.startsWith("data:")) {
            record.file_url = fileUrlForClient;
            record.document_url = fileUrlForClient;
          }
        }
      } catch (error: unknown) {
        console.warn("Vault record was not persisted.", errorText(error));
      }

      if (!isGuest && analysis.category === "lab_report") {
        const biomarkers = Array.isArray(analysis.extracted_data.biomarkers)
          ? analysis.extracted_data.biomarkers
          : [];
        const misprintFlags = analysis.clinical_alerts.filter((alert) =>
          /misprint|cut.?off|illegible|scan|ocr|conflict/i.test(alert)
        );
        try {
          const { error } = await supabase.from("clinical_documents").insert({
            patient_id: userId,
            document_url: record.file_url,
            document_type: "lab_report",
            extracted_biomarkers: biomarkers,
            detected_anomalies: analysis.clinical_alerts.filter((alert) => !misprintFlags.includes(alert)),
            misprint_flags: misprintFlags,
            plain_language_summary: analysis.patient_summary
          });
          if (error) console.warn("Clinical document cross-sync was not persisted.", error.message);
        } catch (error: unknown) {
          console.warn("Clinical document cross-sync was not persisted.", errorText(error));
        }
      }

      if (!isGuest && (analysis.category === "lab_report" || analysis.category === "prescription")) {
          const profileMetrics: Record<string, number | string> = {};
          const profileColumns: Partial<Record<(typeof reportMetricKeys)[number], string>> = {
            blood_glucose: "blood_glucose_latest",
            heart_rate: "heart_rate_latest",
            hba1c: "hba1c_latest",
            total_cholesterol: "cholesterol_latest",
            ldl: "ldl_latest",
            hdl: "hdl_latest",
            triglycerides: "triglycerides_latest",
            vitamin_d: "vitamin_d_latest",
            vitamin_b12: "vitamin_b12_latest",
            tsh: "thyroid_tsh_latest",
            hemoglobin: "hemoglobin_latest"
          };
          for (const key of reportMetricKeys) {
            const value = metricNumber(analysis.extracted_data[key]);
            const column = profileColumns[key];
            if (value !== null && column) profileMetrics[column] = value;
          }
          const systolic = metricNumber(analysis.extracted_data.systolic_bp);
          const diastolic = metricNumber(analysis.extracted_data.diastolic_bp);
          if (systolic !== null && diastolic !== null) {
            profileMetrics.blood_pressure_latest = `${systolic}/${diastolic}`;
          }
        if (Object.keys(profileMetrics).length > 0) {
          try {
            const { error } = await supabase.from("profiles")
              .update(profileMetrics)
              .eq("id", userId);
            if (error) console.warn("Profile auto-fill was not persisted.", error.message);
          } catch (error: unknown) {
            console.warn("Profile auto-fill was not persisted.", errorText(error));
          }
        }

        if (analysis.category === "lab_report") {
          try {
            const { error } = await supabase.from("medical_history").insert({
              user_id: userId,
              type: "diagnosis",
              date: createdAt.slice(0, 10),
              details: {
                condition: analysis.title,
                details: analysis.patient_summary,
                status: "Normal",
                report_summary: true,
                extracted_metrics: analysis.extracted_data,
                status_flags: analysis.extracted_data.status_flags ?? []
              }
            });
            if (error) console.warn("Report summary was not persisted to medical history.", error.message);
          } catch (error: unknown) {
            console.warn("Report summary was not persisted to medical history.", errorText(error));
          }
        } else {
          const medications = Array.isArray(analysis.extracted_data.medications)
            ? analysis.extracted_data.medications.filter(isRecord)
            : [];
          const medicationRows = (medications.length > 0 ? medications : [{}]).map((medication) => ({
            user_id: userId,
            type: "medication" as const,
            date: createdAt.slice(0, 10),
            details: {
              medicine: typeof medication.name === "string" && medication.name ? medication.name : analysis.title,
              dose: typeof medication.dosage === "string" ? medication.dosage : "",
              frequency: typeof medication.frequency === "string" ? medication.frequency : "",
              purpose: analysis.patient_summary,
              extracted_metrics: analysis.extracted_data,
              report_summary: analysis.patient_summary
            }
          }));
          try {
            const { error } = await supabase.from("medical_history").insert(medicationRows);
            if (error) console.warn("Prescription summary was not persisted to medical history.", error.message);
          } catch (error: unknown) {
            console.warn("Prescription summary was not persisted to medical history.", errorText(error));
          }
        }
      }

      if (analysis.category === "diet_meal") {
        const nutrition = mealMacros(analysis.extracted_data);
        if (nutrition) {
          try {
            const { error } = await supabase.from("meal_logs").insert({
              user_id: userId,
              food_name: analysis.title,
              calories: nutrition.calories,
              macros: { protein: nutrition.protein, carbs: nutrition.carbs, fats: nutrition.fats },
              image_url: record.file_url
            });
            if (error) console.warn("Meal cross-sync was not persisted.", error.message);
          } catch (error: unknown) {
            console.warn("Meal cross-sync was not persisted.", errorText(error));
          }
        }
      }
      if (analysis.category === "physical_symptom") {
        try {
          const { error } = await supabase.from("daily_symptom_logs").insert({
            patient_id: userId,
            symptoms: { title: analysis.title, data: analysis.extracted_data, raw_note: message || null },
            logged_at: createdAt
          });
          if (error) console.warn("Symptom cross-sync was not persisted.", error.message);
        } catch (error: unknown) {
          console.warn("Symptom cross-sync was not persisted.", errorText(error));
        }
      }
    }

    return Response.json({
      success: true,
      vaultRecord: record,
      category: analysis.category,
      storageFolder,
      patientSummary: analysis.patient_summary,
      alerts: analysis.clinical_alerts,
      extracted_data: analysis.extracted_data,
      status_flags: analysis.extracted_data.status_flags ?? [],
      file_url: record.file_url,
      detectedPatientName: analysis.detected_patient_name,
      fileHash
    });
  } catch (error: unknown) {
    const message = errorText(error);
    const isCancelled = message.toLowerCase().includes("aborted") || message.toLowerCase().includes("cancelled");
    console.error("Vault document analysis failed.", message);
    return Response.json({
      success: false,
      error: isCancelled ? "Document analysis was cancelled." : message
    }, { status: isCancelled ? 499 : 500 });
  }
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ success: false, error: "Request body must be an object." }, { status: 400 });
  }

  const recordId = typeof body.recordId === "string" ? body.recordId.trim() : "";
  const storagePath = typeof body.storagePath === "string" ? body.storagePath.trim() : null;
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (!recordId) {
    return Response.json({ success: false, error: "A valid recordId is required." }, { status: 400 });
  }
  if (!userId) {
    return Response.json({ success: false, error: "A valid userId is required." }, { status: 400 });
  }

  const isGuest = /guest/i.test(userId) || !uuidPattern.test(userId);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  // Guest users only store data in local browser storage; acknowledge success
  if (isGuest) {
    return Response.json({ success: true, recordId, isGuest: true });
  }

  if (!token) {
    return Response.json({ success: false, error: "Authentication required to delete records." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return Response.json({ success: false, error: "Vault persistence is not configured." }, { status: 500 });
  }

  try {
    const supabase = createSupabase(supabaseUrl, supabaseKey, token);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || authData.user?.id !== userId) {
      return Response.json({ success: false, error: "The session does not match this user." }, { status: 401 });
    }

    // 1. Determine storage path to delete from Supabase Storage
    let targetStoragePath = storagePath;
    if (!targetStoragePath) {
      const { data: existingRow } = await supabase
        .from("patient_memory_vault")
        .select("storage_path")
        .eq("id", recordId)
        .eq("user_id", userId)
        .single();
      if (existingRow?.storage_path) {
        targetStoragePath = existingRow.storage_path;
      }
    }

    if (targetStoragePath) {
      const { error: storageRemoveError } = await supabase.storage
        .from("healthysis_vault")
        .remove([targetStoragePath]);
      if (storageRemoveError) {
        console.warn("Could not remove vault file from storage:", storageRemoveError.message);
      }
    }

    // 2. Delete the record from patient_memory_vault scoped to the active user
    const { error: dbDeleteError } = await supabase
      .from("patient_memory_vault")
      .delete()
      .eq("id", recordId)
      .eq("user_id", userId);

    if (dbDeleteError) {
      return Response.json({ success: false, error: dbDeleteError.message }, { status: 500 });
    }

    return Response.json({ success: true, recordId });
  } catch (err: unknown) {
    console.error("Failed to delete vault record:", err);
    return Response.json({ success: false, error: errorText(err) }, { status: 500 });
  }
}
