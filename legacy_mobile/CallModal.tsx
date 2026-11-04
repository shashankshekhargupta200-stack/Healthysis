"use client";

import React, { useState, useEffect } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  MessageSquare,
  Sparkles,
  Maximize2,
  Stethoscope
} from "lucide-react";

export function CallModal() {
  const { isCallModalOpen, setIsCallModalOpen, selectedDoctor, profile } = usePulse();
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (!isCallModalOpen) {
      setCallDuration(0);
      return;
    }
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isCallModalOpen]);

  if (!isCallModalOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full h-[580px] flex flex-col justify-between p-4 shadow-2xl shadow-emerald-950/60 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 text-[10px] text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Encrypted Video Call • {formatTime(callDuration)}</span>
          </div>

          <span className="text-[10px] font-mono text-slate-400">
            {profile.uniqueId} ↔ {selectedDoctor.uniqueId}
          </span>
        </div>

        {/* Video Simulation Center Viewport */}
        <div className="flex-1 my-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Main Doctor Screen */}
          <div className="flex flex-col items-center text-center p-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-xl border-4 border-slate-900">
                <Stethoscope className="w-12 h-12 text-slate-950" />
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900" />
            </div>

            <h4 className="text-white font-bold text-base mt-3">{selectedDoctor.name}</h4>
            <p className="text-xs text-teal-300 font-medium">{selectedDoctor.specialty}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{selectedDoctor.hospital}</p>

            {/* Speaking audio wave animation */}
            <div className="flex items-center gap-1 mt-4">
              <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-6 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce" />
              <span className="w-1 h-7 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
              <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Reviewing 30-Day Food Timeline</span>
          </div>

          {/* Picture-in-Picture Patient Box (Self View) */}
          <div className="absolute bottom-3 right-3 w-20 h-28 bg-slate-900 rounded-xl border-2 border-emerald-500/60 shadow-lg flex flex-col items-center justify-center overflow-hidden">
            {!isVideoOff ? (
              <div className="w-full h-full bg-slate-850 flex flex-col items-center justify-center text-slate-300">
                <span className="text-xs font-bold text-white">{profile.name[0]}</span>
                <span className="text-[8px] text-emerald-400 mt-1">You</span>
              </div>
            ) : (
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-500">
                <VideoOff className="w-4 h-4" />
                <span className="text-[8px] mt-0.5">Cam Off</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Call Controls */}
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-around relative z-10">
          {/* Mute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-2xl transition-colors ${
              isMuted ? "bg-red-950 text-red-400 border border-red-800" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title={isMuted ? "Unmute mic" : "Mute mic"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video Toggle */}
          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-3 rounded-2xl transition-colors ${
              isVideoOff ? "bg-red-950 text-red-400 border border-red-800" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title={isVideoOff ? "Turn video on" : "Turn video off"}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={() => setIsCallModalOpen(false)}
            className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl shadow-lg shadow-red-950/80 transition-transform active:scale-95"
            title="End Consultation"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
