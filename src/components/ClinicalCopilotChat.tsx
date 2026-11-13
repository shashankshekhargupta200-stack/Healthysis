"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, FileText, LoaderCircle, Mic, Paperclip, Send, X } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { readUserLocalData, writeUserLocalData } from "@/lib/localUserData";
import { dispatchReportExtracted } from "@/lib/reportExtraction";

type DocumentAnalysis = {
  document_type: string;
  extracted_biomarkers: Array<{
    name: string;
    value: string;
    unit: string;
    reference_range: string;
    status: string;
  }>;
  detected_anomalies: string[];
  misprint_flags: string[];
  plain_language_summary: string;
};
type VaultRecord = {
  id: string;
  user_id?: string;
  category: string;
  storage_folder: string;
  title: string;
  extracted_data: Record<string, unknown>;
  patient_summary: string;
  clinical_alerts: string[];
  file_url?: string | null;
  document_url: string | null;
  storage_path?: string | null;
  created_at: string;
};
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  attachmentName?: string;
  documentAnalysis?: DocumentAnalysis;
  vaultRecord?: VaultRecord;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

const quickPrompts = [
  { label: "Snap Lab Report", action: "file" },
  { label: "Log today's symptoms (fever, cough)", action: "text" },
  { label: "Analyze my recent lab report", action: "file" },
  { label: "Explain my BP & metabolic trends", action: "text" },
  { label: "Did you detect any scan errors or misprints?", action: "text" }
];

