"use client";

import React, { useState, useEffect } from "react";
import { usePulse } from "@/context/PulseContext";
import confetti from "canvas-confetti";
import {
  Activity,
  Flame,
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  Zap,
  Clock,
  Calendar,
  AlertTriangle,
  Camera,
  BellRing,
  X
} from "lucide-react";

export function HomeTab() {
  const {
    profile,
    cycleData,
    updateCycleDay,
    metabolicScore,
    habits,
    toggleHabit,
    logTodayMood,
    setActiveTab,
    setIsBreathingOpen,
    missedMealHours,
    setMissedMealHours,
    showMissedMealBanner,
    setShowMissedMealBanner,
    mask
  } = usePulse();

  const [selectedMood, setSelectedMood] = useState<'Calm' | 'Anxious' | 'Brain Fog' | 'Bloated' | 'Radiant' | 'Fatigued'>('Calm');
  const [selectedEnergy, setSelectedEnergy] = useState<number>(3);
  const [selectedStress, setSelectedStress] = useState<number>(3);
  const [quickLogged, setQuickLogged] = useState(false);

  const [greeting, setGreeting] = useState("Good Evening");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  const handleToggleHabit = (id: string, currentlyCompleted: boolean) => {
    if (!currentlyCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#5c8b74', '#abc6b7', '#f28482', '#f4a261']
      });
    }
    toggleHabit(id);
  };

  const handleQuickLog = () => {
    logTodayMood(selectedEnergy, selectedStress, selectedMood, [selectedMood]);
    setQuickLogged(true);
    setTimeout(() => setQuickLogged(false), 2500);
  };

  const primaryHabit = habits[0] || {
    id: "h1",
    title: "10-Minute Post-Lunch Stroll",
    description: "Gentle walk to blunt glucose rise",
    completed: false,
    streakDays: 5
  };

  return (
    <div className="space-y-4 pb-20 pt-2 animate-in fade-in duration-200">
      {/* 1. Personalized Greeting with User Name & Age */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div>
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
            {profile.role === 'doctor' ? "Doctor Workspace" : "Continuous Care Stack"}
          </span>
          <h1 className="text-white font-black text-xl tracking-tight mt-0.5">
            {greeting}, {profile.name} <span className="text-sm font-normal text-slate-400">({profile.age} yrs)</span>
          </h1>
        </div>

        <div className="text-right">
          <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
            {profile.uniqueId}
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">{profile.city}</p>
        </div>
      </div>

      {/* 2. Missed Meal Notification Banner (12h, 15h, 24h Stress & Skipping Reminder) */}
      {showMissedMealBanner && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border border-amber-500/60 rounded-3xl p-4 shadow-xl relative overflow-hidden animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0 mt-0.5 animate-bounce">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
                    Circadian Meal Reminder ({missedMealHours}h Gap)
                  </span>
                </div>
                <h3 className="text-white font-bold text-xs leading-snug">
                  &quot;Are you caught up in office work stress, {profile.name}? Please don&apos;t skip meals!&quot;
                </h3>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  It has been {missedMealHours} hours since your last logged meal. Skipping meals triggers cortisol spikes that prompt your liver to dump glucose. Even a small handful of nuts or warm dal helps stabilize your luteal curve.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowMissedMealBanner(false)}
              className="text-slate-400 hover:text-white p-1"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-amber-800/40 flex items-center justify-between gap-2">
            {/* Quick Test Hours Selector */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span>Simulate:</span>
              {[12, 15, 24].map(h => (
                <button
                  key={h}
                  onClick={() => setMissedMealHours(h)}
                  className={`px-1.5 py-0.5 rounded border text-[10px] ${
                    missedMealHours === h
                      ? "bg-amber-800 text-white border-amber-500 font-bold"
                      : "bg-slate-850 text-slate-400 border-slate-700"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveTab("snap")}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Snap Meal Now</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Cycle Status Card (Day 18 - Luteal Phase) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/60 border border-slate-800 p-4 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800/80 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Day {cycleData.cycleDay} • {mask(cycleData.currentPhase + " Phase")}
              </span>
              <span className="text-[10px] text-slate-400">
                Cycle day {cycleData.cycleDay} of {cycleData.totalCycleLength}
              </span>
            </div>

            <h2 className="text-white font-black text-lg tracking-tight mt-2 flex items-center gap-2">
              <span>{mask("Progesterone Rising Window")}</span>
            </h2>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-xs">
              {mask(cycleData.phaseDescription)}
            </p>
          </div>

          {/* Stepper */}
          <div className="flex flex-col items-end gap-1 text-[10px]">
            <span className="text-slate-400">Adjust day:</span>
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => updateCycleDay(-1)}
                className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                -
              </button>
              <span className="px-1.5 font-mono font-bold text-white text-[11px]">{cycleData.cycleDay}</span>
              <button
                onClick={() => updateCycleDay(1)}
                className="px-2 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Phase mini pills */}
        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-center font-medium">
          <div className={`p-1.5 rounded-lg border ${cycleData.currentPhase === 'Menstrual' ? 'bg-rose-950/60 border-rose-600/70 text-rose-300' : 'bg-slate-800/40 border-slate-700/60 text-slate-400'}`}>
            {mask("Menstrual")}
          </div>
          <div className={`p-1.5 rounded-lg border ${cycleData.currentPhase === 'Follicular' ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300' : 'bg-slate-800/40 border-slate-700/60 text-slate-400'}`}>
            {mask("Follicular")}
          </div>
          <div className={`p-1.5 rounded-lg border ${cycleData.currentPhase === 'Ovulatory' ? 'bg-teal-950/60 border-teal-600/70 text-teal-300' : 'bg-slate-800/40 border-slate-700/60 text-slate-400'}`}>
            {mask("Ovulatory")}
          </div>
          <div className={`p-1.5 rounded-lg border ${cycleData.currentPhase === 'Luteal' ? 'bg-amber-950/70 border-amber-500/80 text-amber-300 font-bold' : 'bg-slate-800/40 border-slate-700/60 text-slate-400'}`}>
            {mask("Luteal (Now)")}
          </div>
        </div>
      </div>

      {/* 4. Metabolic Balance Score Gauge (0-100) */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-sm tracking-tight flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>{mask("Metabolic Balance Score")}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Calculated from meal glycemic pacing, cortisol & circadian rhythms
            </p>
          </div>
          <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full font-mono">
            Continuous Index
          </span>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="9"
                fill="transparent"
                className="text-slate-800"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="9"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * metabolicScore) / 100}
                strokeLinecap="round"
                fill="transparent"
                className="text-emerald-400 transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-white tracking-tight">{metabolicScore}</span>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">/ 100</span>
            </div>
          </div>

          <div className="w-full space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Glucose Spike Control</span>
                <span className="text-emerald-400 font-semibold font-mono">74%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '74%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Cortisol Buffer Index</span>
                <span className="text-teal-400 font-semibold font-mono">68%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-teal-400 h-full rounded-full" style={{ width: '68%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Luteal Nutrient Pacing</span>
                <span className="text-amber-400 font-semibold font-mono">82%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '82%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Today's Single Manageable Habit */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-700/50 p-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-700/60">
              Today&apos;s Single Manageable Habit
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/80">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{primaryHabit.streakDays} day streak</span>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-white font-bold text-sm leading-snug">
              {primaryHabit.title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {primaryHabit.description}
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{primaryHabit.duration}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{primaryHabit.tag}</span>
            </div>
          </div>

          <button
            onClick={() => handleToggleHabit(primaryHabit.id, primaryHabit.completed)}
            className={`p-2.5 rounded-2xl border transition-all active:scale-95 shrink-0 ${
              primaryHabit.completed
                ? "bg-emerald-600 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-900/50"
                : "bg-slate-800/80 border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-400"
            }`}
            title={primaryHabit.completed ? "Mark incomplete" : "Mark habit completed for today!"}
          >
            {primaryHabit.completed ? (
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <Circle className="w-6 h-6 stroke-[1.8]" />
            )}
          </button>
        </div>

        {primaryHabit.completed && (
          <div className="mt-3 bg-emerald-950/80 border border-emerald-600/60 rounded-xl p-2 text-center text-xs text-emerald-300 font-semibold animate-in fade-in duration-200">
            Goal completed for today! Streak preserved 🌟
          </div>
        )}
      </div>

      {/* 6. Quick Vitality Pulse & Cortisol Reset */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-sm tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Quick Vitality Pulse</span>
          </h3>
          <span className="text-[10px] text-slate-400">Log energy & stress</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-xs">
          {(['Calm', 'Bloated', 'Brain Fog', 'Anxious', 'Radiant', 'Fatigued'] as const).map(mood => (
            <button
              key={mood}
              onClick={() => setSelectedMood(mood)}
              className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                selectedMood === mood
                  ? "bg-teal-950 border-teal-500 text-teal-200 font-bold shadow-sm"
                  : "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {mask(mood)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Energy (1-5)</span>
              <span className="font-bold text-emerald-400">{selectedEnergy}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={selectedEnergy}
              onChange={e => setSelectedEnergy(Number(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Stress (1-5)</span>
              <span className="font-bold text-rose-400">{selectedStress}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={selectedStress}
              onChange={e => setSelectedStress(Number(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleQuickLog}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md active:scale-95"
          >
            {quickLogged ? "Logged for Today! ✓" : "Save Vitality Pulse"}
          </button>

          <button
            onClick={() => setIsBreathingOpen(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-800/60 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-teal-400" />
            <span>60s Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
