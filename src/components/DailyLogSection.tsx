"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase";
import { readUserLocalData, writeUserLocalData, isNetworkError } from "@/lib/localUserData";
import { extractSymptomVoiceHeuristic } from "@/lib/symptomVoiceParser";
import {
  Activity,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Pill,
  CheckCircle2,
  Sparkles,
  Info,
  Mic,
  Square,
  Loader2,
  X
} from "lucide-react";

export interface DailySymptomLogEntry {
  id: string;
  patient_id?: string;
  symptom: string;
  severity: "mild" | "moderate" | "severe";
  notes?: string;
  medicine?: string;
  medicine_dose?: string;
  medicine_notes?: string;
  logged_at: string;
}

interface DetectedSymptomPattern {
  id: string;
  title: string;
  observation: string;
  significance: string;
  severity: "attention" | "notable" | "normal";
  type: "multi_day" | "cluster" | "medication_correlation" | "recurrence";
}

const COMMON_SYMPTOM_CHIPS = [
  { label: "Fever", icon: "🌡️" },
  { label: "Cough", icon: "🗣️" },
  { label: "Body Ache", icon: "⚡" },
  { label: "Breathlessness", icon: "🫁" },
  { label: "Headache", icon: "🤕" },
  { label: "Sore Throat", icon: "🧣" },
  { label: "Nausea", icon: "🤢" },
  { label: "Fatigue", icon: "🥱" }
];

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: {
    resultIndex: number;
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function DailyLogSection() {
  const { user, session } = useAuth();
  const userId = user?.id;

  const [logs, setLogs] = useState<DailySymptomLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form Inputs
  const [symptomText, setSymptomText] = useState("");
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("moderate");
  const [notes, setNotes] = useState("");
  const [medicine, setMedicine] = useState("");
  const [medicineDose, setMedicineDose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Voice-to-Text State
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [accumulatedTranscript, setAccumulatedTranscript] = useState("");
  const [voiceFeedbackMsg, setVoiceFeedbackMsg] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Cleanup active audio/speech on unmount
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {}
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 1. Fetch symptom & medicine logs (sorted newest-first)
  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      await Promise.resolve();
      if (!userId) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const local = readUserLocalData<DailySymptomLogEntry[]>(userId, "daily_symptom_logs", []);

        if (user?.isGuest || !session?.user.id) {
          if (active) {
            setLogs(
              [...local].sort(
                (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
              )
            );
          }
          return;
        }

        const supabase = getSupabaseClient();
        const authenticatedUserId = await requireAuthenticatedUser(supabase, session.user.id);
        const { data, error } = await supabase
          .from("daily_symptom_logs")
          .select("id, patient_id, symptoms, logged_at")
          .eq("patient_id", authenticatedUserId)
          .order("logged_at", { ascending: false })
          .limit(50);

        if (error) throw error;

        const remoteEntries: DailySymptomLogEntry[] = (data || []).map((row) => {
          const s = (typeof row.symptoms === "object" && row.symptoms !== null ? row.symptoms : {}) as Record<string, unknown>;
          return {
            id: String(row.id),
            patient_id: String(row.patient_id),
            symptom: String(s.symptom || s.raw_text || "Unspecified symptom"),
            severity: (s.severity === "mild" || s.severity === "severe" ? s.severity : "moderate") as "mild" | "moderate" | "severe",
            notes: typeof s.notes === "string" ? s.notes : undefined,
            medicine: typeof s.medicine === "string" ? s.medicine : undefined,
            medicine_dose: typeof s.medicine_dose === "string" ? s.medicine_dose : undefined,
            medicine_notes: typeof s.medicine_notes === "string" ? s.medicine_notes : undefined,
            logged_at: String(row.logged_at || new Date().toISOString())
          };
        });

        // Merge & Deduplicate with local cache, sorted newest-first
        const combined = [...remoteEntries];
        for (const loc of local) {
          if (!combined.some((r) => r.id === loc.id)) {
            combined.push(loc);
          }
        }
        combined.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

        if (active) {
          setLogs(combined);
          writeUserLocalData(userId, "daily_symptom_logs", combined);
        }
      } catch (err: unknown) {
        console.warn("Could not load daily symptom logs:", err);
        if (isNetworkError(err) && userId) {
          const local = readUserLocalData<DailySymptomLogEntry[]>(userId, "daily_symptom_logs", []);
          if (active) setLogs(local.sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()));
        } else if (active) {
          setLoadError(err instanceof Error ? err.message : "Failed to load symptom records.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void fetchLogs();
    return () => {
      active = false;
    };
  }, [userId, user, session]);

  // 2. Pattern Detection Heuristics over logged symptoms and medicines
  const detectedPatterns: DetectedSymptomPattern[] = useMemo(() => {
    if (logs.length === 0) return [];

    const patterns: DetectedSymptomPattern[] = [];
    const lowerLogs = logs.map((l) => ({
      ...l,
      symLower: l.symptom.toLowerCase(),
      medLower: (l.medicine || "").toLowerCase(),
      notesLower: (l.notes || "").toLowerCase(),
      dateStr: l.logged_at.slice(0, 10)
    }));

    // A. Multi-day Fever Detection
    const feverEntries = lowerLogs.filter(
      (l) => l.symLower.includes("fever") || l.notesLower.includes("fever") || l.notesLower.includes("temp")
    );
    const distinctFeverDays = Array.from(new Set(feverEntries.map((l) => l.dateStr)));
    if (distinctFeverDays.length >= 2) {
      patterns.push({
        id: "pattern-multiday-fever",
        title: "Multi-Day Persistent Fever Trajectory",
        observation: `Fever logged on ${distinctFeverDays.length} distinct days (${distinctFeverDays.slice(0, 3).join(", ")}) with ${feverEntries.length} total entries.`,
        significance: "Unremitting or recurrent fever warrants clinical evaluation for secondary infection or inflammatory etiology.",
        severity: distinctFeverDays.length >= 3 ? "attention" : "notable",
        type: "multi_day"
      });
    }

    // B. Multi-day Cough Detection
    const coughEntries = lowerLogs.filter(
      (l) => l.symLower.includes("cough") || l.notesLower.includes("cough")
    );
    const distinctCoughDays = Array.from(new Set(coughEntries.map((l) => l.dateStr)));
    if (distinctCoughDays.length >= 2) {
      patterns.push({
        id: "pattern-multiday-cough",
        title: "Persistent / Subacute Cough Trajectory",
        observation: `Cough documented across ${distinctCoughDays.length} separate dates.`,
        significance: "Persistent cough tracking over multiple days is clinically relevant for respiratory evaluation.",
        severity: distinctCoughDays.length >= 4 ? "attention" : "notable",
        type: "multi_day"
      });
    }

    // C. Respiratory Symptom Cluster (Cough + Breathlessness / Chest Tightness)
    const hasBreathless = lowerLogs.some(
      (l) => l.symLower.includes("breath") || l.symLower.includes("dyspnea") || l.symLower.includes("wheez")
    );
    if (coughEntries.length >= 1 && hasBreathless) {
      patterns.push({
        id: "pattern-respiratory-cluster",
        title: "Respiratory Symptom Cluster (Cough & Breathlessness)",
        observation: "Co-occurrence of cough and shortness of breath / wheezing logged in recent trajectory.",
        significance: "May indicate lower respiratory tract involvement, bronchospasm, or asthma exacerbation.",
        severity: "attention",
        type: "cluster"
      });
    }

    // D. Viral Prodrome Cluster (Fever + Body Ache / Chills)
    const hasBodyAche = lowerLogs.some(
      (l) => l.symLower.includes("body ache") || l.symLower.includes("myalgia") || l.symLower.includes("chill")
    );
    if (feverEntries.length >= 1 && hasBodyAche) {
      patterns.push({
        id: "pattern-viral-cluster",
        title: "Systemic Viral Prodrome Cluster (Fever & Body Ache)",
        observation: "Fever combined with generalized myalgia/body aches recorded in symptom log history.",
        significance: "Consistent with acute viral or systemic infectious syndrome.",
        severity: "notable",
        type: "cluster"
      });
    }

    // E. Frequent Antipyretic / Pain Medication Intake Pattern
    const antipyretics = lowerLogs.filter(
      (l) =>
        l.medLower.includes("paracetamol") ||
        l.medLower.includes("crocin") ||
        l.medLower.includes("dolo") ||
        l.medLower.includes("ibuprofen") ||
        l.medLower.includes("combiflam")
    );
    if (antipyretics.length >= 3) {
      patterns.push({
        id: "pattern-antipyretic-frequency",
        title: "Frequent Antipyretic Medication Usage",
        observation: `${antipyretics.length} antipyretic / analgesic doses (e.g. Paracetamol/Dolo) logged in recent entries.`,
        significance: "Frequent symptom-masking medication use suggests sustained underlying inflammatory or febrile activity.",
        severity: "notable",
        type: "medication_correlation"
      });
    }

    // F. Headache / Neuro Cluster (Headache + Nausea / Dizziness)
    const headacheEntries = lowerLogs.filter((l) => l.symLower.includes("headache") || l.symLower.includes("migraine"));
    const hasNausea = lowerLogs.some((l) => l.symLower.includes("nausea") || l.symLower.includes("vomit") || l.symLower.includes("dizz"));
    if (headacheEntries.length >= 2 && hasNausea) {
      patterns.push({
        id: "pattern-migraine-cluster",
        title: "Cephalea & Autonomic Cluster (Headache + Nausea)",
        observation: "Repeated headaches documented with associated nausea or dizziness.",
        significance: "Features suggest episodic migraine or neurovascular cephalea.",
        severity: "notable",
        type: "cluster"
      });
    }

    return patterns;
  }, [logs]);

  // 3. Voice Recording Handlers
  const startVoiceRecording = async () => {
    setVoiceFeedbackMsg(null);
    setInterimTranscript("");
    setAccumulatedTranscript("");

    const SpeechRecognition = typeof window !== "undefined"
      ? (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition
      : undefined;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-IN"; // English (India) with excellent comprehension of Indian English & Hinglish
        recognition.continuous = true;
        recognition.interimResults = true;

        let capturedFinal = "";

        recognition.onresult = (event) => {
          let currentInterim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const item = event.results[i];
            const text = item[0].transcript;
            if (item.isFinal) {
              capturedFinal = capturedFinal ? `${capturedFinal} ${text}` : text;
            } else {
              currentInterim += text;
            }
          }
          setAccumulatedTranscript(capturedFinal.trim());
          setInterimTranscript(currentInterim.trim());
        };

        recognition.onerror = (event) => {
          console.warn("Speech recognition error:", event.error);
          if (event.error === "not-allowed" || event.error === "permission-denied") {
            setVoiceFeedbackMsg({
              type: "error",
              message: "Microphone permission was denied. Please allow microphone access in your browser settings to speak symptoms."
            });
            setIsListening(false);
          } else if (event.error === "no-speech") {
            // Keep listening, do not terminate immediately on momentary silence
          } else {
            setVoiceFeedbackMsg({
              type: "error",
              message: `Speech input notice: ${event.error || "Recording error"}.`
            });
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        return;
      } catch (err: unknown) {
        console.warn("SpeechRecognition start error, falling back to MediaRecorder:", err);
      }
    }

    // Fallback: MediaRecorder with getUserMedia for browsers without SpeechRecognition
    if (typeof navigator !== "undefined" && navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        audioChunksRef.current = [];

        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        };

        recorder.start(250);
        mediaRecorderRef.current = recorder;
        setIsListening(true);
        setInterimTranscript("Listening to audio... Speak your symptoms and medicines, then click 'Finish & Autofill'.");
      } catch (err: unknown) {
        const isPermissionDenied = err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
        setVoiceFeedbackMsg({
          type: "error",
          message: isPermissionDenied
            ? "Microphone permission was denied. Please allow microphone access in browser settings to speak."
            : "Could not access microphone on this device."
        });
        setIsListening(false);
      }
    } else {
      setVoiceFeedbackMsg({
        type: "error",
        message: "Voice input is not supported in this browser."
      });
    }
  };

  const stopVoiceAndAutofill = async () => {
    setIsListening(false);
    setIsProcessingVoice(true);
    setVoiceFeedbackMsg(null);

    const fullTranscript = `${accumulatedTranscript} ${interimTranscript}`.trim();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    let recordedBlob: Blob | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      const activeRecorder = mediaRecorderRef.current;
      recordedBlob = await new Promise<Blob | null>((resolve) => {
        activeRecorder.onstop = () => {
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
          const blob = new Blob(audioChunksRef.current, {
            type: activeRecorder.mimeType || "audio/webm"
          });
          resolve(blob);
        };
        activeRecorder.stop();
      });
      mediaRecorderRef.current = null;
    }

    if (!fullTranscript && (!recordedBlob || recordedBlob.size === 0)) {
      setIsProcessingVoice(false);
      setVoiceFeedbackMsg({
        type: "error",
        message: "No speech detected. Please speak clearly into your microphone and try again."
      });
      return;
    }

    try {
      let resultData: {
        symptomText?: string;
        severity?: "mild" | "moderate" | "severe";
        medicine?: string;
        medicineDose?: string;
        notes?: string;
        matchingChips?: string[];
      } | null = null;

      // 1. If audio blob exists without transcript (MediaRecorder path)
      if (recordedBlob && recordedBlob.size > 0 && !fullTranscript) {
        const formData = new FormData();
        formData.append("audio", recordedBlob, "symptom-voice.webm");
        const res = await fetch("/api/agent/extract-symptom-voice", {
          method: "POST",
          body: formData
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            resultData = json;
          }
        }
      } else if (fullTranscript) {
        // 2. Transcript available from Web Speech API
        const res = await fetch("/api/agent/extract-symptom-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: fullTranscript })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            resultData = json;
          }
        }
      }

      // 3. Fallback to client-side heuristic parser if API call was unsuccessful
      if (!resultData && fullTranscript) {
        resultData = extractSymptomVoiceHeuristic(fullTranscript);
      }

      if (resultData) {
        // Autofill fields WITHOUT auto-submitting so user can review and edit
        if (resultData.symptomText) {
          setSymptomText(resultData.symptomText);
        } else if (fullTranscript) {
          setSymptomText(fullTranscript);
        }

        if (resultData.severity === "mild" || resultData.severity === "severe" || resultData.severity === "moderate") {
          setSeverity(resultData.severity);
        }

        if (resultData.medicine) {
          setMedicine(resultData.medicine);
        }

        if (resultData.medicineDose) {
          setMedicineDose(resultData.medicineDose);
        }

        if (resultData.notes) {
          setNotes((prev) => (prev ? `${prev} | ${resultData!.notes}` : resultData!.notes || ""));
        } else if (fullTranscript && !resultData.symptomText?.includes(fullTranscript)) {
          // Preserve raw speech quote in notes if distinct
          setNotes((prev) => (prev ? `${prev} | Spoken: "${fullTranscript}"` : `Spoken: "${fullTranscript}"`));
        }

        setVoiceFeedbackMsg({
          type: "success",
          message: "Autofilled from voice! Please review the details below and click 'Log Entry' when ready."
        });
      } else {
        setVoiceFeedbackMsg({
          type: "error",
          message: "Could not extract details from voice. Please try again or type directly."
        });
      }
    } catch (err: unknown) {
      console.warn("Voice parsing exception, falling back to local heuristic:", err);
      if (fullTranscript) {
        const heuristic = extractSymptomVoiceHeuristic(fullTranscript);
        if (heuristic.symptomText) setSymptomText(heuristic.symptomText);
        if (heuristic.severity) setSeverity(heuristic.severity);
        if (heuristic.medicine) setMedicine(heuristic.medicine);
        if (heuristic.medicineDose) setMedicineDose(heuristic.medicineDose);
        if (heuristic.notes) setNotes(heuristic.notes);
        setVoiceFeedbackMsg({
          type: "success",
          message: "Autofilled from voice (offline heuristic)! Review and save when ready."
        });
      } else {
        setVoiceFeedbackMsg({
          type: "error",
          message: "Could not process voice input. Please try again."
        });
      }
    } finally {
      setIsProcessingVoice(false);
      setInterimTranscript("");
      setAccumulatedTranscript("");
    }
  };

  const cancelVoiceRecording = () => {
    setIsListening(false);
    setIsProcessingVoice(false);
    setInterimTranscript("");
    setAccumulatedTranscript("");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setVoiceFeedbackMsg({
      type: "info",
      message: "Voice input cancelled."
    });
    setTimeout(() => setVoiceFeedbackMsg(null), 3000);
  };

  // Toggle quick symptom chip
  const handleToggleChip = (chipLabel: string) => {
    const chipLower = chipLabel.toLowerCase();
    const currentLower = symptomText.toLowerCase();

    if (currentLower.includes(chipLower)) {
      // Remove chip label cleanly
      const parts = symptomText
        .split(/,\s*|\s*-\s*|\s+and\s+/i)
        .map((p) => p.trim())
        .filter((p) => p && !p.toLowerCase().includes(chipLower));
      setSymptomText(parts.join(", "));
    } else {
      // Append chip label cleanly
      if (!symptomText.trim()) {
        setSymptomText(chipLabel);
      } else {
        setSymptomText(`${symptomText.trim()}, ${chipLabel}`);
      }
    }
  };

  // 4. Handle Add New Entry
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomText.trim() && !medicine.trim()) return;

    setIsSubmitting(true);
    setActionSuccess(null);

    const newEntry: DailySymptomLogEntry = {
      id: crypto.randomUUID(),
      patient_id: userId,
      symptom: symptomText.trim() || (medicine.trim() ? "Medicine Administration" : "Unspecified symptom"),
      severity,
      notes: notes.trim() || undefined,
      medicine: medicine.trim() || undefined,
      medicine_dose: medicineDose.trim() || undefined,
      logged_at: new Date().toISOString()
    };

    try {
      const updated = [newEntry, ...logs].sort(
        (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
      );
      setLogs(updated);
      if (userId) {
        writeUserLocalData(userId, "daily_symptom_logs", updated);
      }

      if (!user?.isGuest && session?.user.id) {
        const supabase = getSupabaseClient();
        const authenticatedUserId = await requireAuthenticatedUser(supabase, session.user.id);
        const { error } = await supabase.from("daily_symptom_logs").insert({
          id: newEntry.id,
          patient_id: authenticatedUserId,
          symptoms: {
            symptom: newEntry.symptom,
            severity: newEntry.severity,
            notes: newEntry.notes,
            medicine: newEntry.medicine,
            medicine_dose: newEntry.medicine_dose,
            type: newEntry.medicine ? "symptom_and_medicine" : "symptom"
          },
          logged_at: newEntry.logged_at
        });
        if (error) console.warn("Could not insert log into Supabase:", error.message);
      }

      setSymptomText("");
      setNotes("");
      setMedicine("");
      setMedicineDose("");
      setVoiceFeedbackMsg(null);
      setActionSuccess("Entry logged successfully and added to newest-first timeline.");
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      console.error("Failed to add symptom log:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Handle Delete Entry
  const handleDeleteLog = async (id: string) => {
    const updated = logs.filter((item) => item.id !== id);
    setLogs(updated);
    if (userId) {
      writeUserLocalData(userId, "daily_symptom_logs", updated);
    }

    if (!user?.isGuest && session?.user.id) {
      try {
        const supabase = getSupabaseClient();
        const authenticatedUserId = await requireAuthenticatedUser(supabase, session.user.id);
        await supabase
          .from("daily_symptom_logs")
          .delete()
          .eq("id", id)
          .eq("patient_id", authenticatedUserId);
      } catch (err) {
        console.warn("Could not delete symptom row from Supabase:", err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* AI PATTERN NOTIFICATION BANNER & BADGE CARD                  */}
      {/* ============================================================ */}
      {detectedPatterns.length > 0 && (
        <section className="rounded-3xl border-2 border-amber-300 bg-amber-50/95 dark:border-amber-800/80 dark:bg-amber-950/40 p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-amber-950 dark:text-amber-100 tracking-tight">
                    AI Pattern Alert Detected
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-xs font-black uppercase">
                    {detectedPatterns.length} Pattern{detectedPatterns.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold mt-0.5">
                  Automated clinical synthesis identified recurring symptom and medication patterns.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-300 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>AI Observation</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {detectedPatterns.map((pattern) => (
              <div
                key={pattern.id}
                className="p-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800/60 space-y-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-[#123F55] dark:text-slate-100">
                    {pattern.title}
                  </span>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      pattern.severity === "attention"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                    }`}
                  >
                    {pattern.severity}
                  </span>
                </div>
                <p className="text-xs text-[#537783] dark:text-slate-300 leading-snug">
                  {pattern.observation}
                </p>
                <p className="text-[11px] font-semibold text-[#076584] dark:text-teal-300 italic pt-0.5">
                  {pattern.significance}
                </p>
              </div>
            ))}
          </div>

          {/* Required Explicit Disclaimer */}
          <div className="flex items-center gap-2 pt-2 border-t border-amber-200/80 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-300 italic">
            <Info className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Note: Insights and patterns are summarized from user-uploaded records rather than a clinical diagnosis.</span>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* QUICK LOGGING CARD FOR UNUSUAL SYMPTOMS & MEDICINES          */}
      {/* ============================================================ */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-[#DCEAEC] dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCEAEC] dark:border-slate-800">
          <div className="space-y-0.5">
            <h3 className="text-lg font-black text-[#123F55] dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#04939D]" />
              <span>Daily Log: Unusual Symptoms &amp; Medicines</span>
            </h3>
            <p className="text-xs text-[#537783] dark:text-slate-400">
              Quickly record unusual symptoms and medicines taken with automatic timestamps.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!isListening && !isProcessingVoice && (
              <button
                type="button"
                onClick={startVoiceRecording}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#04939D] to-[#076584] hover:from-[#037c85] hover:to-[#05536d] text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Speak symptoms and medicines (English, Hindi, Hinglish supported)"
              >
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                <span>Speak to Autofill</span>
              </button>
            )}

            <span className="text-xs font-bold text-[#076584] dark:text-teal-300 bg-[#DDF2F0] dark:bg-teal-950/60 px-3 py-1 rounded-full">
              {logs.length} Logged Entr{logs.length === 1 ? "y" : "ies"}
            </span>
          </div>
        </div>

        {/* Live Voice Recording Panel */}
        {isListening && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-50/90 via-teal-50/50 to-cyan-50/90 dark:from-rose-950/40 dark:via-teal-950/30 dark:to-cyan-950/40 border-2 border-rose-300 dark:border-rose-800/70 shadow-sm space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                </span>
                <span className="text-xs font-black text-rose-950 dark:text-rose-200 tracking-tight flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-rose-600 animate-bounce" />
                  <span>Listening... Speak your symptoms and medicines</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stopVoiceAndAutofill}
                  className="px-3.5 py-1.5 rounded-xl bg-[#04939D] hover:bg-[#037c85] text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Finish &amp; Autofill</span>
                </button>
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Cancel voice input"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interim Transcript Stream Container */}
            <div className="p-3.5 rounded-xl bg-white/95 dark:bg-slate-950/95 border border-teal-200 dark:border-teal-800/60 min-h-[50px] flex items-center">
              {accumulatedTranscript || interimTranscript ? (
                <p className="text-xs font-semibold text-[#123F55] dark:text-slate-100 italic leading-relaxed">
                  &ldquo;{accumulatedTranscript}{interimTranscript ? ` ${interimTranscript}` : ""}&rdquo;
                </p>
              ) : (
                <p className="text-xs text-[#537783] dark:text-slate-400 italic">
                  Say something like: &ldquo;Kal se tez bukhar hai aur dry cough, dopehar ko dolo 650 li thi&rdquo; or &ldquo;Severe headache with nausea since morning&rdquo;
                </p>
              )}
            </div>

            <p className="text-[11px] text-[#537783] dark:text-slate-400">
              💡 Supports English, Hindi, and Hinglish. Speaking will autofill the form below so you can review before submitting.
            </p>
          </div>
        )}

        {/* Processing Voice State */}
        {isProcessingVoice && (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-[#04939D] animate-spin shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#123F55] dark:text-teal-100">
                AI extracting symptom &amp; medicine details...
              </p>
              <p className="text-[11px] text-[#537783] dark:text-teal-300">
                Parsing clinical symptoms, severity, and dosages to autofill the form.
              </p>
            </div>
          </div>
        )}

        {/* Voice Feedback Notification */}
        {voiceFeedbackMsg && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
              voiceFeedbackMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
                : voiceFeedbackMsg.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200"
                : "bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {voiceFeedbackMsg.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {voiceFeedbackMsg.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              {voiceFeedbackMsg.type === "info" && <Info className="w-4 h-4 text-slate-500 shrink-0" />}
              <span>{voiceFeedbackMsg.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceFeedbackMsg(null)}
              className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {loadError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {/* Quick Symptom Chips */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#537783] dark:text-slate-400 block">
            Quick Select Common Unusual Symptoms:
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {COMMON_SYMPTOM_CHIPS.map((chip) => {
              const isSelected = symptomText.toLowerCase().includes(chip.label.toLowerCase());
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleToggleChip(chip.label)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? "bg-[#04939D] text-white border-transparent shadow-xs"
                      : "bg-[#F8FBFC] dark:bg-slate-800 text-[#123F55] dark:text-slate-200 border-[#DCEAEC] dark:border-slate-700 hover:border-[#04939D]/40"
                  }`}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Inputs (Autofilled from Voice or Typed) */}
        <form onSubmit={handleAddLog} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="text-xs font-bold text-[#123F55] dark:text-slate-200 block mb-1">
                Symptom Description
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  placeholder="e.g. Fever 101°F, Dry cough, Breathlessness"
                  className="w-full p-2.5 pr-9 rounded-xl border border-[#DCEAEC] dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-[#123F55] dark:text-slate-100 focus:outline-hidden focus:border-[#04939D]"
                />
                <button
                  type="button"
                  onClick={isListening ? stopVoiceAndAutofill : startVoiceRecording}
                  disabled={isProcessingVoice}
                  title={isListening ? "Stop and autofill" : "Speak to autofill"}
                  className={`absolute right-2 top-2 p-1 rounded-lg transition-all cursor-pointer ${
                    isListening
                      ? "text-rose-600 bg-rose-50 dark:bg-rose-950 animate-pulse"
                      : "text-[#04939D] hover:bg-teal-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {isListening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="text-xs font-bold text-[#123F55] dark:text-slate-200 block mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as "mild" | "moderate" | "severe")}
                className="w-full p-2.5 rounded-xl border border-[#DCEAEC] dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-bold text-[#123F55] dark:text-slate-100 focus:outline-hidden focus:border-[#04939D]"
              >
                <option value="mild">🟢 Mild</option>
                <option value="moderate">🟡 Moderate</option>
                <option value="severe">🔴 Severe</option>
              </select>
            </div>

            <div className="sm:col-span-4">
              <label className="text-xs font-bold text-[#123F55] dark:text-slate-200 block mb-1">
                Medicine Taken (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={medicine}
                  onChange={(e) => setMedicine(e.target.value)}
                  placeholder="e.g. Paracetamol, Dolo, Inhaler"
                  className="w-full p-2.5 pr-8 rounded-xl border border-[#DCEAEC] dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-[#123F55] dark:text-slate-100 focus:outline-hidden focus:border-[#04939D]"
                />
                <Pill className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-4">
              <label className="text-xs font-bold text-[#123F55] dark:text-slate-200 block mb-1">
                Medicine Dose / Timing Notes
              </label>
              <input
                type="text"
                value={medicineDose}
                onChange={(e) => setMedicineDose(e.target.value)}
                placeholder="e.g. 650mg post dinner, 2 puffs SOS"
                className="w-full p-2.5 rounded-xl border border-[#DCEAEC] dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-[#123F55] dark:text-slate-100 focus:outline-hidden focus:border-[#04939D]"
              />
            </div>

            <div className="sm:col-span-6">
              <label className="text-xs font-bold text-[#123F55] dark:text-slate-200 block mb-1">
                Notes / Triggers (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Started after dust exposure, feeling body chills"
                className="w-full p-2.5 rounded-xl border border-[#DCEAEC] dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold text-[#123F55] dark:text-slate-100 focus:outline-hidden focus:border-[#04939D]"
              />
            </div>

            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isSubmitting || (!symptomText.trim() && !medicine.trim())}
                className="w-full py-2.5 px-4 rounded-xl bg-[#04939D] hover:bg-[#037c85] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? "Logging..." : "Log Entry"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* ============================================================ */}
        {/* LOGGED ENTRIES TIMELINE (SORTED NEWEST-FIRST)                 */}
        {/* ============================================================ */}
        <div className="pt-4 border-t border-[#DCEAEC] dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#537783] dark:text-slate-400">
              Recent Logged History (Newest First)
            </span>
            <span className="text-[11px] text-[#829AA3]">
              Chronologically ordered by timestamp
            </span>
          </div>

          {isLoading && (
            <div className="p-4 text-center text-xs text-[#537783] animate-pulse">
              Loading recent symptom logs…
            </div>
          )}

          {!isLoading && logs.length === 0 && (
            <div className="p-6 text-center rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-dashed border-[#DCEAEC] dark:border-slate-800 space-y-1">
              <p className="text-xs font-bold text-[#123F55] dark:text-slate-200">
                No unusual symptoms or medicines logged yet.
              </p>
              <p className="text-[11px] text-[#537783] dark:text-slate-400">
                Use the form above or click &ldquo;Speak to Autofill&rdquo; to record any symptoms or medicines.
              </p>
            </div>
          )}

          <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
            {logs.map((entry) => {
              const formattedDate = new Date(entry.logged_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div
                  key={entry.id}
                  className="p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 flex items-start justify-between gap-3 text-xs shadow-2xs hover:border-[#04939D]/30 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-[#123F55] dark:text-slate-100 text-sm">
                        {entry.symptom}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          entry.severity === "severe"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : entry.severity === "moderate"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {entry.severity}
                      </span>

                      {entry.medicine && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-[#076584] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          <Pill className="w-3 h-3 text-[#04939D]" />
                          <span>{entry.medicine}</span>
                          {entry.medicine_dose && <span>({entry.medicine_dose})</span>}
                        </span>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="text-[11px] text-[#537783] dark:text-slate-300">
                        {entry.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-[#829AA3] dark:text-slate-400 font-medium pt-0.5">
                      <Clock className="w-3 h-3 text-[#04939D]" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteLog(entry.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
