"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  ShieldCheck,
  Lock,
  Trash2,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  CameraOff,
  Video,
  Clock,
  DownloadCloud,
  FileCheck2
} from "lucide-react";

export function PrivacySettingsModal() {
  const {
    isPrivacyModalOpen,
    setIsPrivacyModalOpen,
    profile,
    togglePrivateMode,
    antiScreenshotEnabled,
    setAntiScreenshotEnabled,
    purgeAllData
  } = usePulse();

  const [confirmPurge, setConfirmPurge] = useState(false);

  if (!isPrivacyModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl shadow-slate-950 flex flex-col space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Privacy & Security Governance</h3>
              <p className="text-[11px] text-slate-400">Indian DPDP Act 2023 Compliant</p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsPrivacyModalOpen(false);
              setConfirmPurge(false);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3.5 text-xs text-slate-300">
          {/* DPDP Sovereign Vault */}
          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-xs">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Sovereign On-Device Storage</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Your cycle timings, blood sugar observations, lifetime medical history, and food snaps reside exclusively in your device&apos;s encrypted sandbox. Zero cloud storage without explicit cryptographic authorization.
            </p>
            <div className="text-[10px] text-emerald-400 font-mono pt-1">
              Persistent ID: {profile.uniqueId}
            </div>
          </div>

          {/* Policy 1: Screenshot Prevention DRM */}
          <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                <CameraOff className="w-3.5 h-3.5 text-amber-400" />
                Anti-Screenshot Protection
              </span>
              <p className="text-[10px] text-slate-400">
                Disallows device screenshots on sensitive medical screens to prevent accidental data leaks or shoulder-surfing.
              </p>
            </div>
            <button
              onClick={() => setAntiScreenshotEnabled(!antiScreenshotEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                antiScreenshotEnabled ? "bg-emerald-600" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  antiScreenshotEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Policy 2: 30-Day Auto-Purge of Doctor Chats */}
          <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                30-Day Ephemeral Chat Purge
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-800">
                Enforced
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              All consultation chat messages between doctors, health professionals, and patients automatically self-delete after 30 days to uphold the data minimality principle.
            </p>
          </div>

          {/* Policy 3: Download & Screen Recording Permissions */}
          <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-teal-400" />
                Screen Recording & Downloads
              </span>
              <span className="text-[10px] font-mono text-teal-300">
                Authorized Only
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Screen recording is permitted for patient consultation documentation. Arbitrary raw file downloads are restricted; only patient-authorized clinical summaries (such as the 90-Second Doctor Brief) can be exported.
            </p>
          </div>

          {/* Toggle: Private Mode */}
          <div className="bg-slate-850/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="font-semibold text-white text-xs flex items-center gap-1.5">
                {profile.privateMode ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                Private Masking Mode
              </span>
              <p className="text-[10px] text-slate-400">
                Masks clinical words (&quot;PCOS&quot;, &quot;Luteal Phase&quot;, &quot;Joint Pain&quot;) for private viewing in public transit or office.
              </p>
            </div>
            <button
              onClick={togglePrivateMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                profile.privateMode ? "bg-amber-600" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  profile.privateMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Critical Purge Action */}
          <div className="border border-red-900/40 bg-red-950/20 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-red-400 font-semibold text-xs">
              <Trash2 className="w-4 h-4" />
              <span>Instant Data Shredder</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Need to leave zero trace on this device? Purging instantly shreds all local caches, medical history, meal logs, and ID records.
            </p>

            {!confirmPurge ? (
              <button
                onClick={() => setConfirmPurge(true)}
                className="w-full py-2 bg-red-950 hover:bg-red-900 text-red-300 font-semibold rounded-lg border border-red-800/60 transition-colors text-xs flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge My Data</span>
              </button>
            ) : (
              <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                <div className="p-2 bg-red-900/60 border border-red-600 rounded-lg text-[11px] text-white flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                  <span>Are you sure? This action cannot be reversed. All logged cycle data will be wiped.</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmPurge(false)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={purgeAllData}
                    className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md"
                  >
                    Confirm Wipe
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              setIsPrivacyModalOpen(false);
              setConfirmPurge(false);
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
