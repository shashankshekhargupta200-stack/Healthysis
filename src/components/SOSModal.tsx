"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  AlertTriangle,
  PhoneCall,
  ShieldAlert,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  LifeBuoy,
  Lock
} from "lucide-react";

export function SOSModal() {
  const { isSosOpen, setIsSosOpen } = usePulse();
  const [activeStep, setActiveStep] = useState(0);

  if (!isSosOpen) return null;

  const groundingSteps = [
    {
      title: "5 Things You Can See",
      desc: "Look around your room right now. Notice 5 distinct items: a clock, a bottle of water, a curtain pattern, your shoes, or sunlight on the floor."
    },
    {
      title: "4 Things You Can Touch / Feel",
      desc: "Feel the texture of your clothes, the solid ground beneath your feet, the cool tabletop, or the smooth back of your phone."
    },
    {
      title: "3 Things You Can Hear",
      desc: "Tune into distant background audio: a ceiling fan humming, birds chirping outside, or the slow sound of your own inhalation."
    },
    {
      title: "2 Things You Can Smell",
      desc: "Notice any scent in the air around you, or take a deep, slow, calming breath through your nose."
    },
    {
      title: "1 Thing You Appreciate About Yourself",
      desc: "Remind yourself: You are safe in this moment. Your body is doing its best, and you have survived every difficult day so far."
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-[#DCEAEC] dark:border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-100 dark:border-red-900/50 p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 id="sos-modal-title" className="font-extrabold text-[#123F55] dark:text-slate-100 text-lg sm:text-xl leading-tight">
                Emergency &amp; Immediate Support Net
              </h3>
              <p className="text-xs sm:text-sm text-red-700 dark:text-red-400 font-semibold mt-0.5">
                24x7 Free &amp; Confidential National Crisis Helplines
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSosOpen(false)}
            className="w-11 h-11 rounded-2xl text-[#829AA3] dark:text-slate-400 hover:text-[#123F55] dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-[#DCEAEC] dark:border-slate-700 flex items-center justify-center transition-colors touch-target"
            aria-label="Close emergency modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Primary Callout: Tele-MANAS */}
          <div className="bg-red-50/70 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900/50 rounded-2xl p-5 space-y-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-300 text-xs font-black uppercase tracking-wider">
                <LifeBuoy className="w-3.5 h-3.5 text-red-700 dark:text-red-400" />
                <span>Verified Crisis Support Network</span>
              </div>
              <h4 className="font-black text-[#123F55] dark:text-slate-100 text-lg sm:text-xl mt-2.5">
                Tele-MANAS (Mental Health Helpline)
              </h4>
              <p className="text-sm sm:text-base text-[#537783] dark:text-slate-300 mt-1 leading-relaxed">
                Free, 24x7 confidential psychological support, panic management, and distress counseling available in 20+ regional Indian languages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="tel:14416"
                className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 px-4 rounded-2xl transition-all shadow-md shadow-red-600/30 active:scale-95 text-base touch-target"
              >
                <PhoneCall className="w-5 h-5" />
                <span>Call 14416 (Direct Dial)</span>
              </a>

              <a
                href="tel:18008914416"
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-[#F8FBFC] dark:hover:bg-slate-700 text-[#123F55] dark:text-slate-200 font-bold py-3.5 px-4 rounded-2xl transition-all border border-[#DCEAEC] dark:border-slate-700 text-sm touch-target"
              >
                <span>Toll-Free: 1800-891-4416</span>
              </a>
            </div>
          </div>

          {/* Secondary Official Helplines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="tel:112"
              className="p-4 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 hover:border-[#0EA6B7] hover:bg-[#DDF2F0]/40 dark:hover:bg-teal-950/30 flex flex-col justify-between transition-all group touch-target"
            >
              <div>
                <span className="text-xs font-bold text-[#829AA3] dark:text-slate-400 uppercase tracking-wider">
                  National All-in-One Emergency
                </span>
                <p className="font-extrabold text-[#123F55] dark:text-slate-100 text-lg mt-0.5">
                  Dial 112 (Emergency Services)
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#076584] dark:text-teal-300 group-hover:text-[#04939D]">
                <PhoneCall className="w-4 h-4" />
                <span>Tap to Call Instantly</span>
              </div>
            </a>

            <a
              href="tel:1091"
              className="p-4 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 hover:border-[#0EA6B7] hover:bg-[#DDF2F0]/40 dark:hover:bg-teal-950/30 flex flex-col justify-between transition-all group touch-target"
            >
              <div>
                <span className="text-xs font-bold text-[#829AA3] dark:text-slate-400 uppercase tracking-wider">
                  Women Helpline (National)
                </span>
                <p className="font-extrabold text-[#123F55] dark:text-slate-100 text-lg mt-0.5">
                  Dial 1091 / 181
                </p>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#076584] dark:text-teal-300 group-hover:text-[#04939D]">
                <PhoneCall className="w-4 h-4" />
                <span>Tap to Call Instantly</span>
              </div>
            </a>
          </div>

          {/* 5-4-3-2-1 Grounding Box */}
          <div className="bg-[#DDF2F0]/60 dark:bg-teal-950/30 border border-[#DCEAEC] dark:border-teal-900/40 rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-[#076584] dark:text-teal-300 text-sm sm:text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#0EA6B7]" />
                Immediate Panic Grounding Exercise (5-4-3-2-1)
              </span>
              <span className="text-xs font-bold text-[#076584] dark:text-teal-300 bg-[#DDF2F0] dark:bg-teal-950/60 px-2.5 py-1 rounded-full border border-[#DCEAEC] dark:border-teal-800">
                Step {activeStep + 1} of {groundingSteps.length}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-[#DCEAEC] dark:border-slate-800 shadow-xs space-y-1.5">
              <h5 className="font-extrabold text-[#123F55] dark:text-slate-100 text-base">
                {groundingSteps[activeStep].title}
              </h5>
              <p className="text-sm text-[#537783] dark:text-slate-300 leading-relaxed">
                {groundingSteps[activeStep].desc}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                disabled={activeStep === 0}
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#537783] dark:text-slate-400 hover:text-[#123F55] dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1.5 touch-target"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStep((prev) => (prev + 1) % groundingSteps.length)}
                className="btn-healthysis-primary px-4 py-2 text-white rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-xs flex items-center gap-1.5 touch-target"
              >
                <span>{activeStep === groundingSteps.length - 1 ? "Start Over" : "Next Grounding Step"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-[#F8FBFC] dark:bg-slate-950 border-t border-[#DCEAEC] dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#537783] dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Lock className="w-4 h-4 text-[#04939D]" />
            <span>Strict DPDP Privacy: Calls are handled directly by telecom networks, zero logs recorded.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSosOpen(false)}
            className="px-5 py-2.5 bg-[#EAF2F4] dark:bg-slate-800 hover:bg-[#DDF2F0] dark:hover:bg-slate-700 text-[#123F55] dark:text-slate-200 font-bold rounded-xl transition-colors touch-target"
          >
            Close Emergency Net
          </button>
        </div>
      </div>
    </div>
  );
}
