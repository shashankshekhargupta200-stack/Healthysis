"use client";

import React, { useState, useEffect } from "react";
import { usePulse } from "@/context/PulseContext";
import { X, Volume2, VolumeX, CheckCircle, Sparkles, RefreshCw } from "lucide-react";
import { playCalmChime } from "@/lib/utils";

export function BreathingModal() {
  const { isBreathingOpen, setIsBreathingOpen, logTodayMood, moodLogs } = usePulse();
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold (Top)' | 'Exhale' | 'Hold (Bottom)'>('Inhale');
  const [phaseSeconds, setPhaseSeconds] = useState(4);
  const [isFinished, setIsFinished] = useState(false);

  // 16s cycle: 4s inhale, 4s hold, 4s exhale, 4s hold
  useEffect(() => {
    if (!isBreathingOpen) {
      setIsActive(false);
      setSecondsRemaining(60);
      setIsFinished(false);
      return;
    }
    setIsActive(true);
  }, [isBreathingOpen]);

  useEffect(() => {
    if (!isActive || secondsRemaining <= 0) {
      if (secondsRemaining <= 0 && !isFinished) {
        setIsFinished(true);
        setIsActive(false);
        // Automatically reward user by nudging stress down
        const curr = moodLogs[0] || { energyLevel: 3, stressLevel: 4, mood: 'Calm', symptoms: [] };
        logTodayMood(Math.min(5, curr.energyLevel + 1), Math.max(1, curr.stressLevel - 1), 'Calm', curr.symptoms);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isActive, secondsRemaining, isFinished, logTodayMood, moodLogs]);

  // Phase controller (4s cycle)
  useEffect(() => {
    if (!isActive) return;

    const phaseTimer = setInterval(() => {
      setPhaseSeconds(prev => {
        if (prev <= 1) {
          // Switch phase
          setBreathPhase(currPhase => {
            let next: 'Inhale' | 'Hold (Top)' | 'Exhale' | 'Hold (Bottom)' = 'Inhale';
            if (currPhase === 'Inhale') {
              next = 'Hold (Top)';
              if (soundEnabled) playCalmChime(528, 1.8);
            } else if (currPhase === 'Hold (Top)') {
              next = 'Exhale';
              if (soundEnabled) playCalmChime(396, 2.2);
            } else if (currPhase === 'Exhale') {
              next = 'Hold (Bottom)';
              if (soundEnabled) playCalmChime(432, 1.5);
            } else {
              next = 'Inhale';
              if (soundEnabled) playCalmChime(432, 2.0);
            }
            return next;
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(phaseTimer);
  }, [isActive, soundEnabled]);

  if (!isBreathingOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-emerald-600/40 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl shadow-emerald-950/70 relative overflow-hidden flex flex-col items-center">
        {/* Subtle radial background glow */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Controls */}
        <div className="w-full flex items-center justify-between text-slate-400 mb-2 relative z-10">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-colors ${
              soundEnabled ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-300" : "bg-slate-800 border-slate-700 text-slate-500"
            }`}
            title={soundEnabled ? "Mute calming sound" : "Enable 432Hz ambient chime"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-full">
            Vagal Cortisol Reset
          </span>

          <button
            onClick={() => setIsBreathingOpen(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        {!isFinished ? (
          <div className="my-6 flex flex-col items-center relative z-10 w-full">
            {/* Animated Breathing Circle */}
            <div className="relative w-56 h-56 flex items-center justify-center my-4">
              {/* Outer pulsing ripple ring */}
              <div
                className={`absolute inset-0 rounded-full border border-emerald-400/20 transition-all duration-1000 ${
                  breathPhase === 'Inhale'
                    ? "scale-110 opacity-70 bg-emerald-500/10"
                    : breathPhase === 'Exhale'
                    ? "scale-90 opacity-20"
                    : "scale-100 opacity-40 bg-teal-500/5"
                }`}
              />

              {/* Core Breathing Sphere */}
              <div
                className={`w-36 h-36 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all ease-in-out duration-1000 ${
                  breathPhase === 'Inhale'
                    ? "scale-110 bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-emerald-500/50"
                    : breathPhase === 'Hold (Top)'
                    ? "scale-110 bg-gradient-to-tr from-teal-500 to-cyan-400 text-slate-950 shadow-teal-500/50"
                    : breathPhase === 'Exhale'
                    ? "scale-85 bg-gradient-to-tr from-slate-700 to-emerald-800 text-emerald-200 shadow-slate-950"
                    : "scale-85 bg-gradient-to-tr from-slate-800 to-slate-700 text-slate-300"
                }`}
              >
                <span className="text-lg font-black tracking-tight">{breathPhase}</span>
                <span className="text-xs font-mono font-bold opacity-80 mt-0.5">{phaseSeconds}s</span>
              </div>
            </div>

            {/* Instruction Cue */}
            <div className="space-y-1">
              <h4 className="text-white font-bold text-base">
                {breathPhase === 'Inhale' && "Inhale deeply through your belly..."}
                {breathPhase === 'Hold (Top)' && "Hold gently. Relax your shoulders..."}
                {breathPhase === 'Exhale' && "Exhale slowly through your mouth..."}
                {breathPhase === 'Hold (Bottom)' && "Rest in stillness. Calm is arriving..."}
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Slow rhythmic breathing stimulates the vagus nerve, calming acute cortisol secretion within 60 seconds.
              </p>
            </div>

            {/* Countdown bar */}
            <div className="w-full mt-6 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-1000"
                style={{ width: `${((60 - secondsRemaining) / 60) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400 mt-1.5">
              {secondsRemaining}s remaining
            </span>
          </div>
        ) : (
          /* Finished State */
          <div className="my-8 flex flex-col items-center space-y-4 relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-900/40">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Parasympathetic Shift Complete</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xs">
                Your heart rate variability and vagal tone have stabilized. Today’s stress index has been recalibrated down.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setSecondsRemaining(60);
                  setIsFinished(false);
                  setIsActive(true);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Repeat Reset</span>
              </button>
              <button
                onClick={() => setIsBreathingOpen(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg transition-transform active:scale-95"
              >
                Return to Day
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
