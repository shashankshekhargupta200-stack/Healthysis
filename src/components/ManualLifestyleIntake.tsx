"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase";
import { isNetworkError, readUserLocalData, writeUserLocalData } from "@/lib/localUserData";
import { reportExtractedEventName, toMetricInput, type ReportExtractedDetail } from "@/lib/reportExtraction";

type IntakeValues = {
  fullName: string;
  dob: string;
  systolic: string;
  diastolic: string;
  glucose: string;
  heartRate: string;
  hba1c: string;
  cholesterol: string;
  vitaminD: string;
  tsh: string;
  smoking: "never" | "occasional" | "regular";
  alcohol: "none" | "social" | "moderate" | "heavy";
  fastFood: "rare" | "1-2_times_week" | "frequent";
};

const EMPTY_VALUES: IntakeValues = {
  fullName: "",
  dob: "",
  systolic: "",
  diastolic: "",
  glucose: "",
  heartRate: "",
  hba1c: "",
  cholesterol: "",
  vitaminD: "",
  tsh: "",
  smoking: "never",
  alcohol: "none",
  fastFood: "rare"
};

function isIntakeValues(value: unknown): value is IntakeValues {
  return typeof value === "object" && value !== null && "fullName" in value;
}

function isClinicalReport(value: unknown): value is { category: string; extracted_data: Record<string, unknown> } {
  return typeof value === "object" && value !== null
    && "category" in value && (value.category === "lab_report" || value.category === "prescription")
    && "extracted_data" in value && typeof value.extracted_data === "object" && value.extracted_data !== null;
}

