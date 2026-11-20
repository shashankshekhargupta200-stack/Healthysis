"use client";

import React from "react";
import { usePulse } from "@/context/PulseContext";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  Stethoscope,
  PhoneCall,
  User,
  Tv,
  Sun,
  Moon,
  Laptop
} from "lucide-react";
import { HealthysisLogo } from "@/components/HealthysisLogo";

interface NavbarProps {
  onOpenProfile?: () => void;
}

export function Navbar({ onOpenProfile }: NavbarProps) {
  const {
    profile,
    healthResume,
    setIsSosOpen,
    replaySplash,
    theme,
    toggleTheme
  } = usePulse();
  const { user } = useAuth();
  const activeDisplayName = (profile.name || healthResume.fullName || user?.name || "").trim();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-[#DCEAEC] dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* ========================================================== */}
        {/* TOP LEFT: Brand Logo + Name                                */}
        {/* ========================================================== */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5">
            <HealthysisLogo
              size="md"
              showWordmark={true}
              subtitle="Metabolic & Continuous Care"
            />
            <span className="hidden lg:inline-block px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#076584] dark:text-[#0EA6B7] bg-[#DDF2F0] dark:bg-slate-900 border border-[#DCEAEC] dark:border-slate-800 rounded-full">
              Clinical Care
            </span>
          </div>
        </div>

        {/* ========================================================== */}
        {/* TOP RIGHT: ID Badge, Replay Splash, Profile & SOS Icon      */}
        {/* ========================================================== */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Health / User Badge */}
          <div className="px-3 sm:px-4 py-2 rounded-2xl bg-[#DDF2F0] dark:bg-slate-900 border border-[#DCEAEC] dark:border-slate-800 flex items-center gap-2 shadow-xs">
            {profile.role === "doctor" ? (
              <Stethoscope className="w-4 h-4 text-[#076584] dark:text-[#0EA6B7] shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#04939D] dark:text-[#2CAC7F] shrink-0" />
            )}
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5 min-w-0">
              <span
                className="text-xs sm:text-sm font-bold text-[#076584] dark:text-[#77C86F] tracking-tight truncate max-w-[130px] sm:max-w-[200px]"
                title={activeDisplayName || profile.uniqueId}
              >
                {activeDisplayName || profile.uniqueId}
              </span>
              <span className="text-[10px] font-bold text-[#537783] dark:text-slate-400 capitalize hidden sm:inline">
                ({profile.role})
              </span>
            </div>
          </div>

          {/* Light / Dark / System Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-11 h-11 rounded-2xl bg-[#F8FBFC] dark:bg-slate-900 hover:bg-[#DDF2F0] dark:hover:bg-slate-800 border border-[#DCEAEC] dark:border-slate-800 text-[#076584] dark:text-[#77C86F] flex items-center justify-center transition-colors shadow-xs touch-target relative group"
            title={
              theme === "dark"
                ? "Current: Dark Mode (Click for System Mode)"
                : theme === "system"
                ? "Current: System Mode (Click for Light Mode)"
                : "Current: Light Mode (Click for Dark Mode)"
            }
            aria-label="Toggle Theme (Light, Dark, System)"
          >
            {theme === "dark" ? (
              <Moon className="w-5 h-5 text-indigo-400 stroke-[2.2] animate-in spin-in-180 duration-200" />
            ) : theme === "system" ? (
              <Laptop className="w-5 h-5 text-[#04939D] dark:text-[#2CAC7F] stroke-[2.2] animate-in spin-in-180 duration-200" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500 stroke-[2.2] animate-in spin-in-180 duration-200" />
            )}
            {/* Tiny Indicator dot for system mode */}
            {theme === "system" && (
              <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#04939D] dark:bg-[#2CAC7F]" />
            )}
          </button>

          {/* Quick Replay Opening Page Button */}
          <button
            type="button"
            onClick={replaySplash}
            className="w-11 h-11 rounded-2xl bg-[#F8FBFC] dark:bg-slate-900 hover:bg-[#DDF2F0] dark:hover:bg-slate-800 border border-[#DCEAEC] dark:border-slate-800 text-[#076584] dark:text-[#0EA6B7] hidden md:flex items-center justify-center transition-colors shadow-xs touch-target"
            title="Replay Brand Opening Page"
            aria-label="Replay Opening Page"
          >
            <Tv className="w-4 h-4 text-[#04939D] dark:text-[#2CAC7F]" />
          </button>

          {/* Profile Icon (User Avatar Circle) */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="w-11 h-11 rounded-full bg-[#DDF2F0] dark:bg-slate-900 hover:border-[#0EA6B7] border-2 border-[#DCEAEC] dark:border-slate-800 flex items-center justify-center text-[#076584] dark:text-[#0EA6B7] shadow-xs transition-all touch-target active:scale-95 overflow-hidden cursor-pointer"
            title={`Profile & Settings: ${activeDisplayName || profile.name}`}
            aria-label="User Profile and Settings"
          >
            {profile.userProfilePic ? (
              <img
                src={profile.userProfilePic}
                alt={activeDisplayName || profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 stroke-[2.2] text-[#076584] dark:text-[#0EA6B7]" />
            )}
          </button>

          {/* SOS Emergency: High-Contrast Red Circular Icon Button with subtle pulse */}
          <button
            type="button"
            onClick={() => setIsSosOpen(true)}
            className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/35 transition-all animate-pulse active:scale-95 touch-target"
            title="🚨 Emergency Crisis Helpline (Tele-MANAS 14416 & 112)"
            aria-label="SOS Emergency Helpline"
          >
            <PhoneCall className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </header>
  );
}
