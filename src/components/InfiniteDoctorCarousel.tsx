"use client";

import React from "react";
import { Stethoscope, CheckCircle2 } from "lucide-react";
import { usePulse } from "@/context/PulseContext";
import { doctorsList } from "@/lib/doctorsData";

export function InfiniteDoctorCarousel({ className = "" }: { className?: string }) {
  const { setActiveTab } = usePulse();

  // Duplicate items array so translateX(-50%) produces a seamless, gapless infinite loop
  const doubledDoctors = [...doctorsList, ...doctorsList];

  return (
    <div className={`w-full bg-white dark:bg-slate-900 border border-[#DCEAEC] dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3 overflow-hidden transition-colors duration-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#DDF2F0] dark:bg-slate-800 border border-[#DCEAEC] dark:border-slate-700 text-[#076584] dark:text-[#77C86F] flex items-center justify-center">
            <Stethoscope className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#123F55] dark:text-slate-100 tracking-tight flex items-center gap-2">
              <span>Prayagraj Clinical Specialists ({doctorsList.length} Doctors)</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold text-[#076584] dark:text-[#77C86F] bg-[#DDF2F0] dark:bg-slate-800 px-2 py-0.5 rounded-full border border-[#DCEAEC] dark:border-slate-700">
                <CheckCircle2 className="w-3 h-3 text-[#2CAC7F]" />
                Live on Healthysis
              </span>
            </h3>
            <p className="text-[11px] text-[#537783] dark:text-slate-400 font-medium">
              Tap a listing for qualifications and clinic contact details.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("find-doctors")}
          className="text-xs font-bold text-[#076584] dark:text-[#0EA6B7] hover:text-[#04939D] hover:underline shrink-0"
        >
          View All &rarr;
        </button>
      </div>

      {/* Infinite Scrolling Track */}
      <div className="relative w-full overflow-hidden mask-fade-edges py-2">
        {/* Soft edge blur masks */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />

        <div className="animate-scroll flex gap-6 items-center">
          {doubledDoctors.map((doc, idx) => (
            <div
              key={`${doc.id}-${idx}`}
              onClick={() => setActiveTab("find-doctors")}
              className="flex flex-col items-center group cursor-pointer shrink-0 transition-transform hover:scale-105 active:scale-95"
              style={{ width: "94px" }}
            >
              {/* Circular Avatar Image with verified badge */}
              <div className="relative w-[60px] h-[60px] rounded-full border-2 border-[#0EA6B7]/40 p-0.5 bg-gradient-to-tr from-[#DDF2F0] dark:from-slate-800 to-[#CBEFE0] dark:to-slate-700 group-hover:border-[#04939D] shadow-xs transition-all">
                <div className={`w-full h-full rounded-full flex items-center justify-center text-white font-extrabold text-base shadow-inner ${doc.avatarColor}`}>
                  {doc.avatarInitials}
                </div>
                {doc.verified && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#2CAC7F] border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] text-white font-black" title="Verified Specialist">
                    ✓
                  </span>
                )}
              </div>

              {/* Doctor Name & Specialty Underneath */}
              <div className="mt-2 text-center w-full">
                <p className="text-xs font-extrabold text-[#123F55] dark:text-slate-200 group-hover:text-[#04939D] dark:group-hover:text-[#77C86F] transition-colors truncate">
                  {doc.name}
                </p>
                <p className="text-[10px] text-[#076584] dark:text-[#0EA6B7] font-semibold truncate">
                  {doc.specialty}
                </p>
                <p className="text-[9px] text-[#829AA3] dark:text-slate-500 font-bold truncate">
                  {doc.consultationFee}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