export function ManualLifestyleIntake() {
  const { user, session } = useAuth();
  const userId = user?.id ?? "";
  const [values, setValues] = useState<IntakeValues>(EMPTY_VALUES);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!userId) return;
      const local = readUserLocalData<unknown>(userId, "clinical_intake", null);
      if (user?.isGuest) {
        const reports = readUserLocalData<unknown[]>(userId, "patient_memory_vault", []);
        const latestReport = reports.find(isClinicalReport);
        const extracted = latestReport?.extracted_data;
        const reportValues: Partial<IntakeValues> = extracted ? {
          ...(toMetricInput(extracted.systolic_bp) ? { systolic: toMetricInput(extracted.systolic_bp) } : {}),
          ...(toMetricInput(extracted.diastolic_bp) ? { diastolic: toMetricInput(extracted.diastolic_bp) } : {}),
          ...(toMetricInput(extracted.blood_glucose) ? { glucose: toMetricInput(extracted.blood_glucose) } : {}),
          ...(toMetricInput(extracted.heart_rate) ? { heartRate: toMetricInput(extracted.heart_rate) } : {}),
          ...(toMetricInput(extracted.hba1c) ? { hba1c: toMetricInput(extracted.hba1c) } : {}),
          ...(toMetricInput(extracted.total_cholesterol) ? { cholesterol: toMetricInput(extracted.total_cholesterol) } : {}),
          ...(toMetricInput(extracted.vitamin_d) ? { vitaminD: toMetricInput(extracted.vitamin_d) } : {}),
          ...(toMetricInput(extracted.tsh) ? { tsh: toMetricInput(extracted.tsh) } : {})
        } : {};
        if (active) {
          if (isIntakeValues(local) || Object.keys(reportValues).length > 0) {
            setValues({ ...EMPTY_VALUES, ...(isIntakeValues(local) ? local : {}), ...reportValues });
          }
          setAutoFilledFields(Object.keys(reportValues));
        }
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const authenticatedUserId = await requireAuthenticatedUser(supabase, session?.user.id);
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, dob, details, blood_pressure_latest, blood_glucose_latest, heart_rate_latest, hba1c_latest, cholesterol_latest, vitamin_d_latest, thyroid_tsh_latest")
          .eq("id", authenticatedUserId)
          .maybeSingle();
        if (profileError) throw profileError;
        const details = data?.details;
        const saved = typeof details === "object" && details !== null && "manual_intake" in details
          ? details.manual_intake
          : null;
        if (active) {
          setValues({
            ...EMPTY_VALUES,
            ...(isIntakeValues(saved) ? saved : isIntakeValues(local) ? local : {}),
            fullName: data?.full_name ?? (isIntakeValues(local) ? local.fullName : ""),
            dob: data?.dob ?? (isIntakeValues(local) ? local.dob : ""),
            systolic: toMetricInput(isIntakeValues(saved) ? saved.systolic : null) || data?.blood_pressure_latest?.split("/")[0] || "",
            diastolic: toMetricInput(isIntakeValues(saved) ? saved.diastolic : null) || data?.blood_pressure_latest?.split("/")[1] || "",
            glucose: toMetricInput(isIntakeValues(saved) ? saved.glucose : null) || toMetricInput(data?.blood_glucose_latest),
            heartRate: toMetricInput(isIntakeValues(saved) ? saved.heartRate : null) || toMetricInput(data?.heart_rate_latest),
            hba1c: toMetricInput(isIntakeValues(saved) ? saved.hba1c : null) || toMetricInput(data?.hba1c_latest),
            cholesterol: toMetricInput(isIntakeValues(saved) ? saved.cholesterol : null) || toMetricInput(data?.cholesterol_latest),
            vitaminD: toMetricInput(isIntakeValues(saved) ? saved.vitaminD : null) || toMetricInput(data?.vitamin_d_latest),
            tsh: toMetricInput(isIntakeValues(saved) ? saved.tsh : null) || toMetricInput(data?.thyroid_tsh_latest)
          });
          setAutoFilledFields([
            ...(data?.blood_pressure_latest ? ["systolic", "diastolic"] : []),
            ...(data?.blood_glucose_latest ? ["glucose"] : []),
            ...(data?.heart_rate_latest ? ["heartRate"] : []),
            ...(data?.hba1c_latest ? ["hba1c"] : []),
            ...(data?.cholesterol_latest ? ["cholesterol"] : []),
            ...(data?.vitamin_d_latest ? ["vitaminD"] : []),
            ...(data?.thyroid_tsh_latest ? ["tsh"] : [])
          ]);
        }
      } catch (loadError: unknown) {
        if (isNetworkError(loadError) && active && isIntakeValues(local)) {
          setValues({ ...EMPTY_VALUES, ...local });
        } else if (active) {
          setError(loadError instanceof Error ? loadError.message : "Could not load your saved health profile.");
        }
      }
    };
    void load();
    return () => { active = false; };
  }, [session?.user.id, user?.isGuest, userId]);

  useEffect(() => {
    const handleReportExtracted = (event: Event) => {
      const { detail } = event as CustomEvent<ReportExtractedDetail>;
      const extracted = detail?.extracted_data;
      if (!extracted) return;
      const updates: Record<string, string> = {};
      const fields: string[] = [];
      const map: Array<[Exclude<keyof IntakeValues, "fullName" | "dob" | "smoking" | "alcohol" | "fastFood">, string]> = [
        ["systolic", "systolic_bp"],
        ["diastolic", "diastolic_bp"],
        ["glucose", "blood_glucose"],
        ["heartRate", "heart_rate"],
        ["hba1c", "hba1c"],
        ["cholesterol", "total_cholesterol"],
        ["vitaminD", "vitamin_d"],
        ["tsh", "tsh"]
      ];
      for (const [field, key] of map) {
        const value = toMetricInput(extracted[key]);
        if (value) {
          updates[field] = value;
          fields.push(field);
        }
      }
      if (fields.length === 0) return;
      setValues((current) => {
        const next = { ...current, ...updates };
        if (userId) writeUserLocalData(userId, "clinical_intake", next);
        return next;
      });
      setAutoFilledFields(fields);
      setNotice("Report readings filled from the latest scan.");
    };
    window.addEventListener(reportExtractedEventName, handleReportExtracted);
    return () => window.removeEventListener(reportExtractedEventName, handleReportExtracted);
  }, [userId]);

  const setField = (field: keyof IntakeValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSaving(true);
    try {
      if (!userId) throw new Error("Sign in or continue as guest to save your health profile.");
      const systolic = values.systolic ? Number(values.systolic) : null;
      const diastolic = values.diastolic ? Number(values.diastolic) : null;
      const glucose = values.glucose ? Number(values.glucose) : null;
      const heartRate = values.heartRate ? Number(values.heartRate) : null;
      const additionalMetrics = [values.hba1c, values.cholesterol, values.vitaminD, values.tsh]
        .map((value) => value ? Number(value) : null);
      if ((systolic === null) !== (diastolic === null)) {
        throw new Error("Enter both systolic and diastolic blood pressure, or leave both blank.");
      }
      if ([systolic, diastolic, glucose, heartRate, ...additionalMetrics].some((value) => value !== null && !Number.isFinite(value))) {
        throw new Error("Enter valid numeric readings.");
      }

      if (user?.isGuest) {
        if (!writeUserLocalData(userId, "clinical_intake", values)) {
          throw new Error("Could not save your profile on this device.");
        }
        setNotice("Health profile saved on this device. Sign in to sync it to your account.");
        return;
      }

      const supabase = getSupabaseClient();
      const authenticatedUserId = await requireAuthenticatedUser(supabase, session?.user.id);
      const { data: existing, error: readError } = await supabase
        .from("profiles")
        .select("details")
        .eq("id", authenticatedUserId)
        .maybeSingle();
      if (readError) throw readError;
      const details = typeof existing?.details === "object" && existing.details !== null
        ? existing.details as Record<string, unknown>
        : {};
      const { error: saveError } = await supabase.from("profiles").upsert({
        id: authenticatedUserId,
        full_name: values.fullName.trim() || user?.name || "User",
        dob: values.dob || null,
        blood_pressure_latest: systolic !== null && diastolic !== null ? `${systolic}/${diastolic}` : null,
        blood_glucose_latest: glucose,
        heart_rate_latest: heartRate,
        hba1c_latest: values.hba1c ? Number(values.hba1c) : null,
        cholesterol_latest: values.cholesterol ? Number(values.cholesterol) : null,
        vitamin_d_latest: values.vitaminD ? Number(values.vitaminD) : null,
        thyroid_tsh_latest: values.tsh ? Number(values.tsh) : null,
        details: { ...details, manual_intake: values },
        updated_at: new Date().toISOString()
      }, { onConflict: "id" });
      if (saveError) throw saveError;
      writeUserLocalData(userId, "clinical_intake", values);
      setNotice("Health profile saved securely.");
    } catch (saveError: unknown) {
      if (isNetworkError(saveError) && userId && writeUserLocalData(userId, "clinical_intake", values)) {
        setNotice("Network unavailable. Your health profile was saved on this device.");
      } else {
        setError(saveError instanceof Error ? saveError.message : "Could not save your health profile.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-[#DCEAEC] bg-white px-3 py-2.5 text-sm text-[#123F55] outline-none focus:border-[#04939D] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
  const labelClass = "grid gap-1.5 text-xs font-bold text-[#537783] dark:text-slate-300";
  const autoBadge = (field: string) => autoFilledFields.includes(field)
    ? <span className="ml-1 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">Auto-filled from Lab Scan</span>
    : null;

  return (
    <section aria-labelledby="manual-intake-title" className="space-y-4 rounded-3xl border border-[#DCEAEC] bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#04939D]">Daily intake</p>
          <h2 id="manual-intake-title" className="mt-1 text-xl font-black">Vitals &amp; lifestyle</h2>
        </div>
        {user?.isGuest && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Saved on this device</span>}
      </header>
      <p className="text-sm text-[#537783] dark:text-slate-400">Add readings and habits to help keep your health profile up to date.</p>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={save}>
        <label className={labelClass}>Name
          <input autoComplete="name" className={inputClass} onChange={(event) => setField("fullName", event.target.value)} value={values.fullName} />
        </label>
        <label className={labelClass}>Date of birth
          <input className={inputClass} onChange={(event) => setField("dob", event.target.value)} type="date" value={values.dob} />
        </label>
        <label className={labelClass}>Systolic BP (mmHg)
          {autoBadge("systolic")}
          <input className={inputClass} min="40" max="300" onChange={(event) => setField("systolic", event.target.value)} type="number" value={values.systolic} />
        </label>
        <label className={labelClass}>Diastolic BP (mmHg)
          {autoBadge("diastolic")}
          <input className={inputClass} min="20" max="200" onChange={(event) => setField("diastolic", event.target.value)} type="number" value={values.diastolic} />
        </label>
        <label className={labelClass}>Blood glucose (mg/dL)
          {autoBadge("glucose")}
          <input className={inputClass} min="1" max="2000" onChange={(event) => setField("glucose", event.target.value)} type="number" value={values.glucose} />
        </label>
        <label className={labelClass}>Heart rate (bpm)
          {autoBadge("heartRate")}
          <input className={inputClass} min="20" max="300" onChange={(event) => setField("heartRate", event.target.value)} type="number" value={values.heartRate} />
        </label>
        <label className={labelClass}>HbA1c (%)
          {autoBadge("hba1c")}
          <input className={inputClass} min="0" max="100" onChange={(event) => setField("hba1c", event.target.value)} type="number" step="0.1" value={values.hba1c} />
        </label>
        <label className={labelClass}>Total cholesterol (mg/dL)
          {autoBadge("cholesterol")}
          <input className={inputClass} min="0" max="2000" onChange={(event) => setField("cholesterol", event.target.value)} type="number" value={values.cholesterol} />
        </label>
        <label className={labelClass}>Vitamin D (ng/mL)
          {autoBadge("vitaminD")}
          <input className={inputClass} min="0" max="1000" onChange={(event) => setField("vitaminD", event.target.value)} type="number" step="0.1" value={values.vitaminD} />
        </label>
        <label className={labelClass}>TSH (µIU/mL)
          {autoBadge("tsh")}
          <input className={inputClass} min="0" max="1000" onChange={(event) => setField("tsh", event.target.value)} type="number" step="0.01" value={values.tsh} />
        </label>
        <label className={labelClass}>Smoking
          <select className={inputClass} onChange={(event) => setField("smoking", event.target.value)} value={values.smoking}>
            <option value="never">Never</option><option value="occasional">Occasional</option><option value="regular">Regular</option>
          </select>
        </label>
        <label className={labelClass}>Alcohol
          <select className={inputClass} onChange={(event) => setField("alcohol", event.target.value)} value={values.alcohol}>
            <option value="none">None</option><option value="social">Social</option><option value="moderate">Moderate</option><option value="heavy">Heavy</option>
          </select>
        </label>
        <label className={`${labelClass} sm:col-span-2`}>Fast food frequency
          <select className={inputClass} onChange={(event) => setField("fastFood", event.target.value)} value={values.fastFood}>
            <option value="rare">Rare</option><option value="1-2_times_week">1–2 times/week</option><option value="frequent">Frequent</option>
          </select>
        </label>
        {error && <p className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
        {notice && <p className="sm:col-span-2 rounded-xl bg-teal-50 p-3 text-sm text-teal-800" role="status">{notice}</p>}
        <button className="rounded-xl bg-[#04939D] px-4 py-3 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2" disabled={isSaving} type="submit">
          {isSaving ? "Saving…" : "Save Health Profile"}
        </button>
      </form>
    </section>
  );
}
