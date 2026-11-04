"use client";

import React from "react";
import { usePulse } from "@/context/PulseContext";
import {
  ShieldCheck,
  Lock,
  X,
  FileText,
  Server,
  EyeOff,
  Trash2,
  CheckCircle2,
  ExternalLink,
  HeartHandshake
} from "lucide-react";
import { HealthysisLogo } from "@/components/HealthysisLogo";

export function PrivacyPolicyModal() {
  const { isPrivacyPolicyOpen, setIsPrivacyPolicyOpen, profile } = usePulse();

  if (!isPrivacyPolicyOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-[#DCEAEC] dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-[#F8FBFC] dark:bg-slate-950 border-b border-[#DCEAEC] dark:border-slate-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-healthysis-signature text-white flex items-center justify-center shadow-md shadow-[#04939D]/20">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2
                id="privacy-policy-title"
                className="text-lg sm:text-xl font-black text-[#123F55] dark:text-slate-100 tracking-tight"
              >
                Privacy &amp; Security Policy
              </h2>
              <p className="text-xs text-[#537783] dark:text-slate-400 font-medium">
                Healthysis Sovereign Health Data Governance &bull; Updated October 2026
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPrivacyPolicyOpen(false)}
            className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-[#DCEAEC] dark:border-slate-700 text-[#537783] dark:text-slate-400 hover:text-[#123F55] dark:hover:text-slate-200 flex items-center justify-center transition-colors touch-target"
            aria-label="Close Privacy Policy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-[#123F55] dark:text-slate-200 leading-relaxed">
          {/* Executive Overview Badge */}
          <div className="p-4 rounded-2xl bg-[#DDF2F0] dark:bg-teal-950/40 border border-[#DCEAEC] dark:border-teal-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-black text-[#076584] dark:text-teal-300 uppercase tracking-wider text-[11px] block">
                Sovereign Patient Guarantee
              </span>
              <p className="text-xs text-[#123F55] dark:text-slate-100 font-semibold">
                Your health data belongs exclusively to you. No tracking, no data sales, and zero unconsented third-party access.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-[#076584] dark:text-teal-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-[#DCEAEC] dark:border-slate-800 shrink-0 self-start sm:self-auto">
              ID: {profile.uniqueId}
            </span>
          </div>

          {/* Prototype data handling */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Remote health service status */}
            <div className="p-4 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#04939D]/15 text-[#04939D] dark:text-[#0EA6B7] flex items-center justify-center font-bold">
                <Server className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="font-extrabold text-[#123F55] dark:text-slate-100 text-sm">
                Health records
              </h3>
              <p className="text-[#537783] dark:text-slate-400 text-[11px] leading-relaxed">
                No ABDM or ABHA connection is currently configured.
              </p>
            </div>

            {/* Local identity limitations */}
            <div className="p-4 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#2CAC7F]/15 text-[#2CAC7F] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="font-extrabold text-[#123F55] dark:text-slate-100 text-sm">
                Account authentication
              </h3>
              <p className="text-[#537783] dark:text-slate-400 text-[11px] leading-relaxed">
                Sign-in is provided by Supabase Auth using email or phone and password. Confirmation requirements follow the project’s authentication settings.
              </p>
            </div>

            {/* Health record authorization */}
            <div className="p-4 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#076584]/15 text-[#076584] dark:text-teal-300 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <h3 className="font-extrabold text-[#123F55] dark:text-slate-100 text-sm">
                Supabase access
              </h3>
              <p className="text-[#537783] dark:text-slate-400 text-[11px] leading-relaxed">
                Health-record requests use your authenticated Supabase user ID and rely on the row-level security policies in the database schema.
              </p>
            </div>
          </div>

          {/* Section 1: Data Collection */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-[#123F55] dark:text-slate-100 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#DDF2F0] dark:bg-teal-950/60 text-[#076584] dark:text-teal-300 flex items-center justify-center font-black text-xs">
                1
              </span>
              <span>Current data handling</span>
            </h4>
            <p className="text-[#537783] dark:text-slate-400">
              Supabase Auth manages your account and persists its session in browser storage. Browser storage is not encrypted by this application.
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#537783] dark:text-slate-400 pl-2">
              <li>Meal photos submitted for analysis are sent to the configured AI service and are not saved as app records.</li>
              <li>Health-record access is restricted to the signed-in Supabase account by database row-level security policies.</li>
            </ul>
          </div>

          {/* Section 2: External integrations */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-[#123F55] dark:text-slate-100 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#DDF2F0] dark:bg-teal-950/60 text-[#076584] dark:text-teal-300 flex items-center justify-center font-black text-xs">
                2
              </span>
              <span>External health integrations</span>
            </h4>
            <p className="text-[#537783] dark:text-slate-400">
              The current version does not connect to ABHA, ABDM, hospitals, or physicians:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#537783] dark:text-slate-400 pl-2">
              <li>PDF exports are generated in this application from the currently available Healthfolio data.</li>
              <li>No external provider access or consent-management workflow is configured.</li>
            </ul>
          </div>

          {/* Section 3: Storage and removal */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-[#123F55] dark:text-slate-100 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#DDF2F0] dark:bg-teal-950/60 text-[#076584] dark:text-teal-300 flex items-center justify-center font-black text-xs">
                3
              </span>
              <span>Local session removal</span>
            </h4>
            <p className="text-[#537783] dark:text-slate-400">
              Signing out removes the locally stored name and phone number from this browser. It does not erase any records from a configured remote database.
            </p>
          </div>

          {/* Section 4: Data Protection Officer / Grievance Redressal */}
          <div className="p-4 rounded-2xl bg-[#F8FBFC] dark:bg-slate-950 border border-[#DCEAEC] dark:border-slate-800 space-y-1.5">
            <div className="font-extrabold text-[#123F55] dark:text-slate-100">
              Grievance Redressal &amp; Data Protection Officer (DPO)
            </div>
            <p className="text-[#537783] dark:text-slate-400 text-[11px]">
              For inquiries regarding data custody, DPDP Act compliance, or clinical integrations:
            </p>
            <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-semibold text-[#076584] dark:text-teal-300">
              <span>Email: privacy@healthysis.com</span>
              <span>&bull;</span>
              <span>DPDP Compliance Reg: HS-DPDP-2026-IN</span>
              <span>&bull;</span>
              <span>Response SLA: Within 48 Hours</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-[#F8FBFC] dark:bg-slate-950 border-t border-[#DCEAEC] dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-[#537783] dark:text-slate-400">
            <Lock className="w-3.5 h-3.5 text-[#2CAC7F]" />
            <span>Healthysis End-to-End Cryptographic Security Active</span>
          </div>

          <button
            type="button"
            onClick={() => setIsPrivacyPolicyOpen(false)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-healthysis-signature text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
          >
            I Understand &amp; Agree
          </button>
        </div>
      </div>
    </div>
  );
}
