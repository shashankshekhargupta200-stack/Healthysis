"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  UploadCloud,
  Utensils
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePulse } from "@/context/PulseContext";
import { getSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase";
import { isNetworkError, readUserLocalData, writeUserLocalData } from "@/lib/localUserData";

interface MealAnalysis {
  itemName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface MealLog extends MealAnalysis {
  id: string;
  timestamp: string;
}

interface VaultIngestResult {
  success: boolean;
  error?: string;
  category: string;
  storageFolder: string;
  patientSummary: string;
  alerts: string[];
  vaultRecord: {
    id: string;
    user_id?: string;
    category?: string;
    storage_folder?: string;
    title: string;
    extracted_data: Record<string, unknown>;
    created_at: string;
    patient_summary?: string;
    clinical_alerts?: string[];
    file_url?: string | null;
    document_url?: string | null;
    storage_path?: string | null;
  };
}

function isVaultIngestResult(value: unknown): value is VaultIngestResult {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Partial<VaultIngestResult>;
  return record.success === true
    && typeof record.category === "string"
    && typeof record.storageFolder === "string"
    && typeof record.patientSummary === "string"
    && Array.isArray(record.alerts)
    && typeof record.vaultRecord === "object"
    && record.vaultRecord !== null
    && typeof record.vaultRecord.title === "string"
    && typeof record.vaultRecord.extracted_data === "object";
}

function getNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function mealAnalysisFromVault(result: VaultIngestResult): MealAnalysis | null {
  if (result.category !== "diet_meal") return null;
  const data = result.vaultRecord.extracted_data;
  const macros = typeof data.macros === "object" && data.macros !== null
    ? data.macros as Record<string, unknown>
    : data;
  const calories = getNumber(data.calories);
  const protein = getNumber(macros.protein);
  const carbs = getNumber(macros.carbs);
  const fats = getNumber(macros.fats);
  if (calories === null || protein === null || carbs === null) return null;
  return {
    itemName: result.vaultRecord.title,
    calories,
    protein,
    carbs,
    fats: fats ?? 0
  };
}

function readMealImage(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the selected image."));
        return;
      }
      resolve({ dataUrl: reader.result, mimeType: file.type });
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the selected image."));
    reader.onabort = () => reject(new Error("Image reading was cancelled."));
    reader.readAsDataURL(file);
  });
}

