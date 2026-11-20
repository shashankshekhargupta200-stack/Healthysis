"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePulse } from "@/context/PulseContext";
import { useVaultUpload } from "@/context/VaultUploadContext";
import { getSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase";
import { HomeTabView } from "@/components/tabs/HomeTabView";
import { HealthResumeBuilderTabView } from "@/components/tabs/HealthResumeBuilderTabView";
import { MealSnapTabView } from "@/components/tabs/MealSnapTabView";
import { FindDoctorsTabView } from "@/components/tabs/FindDoctorsTabView";
import { UserProfileTabView } from "@/components/tabs/UserProfileTabView";
import { readUserLocalData, isNetworkError } from "@/lib/localUserData";
import type { HealthResumeData } from "@/types";

export function Dashboard() {
  const { activeTab, setActiveTab, setIsPrivacyPolicyOpen, setIsSosOpen, updateProfile, updateHealthResume } = usePulse();
  const {
    activeJob,
    isUploading,
    uploadProgress,
    cancelUpload,
    completionNotice,
    dismissNotice,
    dismissVerification,
    dismissDuplicate
  } = useVaultUpload();
  const { session, user, authError } = useAuth();
  const userId = user?.id;
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      await Promise.resolve();
      try {
        if (user?.isGuest && userId) {
          const resume = readUserLocalData<HealthResumeData | null>(userId, "healthfolio", null);
          const savedProfile = readUserLocalData<Record<string, unknown> | null>(userId, "user_profile", null);
          if (active) {
            updateProfile({
              name: (typeof savedProfile?.name === "string" ? savedProfile.name : "") || resume?.fullName || user.name,
              phone: (typeof savedProfile?.phone === "string" ? savedProfile.phone : "") || resume?.phone || user.phone || "",
              uniqueId: (typeof savedProfile?.patientId === "string" ? savedProfile.patientId : "") || user.id,
              dob: (typeof savedProfile?.dob === "string" ? savedProfile.dob : "") || resume?.dob || "",
              location: (typeof savedProfile?.location === "string" ? savedProfile.location : "") || resume?.location || "",
              email: (typeof savedProfile?.email === "string" ? savedProfile.email : "") || resume?.email || user.email || ""
            });
            if (resume) {
              updateHealthResume(resume);
            }
          }
          return;
        }
        const supabase = getSupabaseClient();
        const authenticatedUserId = await requireAuthenticatedUser(supabase, session?.user.id);
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, phone, dob, blood_group, abha_id")
          .eq("id", authenticatedUserId)
          .maybeSingle();
        if (error) throw error;
        if (active && data) {
          const resume = readUserLocalData<HealthResumeData | null>(authenticatedUserId, "healthfolio", null);
          const savedProfile = readUserLocalData<Record<string, unknown> | null>(authenticatedUserId, "user_profile", null);
          updateProfile({
            name: data.full_name,
            phone: data.phone ?? "",
            uniqueId: data.id,
            dob: data.dob ?? "",
            location: (typeof savedProfile?.location === "string" ? savedProfile.location : "") || resume?.location || "",
            email: (typeof savedProfile?.email === "string" ? savedProfile.email : "") || resume?.email || session?.user.email || ""
          });
          if (resume) {
            updateHealthResume(resume);
          }
        }
      } catch (error: unknown) {
        console.error("Could not load the user's profile.", error);
        if (isNetworkError(error) && userId) {
          const resume = readUserLocalData<HealthResumeData | null>(userId, "healthfolio", null);
          const savedProfile = readUserLocalData<Record<string, unknown> | null>(userId, "user_profile", null);
          if (active && (resume || savedProfile)) {
            updateProfile({
              name: (typeof savedProfile?.name === "string" ? savedProfile.name : "") || resume?.fullName || user?.name || "",
              phone: (typeof savedProfile?.phone === "string" ? savedProfile.phone : "") || resume?.phone || user?.phone || "",
              uniqueId: (typeof savedProfile?.patientId === "string" ? savedProfile.patientId : "") || userId,
              dob: (typeof savedProfile?.dob === "string" ? savedProfile.dob : "") || resume?.dob || "",
              location: (typeof savedProfile?.location === "string" ? savedProfile.location : "") || resume?.location || "",
              email: (typeof savedProfile?.email === "string" ? savedProfile.email : "") || resume?.email || user?.email || ""
            });
            if (resume) {
              updateHealthResume(resume);
            }
          }
        } else if (active) {
          setProfileError(error instanceof Error ? error.message : "Could not load your profile.");
        }
      } finally {
        if (active) setIsLoadingProfile(false);
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [session?.user.id, user?.id, user?.isGuest, user?.name, user?.phone, userId, updateProfile, updateHealthResume]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 min-h-[calc(100vh-5rem)] flex flex-col justify-between">
      {isLoadingProfile && (
        <div role="status" className="mb-4 flex items-center justify-center gap-2 text-sm text-[#537783]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#DCEAEC] border-t-[#04939D]" />
          Loading your profile…
        </div>
      )}
      {profileError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{profileError}</span>
        </div>
      )}
      {authError && !user?.isGuest && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{authError}</span>
        </div>
      )}
      {/* Persistent non-blocking vault upload and completion notices across tab switches */}
      {activeTab !== "healthfolio" && activeTab !== "doctor-brief" && (
        <>
          {isUploading && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50/90 p-3.5 px-4 text-xs font-semibold text-[#076584] shadow-xs dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <LoaderCircle className="h-4 w-4 animate-spin shrink-0 text-[#04939D]" />
                <span className="truncate">
                  <strong>Scanning Document:</strong> {uploadProgress}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("healthfolio")}
                  className="rounded-lg bg-[#04939D] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#037c85] transition-colors"
                >
                  View in Healthfolio
                </button>
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activeJob?.status === "requires_confirmation" && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-3.5 px-4 text-xs font-semibold text-amber-900 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="truncate">
                  <strong>Action Required:</strong> Confirm ownership of uploaded report &ldquo;{activeJob.fileName}&rdquo;.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("healthfolio")}
                  className="rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700 transition-colors"
                >
                  Review &amp; Confirm
                </button>
                <button
                  type="button"
                  onClick={dismissVerification}
                  className="rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {activeJob?.status === "duplicate_detected" && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 p-3.5 px-4 text-xs font-semibold text-amber-900 shadow-xs dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="truncate">
                  <strong>Duplicate Detected:</strong> Report &ldquo;{activeJob.fileName}&rdquo; already exists in Healthfolio.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("healthfolio")}
                  className="rounded-lg bg-amber-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-amber-700 transition-colors"
                >
                  Review Duplicate
                </button>
                <button
                  type="button"
                  onClick={dismissDuplicate}
                  className="rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {completionNotice && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/95 p-3.5 px-4 text-xs font-semibold text-emerald-900 shadow-xs dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate">
                  <strong>Analysis Complete:</strong> &ldquo;{completionNotice.title}&rdquo; was saved to Healthfolio Vault!
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dismissNotice();
                    setActiveTab("healthfolio");
                  }}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  View in Healthfolio
                </button>
                <button
                  type="button"
                  aria-label="Dismiss notice"
                  onClick={dismissNotice}
                  className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab-based Routing (SPA Single Page Application with smooth transition) */}
      <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === "home" && <HomeTabView />}
        {(activeTab === "healthfolio" || activeTab === "doctor-brief") && <HealthResumeBuilderTabView />}
        {activeTab === "snap" && <MealSnapTabView />}
        {activeTab === "find-doctors" && <FindDoctorsTabView />}
        {(activeTab === "user-profile" || activeTab === "truth-engine") && <UserProfileTabView />}
      </div>

      {/* Persistent Clean Global Footer */}
      <footer className="mt-16 pt-8 border-t border-[#DCEAEC] dark:border-slate-800 text-xs text-[#537783] dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#123F55] dark:text-slate-100">Healthysis</span>
          <span>&bull;</span>
          <span>Sovereign Healthcare &amp; Clinical Records</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setIsPrivacyPolicyOpen(true)}
            className="hover:text-[#04939D] flex items-center gap-1 transition-colors underline decoration-dotted"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#2CAC7F]" />
            <span>Privacy &amp; Security Policy</span>
          </button>
          <span>&bull;</span>
          <span className="text-[#829AA3]">Health records are protected by your Supabase account</span>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => setIsSosOpen(true)}
            className="hover:text-rose-600 transition-colors"
          >
            Emergency (14416)
          </button>
        </div>
      </footer>
    </div>
  );
}
