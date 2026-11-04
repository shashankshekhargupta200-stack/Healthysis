"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  Sparkles,
  Share2,
  Check,
  AlertTriangle,
  BookOpen,
  Filter,
  CheckCircle,
  Copy,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { mythCards } from "@/lib/mockData";
import { MythCard } from "@/types";

export function TruthEngineTab() {
  const { mask, t } = usePulse();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "All Myths" },
    { id: "diet", label: "Carbs & Diet" },
    { id: "supplements", label: "Supplements & Herbs" },
    { id: "exercise", label: "Workouts & HIIT" },
    { id: "fertility", label: "Fertility Facts" }
  ];

  const filteredCards = selectedCategory === "all"
    ? mythCards
    : mythCards.filter(c => c.category === selectedCategory);

  const handleCopyWhatsApp = (card: MythCard) => {
    navigator.clipboard?.writeText(card.whatsappShareText);
    setCopiedId(card.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 pb-20 pt-2 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>{t.truthEngineHeader}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Busting WhatsApp & Reels misinformation with clinical facts
          </p>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full font-mono">
          5 Verified
        </span>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`text-xs px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? "bg-emerald-950 border-emerald-500 text-emerald-200 font-bold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Myth Cards Feed */}
      <div className="space-y-3.5">
        {filteredCards.map(card => (
          <div
            key={card.id}
            className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl space-y-3 hover:border-slate-700 transition-colors"
          >
            {/* Top Badge: Platform Source + Verdict */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                {card.platformSource}
              </span>

              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  card.verdict === 'FALSE'
                    ? "bg-rose-950 text-rose-300 border-rose-800"
                    : card.verdict === 'MISLEADING'
                    ? "bg-amber-950 text-amber-300 border-amber-800"
                    : "bg-teal-950 text-teal-300 border-teal-800"
                }`}
              >
                {card.verdict}
              </span>
            </div>

            {/* The Viral Myth Statement */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Viral Claim:
              </div>
              <h3 className="text-white font-bold text-sm leading-snug">
                &quot;{mask(card.myth)}&quot;
              </h3>
            </div>

            {/* Doctor-Backed Truth Box */}
            <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t.mythBustedBadge}</span>
              </div>
              <p className="text-xs text-white font-semibold leading-relaxed">
                {mask(card.doctorFact)}
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed border-t border-emerald-900/40 pt-2">
                {mask(card.clinicalExplanation)}
              </p>
            </div>

            {/* Citation Reference & WhatsApp Share Button */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-[200px]" title={card.doctorReference}>
                <BookOpen className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{card.doctorReference}</span>
              </div>

              {/* Copy Polite WhatsApp Debunk Text */}
              <button
                onClick={() => handleCopyWhatsApp(card)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-800/60 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors"
                title="Copy ready-to-send polite WhatsApp reply for family groups"
              >
                {copiedId === card.id ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Copied text!</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp Debunk</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
