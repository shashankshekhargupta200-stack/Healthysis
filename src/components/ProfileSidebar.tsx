"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  User,
  Activity,
  FileText,
  Link as LinkIcon,
  Settings,
  ShieldCheck,
  Info,
  LogOut,
  X,
  ChevronDown,
  ChevronUp,
  Moon,
  Sun,
  Laptop,
  Download,
  ExternalLink
} from "lucide-react";

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileSidebar({ isOpen, onClose }: ProfileSidebarProps) {
  const { profile, signOut, theme, setTheme, setActiveTab, setIsPrivacyPolicyOpen } = usePulse();

  // Accordion expansion states
  const [expandedSection, setExpandedSection] = useState<string | null>("activity");
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut();
    } catch (error: unknown) {
      console.error("Could not sign out of Supabase.", error);
      setSignOutError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 25% Dark Backdrop Overlay to Click-to-Close */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#123F55]/70 backdrop-blur-xs transition-opacity"
        aria-label="Close sidebar overlay"
      />

      {/* 75% Screen Width Slide-Over Drawer */}
      <aside
        className="fixed inset-y-0 right-0 w-[85vw] sm:w-[75vw] md:w-[60vw] lg:w-[45vw] bg-white text-[#123F55] shadow-2xl border-l border-[#DCEAEC] flex flex-col justify-between overflow-y-auto z-50 animate-in slide-in-from-right duration-300"
      >
        {/* ============================================================ */}
        {/* TOP: User Identity Header & Close Button                     */}
        {/* ============================================================ */}
        <div className="p-6 sm:p-8 bg-[#F8FBFC] border-b border-[#DCEAEC] flex items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-healthysis-signature flex items-center justify-center text-white shadow-md shadow-[#04939D]/20 overflow-hidden">
              {profile.userProfilePic ? (
                <img
                  src={profile.userProfilePic}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-7 h-7 text-white stroke-[2.2]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-[#123F55] tracking-tight">
                  {profile.name || "Patient Profile"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#DDF2F0] text-[#076584] border border-[#DCEAEC]">
                  {profile.role}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs font-bold text-[#076584] bg-white px-2 py-0.5 rounded-lg border border-[#DCEAEC]">
                  {profile.uniqueId}
                </span>
                <span className="text-xs text-[#537783] font-medium">
                  Supabase account
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white hover:bg-[#F8FBFC] border border-[#DCEAEC] text-[#537783] flex items-center justify-center transition-all touch-target"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================ */}
        {/* MENU ITEMS LIST (GENEROUS PADDING & BORDER-BOTTOM SEPARATORS) */}
        {/* ============================================================ */}
        <div className="flex-1 divide-y divide-[#DCEAEC] p-6 sm:p-8 space-y-2">
          
          {/* 1. PERSONAL DETAILS */}
          <div className="py-4 border-b border-[#DCEAEC]">
            <button
              type="button"
              onClick={() => toggleSection("personal")}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#DDF2F0] text-[#076584] flex items-center justify-center border border-[#DCEAEC] group-hover:bg-[#076584] group-hover:text-white transition-colors">
                  <User className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-base font-black text-[#123F55] block">
                    Personal Details
                  </span>
                  <span className="text-xs text-[#537783] font-medium block">
                    Age, biometrics, BMI, and demographic data
                  </span>
                </div>
              </div>
              {expandedSection === "personal" ? (
                <ChevronUp className="w-5 h-5 text-[#829AA3]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#829AA3]" />
              )}
            </button>

            {expandedSection === "personal" && (
              <div className="mt-4 p-4 rounded-2xl bg-[#F8FBFC] border border-[#DCEAEC] space-y-3 text-xs animate-in fade-in duration-150">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[#829AA3] font-bold block text-[10px] uppercase">Full Name</span>
                    <span className="font-extrabold text-[#123F55] text-sm">{profile.name}</span>
                  </div>
                  <div>
                    <span className="text-[#829AA3] font-bold block text-[10px] uppercase">Age / Gender</span>
                    <span className="font-extrabold text-[#123F55] text-sm">
                      {profile.age || "—"} yrs • {profile.gender || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#829AA3] font-bold block text-[10px] uppercase">DOB</span>
                    <span className="font-extrabold text-[#123F55] text-sm">{profile.dob || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[#829AA3] font-bold block text-[10px] uppercase">Height &amp; Weight</span>
                    <span className="font-extrabold text-[#123F55] text-sm">
                      {profile.height || "—"} • {profile.weight || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#829AA3] font-bold block text-[10px] uppercase">Calculated BMI</span>
                    <span className="font-extrabold text-[#076584] text-sm">
                      {profile.bmi || "—"} {profile.bmiCategory && `(${profile.bmiCategory})`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#829AA3] font-bold block text-[10px] uppercase">Health ID Hash</span>
                    <span className="font-mono font-bold text-[#123F55] text-xs">{profile.uniqueId || "—"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. YOUR ACTIVITY */}
          <div className="py-4 border-b border-[#DCEAEC]">
            <button
              type="button"
              onClick={() => toggleSection("activity")}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#CBEFE0] text-[#2CAC7F] flex items-center justify-center border border-[#DCEAEC] group-hover:bg-[#2CAC7F] group-hover:text-white transition-colors">
                  <Activity className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-base font-black text-[#123F55] block">
                    Your Activity
                  </span>
                  <span className="text-xs text-[#537783] font-medium block">
                    Past Diseases, Current Medications &amp; Upcoming Appointments
                  </span>
                </div>
              </div>
              {expandedSection === "activity" ? (
                <ChevronUp className="w-5 h-5 text-[#829AA3]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#829AA3]" />
              )}
            </button>

            {expandedSection === "activity" && (
              <div className="mt-4 rounded-2xl bg-[#F8FBFC] p-4 text-xs text-[#537783]">
                Medical history and medications are managed in your Healthfolio.
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    setActiveTab("healthfolio");
                  }}
                  className="ml-1 font-bold text-[#076584] underline"
                >
                  Open Healthfolio
                </button>
              </div>
            )}
          </div>

          {/* 3. HEALTH RESUME */}
          <div className="py-4 border-b border-[#DCEAEC]">
            <button
              type="button"
              onClick={() => toggleSection("resume")}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#DDF2F0] text-[#076584] flex items-center justify-center border border-[#DCEAEC] group-hover:bg-[#076584] group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-base font-black text-[#123F55] block">
                    Health Resume
                  </span>
                  <span className="text-xs text-[#537783] font-medium block">
                    One-page clinical summary for specialist visits
                  </span>
                </div>
              </div>
              {expandedSection === "resume" ? (
                <ChevronUp className="w-5 h-5 text-[#829AA3]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#829AA3]" />
              )}
            </button>

            {expandedSection === "resume" && (
              <div className="mt-4 p-4 rounded-2xl bg-[#F8FBFC] border border-[#DCEAEC] space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#123F55]">
                    Health Resume Brief (ID: {profile.uniqueId})
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#CBEFE0] text-[#2CAC7F]">
                    Current profile
                  </span>
                </div>
                <p className="text-xs text-[#537783] leading-relaxed font-medium">
                  This summary contains information you have entered in your Healthfolio.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setActiveTab("healthfolio");
                    }}
                    className="btn-healthysis-primary flex-1 py-2.5 px-3 rounded-xl text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 touch-target"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Healthfolio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setActiveTab("healthfolio");
                    }}
                    className="btn-healthysis-secondary py-2.5 px-3 rounded-xl font-extrabold text-xs transition-colors flex items-center gap-1.5 touch-target"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. CONNECTIONS */}
          <div className="py-4 border-b border-[#DCEAEC]">
            <button
              type="button"
              onClick={() => toggleSection("connections")}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#C6E2F1]/50 text-[#076584] flex items-center justify-center border border-[#DCEAEC] group-hover:bg-[#076584] group-hover:text-white transition-colors">
                  <LinkIcon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-base font-black text-[#123F55] block">
                    Connections
                  </span>
                  <span className="text-xs text-[#537783] font-medium block">
                    Active doctor consultations &amp; chat histories
                  </span>
                </div>
              </div>
              {expandedSection === "connections" ? (
                <ChevronUp className="w-5 h-5 text-[#829AA3]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#829AA3]" />
              )}
            </button>

            {expandedSection === "connections" && (
              <div className="mt-4 rounded-2xl bg-[#F8FBFC] p-4 text-xs text-[#537783]">
                No connected providers are available.
              </div>
            )}
          </div>

          {/* 5. SETTINGS */}
          <div className="py-4 border-b border-[#DCEAEC]">
            <button
              type="button"
              onClick={() => toggleSection("settings")}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#F8FBFC] text-[#123F55] flex items-center justify-center border border-[#DCEAEC] group-hover:bg-[#076584] group-hover:text-white transition-colors">
                  <Settings className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-base font-black text-[#123F55] block">
                    Settings
                  </span>
                  <span className="text-xs text-[#537783] font-medium block">
                    Theme mode, notifications &amp; privacy preferences
                  </span>
                </div>
              </div>
              {expandedSection === "settings" ? (
                <ChevronUp className="w-5 h-5 text-[#829AA3]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#829AA3]" />
              )}
            </button>

            {expandedSection === "settings" && (
              <div className="mt-4 p-4 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950/70 border border-[#DCEAEC] dark:border-slate-800 space-y-4 animate-in fade-in duration-150 text-xs">
                {/* 3-STATE LIGHT / DARK / SYSTEM MODE TOGGLE */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {theme === "dark" ? (
                        <Moon className="w-4 h-4 text-indigo-400" />
                      ) : theme === "system" ? (
                        <Laptop className="w-4 h-4 text-[#04939D] dark:text-[#2CAC7F]" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                      )}
                      <div>
                        <span className="font-extrabold text-[#123F55] dark:text-slate-200 block">Display Theme</span>
                        <span className="text-[#537783] dark:text-slate-400 text-[11px] capitalize">
                          Active: <strong>{theme} mode</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        theme === "light"
                          ? "bg-[#04939D] text-white border-[#04939D] shadow-xs"
                          : "bg-white dark:bg-slate-900 text-[#123F55] dark:text-slate-300 border-[#DCEAEC] dark:border-slate-800 hover:bg-[#F8FBFC] dark:hover:bg-slate-800"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                      <span>Light</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        theme === "dark"
                          ? "bg-[#04939D] text-white border-[#04939D] shadow-xs"
                          : "bg-white dark:bg-slate-900 text-[#123F55] dark:text-slate-300 border-[#DCEAEC] dark:border-slate-800 hover:bg-[#F8FBFC] dark:hover:bg-slate-800"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dark</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme("system")}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        theme === "system"
                          ? "bg-[#04939D] text-white border-[#04939D] shadow-xs"
                          : "bg-white dark:bg-slate-900 text-[#123F55] dark:text-slate-300 border-[#DCEAEC] dark:border-slate-800 hover:bg-[#F8FBFC] dark:hover:bg-slate-800"
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5 text-[#076584] dark:text-[#77C86F]" />
                      <span>System</span>
                    </button>
                  </div>
                </div>

                {/* Privacy Safeguard Status */}
                <div className="pt-3 border-t border-[#DCEAEC] flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-[#123F55] block">Background Screen Obfuscation</span>
                    <span className="text-[#537783] text-[11px]">Blurs this page when switching apps</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#CBEFE0] text-[#2CAC7F] font-black text-[10px] uppercase">
                    Active
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 6. CUSTOMER SUPPORT & PRIVACY POLICY */}
          <div className="py-4 border-b border-[#DCEAEC]">
            <button
              type="button"
              onClick={() => toggleSection("support")}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#DDF2F0] text-[#076584] flex items-center justify-center border border-[#DCEAEC] group-hover:bg-[#076584] group-hover:text-white transition-colors">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-base font-black text-[#123F55] block">
                    Customer Support &amp; Privacy Policy
                  </span>
                  <span className="text-xs text-[#537783] font-medium block">
                    DPDP Act compliance, emergency helpline &amp; grievance officer
                  </span>
                </div>
              </div>
              {expandedSection === "support" ? (
                <ChevronUp className="w-5 h-5 text-[#829AA3]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#829AA3]" />
              )}
            </button>

            {expandedSection === "support" && (
              <div className="mt-4 p-4 rounded-2xl bg-[#F8FBFC] border border-[#DCEAEC] space-y-3 animate-in fade-in duration-150 text-xs">
                <div className="space-y-1">
                  <span className="font-extrabold text-[#123F55] block">24/7 National Emergency &amp; Crisis Lines</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-3 py-1 rounded-lg bg-[#DDF2F0] text-[#076584] font-bold">
                      Tele-MANAS: 14416 (Toll-Free)
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-red-100 text-red-900 font-bold">
                      Ambulance: 112
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#DCEAEC] text-[#537783] leading-relaxed font-medium">
                  Health records are scoped to your signed-in Supabase account. View the privacy policy for details about authentication and data access.
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setIsPrivacyPolicyOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#DDF2F0] border border-[#0EA6B7] text-[#076584] font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors touch-target"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#04939D]" />
                    <span>View Privacy &amp; Security Policy</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 7. ABOUT US */}
          <div className="py-4 border-b border-[#DCEAEC]">
            <button
              type="button"
              onClick={() => toggleSection("about")}
              className="w-full flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Info className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-base font-black text-[#123F55] block">
                    About Us
                  </span>
                  <span className="text-xs text-[#537783] font-medium block">
                    Mission, clinical advisory board &amp; research
                  </span>
                </div>
              </div>
              {expandedSection === "about" ? (
                <ChevronUp className="w-5 h-5 text-[#829AA3]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#829AA3]" />
              )}
            </button>

            {expandedSection === "about" && (
              <div className="mt-4 p-4 rounded-2xl bg-[#F8FBFC] border border-[#DCEAEC] space-y-2 animate-in fade-in duration-150 text-xs">
                <h4 className="font-extrabold text-[#123F55]">
                  Healthysis Continuous Care Ecosystem
                </h4>
                <p className="text-[#537783] leading-relaxed font-medium">
                  We empower women and individuals navigating silent chronic conditions like PCOS, insulin resistance, and burnout to achieve sustained metabolic equilibrium without shame or clinical friction.
                </p>
                <div className="text-[11px] text-[#076584] font-bold pt-1">
                  Clinical Advisory: AIIMS New Delhi • Manipal Hospital Bengaluru • Apollo Endocrinology
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ============================================================ */}
        {/* BASE: SIGN OUT BUTTON                                        */}
        {/* ============================================================ */}
        <div className="p-6 sm:p-8 bg-[#F8FBFC] border-t border-[#DCEAEC] sticky bottom-0 z-20">
          {signOutError && (
            <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {signOutError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="w-full py-4 px-6 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-200 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 touch-target"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out &amp; Return to Gateway</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
