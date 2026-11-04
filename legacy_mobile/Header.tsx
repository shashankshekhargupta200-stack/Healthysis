"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  User,
  AlertTriangle,
  Copy,
  Check,
  Lock,
  Eye,
  EyeOff,
  Globe,
  CameraOff,
  Stethoscope,
  HeartPulse
} from "lucide-react";
import { UserRole } from "@/types";

export function Header() {
  const {
    profile,
    togglePrivateMode,
    setIsSosOpen,
    setIsProfileOpen,
    setIsPrivacyModalOpen,
    setLanguage,
    switchRole,
    antiScreenshotEnabled,
    mask
  } = usePulse();

  const [copied, setCopied] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard?.writeText(profile.uniqueId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* Top Left: EM-ID / D-ID / P-ID Badge */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-md">
            <span className="text-xs tracking-wider">PS</span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              {/* Copyable Electronic Medical ID (Top Left Corner) */}
              <button
                onClick={handleCopyId}
                className="flex items-center gap-1 text-xs font-mono font-black text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-lg hover:bg-emerald-900/90 transition-colors"
                title="Your Persistent Electronic Medical ID"
              >
                <span>{profile.uniqueId}</span>
                {copied ? (
                  <Check className="w-2.5 h-2.5 text-white" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-60" />
                )}
              </button>

              {/* DPDP On-Device Tag */}
              <button
                onClick={() => setIsPrivacyModalOpen(true)}
                className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 rounded-full px-1.5 py-0.2 hover:text-white"
                title="DPDP Sovereign On-Device Storage"
              >
                DPDP
              </button>
            </div>
            <div className="text-[10px] text-slate-400">
              {profile.role === 'doctor' ? "Doctor Portal" : profile.role === 'health_pro' ? "Health Pro" : "Electronic Medical ID"}
            </div>
          </div>
        </div>

        {/* Center / Right: Role Switcher, SOS, and Top-Right Profile Avatar */}
        <div className="flex items-center gap-1.5">
          {/* Quick Demo Role Switcher (Doctor D-ID vs Patient EM-ID) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="px-2 py-1 bg-slate-800/90 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors"
              title="Switch role view for demo"
            >
              {profile.role === 'doctor' && <Stethoscope className="w-3 h-3 text-teal-400" />}
              {profile.role === 'health_pro' && <HeartPulse className="w-3 h-3 text-emerald-400" />}
              {profile.role === 'patient' && <User className="w-3 h-3 text-slate-300" />}
              <span className="capitalize">{profile.role === 'health_pro' ? 'Coach' : profile.role}</span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 text-xs">
                <button
                  onClick={() => {
                    switchRole('patient');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-2 py-1.5 text-left rounded-lg transition-colors flex items-center justify-between ${
                    profile.role === 'patient' ? "bg-emerald-950 text-emerald-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span>Patient (EM-ID)</span>
                  {profile.role === 'patient' && <Check className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => {
                    switchRole('doctor');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-2 py-1.5 text-left rounded-lg transition-colors flex items-center justify-between ${
                    profile.role === 'doctor' ? "bg-teal-950 text-teal-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span>Doctor (D-ID)</span>
                  {profile.role === 'doctor' && <Check className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => {
                    switchRole('health_pro');
                    setShowRoleMenu(false);
                  }}
                  className={`w-full px-2 py-1.5 text-left rounded-lg transition-colors flex items-center justify-between ${
                    profile.role === 'health_pro' ? "bg-emerald-950 text-emerald-300 font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span>Health Pro (P-ID)</span>
                  {profile.role === 'health_pro' && <Check className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          {/* Red Emergency Contact SOS Pop-up Button */}
          <button
            onClick={() => setIsSosOpen(true)}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-md shadow-red-950/60 transition-transform active:scale-95 animate-pulse-subtle"
            title="Emergency Mental Health & Crisis SOS (Tele-MANAS)"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
            <span className="text-[10px] tracking-wider font-black">SOS</span>
          </button>

          {/* Top Right Corner: Profile Symbol (Opens Lifetime Medical History) */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center justify-center transition-colors shadow-sm"
            title="Open Lifetime Medical Profile & Past Checkups"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sensitive Mode Banner if active */}
      {profile.privateMode && (
        <div className="bg-amber-950/80 border-t border-amber-800/50 -mx-4 -mb-2.5 mt-2 px-4 py-1 flex items-center justify-between text-[11px] text-amber-200">
          <span className="flex items-center gap-1">
            <EyeOff className="w-3 h-3 text-amber-400" />
            Public Screen Mask Active: Medical labels generalized for privacy.
          </span>
          <button
            onClick={togglePrivateMode}
            className="underline text-amber-400 hover:text-amber-100 font-medium"
          >
            Turn off
          </button>
        </div>
      )}
    </header>
  );
}
