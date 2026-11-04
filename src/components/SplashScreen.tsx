"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ArrowRight, Activity, ShieldCheck, HeartPulse } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const statusText =
    progress === 100
      ? "Welcome to Healthysis"
      : progress >= 70
      ? "Preparing personalized clinical experience..."
      : progress > 30
      ? "Verifying continuous metabolic telemetry..."
      : "Initializing sovereign health vault...";

  const handleEnter = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  }, [isExiting, onComplete]);

  useEffect(() => {
    // Progress counter animation from 0% to 100% over ~2.4 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 8) + 4;
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const timeout = setTimeout(() => {
        handleEnter();
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [progress, handleEnter]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-white via-[#DDF2F0]/40 to-[#C6E2F1]/50 transition-all duration-700 ease-out select-none ${
        isExiting ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Ambient Radial Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-[#0EA6B7]/15 via-[#2CAC7F]/15 to-[#77C86F]/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-healthysis" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#C6E2F1]/40 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* Top Bar: Skip button & Security indicator */}
      <div className="w-full max-w-4xl px-6 py-6 flex items-center justify-between z-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#DCEAEC] text-[#076584] text-xs font-extrabold uppercase tracking-wider shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-[#04939D]" />
          <span>Sovereign Health Vault</span>
        </div>

        <button
          type="button"
          onClick={handleEnter}
          className="text-xs font-bold text-[#537783] hover:text-[#076584] bg-white/70 hover:bg-white px-3.5 py-1.5 rounded-full border border-[#DCEAEC] transition-all flex items-center gap-1.5 shadow-xs touch-target"
        >
          <span>Skip</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Stage: The Official Healthysis Splash Card with Animations */}
      <div className="relative flex flex-col items-center justify-center max-w-sm sm:max-w-md w-full px-4 text-center my-auto z-10">
        {/* Floating Layered Container for the Splash Image */}
        <div className="relative w-full aspect-[470/680] max-h-[58vh] sm:max-h-[62vh] rounded-3xl overflow-hidden shadow-2xl shadow-[#076584]/15 border border-white/60 bg-white/40 backdrop-blur-sm animate-float">
          {/* Main Visual Reference Image (Cleaned, without Ashoka emblem or government text) */}
          <Image
            src="/healthysis-splash.png"
            alt="Healthysis Brand Opening"
            fill
            sizes="(max-width: 640px) 90vw, 420px"
            priority
            className="object-cover object-top"
          />

          {/* Shimmer Overlay Sweep */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-60 animate-shimmer pointer-events-none" />

          {/* Glowing bottom gradient blend */}
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#C6E2F1]/80 to-transparent pointer-events-none" />
        </div>

        {/* Dynamic Tagline */}
        <div className="mt-5 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-xs sm:text-sm font-bold text-[#076584] tracking-wide uppercase">
            Autonomous Metabolic &amp; Clinical Management
          </p>
          <p className="text-[11px] sm:text-xs text-[#537783] max-w-xs mx-auto">
            {statusText}
          </p>
        </div>
      </div>

      {/* Bottom Progress Bar & Action Area */}
      <div className="w-full max-w-sm sm:max-w-md px-6 pb-8 z-20 space-y-4">
        {/* Animated Progress Bar using Signature Gradient */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-extrabold text-[#537783]">
            <span className="flex items-center gap-1.5 text-[#076584]">
              <HeartPulse className="w-3.5 h-3.5 text-[#0EA6B7] animate-pulse" />
              <span>Starting Health Engine</span>
            </span>
            <span className="font-mono text-[#076584]">{progress}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-white/80 border border-[#DCEAEC] overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full rounded-full bg-healthysis-signature transition-all duration-200 ease-out shadow-xs"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Enter Application Button */}
        <button
          type="button"
          onClick={handleEnter}
          className="btn-healthysis-primary w-full py-3.5 px-6 rounded-2xl text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 touch-target shadow-lg group"
        >
          <span>Enter Healthysis</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* DPDP Compliance Notice */}
        <p className="text-[10px] text-center text-[#829AA3] font-medium">
          DPDP Act 2023 Compliant • 100% On-Device Confidential Telemetry
        </p>
      </div>
    </div>
  );
}
