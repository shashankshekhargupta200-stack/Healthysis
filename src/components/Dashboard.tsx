"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePulse } from "@/context/PulseContext";
import { getSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase";
import { HomeTabView } from "@/components/tabs/HomeTabView";
import { HealthResumeBuilderTabView } from "@/components/tabs/HealthResumeBuilderTabView";
import { MealSnapTabView } from "@/components/tabs/MealSnapTabView";
import { FindDoctorsTabView } from "@/components/tabs/FindDoctorsTabView";
import { UserProfileTabView } from "@/components/tabs/UserProfileTabView";
import { ShieldCheck } from "lucide-react";
import { readUserLocalData, isNetworkError } from "@/lib/localUserData";
import type { HealthResumeData } from "@/types";

export function Dashboard() {
  const { activeTab, setIsPrivacyPolicyOpen, setIsSosOpen, updateProfile } = usePulse();
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
          if (active) {
            updateProfile({
              name: resume?.fullName || user.name,
              phone: resume?.phone || user.phone || "",
              uniqueId: user.id,
              dob: resume?.dob || ""
            });
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
          updateProfile({
            name: data.full_name,
            phone: data.phone ?? "",
            uniqueId: data.id,
            dob: data.dob ?? ""
          });
        }
      } catch (error: unknown) {
        console.error("Could not load the user's profile.", error);
        if (isNetworkError(error) && userId) {
          const resume = readUserLocalData<HealthResumeData | null>(userId, "healthfolio", null);
          if (active && resume) {
            updateProfile({
              name: resume.fullName || user?.name || "",
              phone: resume.phone || user?.phone || "",
              uniqueId: userId,
              dob: resume.dob
            });
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
  }, [session?.user.id, user?.id, user?.isGuest, user?.name, user?.phone, userId, updateProfile]);

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