export function MealSnapTabView() {
  const { session, user } = useAuth();
  const userId = user?.id;
  const { pendingMealImage, setPendingMealImage } = usePulse();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mealImageInputRef = useRef<HTMLInputElement | null>(null);
  const processedMealImageRef = useRef<File | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [analysisResult, setAnalysisResult] = useState<MealAnalysis | null>(null);
  const [vaultResult, setVaultResult] = useState<VaultIngestResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(true);
  const [mealLoadError, setMealLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadMeals = async () => {
      await Promise.resolve();
      try {
        if (user?.isGuest && userId) {
          if (active) setMealLogs(readUserLocalData(userId, "meal_logs", []));
          return;
        }
        const supabase = getSupabaseClient();
        const authenticatedUserId = await requireAuthenticatedUser(supabase, session?.user.id);
        const { data, error } = await supabase
          .from("meal_logs")
          .select("id, food_name, calories, macros, timestamp")
          .eq("user_id", authenticatedUserId)
          .order("timestamp", { ascending: false })
          .limit(30);
        if (error) throw error;

        const records = (data ?? []).map((row) => {
          const macros = row.macros as MealAnalysis;
          return {
            id: row.id,
            itemName: row.food_name,
            calories: Number(row.calories),
            protein: Number(macros.protein ?? 0),
            carbs: Number(macros.carbs ?? 0),
            fats: Number(macros.fats ?? 0),
            timestamp: row.timestamp
          };
        });
        if (active) setMealLogs(records);
      } catch (error: unknown) {
        console.error("Could not load the user's meal history.", error);
        if (isNetworkError(error) && userId) {
          if (active) setMealLogs(readUserLocalData(userId, "meal_logs", []));
        } else if (active) {
          setMealLoadError(error instanceof Error ? error.message : "Could not load your meal history.");
        }
      } finally {
        if (active) setIsLoadingMeals(false);
      }
    };

    void loadMeals();
    return () => {
      active = false;
    };
  }, [session?.user.id, user?.isGuest, userId]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;
    const videoElement = videoRef.current;

    const initCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not available in this browser.");
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoElement) {
          videoElement.srcObject = stream;
          await videoElement.play();
        }
        setHasCameraPermission(true);
        setCameraError(null);
      } catch (error: unknown) {
        console.warn("Meal Snap camera access is unavailable.", error);
        if (active) {
          setHasCameraPermission(false);
          setCameraError(error instanceof Error ? error.message : "Camera access was denied.");
        }
      }
    };

    if (!capturedImage) void initCamera();
    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoElement) videoElement.srcObject = null;
    };
  }, [capturedImage, facingMode]);

  const analyzeMealImage = useCallback(async (
    imagePromise: Promise<{ dataUrl: string; mimeType: string }>
  ) => {
    setAnalysisResult(null);
    setVaultResult(null);
    setAnalysisError(null);
    setIsAnalyzing(true);

    try {
      const { dataUrl, mimeType } = await imagePromise;
      setCapturedImage(dataUrl);
      const imageBlob = await fetch(dataUrl).then((response) => response.blob());
      const file = new File([imageBlob], `healthysis-upload.${mimeType.split("/")[1] || "jpg"}`, { type: mimeType });
      const formData = new FormData();
      formData.set("userId", userId ?? "");
      formData.set("file", file);
      const response = await fetch("/api/agent/vault-ingest", {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        body: formData
      });
      const responseText = await response.text();
      let parsedBody: unknown;
      try {
        parsedBody = responseText ? JSON.parse(responseText) as unknown : null;
      } catch {
        throw new Error("Document analysis returned an unreadable response.");
      }
      const body = isVaultIngestResult(parsedBody) ? parsedBody : null;
      const serverError = typeof parsedBody === "object" && parsedBody !== null && "error" in parsedBody && typeof parsedBody.error === "string"
        ? parsedBody.error
        : null;
      if (!response.ok || !body) {
        throw new Error(serverError || response.statusText || "Document analysis failed. Please try again.");
      }
      setVaultResult(body);
      if (user?.isGuest && userId) {
        const existingVault = readUserLocalData<VaultIngestResult["vaultRecord"][]>(userId, "patient_memory_vault", []);
        writeUserLocalData(userId, "patient_memory_vault", [
          {
            ...body.vaultRecord,
            user_id: userId,
            category: body.category,
            storage_folder: body.storageFolder,
            patient_summary: body.patientSummary,
            clinical_alerts: body.alerts,
            file_url: body.vaultRecord.file_url ?? body.vaultRecord.document_url ?? null,
            document_url: body.vaultRecord.document_url ?? null
          },
          ...existingVault.filter((record) => record.id !== body.vaultRecord.id)
        ].slice(0, 100));
      }
      const meal = mealAnalysisFromVault(body);
      if (!meal) return;

      setAnalysisResult(meal);
      const localMeal: MealLog = {
        ...meal,
        id: body.vaultRecord.id,
        timestamp: body.vaultRecord.created_at || new Date().toISOString()
      };
      if (user?.isGuest && userId) {
        const nextMeals = [localMeal, ...readUserLocalData<MealLog[]>(userId, "meal_logs", [])].slice(0, 100);
        writeUserLocalData(userId, "meal_logs", nextMeals);
        setMealLogs(nextMeals);
      } else {
        setMealLogs((previous) => [localMeal, ...previous.filter((entry) => entry.id !== localMeal.id)]);
      }
    } catch (error: unknown) {
      console.error("Meal Snap analysis failed.", error);
      setAnalysisError(error instanceof Error ? error.message : "Meal analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [session, user, userId]);

  const handleMealFile = useCallback((file: File) => {
    void analyzeMealImage(readMealImage(file));
  }, [analyzeMealImage]);

  useEffect(() => {
    if (!pendingMealImage || processedMealImageRef.current === pendingMealImage) return;
    processedMealImageRef.current = pendingMealImage;
    queueMicrotask(() => {
      handleMealFile(pendingMealImage);
      setPendingMealImage(null);
    });
  }, [pendingMealImage, setPendingMealImage, handleMealFile]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleMealFile(file);
    event.currentTarget.value = "";
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setAnalysisError("The camera is not ready. Upload a meal photo to continue.");
      return;
    }
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not capture an image from the camera.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      void analyzeMealImage(Promise.resolve({
        dataUrl: canvas.toDataURL("image/png"),
        mimeType: "image/png"
      }));
    } catch (error: unknown) {
      console.error("Meal Snap camera capture failed.", error);
      setAnalysisError(error instanceof Error ? error.message : "Could not capture a camera image.");
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setVaultResult(null);
    setAnalysisError(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 animate-in fade-in duration-200">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#DCEAEC] bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-2xl font-black text-[#123F55] dark:text-slate-100">Meal Snap</h1>
          <p className="mt-1 text-sm text-[#537783]">Capture or upload a meal photo to analyze and save it to your profile.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => mealImageInputRef.current?.click()}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-xl border border-[#DCEAEC] px-4 py-2.5 text-sm font-bold text-[#076584] disabled:opacity-50 dark:border-slate-700"
          >
            <UploadCloud className="h-4 w-4" /> Upload photo
          </button>
          <button
            type="button"
            onClick={() => setFacingMode((mode) => mode === "environment" ? "user" : "environment")}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-xl border border-[#DCEAEC] px-4 py-2.5 text-sm font-bold text-[#076584] disabled:opacity-50 dark:border-slate-700"
          >
            <RefreshCw className="h-4 w-4" /> Flip camera
          </button>
        </div>
      </header>

      <section className="relative aspect-[4/3] max-h-[460px] overflow-hidden rounded-3xl border-2 border-[#DCEAEC] bg-slate-950 dark:border-slate-800">
        <input
          ref={mealImageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          className="hidden"
          aria-label="Upload meal photo"
        />
        <canvas ref={canvasRef} className="hidden" />
        {capturedImage ? (
          <div className="relative h-full w-full">
            <Image
              src={capturedImage}
              alt="Meal for nutritional analysis"
              fill
              unoptimized
              sizes="100vw"
              className="object-contain"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/45 text-center text-white">
              {isAnalyzing ? (
                <RefreshCw className="h-8 w-8 animate-spin" />
              ) : vaultResult ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              ) : null}
              <p className="text-xl font-black">
                {isAnalyzing ? "Analyzing document..." : vaultResult ? "Analysis complete" : "Meal photo"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              disabled={isAnalyzing}
              className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-xl bg-black/50 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
          </div>
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="absolute top-4 rounded-full bg-slate-950/70 px-4 py-2 text-xs font-bold text-white">
              {hasCameraPermission ? "Camera ready" : "Camera unavailable — upload a photo"}
            </div>
            <button
              type="button"
              onClick={handleCapture}
              disabled={!hasCameraPermission || isAnalyzing}
              className="absolute bottom-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#04939D] text-white shadow-xl disabled:opacity-50"
              aria-label="Capture and analyze meal"
            >
              <Camera className="h-7 w-7" />
            </button>
          </div>
        )}
      </section>

      {(analysisError || cameraError || mealLoadError) && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            {analysisError && <p>{analysisError}</p>}
            {!analysisError && cameraError && !capturedImage && <p>{cameraError}</p>}
            {mealLoadError && <p>{mealLoadError}</p>}
          </div>
        </div>
      )}

      {analysisResult && (
        <section className="space-y-4 rounded-3xl border border-[#DCEAEC] bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#04939D]">AI meal estimate</p>
            <h2 className="text-2xl font-black">{analysisResult.itemName}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Calories", `${analysisResult.calories} kcal`],
              ["Protein", `${analysisResult.protein} g`],
              ["Carbs", `${analysisResult.carbs} g`],
              ["Fats", `${analysisResult.fats} g`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#F8FBFC] p-4 text-center dark:bg-slate-950">
                <p className="text-xs text-[#537783]">{label}</p>
                <p className="mt-1 font-black">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#537783]">Nutrition values are estimates and may vary by ingredients and portion size.</p>
        </section>
      )}

      {vaultResult && (
        <section aria-live="polite" className="space-y-3 rounded-3xl border border-[#BDE5D2] bg-[#F0FBF5] p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Extracted by Healthysis Agent</p>
            <h2 className="mt-1 text-xl font-black">{vaultResult.vaultRecord.title} saved to {vaultResult.storageFolder} folder</h2>
          </div>
          <p className="text-sm leading-6 text-[#315D4D] dark:text-emerald-100">{vaultResult.patientSummary}</p>
          {vaultResult.alerts.map((alert, index) => (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" key={`${index}-${alert}`}>{alert}</p>
          ))}
        </section>
      )}

      <section className="space-y-4 rounded-3xl border border-[#DCEAEC] bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-[#04939D]" />
          <h2 className="text-xl font-black">Your meal history</h2>
        </div>
        {isLoadingMeals ? (
          <div role="status" className="flex items-center gap-3 py-8 text-sm text-[#537783]">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#DCEAEC] border-t-[#04939D]" />
            Loading your meal history…
          </div>
        ) : mealLogs.length === 0 ? (
          <p className="py-6 text-sm text-[#537783]">No meals have been saved to this profile yet.</p>
        ) : (
          <ul className="divide-y divide-[#DCEAEC] dark:divide-slate-800">
            {mealLogs.map((meal) => (
              <li key={meal.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-bold">{meal.itemName}</p>
                  <p className="text-xs text-[#537783]">{new Date(meal.timestamp).toLocaleString()}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold">{meal.calories} kcal</p>
                  <p className="text-xs text-[#537783]">P {meal.protein}g · C {meal.carbs}g · F {meal.fats}g</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
