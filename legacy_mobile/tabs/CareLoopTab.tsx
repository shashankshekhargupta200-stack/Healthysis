"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  Stethoscope,
  Send,
  FileText,
  Video,
  Bot,
  User,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Clock,
  Sparkles,
  PhoneCall,
  Lock,
  Trash2
} from "lucide-react";
import { DoctorProfile } from "@/types";

export function CareLoopTab() {
  const {
    chatMessages,
    sendMessage,
    doctorsList,
    selectedDoctor,
    setSelectedDoctor,
    setIsDoctorBriefOpen,
    setIsCallModalOpen,
    profile,
    mask
  } = usePulse();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Knee joint pain after aloo paratha?",
    "Craving sweets at 4 PM in Luteal phase?",
    "Is Metformin 500mg timing right?",
    "Review my 30-day glycemic spikes"
  ];

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim()) return;
    sendMessage(text);
    setInput("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div className="space-y-4 pb-24 pt-2 animate-in fade-in duration-200 flex flex-col h-[calc(100vh-140px)]">
      {/* 1. Prominent Top Banner: Generate 90-Second Doctor Brief */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-600/50 p-4 shadow-xl shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                15-Minute Consultation Ready
              </span>
            </div>
            <h3 className="text-white font-bold text-sm tracking-tight mt-1">
              90-Second Doctor Clinical Brief
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Synthesizes 30-day glycemic spikes, knee joint correlations, and adherence for your next doctor consultation.
            </p>
          </div>

          <button
            onClick={() => setIsDoctorBriefOpen(true)}
            className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-emerald-950 flex items-center gap-1.5 transition-transform active:scale-95 shrink-0"
          >
            <FileText className="w-4 h-4 stroke-[2.5]" />
            <span>Generate Brief</span>
          </button>
        </div>
      </div>

      {/* 2. Doctor Directory & Video Call Launcher */}
      <div className="shrink-0 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-semibold text-slate-300">Consulting Physicians & Coaches:</span>
          <span>Tap to switch doctor</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {doctorsList.map(doc => (
            <div
              key={doc.id}
              onClick={() => setSelectedDoctor(doc)}
              className={`p-3 rounded-2xl border min-w-[210px] cursor-pointer transition-all ${
                selectedDoctor.id === doc.id
                  ? "bg-slate-850 border-emerald-500 shadow-md shadow-emerald-950"
                  : "bg-slate-900 border-slate-800 hover:bg-slate-850"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-teal-400 font-bold bg-teal-950 px-1.5 py-0.2 rounded-md border border-teal-800">
                    {doc.uniqueId}
                  </span>
                  <h4 className="text-white font-bold text-xs mt-1 truncate">{doc.name}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{doc.specialty}</p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDoctor(doc);
                    setIsCallModalOpen(true);
                  }}
                  className="p-2 bg-gradient-to-tr from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 rounded-xl shadow-md transition-transform active:scale-95"
                  title={`Start video call with ${doc.name}`}
                >
                  <Video className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                <span>{doc.hospital.split(',')[0]}</span>
                <span className="text-emerald-400 font-bold">₹{doc.consultationFee}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Doctor-Patient Chat Container with 30-Day Auto-Purge */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col overflow-hidden shadow-xl min-h-0">
        {/* Chat Header with 30-Day Deletion Notice & Video Call Button */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
                <Stethoscope className="w-4 h-4 text-slate-950" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-white font-bold text-xs">{selectedDoctor.name}</h4>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1 rounded border border-emerald-800">
                  {selectedDoctor.uniqueId}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="w-2.5 h-2.5 text-amber-400" />
                <span>30-Day Auto-Purge (28 days left)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCallModalOpen(true)}
              className="p-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Start Video Consultation"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Call</span>
            </button>
          </div>
        </div>

        {/* DPDP 30-Day Ephemeral Banner */}
        <div className="bg-slate-850/80 border border-slate-800 rounded-xl px-2.5 py-1 my-1.5 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            Protected DPDP channel: Chats auto-delete in 30 days.
          </span>
          <span className="font-mono text-emerald-400">{profile.uniqueId}</span>
        </div>

        {/* Quick Suggested Prompt Pills */}
        <div className="py-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[10px] whitespace-nowrap bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/80 px-2.5 py-1 rounded-xl transition-colors shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 py-2 pr-1 min-h-0">
          {chatMessages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 text-xs ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender !== "user" && (
                <div className="w-7 h-7 rounded-xl bg-teal-950 text-teal-400 border border-teal-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Stethoscope className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                  msg.sender === "user"
                    ? "bg-emerald-600 text-slate-950 font-medium rounded-tr-xs"
                    : "bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-xs"
                }`}
              >
                {msg.tags && msg.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {msg.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-bold uppercase tracking-wider bg-slate-900/60 text-teal-300 px-1.5 py-0.5 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="whitespace-pre-line leading-relaxed text-[11px]">
                  {mask(msg.text)}
                </div>

                <div
                  className={`text-[9px] mt-1 text-right ${
                    msg.sender === "user" ? "text-emerald-950/70" : "text-slate-400"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === "user" && (
                <div className="w-7 h-7 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-2 border-t border-slate-800 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask doctor about joint pain, food pairing, or test..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-slate-950 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