export function ClinicalCopilotChat() {
  const { user, session } = useAuth();
  const accessToken = session?.access_token;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Choose an image or PDF report to attach.");
      return;
    }
    setError("");
    setImage(file);
    setPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
  };

  const toggleSpeech = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = typeof window !== "undefined"
      ? (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition
      : undefined;
    if (!SpeechRecognition) {
      setError("Speech recognition is not available in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).slice(event.resultIndex).map((result) => result[0].transcript).join(" ");
      setDraft((current) => `${current}${current.trim() ? " " : ""}${transcript}`.trim());
    };
    recognition.onerror = () => {
      setError("Microphone access failed. Check your browser permission and try again.");
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setError("");
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setError("Could not start speech recognition.");
    }
  };

  const send = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = draft.trim();
    if ((!message && !image) || isSending) return;
    if (!user?.id) {
      setError("Sign in or continue as guest before using the copilot.");
      return;
    }
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: message || "Please analyze this report.",
      image: preview || undefined,
      attachmentName: image?.name
    };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setError("");
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.set(image ? "userId" : "patientId", user.id);
      formData.set("message", message);
      if (image) formData.set("file", image);
      if (user.isGuest) {
        formData.set("guestDossier", JSON.stringify({
          profile: readUserLocalData(user.id, "clinical_intake", null),
          vitals: readUserLocalData(user.id, "vitals", []),
          recentMeals: readUserLocalData(user.id, "meal_logs", []).slice(0, 5),
          labReports: readUserLocalData<VaultRecord[]>(user.id, "patient_memory_vault", [])
            .filter((record) => record.category === "lab_report")
            .slice(0, 5),
          loggedSymptoms: readUserLocalData(user.id, "daily_symptom_logs", []).slice(0, 10),
          vaultArchive: readUserLocalData<VaultRecord[]>(user.id, "patient_memory_vault", []).slice(0, 5)
        }));
      }
      const response = await fetch(image ? "/api/agent/vault-ingest" : "/api/agent/unified-copilot", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData
      });
      const text = await response.text();
      let result: {
        success?: boolean;
        reply?: string;
        error?: string;
        documentAnalysis?: DocumentAnalysis | null;
        vaultRecord?: VaultRecord;
        storageFolder?: string;
        patientSummary?: string;
        alerts?: string[];
        symptomLogged?: boolean;
        category?: string;
        extracted_data?: Record<string, unknown>;
        status_flags?: Array<{ biomarker: string; value: number | string | null; status: "NORMAL" | "HIGH" | "LOW" | "CRITICAL" }>;
      } = {};
      let responseParseFailed = false;
      try {
        result = text ? JSON.parse(text) as typeof result : {};
      } catch {
        responseParseFailed = true;
      }
      if (!response.ok || !result.success || (image ? !result.vaultRecord : !result.reply)) {
        throw new Error(
          result.error
          || (!response.ok
            ? response.statusText || `Request failed (${response.status}).`
            : responseParseFailed
              ? "The copilot returned an unreadable response."
              : "The copilot could not process your message.")
        );
      }
      if (user.isGuest && result.vaultRecord) {
        const existingVault = readUserLocalData<VaultRecord[]>(user.id, "patient_memory_vault", []);
        writeUserLocalData(user.id, "patient_memory_vault", [
          result.vaultRecord,
          ...existingVault.filter((record) => record.id !== result.vaultRecord?.id)
        ].slice(0, 100));
      }
      if (result.vaultRecord && (result.category === "lab_report" || result.category === "prescription")) {
        dispatchReportExtracted({
          category: result.category,
          extracted_data: result.extracted_data ?? result.vaultRecord.extracted_data,
          status_flags: result.status_flags ?? [],
          title: result.vaultRecord.title,
          patient_summary: result.patientSummary ?? result.vaultRecord.patient_summary,
          vaultRecord: result.vaultRecord as unknown as Record<string, unknown>
        });
      }
      if (user.isGuest && result.symptomLogged) {
        const symptoms = readUserLocalData<Record<string, unknown>[]>(user.id, "daily_symptom_logs", []);
        writeUserLocalData(user.id, "daily_symptom_logs", [
          { id: crypto.randomUUID(), symptoms: { raw_text: message }, logged_at: new Date().toISOString() },
          ...symptoms
        ].slice(0, 100));
      }
      setMessages((current) => [...current, {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: result.vaultRecord
          ? `${result.vaultRecord.title} saved to ${result.storageFolder ?? result.vaultRecord.storage_folder} folder • Extracted by Healthysis Agent`
          : result.reply ?? "",
        documentAnalysis: result.documentAnalysis ?? undefined,
        vaultRecord: result.vaultRecord
          ? {
            ...result.vaultRecord,
            storage_folder: result.storageFolder ?? result.vaultRecord.storage_folder,
            patient_summary: result.patientSummary ?? result.vaultRecord.patient_summary,
            clinical_alerts: result.alerts ?? result.vaultRecord.clinical_alerts
          }
          : undefined
      }]);
      setImage(null);
      setPreview("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (sendError: unknown) {
      const message = sendError instanceof Error ? sendError.message : "Could not reach the clinical copilot.";
      setError(message);
      setMessages((current) => current.filter((entry) => entry.id !== userMessage.id));
      setDraft(userMessage.content);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section aria-labelledby="clinical-copilot-title" className="overflow-hidden rounded-3xl border border-[#DCEAEC] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="border-b border-[#DCEAEC] p-5 dark:border-slate-800">
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#04939D]">Healthysis assistant</p>
        <h2 id="clinical-copilot-title" className="mt-1 text-xl font-black">Clinical Copilot</h2>
        <p className="mt-1 text-sm text-[#537783] dark:text-slate-400">Ask about symptoms, trends, or share a report for a plain-language explanation.</p>
      </header>
      <div aria-live="polite" className="max-h-[380px] min-h-40 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && <p className="rounded-2xl bg-[#F4F9FA] p-4 text-sm text-[#537783] dark:bg-slate-800 dark:text-slate-300">Tell me what you would like help understanding. I’m informational only and can’t diagnose conditions.</p>}
        {messages.map((message) => (
          <article key={message.id} className={`max-w-[90%] rounded-2xl p-3 text-sm ${message.role === "user" ? "ml-auto bg-[#E3F5F5] text-[#123F55] dark:bg-teal-950 dark:text-teal-50" : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"}`}>
            {message.image && <Image alt="Attached report preview" className="mb-2 max-h-40 rounded-xl object-contain" height={240} src={message.image} unoptimized width={320} />}
            {message.attachmentName && !message.image && <p className="mb-2 flex items-center gap-2 text-xs font-semibold"><Paperclip className="h-4 w-4" />{message.attachmentName}</p>}
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.documentAnalysis && (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                <p className="font-bold">{message.documentAnalysis.document_type.replaceAll("_", " ")} · Report findings</p>
                <p>{message.documentAnalysis.plain_language_summary}</p>
                {message.documentAnalysis.extracted_biomarkers.slice(0, 12).map((marker, index) => (
                  <p className="flex flex-wrap justify-between gap-2 text-xs" key={`${marker.name}-${index}`}>
                    <span>{marker.name}</span>
                    <strong>{marker.value} {marker.unit}{marker.reference_range ? ` · Ref: ${marker.reference_range}` : ""} · {marker.status}</strong>
                  </p>
                ))}
                {message.documentAnalysis.detected_anomalies.map((anomaly, index) => (
                  <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" key={`anomaly-${index}`}>Finding: {anomaly}</p>
                ))}
                {message.documentAnalysis.misprint_flags.map((flag, index) => (
                  <p className="rounded-lg bg-rose-50 p-2 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-100" key={`misprint-${index}`}>Scan quality: {flag}</p>
                ))}
              </div>
            )}
            {message.vaultRecord && (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                <p className="font-bold">{message.vaultRecord.title} saved to {message.vaultRecord.storage_folder} folder • Extracted by Healthysis Agent</p>
                <p>{message.vaultRecord.patient_summary}</p>
                {Object.entries(message.vaultRecord.extracted_data).slice(0, 12).map(([key, value]) => (
                  <p className="text-xs" key={key}><strong>{key.replaceAll("_", " ")}:</strong> {typeof value === "string" || typeof value === "number" ? value : JSON.stringify(value)}</p>
                ))}
                {message.vaultRecord.clinical_alerts.map((alert, index) => (
                  <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" key={`${index}-${alert}`}>{alert}</p>
                ))}
              </div>
            )}
          </article>
        ))}
        {isSending && <p className="flex items-center gap-2 text-sm text-[#537783]" role="status"><LoaderCircle className="h-4 w-4 animate-spin" /> Reviewing your message…</p>}
      </div>
      <div className="space-y-3 border-t border-[#DCEAEC] p-4 dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button className="rounded-full border border-[#DCEAEC] px-3 py-1.5 text-left text-xs font-semibold text-[#315D68] hover:border-[#04939D] dark:border-slate-700 dark:text-slate-300" key={prompt.label} onClick={() => prompt.action === "file" ? inputRef.current?.click() : setDraft(prompt.label)} type="button">{prompt.label}</button>
          ))}
        </div>
        {image && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
            {preview
              ? <Image alt="Selected report preview" className="h-14 w-14 rounded-lg object-cover" height={56} src={preview} unoptimized width={56} />
              : <FileText className="ml-3 h-8 w-8 shrink-0 text-[#04939D]" />}
            <span className="min-w-0 flex-1 truncate text-xs">{image.name}</span>
            <button aria-label="Remove attachment" className="rounded-lg p-2 hover:bg-white dark:hover:bg-slate-700" onClick={() => { setImage(null); setPreview(""); if (inputRef.current) inputRef.current.value = ""; }} type="button"><X className="h-4 w-4" /></button>
          </div>
        )}
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
        <form className="flex items-end gap-2" onSubmit={send}>
          <input accept="image/*,application/pdf" capture="environment" className="hidden" onChange={selectImage} ref={inputRef} type="file" />
          <button aria-label="Attach or capture a report" className="rounded-xl border border-[#DCEAEC] p-3 text-[#315D68] hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => inputRef.current?.click()} type="button">
            <Paperclip className="h-5 w-5" /><Camera className="-mt-2 ml-3 h-3.5 w-3.5" />
          </button>
          <button aria-label={isListening ? "Stop dictation" : "Dictate symptoms"} aria-pressed={isListening} className={`rounded-xl border p-3 ${isListening ? "animate-pulse border-rose-400 bg-rose-50 text-rose-700" : "border-[#DCEAEC] text-[#315D68] dark:border-slate-700 dark:text-slate-300"}`} onClick={toggleSpeech} type="button"><Mic className="h-5 w-5" /></button>
          <textarea aria-label="Write a message to the clinical copilot" className="min-h-12 flex-1 resize-y rounded-xl border border-[#DCEAEC] bg-white px-3 py-3 text-sm outline-none focus:border-[#04939D] dark:border-slate-700 dark:bg-slate-950" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder={isListening ? "Listening…" : "Describe symptoms or ask a question…"} rows={1} value={draft} />
          <button aria-label="Send message" className="rounded-xl bg-[#04939D] p-3 text-white disabled:opacity-50" disabled={isSending || (!draft.trim() && !image)} type="submit">{isSending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
        </form>
        <p className="text-center text-[11px] text-[#718A91]">For information only, not a medical diagnosis. Seek professional advice for health concerns.</p>
      </div>
    </section>
  );
}
