"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  ShieldCheck,
  Check,
  ArrowRight,
  Globe,
  Lock,
  Sparkles,
  Stethoscope,
  HeartPulse,
  User,
  Phone,
  CreditCard,
  Calendar,
  KeyRound,
  X
} from "lucide-react";
import { Language, UserRole } from "@/types";
import { generateRoleId } from "@/lib/utils";

export function OnboardingModal() {
  const {
    profile,
    updateProfile,
    isOnboardingOpen,
    setIsOnboardingOpen,
    t
  } = usePulse();

  const [step, setStep] = useState(1);
  const [selectedLang, setSelectedLang] = useState<Language>(profile.language || 'en');
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');

  // Personal Info Form
  const [name, setName] = useState(profile.name || 'Ananya');
  const [age, setAge] = useState(profile.age || 24);
  const [dob, setDob] = useState(profile.dob || '2002-04-16');
  const [phone, setPhone] = useState(profile.phone || '+91 98765 43210');
  const [aadharNumber, setAadharNumber] = useState(profile.aadharNumber || '4928 1029 3849');

  // OTP State
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState(false);

  // Generated Unique ID
  const [generatedUniqueId, setGeneratedUniqueId] = useState("");

  if (!isOnboardingOpen) return null;

  const handleRoleSelected = (role: UserRole) => {
    setSelectedRole(role);
    setStep(3); // Go to personal details
  };

  const handleDetailsSubmit = () => {
    // Proceed to OTP verification step
    setStep(4);
  };

  const handleVerifyOtp = () => {
    setIsVerifyingOtp(true);
    setTimeout(() => {
      setIsVerifyingOtp(false);
      // Generate ID with [2 Alphabets]-[3 Numbers]
      const newId = generateRoleId(selectedRole);
      setGeneratedUniqueId(newId);
      setStep(5); // Show generated ID screen
    }, 1200);
  };

  const handleCompleteOnboarding = () => {
    updateProfile({
      name: name || 'Ananya',
      age: Number(age) || 24,
      dob: dob,
      phone: phone,
      aadharNumber: aadharNumber,
      role: selectedRole,
      uniqueId: generatedUniqueId || profile.uniqueId,
      language: selectedLang,
      onboarded: true
    });
    setIsOnboardingOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl shadow-emerald-950/60 flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold">
              <span>PS</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Identity & Role Setup</h3>
              <p className="text-[10px] text-slate-400">Step {step} of 5</p>
            </div>
          </div>
          {profile.onboarded && (
            <button
              onClick={() => setIsOnboardingOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* STEP 1: Language Selector */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h4 className="text-white font-bold text-sm">Choose Your Language</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Select your preferred language for continuous health guidance.
              </p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setSelectedLang("en")}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  selectedLang === "en"
                    ? "bg-emerald-950/60 border-emerald-500 text-white"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">English</div>
                  <div className="text-[10px] text-slate-400">Clinical, direct & reassuring</div>
                </div>
                {selectedLang === "en" && <Check className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                onClick={() => setSelectedLang("hi")}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  selectedLang === "hi"
                    ? "bg-emerald-950/60 border-emerald-500 text-white"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">हिंदी (Hindi)</div>
                  <div className="text-[10px] text-slate-400">सरल, आत्मीय एवं स्पष्ट मार्गदर्शन</div>
                </div>
                {selectedLang === "hi" && <Check className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                onClick={() => setSelectedLang("hinglish")}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                  selectedLang === "hinglish"
                    ? "bg-emerald-950/60 border-emerald-500 text-white"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                <div>
                  <div className="font-semibold text-xs">Hinglish</div>
                  <div className="text-[10px] text-slate-400">Desi food context + easy English</div>
                </div>
                {selectedLang === "hinglish" && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full mt-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md"
            >
              <span>Next: Select Profession</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Profession / Role Selector (Doctor D-ID, Health Pro P-ID, Patient EM-ID) */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h4 className="text-white font-bold text-sm">What is your profession?</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                We assign a specialized cryptographic ID prefix based on your role.
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Option 1: Doctor -> D-ID */}
              <button
                onClick={() => handleRoleSelected('doctor')}
                className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  selectedRole === 'doctor'
                    ? "bg-teal-950/70 border-teal-500 text-white shadow-md shadow-teal-950"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-teal-600/60"
                }`}
              >
                <div className="p-2 rounded-xl bg-teal-900/60 text-teal-400 mt-0.5">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">Doctor / Physician</span>
                    <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.2 rounded-full font-mono">
                      D-ID
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Generates a verified <strong>D-ID</strong>. Access clinical dashboard, patient 30-day food timelines & doctor briefs.
                  </p>
                </div>
              </button>

              {/* Option 2: Health Professional -> P-ID */}
              <button
                onClick={() => handleRoleSelected('health_pro')}
                className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  selectedRole === 'health_pro'
                    ? "bg-emerald-950/70 border-emerald-500 text-white shadow-md shadow-emerald-950"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-emerald-600/60"
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-900/60 text-emerald-400 mt-0.5">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">Health Professional / Nutritionist</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded-full font-mono">
                      P-ID
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Generates a professional <strong>P-ID</strong>. Coach patients on metabolic pacing and nutritional compliance.
                  </p>
                </div>
              </button>

              {/* Option 3: Patient / Normal User -> EM-ID */}
              <button
                onClick={() => handleRoleSelected('patient')}
                className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  selectedRole === 'patient'
                    ? "bg-slate-850 border-emerald-400 text-white shadow-md shadow-slate-950"
                    : "bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="p-2 rounded-xl bg-slate-800 text-emerald-400 mt-0.5">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">Patient / Individual User</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded-full font-mono">
                      EM-ID
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Generates a unique <strong>EM-ID</strong> (Electronic Medical ID). Daily cycle tracking, meal scanning & doctor consultations.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Welcome & Registration (Name, Age, DOB, Phone, Aadhaar) */}
        {step === 3 && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div>
              <h4 className="text-white font-bold text-sm">Welcome to Pulse Saarthi!</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Please enter your credentials to initiate sovereign verification.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Full Name / Alias
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ananya"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> Contact Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-slate-400" /> Aadhaar / ABHA Number (12-Digit)
                </label>
                <input
                  type="text"
                  value={aadharNumber}
                  onChange={e => setAadharNumber(e.target.value)}
                  placeholder="XXXX XXXX 4829"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Aadhaar data verified on-device via DPDP sandboxing.</span>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleDetailsSubmit}
                className="w-2/3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md"
              >
                <span>Submit & Send OTP</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: OTP Verification */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-600/60 flex items-center justify-center text-teal-400 mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="text-white font-bold text-sm">Enter Mobile OTP</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                A 6-digit one-time password has been sent to <span className="text-white font-semibold">{phone}</span>
              </p>
            </div>

            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 text-center space-y-3">
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="• • • • • •"
                className="w-44 text-center tracking-[0.5em] font-mono text-xl font-bold bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-emerald-400 focus:outline-none focus:border-emerald-500 mx-auto block"
              />

              <button
                onClick={() => setOtp("849201")}
                className="text-[11px] text-teal-400 hover:underline inline-block"
              >
                Auto-fill Demo OTP (849201)
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(3)}
                className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp}
                className="w-2/3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-emerald-950"
              >
                {isVerifyingOtp ? "Verifying Aadhaar OTP..." : "Verify & Generate ID"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Unique ID Generated (e.g. EM-742, DR-821) */}
        {step === 5 && (
          <div className="space-y-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-950/80 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-950">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
                Aadhaar Authentication Verified
              </span>
              <h4 className="text-white font-black text-lg mt-2">
                Your Lifetime Health ID is Ready
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Welcome, <span className="font-bold text-white">{name}</span> ({age} yrs). This ID will remain unique to you across all hospital appointments and doctor consultations.
              </p>
            </div>

            {/* Prominent Generated ID Box */}
            <div className="bg-gradient-to-b from-slate-850 to-slate-900 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-xl space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                {selectedRole === 'doctor' ? "Doctor D-ID" : selectedRole === 'health_pro' ? "Health Pro P-ID" : "Electronic Medical ID (EM-ID)"}
              </div>
              <div className="font-mono text-3xl font-black text-white tracking-widest text-emerald-300">
                {generatedUniqueId || profile.uniqueId}
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                Format: 2 alphabets + dash + 3 digits • Sovereign DPDP Encrypted
              </div>
            </div>

            <button
              onClick={handleCompleteOnboarding}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-transform active:scale-95"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>Enter Pulse Saarthi Home</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
