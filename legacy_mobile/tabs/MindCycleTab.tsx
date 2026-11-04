"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  Moon,
  Zap,
  Sparkles,
  Heart,
  TrendingDown,
  TrendingUp,
  Smile,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar
} from "lucide-react";

export function MindCycleTab() {
  const {
    cycleData,
    moodLogs,
    logTodayMood,
    setIsBreathingOpen,
    mask,
    t
  } = usePulse();

  const [energy, setEnergy] = useState<number>(3);
  const [stress, setStress] = useState<number>(4);
  const [mood, setMood] = useState<'Calm' | 'Anxious' | 'Brain Fog' | 'Bloated' | 'Radiant' | 'Fatigued'>('Bloated');
  const [symptoms, setSymptoms] = useState<string[]>(["Mid-Day Brain Fog", "Sugar Craving"]);
  const [loggedSuccess, setLoggedSuccess] = useState(false);

  const availableSymptoms = [
    "Jawline Acne Flare",
    "Sugar Craving",
    "Abdominal Bloating",
    "Mid-Day Brain Fog",
    "Pelvic Heaviness",
    "Poor Sleep / Restless",
    "Breast Tenderness",
    "Clear Radiant Glow"
  ];

  const toggleSymptom = (s: string) => {
    if (symptoms.includes(s)) {
      setSymptoms(symptoms.filter(item => item !== s));
    } else {
      setSymptoms([...symptoms, s]);
    }
  };

  const handleSubmitLog = () => {
    logTodayMood(energy, stress, mood, symptoms);
    setLoggedSuccess(true);
    setTimeout(() => setLoggedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4 pb-20 pt-2 animate-in fade-in duration-200">
      {/* 1. Hero: 60-Second Cortisol & Vagus Nerve Reset */}
      <div className="rounded-3xl bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 border border-teal-600/50 p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-800">
              Immediate Cortisol Drop
            </span>
            <h3 className="text-white font-black text-base mt-2">
              60-Second Vagal Breathing Reset
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xs">
              When work stress or deadlines spike your adrenals, cortisol signals the liver to dump glucose. Take 60 seconds of parasympathetic reset.
            </p>
          </div>

          <button
            onClick={() => setIsBreathingOpen(true)}
            className="px-4 py-3 bg-gradient-to-tr from-teal-500 to-emerald-400 hover:from-teal-400 hover:to-emerald-300 text-slate-950 font-black rounded-2xl text-xs shadow-lg shadow-teal-950/60 transition-transform active:scale-95 shrink-0 flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            <span>Begin Reset</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Daily Log Form */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="text-white font-bold text-sm tracking-tight flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-emerald-400" />
              <span>Log Mind & Cycle Signals</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Correlate Day {cycleData.cycleDay} ({cycleData.currentPhase}) with daily energy
            </p>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            Private Log
          </span>
        </div>

        {/* Energy Scale (1 to 5) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Energy Level (1-5):</span>
            <span className="text-emerald-400 font-bold font-mono">
              {energy === 1 && "1 - Exhausted"}
              {energy === 2 && "2 - Sluggish"}
              {energy === 3 && "3 - Steady"}
              {energy === 4 && "4 - High"}
              {energy === 5 && "5 - Radiant"}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map(lvl => (
              <button
                key={lvl}
                onClick={() => setEnergy(lvl)}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  energy === lvl
                    ? "bg-emerald-600 text-slate-950 shadow-md shadow-emerald-950 scale-105"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Stress Scale (1 to 5) */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Subjective Stress (1-5):</span>
            <span className="text-rose-400 font-bold font-mono">
              {stress === 1 && "1 - Peaceful"}
              {stress === 2 && "2 - Mild"}
              {stress === 3 && "3 - Manageable"}
              {stress === 4 && "4 - Work Deadline Pressure"}
              {stress === 5 && "5 - Acute Overwhelm"}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map(lvl => (
              <button
                key={lvl}
                onClick={() => setStress(lvl)}
                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                  stress === lvl
                    ? "bg-rose-600 text-white shadow-md shadow-rose-950 scale-105"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Mood Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Primary Emotional State:
          </label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {(['Calm', 'Bloated', 'Brain Fog', 'Anxious', 'Radiant', 'Fatigued'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`py-2 px-2 rounded-xl border text-center transition-all ${
                  mood === m
                    ? "bg-teal-950/80 border-teal-500 text-teal-200 font-bold shadow-sm"
                    : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {mask(m)}
              </button>
            ))}
          </div>
        </div>

        {/* Symptom Multi-check */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
            Physical Symptoms Today:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availableSymptoms.map(sym => {
              const selected = symptoms.includes(sym);
              return (
                <button
                  key={sym}
                  onClick={() => toggleSymptom(sym)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                    selected
                      ? "bg-emerald-950 border-emerald-500 text-emerald-200 font-semibold"
                      : "bg-slate-850 border-slate-700/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {mask(sym)} {selected && "✓"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmitLog}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 active:scale-95"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{loggedSuccess ? "Saved to Encrypted Local Storage! ✓" : "Save Today's Log"}</span>
        </button>
      </div>

      {/* 3. 5-Day Trend History */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-bold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            Recent 5-Day Trend
          </h4>
          <span className="text-[10px] text-slate-400">Days 14 - 18</span>
        </div>

        <div className="space-y-2">
          {moodLogs.map((entry, idx) => (
            <div
              key={idx}
              className="bg-slate-850 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-semibold text-white">{entry.date}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Mood: <span className="text-teal-300 font-medium">{mask(entry.mood)}</span>
                  {entry.symptoms.length > 0 && ` • ${mask(entry.symptoms.join(", "))}`}
                </div>
              </div>

              <div className="flex items-center gap-2 text-right">
                <div className="bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded-lg text-center">
                  <div className="text-[9px] text-emerald-400">Energy</div>
                  <div className="font-bold text-white text-xs">{entry.energyLevel}/5</div>
                </div>
                <div className="bg-rose-950/70 border border-rose-800 px-2 py-0.5 rounded-lg text-center">
                  <div className="text-[9px] text-rose-400">Stress</div>
                  <div className="font-bold text-white text-xs">{entry.stressLevel}/5</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
