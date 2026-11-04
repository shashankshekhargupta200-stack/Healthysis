"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  User,
  ShieldCheck,
  FileText,
  Droplet,
  Ruler,
  Weight,
  Activity,
  Phone,
  Mail,
  MapPin,
  Lock,
  AlertCircle,
  Share2,
  Check
} from "lucide-react";

export function UserProfileTabView() {
  const {
    profile,
    healthResume,
    setActiveTab
  } = usePulse();

  const [isCopied, setIsCopied] = useState(false);
  const patientId = healthResume.patientId || profile.uniqueId;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard?.writeText(patientId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error: unknown) {
      console.error("Could not copy the profile ID.", error);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* ============================================================ */}
      {/* 1. HERO HEADER: SWASTHYA RESUME & ABHA SOVEREIGN IDENTITY    */}
      {/* ============================================================ */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-[#DCEAEC] dark:border-slate-800 shadow-sm relative overflow-hidden">
        {/* Ambient subtle decorative mint/teal glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#DDF2F0]/80 via-[#C6E2F1]/30 to-transparent dark:from-teal-950/40 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Patient Avatar & Primary Bio */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-3 border-[#0EA6B7] shadow-md bg-[#DDF2F0] dark:bg-slate-800 flex items-center justify-center">
                {(profile.userProfilePic || healthResume.userProfilePic || healthResume.profilePhotoUrl) ? (
                  <img
                    src={profile.userProfilePic || healthResume.userProfilePic || healthResume.profilePhotoUrl}
                    alt={healthResume.fullName || profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-[#076584] dark:text-teal-400 stroke-[1.8]" />
                )}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#2CAC7F] text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900 text-[10px] font-black shadow-xs">
                ✓
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-[#123F55] dark:text-slate-100 tracking-tight">
                  {healthResume.fullName || profile.name}
                </h1>
                <span className="px-3 py-1 rounded-full bg-[#DDF2F0] dark:bg-teal-950/60 text-[#076584] dark:text-teal-300 text-xs font-extrabold uppercase tracking-wider border border-[#DCEAEC] dark:border-teal-800">
                  Personal Health Profile
                </span>
              </div>

              <p className="text-sm font-semibold text-[#537783] dark:text-slate-300">
                {healthResume.age || "—"} yrs • {healthResume.gender || "—"} • DOB: {healthResume.dob || "—"}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-[#537783] dark:text-slate-400">
                <span className="flex items-center gap-1 font-mono font-bold bg-[#F8FBFC] dark:bg-slate-950 px-2.5 py-1 rounded-xl border border-[#DCEAEC] dark:border-slate-800 text-[#123F55] dark:text-slate-200">
                  <Lock className="w-3.5 h-3.5 text-[#04939D]" />
                  ID: {patientId || "—"}
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="ml-1 text-[#0EA6B7] hover:text-[#076584] dark:hover:text-teal-300"
                    title="Copy Patient ID"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-[#2CAC7F]" /> : <Share2 className="w-3 h-3" />}
                  </button>
                </span>

                <span className="flex items-center gap-1 font-bold text-[#076584] dark:text-teal-300">
                  <ShieldCheck className="w-4 h-4 text-[#2CAC7F]" />
                  DPDP Act Encrypted
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("healthfolio")}
              className="btn-healthysis-primary w-full sm:w-auto py-3.5 px-6 rounded-2xl text-white font-black text-sm shadow-lg shadow-[#04939D]/25 transition-all flex items-center justify-center gap-2 touch-target"
            >
              <FileText className="w-4 h-4 stroke-[2.5]" />
              <span>Open Healthfolio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("healthfolio")}
              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-800 hover:bg-[#DDF2F0] dark:hover:bg-slate-700 border border-[#DCEAEC] dark:border-slate-700 text-[#076584] dark:text-teal-300 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 stroke-[2.2]" />
              <span>Edit Healthfolio</span>
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. CORE BIOLOGICAL & CLINICAL VITALS GRID                    */}
      {/* ============================================================ */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Blood Group */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-[#DCEAEC] dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
            <Droplet className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#829AA3] dark:text-slate-400">Blood Group</span>
            <div className="text-xl font-black text-[#123F55] dark:text-slate-100">{healthResume.bloodGroup || "—"}</div>
          </div>
        </div>

        {/* Height */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-[#DCEAEC] dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#DDF2F0] dark:bg-teal-950/40 text-[#04939D] dark:text-teal-300 flex items-center justify-center shrink-0">
            <Ruler className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#829AA3] dark:text-slate-400">Height</span>
            <div className="text-xl font-black text-[#123F55] dark:text-slate-100">{healthResume.heightCm ? `${healthResume.heightCm} cm` : "—"}</div>
          </div>
        </div>

        {/* Weight */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-[#DCEAEC] dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C6E2F1] dark:bg-slate-800 text-[#076584] dark:text-teal-300 flex items-center justify-center shrink-0">
            <Weight className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#829AA3] dark:text-slate-400">Weight</span>
            <div className="text-xl font-black text-[#123F55] dark:text-slate-100">{healthResume.weightKg ? `${healthResume.weightKg} kg` : "—"}</div>
          </div>
        </div>

        {/* Calculated BMI */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-[#DCEAEC] dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#CBEFE0] dark:bg-emerald-950/40 text-[#2CAC7F] flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#829AA3] dark:text-slate-400">BMI Score</span>
            <div className="text-xl font-black text-[#123F55] dark:text-slate-100">
              {healthResume.bmi || "—"} {healthResume.bmiCategory && <span className="text-xs text-[#2CAC7F] dark:text-emerald-400 font-bold">({healthResume.bmiCategory})</span>}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. SPLIT SECTION: ABHA DIGITAL CARD & CONTACT DETAILS        */}
      {/* ============================================================ */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* ABHA Digital Registration Card (5 Cols) */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#076584] via-[#04939D] to-[#0EA6B7] text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-[#04939D]/20 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                  Digital Health ID
                </span>
                  <span className="text-xs font-bold text-white/80">Profile details</span>
              </div>
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>

            <div className="pt-2">
              <span className="text-xs text-white/70 uppercase tracking-widest font-semibold block">ABHA Number</span>
              <div className="text-2xl font-mono font-black tracking-widest text-white">
                {healthResume.abhaId || "Not provided"}
              </div>
            </div>

            <div>
              <span className="text-xs text-white/70 uppercase tracking-wider font-semibold block">ABHA Address</span>
              <div className="text-sm font-semibold text-white/95">
                {healthResume.abhaAddress || "Not provided"}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 flex items-center justify-between mt-6">
            <div className="text-[11px] text-white/80">
              Health ID information saved in your Healthfolio
            </div>
          </div>
        </div>

        {/* Contact & Demographics Details (7 Cols) */}
        <div className="md:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-[#DCEAEC] dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCEAEC] dark:border-slate-800">
            <h3 className="font-extrabold text-[#123F55] dark:text-slate-100 text-base sm:text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-[#04939D]" />
              <span>Contact &amp; Emergency Registry</span>
            </h3>
            <span className="text-xs font-bold text-[#2CAC7F] bg-[#CBEFE0] dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-full">
            User profile
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800">
              <Phone className="w-4 h-4 text-[#0EA6B7] mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#829AA3] dark:text-slate-400">Phone Number</span>
                <div className="text-sm font-bold text-[#123F55] dark:text-slate-100">{healthResume.phone || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800">
              <Mail className="w-4 h-4 text-[#0EA6B7] mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#829AA3] dark:text-slate-400">Email Address</span>
                <div className="text-sm font-bold text-[#123F55] dark:text-slate-100">{healthResume.email || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800">
              <MapPin className="w-4 h-4 text-[#0EA6B7] mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#829AA3] dark:text-slate-400">Location</span>
                <div className="text-sm font-bold text-[#123F55] dark:text-slate-100">{healthResume.location || "—"}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold uppercase text-[#829AA3] dark:text-slate-400">Allergies Summary</span>
                <div className="text-sm font-bold text-[#123F55] dark:text-slate-100">{healthResume.allergiesSummary || "Not provided"}</div>
              </div>
            </div>
          </div>

          {/* Quick Healthfolio Banner */}
          <div className="p-4 rounded-2xl bg-[#DDF2F0] dark:bg-teal-950/40 border border-[#DCEAEC] dark:border-teal-900/50 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-[#076584] dark:text-teal-300 flex items-center justify-center font-bold">
                📄
              </div>
              <div>
                <h4 className="font-bold text-[#076584] dark:text-teal-300 text-sm">Healthfolio</h4>
                <p className="text-xs text-[#537783] dark:text-slate-400">View and manage your personal health information.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("healthfolio")}
              className="text-xs font-black text-[#04939D] dark:text-teal-300 hover:underline whitespace-nowrap"
            >
              View &rarr;
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
