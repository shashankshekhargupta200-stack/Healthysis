"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  User,
  X,
  ShieldCheck,
  Calendar,
  Pill,
  FileText,
  Activity,
  Heart,
  Stethoscope,
  Building2,
  Clock,
  Download,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export function PatientProfileModal() {
  const { isProfileOpen, setIsProfileOpen, profile, mask } = usePulse();
  const [activeTab, setActiveTab] = useState<'meds' | 'checkups' | 'history'>('meds');

  if (!isProfileOpen) return null;

  const lifetime = profile.lifetimeRecord;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl shadow-slate-950 overflow-hidden">
        {/* Modal Top Bar */}
        <div className="bg-slate-800/90 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <User className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-white text-sm">{profile.name}</h3>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {profile.uniqueId}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Age {profile.age} • DOB: {profile.dob} • Bengaluru
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsProfileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs inside Profile */}
        <div className="grid grid-cols-3 bg-slate-950/60 p-1 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('meds')}
            className={`py-2 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'meds' ? "bg-slate-800 text-emerald-400 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Medications</span>
          </button>
          <button
            onClick={() => setActiveTab('checkups')}
            className={`py-2 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'checkups' ? "bg-slate-800 text-teal-400 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Checkups</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'history' ? "bg-slate-800 text-purple-400 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Lifelong Health</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto no-scrollbar space-y-3.5 text-xs text-slate-200 flex-1">
          {/* TAB 1: Complete Past & Current Medications */}
          {activeTab === 'meds' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-white">Prescribed Medications History</span>
                <span>{lifetime?.pastMedications.length || 0} Records</span>
              </div>

              {lifetime?.pastMedications.map((med, idx) => (
                <div
                  key={idx}
                  className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm">{med.medicineName}</h4>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            med.status === 'active'
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {med.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                        Dosage: {med.dosage} • {med.duration}
                      </p>
                    </div>
                  </div>

                  {/* Prescribing Doctor Information */}
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-teal-300 font-semibold">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Prescribed by: {med.prescribedByDoctor} ({med.doctorSpecialty})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                      <Building2 className="w-3 h-3" />
                      <span>{med.hospitalOrClinic} • Year: {med.yearPrescribed}</span>
                    </div>
                    <div className="text-slate-300 pt-1 border-t border-slate-800 text-[10px]">
                      <span className="font-semibold text-slate-400">Clinical Purpose: </span>
                      {med.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Past Checkups & Diagnostics */}
          {activeTab === 'checkups' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-white">Lifetime Checkup Logs</span>
                <span>Verified Diagnostic Records</span>
              </div>

              {lifetime?.pastCheckups.map((chk, idx) => (
                <div
                  key={idx}
                  className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{chk.checkupType}</span>
                    <span className="text-[10px] text-teal-400 font-mono bg-teal-950 px-2 py-0.5 rounded-full border border-teal-800">
                      {chk.date}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 font-medium">
                    Consultant: <span className="text-slate-100">{chk.consultingDoctor}</span>
                  </p>

                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                    <span className="font-semibold text-emerald-400 block">Diagnosis: {chk.diagnosis}</span>
                    <ul className="text-slate-300 space-y-0.5 pl-2 pt-1 border-t border-slate-800 text-[10px]">
                      {chk.keyFindings.map((finding, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-1.5">
                          <span className="text-teal-400">•</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Lifelong Health, Illnesses & Family History */}
          {activeTab === 'history' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {/* Chronic Conditions */}
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  Chronic Conditions
                </h4>
                <ul className="space-y-1 pl-1 text-[11px] text-slate-300">
                  {lifetime?.chronicConditions.map((c, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Past Illnesses & Hospitalizations */}
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Past Illnesses & Hospitalizations
                </h4>
                <ul className="space-y-1 pl-1 text-[11px] text-slate-300">
                  {lifetime?.pastIllnesses.map((ill, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{ill}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Family History */}
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Heritable Family History
                </h4>
                <ul className="space-y-1 pl-1 text-[11px] text-slate-300">
                  {lifetime?.familyHistory.map((fam, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-teal-400 font-bold">•</span>
                      <span>{fam}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>DPDP Sovereign Health Vault</span>
          </span>
          <button
            onClick={() => setIsProfileOpen(false)}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
