"use client";

import React, { useState, useRef } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  Camera,
  Upload,
  Sparkles,
  Zap,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Utensils,
  Flame,
  Activity,
  BellRing
} from "lucide-react";
import { MealAnalysis } from "@/types";
import { sampleMealsForScanner } from "@/lib/mockData";

export function SnapTab() {
  const { addMealLog, mask, missedMealHours, setMissedMealHours } = usePulse();

  const [selectedMeal, setSelectedMeal] = useState<MealAnalysis>(sampleMealsForScanner[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [analyzedResult, setAnalyzedResult] = useState<MealAnalysis | null>(sampleMealsForScanner[0]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSimulateScan = (meal: MealAnalysis) => {
    setSelectedMeal(meal);
    setIsScanning(true);
    setAnalyzedResult(null);
    setSaveSuccess(false);

    setTimeout(() => {
      setIsScanning(false);
      setAnalyzedResult(meal);
    }, 1600);
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const customMealData: MealAnalysis = {
        id: `custom-${Date.now()}`,
        timestamp: "Just Now",
        dateStr: "Today (Day 18)",
        timeOfDay: "Dinner",
        mealName: "Uploaded Home Dinner (Dal, Rice & Sabzi)",
        imageUrl: url,
        identifiedItems: [
          "1 Bowl Steamed White Rice (Carbohydrate base)",
          "1 Katori Yellow Moong Dal Tadka (Plant protein)",
          "Bhindi / Okra Masala (Soluble fiber)",
          "Fresh Cucumber & Carrot Slices"
        ],
        nutrients: {
          calories: 430,
          carbsGrams: 58,
          proteinGrams: 14,
          fiberGrams: 6.5,
          fatGrams: 12,
          glycemicIndex: 54,
          inflammatoryIndex: "Moderate"
        },
        glycemicImpact: "Moderate Glycemic Load",
        glycemicLevel: "moderate",
        hormonalImpactSummary: "Balanced homemade meal. Eating the steamed white rice after dal and fiber reduces the glucose velocity, keeping morning cortisol and joint stiffness buffered.",
        jointPainCorrelation: "Moderate profile. Okra and moong dal provide protective mucilaginous fiber.",
        microNudge: "Eat your dal and bhindi 5 minutes BEFORE the rice to slow down gastric carbohydrate absorption.",
        actionableSteps: [
          "Start with the okra sabzi and dal broth.",
          "Add 1 tbsp curd to introduce lactic acid and lower overall glycemic index.",
          "Enjoy a 10-minute relaxed post-meal walk."
        ],
        fiberScore: 6,
        proteinScore: 6
      };

      setSelectedMeal(customMealData);
      setIsScanning(true);
      setAnalyzedResult(null);

      setTimeout(() => {
        setIsScanning(false);
        setAnalyzedResult(customMealData);
      }, 1700);
    }
  };

  const handleSaveToDiary = () => {
    if (analyzedResult) {
      addMealLog(analyzedResult);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  return (
    <div className="space-y-4 pb-20 pt-2 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-base flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>Snapchat-Style Food Scanner</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Powered by Gemini Vision • Calculates nutrients & joint pain triggers
          </p>
        </div>
        <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Gemini Vision</span>
        </span>
      </div>

      {/* Snapchat-Style Viewfinder Camera Viewport */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-700 aspect-[4/3] flex items-center justify-center shadow-2xl">
        {/* Subtle camera grid */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
          <div className="border-r border-b border-white/50" />
          <div className="border-r border-b border-white/50" />
          <div className="border-b border-white/50" />
          <div className="border-r border-b border-white/50" />
          <div className="border-r border-b border-white/50" />
          <div className="border-b border-white/50" />
          <div className="border-r border-b border-white/50" />
          <div className="border-r border-b border-white/50" />
          <div />
        </div>

        {/* Viewfinder Target Reticle */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />

        {/* Live scanning radar animation */}
        {isScanning && (
          <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none flex flex-col justify-center items-center">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400/80 animate-bounce" />
            <div className="mt-4 bg-slate-900/90 text-emerald-300 border border-emerald-500/40 text-xs px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 shadow-xl">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Gemini Vision calculating macronutrients & glycemic load...</span>
            </div>
          </div>
        )}

        {/* Meal Icon & Target Content */}
        <div className="relative z-10 text-center px-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-emerald-400 shadow-md">
            <Utensils className="w-8 h-8" />
          </div>
          <h4 className="text-white font-bold text-sm mt-3">{selectedMeal.mealName}</h4>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
            Snap your meal right before eating. Nutrients store in 30-day history for doctor review.
          </p>
        </div>

        {/* Bottom Shutter & Controls inside camera */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between z-20">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            title="Upload photo from camera roll"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCustomUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Shutter Capture Snap Button */}
          <button
            onClick={() => handleSimulateScan(selectedMeal)}
            disabled={isScanning}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 transition-transform active:scale-95"
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
            <span>{isScanning ? "Scanning..." : "Snap & Calculate"}</span>
          </button>

          <button
            onClick={() => handleSimulateScan(selectedMeal)}
            className="p-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs"
            title="Reload scanner"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Meal Scenario Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Quick Desi Meals (Tap to snap):</span>
          <span>Simulated presets</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {sampleMealsForScanner.slice(0, 4).map(meal => (
            <button
              key={meal.id}
              onClick={() => handleSimulateScan(meal)}
              className={`p-2.5 rounded-2xl border text-left transition-all ${
                selectedMeal.id === meal.id
                  ? "bg-slate-850 border-emerald-500/80 text-white shadow-md shadow-emerald-950"
                  : "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850"
              }`}
            >
              <div className="font-semibold text-[11px] truncate">{meal.mealName}</div>
              <div className="flex items-center justify-between mt-1 text-[10px]">
                <span
                  className={
                    meal.glycemicLevel === 'high'
                      ? "text-rose-400 font-bold"
                      : meal.glycemicLevel === 'moderate'
                      ? "text-amber-400 font-bold"
                      : "text-emerald-400 font-bold"
                  }
                >
                  {meal.glycemicImpact}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Analyzed Results Card (Nutrients & Joint Pain Correlation) */}
      {analyzedResult && !isScanning && (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-4 shadow-xl space-y-3.5 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">
                Gemini Vision Nutrient Breakdown:
              </span>
              <h3 className="text-white font-bold text-sm mt-0.5">{analyzedResult.mealName}</h3>
            </div>

            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border shrink-0 ${
                analyzedResult.glycemicLevel === 'high'
                  ? "bg-rose-950/80 border-rose-600/70 text-rose-300"
                  : analyzedResult.glycemicLevel === 'moderate'
                  ? "bg-amber-950/80 border-amber-600/70 text-amber-300"
                  : "bg-emerald-950/80 border-emerald-600/70 text-emerald-300"
              }`}
            >
              {mask(analyzedResult.glycemicImpact)}
            </span>
          </div>

          {/* Complete Nutrient Metrics Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="bg-slate-850 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400">Calories</div>
              <div className="font-bold text-white font-mono text-[11px]">{analyzedResult.nutrients.calories} kcal</div>
            </div>
            <div className="bg-slate-850 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400">Carbs</div>
              <div className="font-bold text-amber-400 font-mono text-[11px]">{analyzedResult.nutrients.carbsGrams}g</div>
            </div>
            <div className="bg-slate-850 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400">Protein</div>
              <div className="font-bold text-emerald-400 font-mono text-[11px]">{analyzedResult.nutrients.proteinGrams}g</div>
            </div>
            <div className="bg-slate-850 p-2 rounded-xl border border-slate-800">
              <div className="text-[9px] text-slate-400">Fiber</div>
              <div className="font-bold text-teal-400 font-mono text-[11px]">{analyzedResult.nutrients.fiberGrams}g</div>
            </div>
          </div>

          {/* Identified Ingredients */}
          <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Identified Ingredients:
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {analyzedResult.identifiedItems.map((item, i) => (
                <span
                  key={i}
                  className="bg-slate-800 border border-slate-700/80 text-slate-200 text-[11px] px-2.5 py-1 rounded-lg"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Joint Pain Link */}
          {analyzedResult.jointPainCorrelation && (
            <div className="bg-amber-950/40 border border-amber-600/60 rounded-2xl p-3 space-y-1">
              <h5 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Joint Pain & Inflammatory Trigger Note</span>
              </h5>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {mask(analyzedResult.jointPainCorrelation)}
              </p>
            </div>
          )}

          {/* Actionable Micro-Nudge */}
          <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
              <Lightbulb className="w-4 h-4 text-emerald-400" />
              <span>Saarthi Micro-Nudge</span>
            </div>
            <p className="text-xs text-white font-medium leading-relaxed">
              &quot;{analyzedResult.microNudge}&quot;
            </p>
            <ul className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-emerald-800/40">
              {analyzedResult.actionableSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Save to History Button */}
          <button
            onClick={handleSaveToDiary}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-1.5 active:scale-95"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{saveSuccess ? "Saved to 30-Day Food History! ✓" : "Save to 30-Day Food History"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
