import { GoogleGenerativeAI, type GenerateContentResult, type Part } from "@google/generative-ai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supportedFileTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxImageBytes = 8 * 1024 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const models = ["gemini-3.5-flash", "gemini-3.5-pro", "gemini-3.0-flash"] as const;
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

async function generateWithFallback(
  apiKey: string,
  promptOrParts: string | Array<string | Part>
): Promise<GenerateContentResult> {
  const client = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;
  for (const modelName of models) {
    try {
      return await client.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      }).generateContent(promptOrParts);
    } catch (error: unknown) {
      if (!isMissingModel(error)) throw error;
      lastError = error;
      console.warn(`Vault ingestion model ${modelName} not available; trying fallback.`);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No supported Gemini model is available.");
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
  return {
    category: validCategory,
    title: typeof value.title === "string" && value.title.trim()
      ? value.title.trim().slice(0, 180)
      : "Uploaded health document",
    extracted_data: extracted,
    patient_summary: typeof value.patient_summary === "string" && value.patient_summary.trim()
      ? value.patient_summary.trim().slice(0, 4000)
      : "The document was reviewed. Confirm any important details with your healthcare professional.",
    clinical_alerts: alerts.map((alert) => alert.slice(0, 500))
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

  const instructions = [
    "Analyze this patient-uploaded image or PDF. Classify it as exactly one of lab_report, prescription, diet_meal, physical_symptom, other.",
    "Return only valid JSON with keys category, title, extracted_data, patient_summary, clinical_alerts.",
    `For lab_report or prescription, extracted_data must include these exact keys: ${reportMetricKeys.join(", ")}, medications (array of {name, dosage, frequency}), status_flags (array of {biomarker, value, status}, where status is exactly NORMAL, HIGH, LOW, or CRITICAL), and biomarkers (array of {name, value, unit, reference_range, status}). Use a number or null for each metric key. Preserve the document's exact numeric readings and units in biomarkers; do not infer missing values. For prescriptions, extract each medication name, dosage, and frequency.`,
    "Set title to a concise descriptive name. For diet_meal, include food_name, numeric calories and macros with numeric protein, carbs and fats. For physical_symptom, include symptoms as an array with name, severity and onset_duration, plus any measured value and unit. For other, retain useful extracted fields. For uncertain or unreadable values, state that explicitly; do not invent values.",
    "Use clinical_alerts for critical/out-of-range findings, scan misprints/cut-offs, or potentially high-glycemic meal alerts. Keep patient_summary clear and non-technical. Never diagnose or recommend changing a medication.",
    message ? `User context: ${message}` : ""
  ].filter(Boolean).join("\n");

  try {
    const result = await generateWithFallback(apiKey, [
      { inlineData: { data: Buffer.from(imageBytes).toString("base64"), mimeType: file.type } },
      instructions
    ]);
    let rawAnalysis: unknown;
    try {
      rawAnalysis = JSON.parse(result.response.text());
    } catch {
      return Response.json({ success: false, error: "The document analysis returned unreadable data." }, { status: 502 });
    }
    const analysis = normalizeAnalysis(rawAnalysis);
    const storageFolder = folders[analysis.category];
    const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
    const safeUserId = userId.replace(/[^A-Za-z0-9_-]/g, "_");
    const storagePath = `${storageFolder}/${safeUserId}-${Date.now()}.${extension}`;
    const createdAt = new Date().toISOString();
    const fileBuffer = Buffer.from(imageBytes);
    let fileUrl = `data:${file.type};base64,${fileBuffer.toString("base64")}`;
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
      storage_path: null as string | null,
      created_at: createdAt
    };

    if (supabase) {
      try {
        const { error: uploadError } = await supabase.storage
          .from("healthysis_vault")
          .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false });
        if (uploadError) {
          console.warn("Vault file upload failed; returning a local data URL.", uploadError.message);
        } else {
          const { data: publicUrl } = supabase.storage.from("healthysis_vault").getPublicUrl(storagePath);
          const { data: signedUrl, error: urlError } = await supabase.storage
            .from("healthysis_vault")
            .createSignedUrl(storagePath, 7 * 24 * 60 * 60);
          if (urlError) {
            console.warn("Could not create a vault signed URL; returning a local data URL.", urlError.message);
          } else {
            fileUrl = signedUrl.signedUrl || publicUrl.publicUrl;
            record.file_url = fileUrl;
            record.document_url = fileUrl;
            record.storage_path = storagePath;
          }
        }
      } catch (error: unknown) {
        console.warn("Vault file upload failed; returning a local data URL.", errorText(error));
      }

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
      file_url: record.file_url
    });
  } catch (error: unknown) {
    console.error("Vault document analysis failed.", errorText(error));
    return Response.json({ success: false, error: errorText(error) }, { status: 502 });
  }
}
