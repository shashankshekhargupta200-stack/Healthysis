"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  Calendar,
  Clock,
  Utensils,
  AlertTriangle,
  CheckCircle,
  Filter,
  Activity,
  Flame,
  Zap,
  Info
} from "lucide-react";

export function HistoryTab() {
  const {
    mealLogs,
    historyFilter,
    setHistoryFilter,
    mask
  } = usePulse();

  const [filterType, setFilterType] = useState<'all' | 'high_gi' | 'joint_triggers'>('all');

  // Filter based on window (7 days vs 30 days) and category
  const filteredMeals = mealLogs.filter(meal => {
    if (filterType === 'high_gi') return meal.glycemicLevel === 'high';
    if (filterType === 'joint_triggers') return meal.jointPainCorrelation !== undefined;
    return true;
  });

  return (
    <div className="space-y-4 pb-20 pt-2 animate-in fade-in duration-200">
      {/* Top Header & Window Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>Dietary & Joint Pain Timeline</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Doctor & patient historical dietary window
          </p>
        </div>

        {/* 7 Days vs 30 Days Toggle */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-semibold">
          <button
            onClick={() => setHistoryFilter('7days')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              historyFilter === '7days' ? "bg-emerald-600 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setHistoryFilter('30days')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              historyFilter === '30days' ? "bg-emerald-600 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Joint Pain & Symptom Correlation Clinical Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/50 border border-amber-600/50 rounded-2xl p-3.5 space-y-1.5 shadow-lg">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Doctor Clinical Correlation Note: Joint Stiffness & Diet</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          In {historyFilter === '7days' ? "the past 7 days" : "the past 30 days"}, your knee joint stiffness flared on <strong>Day 15 (Samosa)</strong> and <strong>Day 18 (Aloo Paratha)</strong> within 4 hours of refined starch meals. Elevated glucose produces advanced glycation end-products (AGEs) that trigger acute synovial inflammation.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-xl border transition-colors ${
            filterType === 'all'
              ? "bg-emerald-950 border-emerald-500 text-emerald-200 font-bold"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          All Logged Meals ({filteredMeals.length})
        </button>
        <button
          onClick={() => setFilterType('joint_triggers')}
          className={`px-3 py-1.5 rounded-xl border transition-colors ${
            filterType === 'joint_triggers'
              ? "bg-amber-950 border-amber-500 text-amber-200 font-bold"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          Joint Pain Triggers ⚠️
        </button>
        <button
          onClick={() => setFilterType('high_gi')}
          className={`px-3 py-1.5 rounded-xl border transition-colors ${
            filterType === 'high_gi'
              ? "bg-rose-950 border-rose-500 text-rose-200 font-bold"
              : "bg-slate-900 border-slate-800 text-slate-400"
          }`}
        >
          High Glycemic
        </button>
      </div>

      {/* Timeline Meal Cards */}
      <div className="space-y-3">
        {filteredMeals.map((meal, idx) => (
          <div
            key={meal.id}
            className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl space-y-3 hover:border-slate-700 transition-colors"
          >
            {/* Header: Date, TimeOfDay & Glycemic Badge */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>{meal.dateStr}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">{meal.timeOfDay}</span>
                </div>
                <h3 className="text-white font-bold text-sm mt-0.5">{meal.mealName}</h3>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  meal.glycemicLevel === 'high'
                    ? "bg-rose-950 text-rose-300 border-rose-700"
                    : meal.glycemicLevel === 'moderate'
                    ? "bg-amber-950 text-amber-300 border-amber-700"
                    : "bg-emerald-950 text-emerald-300 border-emerald-700"
                }`}
              >
                {mask(meal.glycemicImpact)}
              </span>
            </div>

            {/* Nutrients Metrics Grid */}
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
              <div className="bg-slate-850 p-2 rounded-xl border border-slate-800">
                <div className="text-[9px] text-slate-400">Calories</div>
                <div className="font-bold text-white font-mono text-[11px]">{meal.nutrients.calories} kcal</div>
              </div>
              <div className="bg-slate-850 p-2 rounded-xl border border-slate-800">
                <div className="text-[9px] text-slate-400">Carbs</div>
                <div className="font-bold text-amber-400 font-mono text-[11px]">{meal.nutrients.carbsGrams}g</div>
              </div>
              <div className="bg-slate-850 p-2 rounded-xl border border-slate-800">
                <div className="text-[9px] text-slate-400">Protein</div>
                <div className="font-bold text-emerald-400 font-mono text-[11px]">{meal.nutrients.proteinGrams}g</div>
              </div>
              <div className="bg-slate-850 p-2 rounded-xl border border-slate-800">
                <div className="text-[9px] text-slate-400">Fiber</div>
                <div className="font-bold text-teal-400 font-mono text-[11px]">{meal.nutrients.fiberGrams}g</div>
              </div>
            </div>

            {/* Identified Items */}
            <div className="text-[11px] text-slate-300">
              <span className="font-semibold text-slate-400 block mb-1">Identified Items:</span>
              <div className="flex flex-wrap gap-1">
                {meal.identifiedItems.map((item, i) => (
                  <span key={i} className="bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-lg text-[10px]">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Joint Pain & Inflammatory Correlation */}
            {meal.jointPainCorrelation && (
              <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-amber-300">Symptom Link: </strong>
                  {mask(meal.jointPainCorrelation)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
