"use client";

import React, { useRef } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  Home,
  FileText,
  Camera,
  Stethoscope,
  User,
  ChevronUp
} from "lucide-react";
import { NavigationTab } from "@/types";

export function BottomNavBar() {
  const {
    activeTab,
    setActiveTab,
    setPendingMealImage
  } = usePulse();

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const swipedUpRef = useRef<boolean>(false);

  const handleTabClick = (tab: NavigationTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Touch Event Handlers for Swipe-Up Camera on the Center Button
  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (e.touches.length > 0) {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      swipedUpRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (touchStartY.current !== null && e.touches.length > 0) {
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - touchStartY.current;
      const deltaX = Math.abs(currentX - (touchStartX.current ?? currentX));

      // Upward swipe: negative deltaY of more than 35px with limited horizontal variance
      if (deltaY < -35 && deltaX < 60) {
        swipedUpRef.current = true;
      }
    }
  };

  const handleTouchEnd = () => {
    if (swipedUpRef.current) {
      // Trigger native device camera directly
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }
    touchStartY.current = null;
    touchStartX.current = null;
  };

  const handleSnapClick = () => {
    if (swipedUpRef.current) {
      swipedUpRef.current = false;
      return;
    }
    handleTabClick("snap");
  };

  const handleNativeCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingMealImage(file);
      setActiveTab("snap");
    }
    e.currentTarget.value = "";
  };

  return (
    <>
      {/* Hidden Native Camera Input with environment capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleNativeCameraCapture}
        className="hidden"
        aria-hidden="true"
      />

      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-[#DCEAEC] dark:border-slate-800 z-50 py-2.5 shadow-xl select-none transition-colors duration-200"
      >
        <div className="max-w-2xl mx-auto flex items-center justify-around px-4">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => handleTabClick("home")}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all touch-target ${
              activeTab === "home"
                ? "text-[#076584] dark:text-[#77C86F] font-extrabold scale-105"
                : "text-[#829AA3] dark:text-slate-400 hover:text-[#076584] dark:hover:text-slate-200 font-semibold"
            }`}
          >
            <Home className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[11px] tracking-tight">Home</span>
            {activeTab === "home" && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0EA6B7] dark:bg-[#77C86F] -mt-0.5" />
            )}
          </button>

          {/* 2. Healthfolio (Health Resume Builder) */}
          <button
            type="button"
            onClick={() => handleTabClick("healthfolio")}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all touch-target ${
              activeTab === "healthfolio" || activeTab === "doctor-brief"
                ? "text-[#076584] dark:text-[#77C86F] font-extrabold scale-105"
                : "text-[#829AA3] dark:text-slate-400 hover:text-[#076584] dark:hover:text-slate-200 font-semibold"
            }`}
          >
            <FileText className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[11px] tracking-tight">Healthfolio</span>
            {(activeTab === "healthfolio" || activeTab === "doctor-brief") && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0EA6B7] dark:bg-[#77C86F] -mt-0.5" />
            )}
          </button>

          {/* 3. Meal Snap (CENTER - elevated with Signature Healthysis Gradient) */}
          <button
            type="button"
            onClick={handleSnapClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex flex-col items-center gap-1 -mt-6 touch-target group relative focus:outline-none"
            title="Tap to open Snap Tab • Swipe up for direct camera"
            aria-label="Meal Snap (Swipe up to open camera directly)"
          >
            {/* Subtle swipe-up hint arrow */}
            <div className="w-5 h-5 -mb-1 flex items-center justify-center text-[#04939D] dark:text-[#2CAC7F] opacity-75 group-hover:opacity-100 transition-opacity animate-bounce">
              <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
            </div>

            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-950 transition-all transform group-active:scale-95 group-hover:scale-105 bg-healthysis-signature text-white ${
                activeTab === "snap"
                  ? "shadow-[#04939D]/50 ring-2 ring-[#0EA6B7]"
                  : "shadow-[#04939D]/30 hover:brightness-105"
              }`}
            >
              <Camera className="w-6 h-6 stroke-[2.5]" />
            </div>

            <span
              className={`text-[11px] font-extrabold tracking-tight ${
                activeTab === "snap"
                  ? "text-[#076584] dark:text-[#77C86F]"
                  : "text-[#537783] dark:text-slate-400"
              }`}
            >
              Meal Snap
            </span>
          </button>

          {/* 4. Find Doctors */}
          <button
            type="button"
            onClick={() => handleTabClick("find-doctors")}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all touch-target ${
              activeTab === "find-doctors"
                ? "text-[#076584] dark:text-[#77C86F] font-extrabold scale-105"
                : "text-[#829AA3] dark:text-slate-400 hover:text-[#076584] dark:hover:text-slate-200 font-semibold"
            }`}
          >
            <Stethoscope className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[11px] tracking-tight">Find Doctors</span>
            {activeTab === "find-doctors" && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0EA6B7] dark:bg-[#77C86F] -mt-0.5" />
            )}
          </button>

          {/* 5. User Profile (Swasthya Resume Dashboard) */}
          <button
            type="button"
            onClick={() => handleTabClick("user-profile")}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all touch-target ${
              activeTab === "user-profile" || activeTab === "truth-engine"
                ? "text-[#076584] dark:text-[#77C86F] font-extrabold scale-105"
                : "text-[#829AA3] dark:text-slate-400 hover:text-[#076584] dark:hover:text-slate-200 font-semibold"
            }`}
          >
            <User className="w-5 h-5 stroke-[2.2]" />
            <span className="text-[11px] tracking-tight">Profile</span>
            {(activeTab === "user-profile" || activeTab === "truth-engine") && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0EA6B7] dark:bg-[#77C86F] -mt-0.5" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
