"use client";

import React from "react";
import { usePulse } from "@/context/PulseContext";
import {
  User,
  X,
  Globe,
  ShieldCheck,
  Check
} from "lucide-react";
import { Language } from "@/types";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const languages: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिंदी" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
];

export function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const {
    profile,
    setLanguage,
    setIsPrivacyPolicyOpen
  } = usePulse();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-[#DCEAEC] dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#F8FBFC] dark:bg-slate-950 border-b border-[#DCEAEC] dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF2F0] dark:bg-teal-950/60 border border-[#DCEAEC] dark:border-teal-800 text-[#076584] dark:text-teal-300 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 id="profile-settings-title" className="font-extrabold text-[#123F55] dark:text-slate-100 text-lg">
                Profile &amp; Health Settings
              </h3>
              <p className="text-xs text-[#537783] dark:text-slate-400 font-medium">
                Biometrics, Sovereign Credentials &amp; Language
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl text-[#829AA3] dark:text-slate-400 hover:text-[#123F55] dark:hover:text-slate-200 hover:bg-[#F8FBFC] dark:hover:bg-slate-800 flex items-center justify-center transition-colors touch-target"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Sovereign ID Banner */}
          <div className="p-5 rounded-2xl bg-[#DDF2F0] dark:bg-teal-950/40 border border-[#DCEAEC] dark:border-teal-900/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#076584] dark:text-teal-300 block">
                Local Profile ID
              </span>
              <div className="text-2xl font-black font-mono text-[#123F55] dark:text-slate-100 tracking-wider">
                {profile.uniqueId}
              </div>
              <span className="text-xs text-[#04939D] dark:text-teal-400 font-semibold capitalize flex items-center gap-1">
                Role: {profile.role}
              </span>
            </div>
          </div>

          {/* User Biometrics Card */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[#537783] dark:text-slate-400 text-sm uppercase tracking-wider">
              Registered Biometrics
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800">
                <span className="text-[#829AA3] dark:text-slate-400 font-medium block">Full Name</span>
                <span className="text-[#123F55] dark:text-slate-100 font-bold text-sm mt-0.5 block">{profile.name}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800">
                <span className="text-[#829AA3] dark:text-slate-400 font-medium block">Age &amp; DOB</span>
                <span className="text-[#123F55] dark:text-slate-100 font-bold text-sm mt-0.5 block">
                  {profile.age || "—"}y ({profile.dob || "—"})
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800">
                <span className="text-[#829AA3] dark:text-slate-400 font-medium block">Height &amp; Weight</span>
                <span className="text-[#123F55] dark:text-slate-100 font-bold text-sm mt-0.5 block">
                  {profile.height} / {profile.weight}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800">
                <span className="text-[#829AA3] dark:text-slate-400 font-medium block">Mobile Contact</span>
                <span className="text-[#123F55] dark:text-slate-100 font-bold text-sm mt-0.5 block">
                  {profile.phone}
                </span>
              </div>
            </div>
          </div>

          {/* Language Selector (5 Languages) */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[#537783] dark:text-slate-400 text-sm uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#04939D] dark:text-teal-400" />
              <span>Platform Language</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {languages.map((lang) => {
                const isActive = profile.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all touch-target ${
                      isActive
                        ? "border-[#0EA6B7] bg-[#DDF2F0] dark:bg-teal-950/60 text-[#076584] dark:text-teal-300 font-extrabold shadow-xs"
                        : "border-[#DCEAEC] dark:border-slate-800 hover:border-[#0EA6B7] bg-[#F8FBFC] dark:bg-slate-950 text-[#537783] dark:text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{lang.label}</div>
                      <div className="text-[11px] text-[#829AA3] dark:text-slate-500">{lang.native}</div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-[#04939D] dark:text-teal-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Privacy & Security Policy Shortcut */}
          <div className="pt-2 border-t border-[#DCEAEC] dark:border-slate-800 space-y-2">
            <h4 className="font-extrabold text-[#123F55] dark:text-slate-100 text-sm flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#04939D] dark:text-teal-400" />
              <span>Privacy, Security &amp; National Health Grid</span>
            </h4>
            <p className="text-xs text-[#537783] dark:text-slate-400">
              Review ABDM &amp; ABHA compliance, local-first DPDP Act safeguards, and end-to-end cryptographic encryption.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                setIsPrivacyPolicyOpen(true);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-[#DDF2F0] dark:bg-teal-950/40 hover:bg-[#C6E2F1] dark:hover:bg-teal-950/60 text-[#076584] dark:text-teal-300 font-extrabold text-xs transition-colors flex items-center justify-center gap-2 border border-[#DCEAEC] dark:border-teal-900/50"
            >
              <ShieldCheck className="w-4 h-4 text-[#04939D] dark:text-teal-400" />
              <span>Read Full Privacy &amp; Security Policy</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
