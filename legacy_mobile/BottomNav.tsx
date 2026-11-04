"use client";

import React from "react";
import { usePulse } from "@/context/PulseContext";
import {
  Home,
  Clock,
  Camera,
  Stethoscope,
  Sparkles
} from "lucide-react";

export function BottomNav() {
  const { activeTab, setActiveTab } = usePulse();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 py-1.5 px-3">
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {/* Section 1: Home */}
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === "home" ? "text-emerald-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${activeTab === "home" ? "bg-emerald-950/80" : ""}`}>
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Home</span>
        </button>

        {/* Section 2: History (7/30 days dietary & symptoms timeline) */}
        <button
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === "history" ? "text-emerald-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${activeTab === "history" ? "bg-emerald-950/80" : ""}`}>
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">History</span>
        </button>

        {/* Section 3: Camera (Center Snapchat-Style Snap Button) */}
        <div className="flex-1 flex flex-col items-center -mt-6">
          <button
            onClick={() => setActiveTab("snap")}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-2 ${
              activeTab === "snap"
                ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 border-white shadow-emerald-500/40 scale-105"
                : "bg-gradient-to-tr from-emerald-600 to-teal-600 text-white border-slate-700 shadow-slate-950/60 hover:scale-105"
            }`}
            title="Snap meal photo for Gemini Vision AI analysis"
          >
            <Camera className="w-6 h-6 stroke-[2.2]" />
          </button>
          <span
            className={`text-[10px] mt-1 font-semibold ${
              activeTab === "snap" ? "text-emerald-400" : "text-slate-400"
            }`}
          >
            Snap
          </span>
        </div>

        {/* Section 4: Doctors (Doctor symbol, chats, video call, 90s brief) */}
        <button
          onClick={() => setActiveTab("doctors")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === "doctors" ? "text-emerald-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${activeTab === "doctors" ? "bg-emerald-950/80" : ""}`}>
            <Stethoscope className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Doctors</span>
        </button>

        {/* Section 5: Misinformation (Truth Engine symbol) */}
        <button
          onClick={() => setActiveTab("truth")}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            activeTab === "truth" ? "text-emerald-400 font-semibold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <div className={`p-1 rounded-full transition-colors ${activeTab === "truth" ? "bg-emerald-950/80" : ""}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Truth</span>
        </button>
      </div>
    </nav>
  );
}
