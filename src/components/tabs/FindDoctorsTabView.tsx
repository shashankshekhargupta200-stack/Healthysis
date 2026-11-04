"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  Stethoscope,
  Search,
  Star,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Lock,
  Building2,
  GraduationCap,
  Sparkles,
  X,
  Calendar,
  AlertCircle,
  Phone,
  Video,
  Zap,
  Mic,
  MicOff,
  Send,
  Volume2,
  PhoneOff
} from "lucide-react";
import { DoctorProfile } from "@/types";
import { InfiniteDoctorCarousel } from "@/components/InfiniteDoctorCarousel";

export function FindDoctorsTabView() {
  const { doctorsList } = usePulse();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("All");
  const [selectedDoctorForModal, setSelectedDoctorForModal] = useState<DoctorProfile | null>(null);
  const [isPersonalConsultFilter, setIsPersonalConsultFilter] = useState(false);
  const [isPrivateHeroModalOpen, setIsPrivateHeroModalOpen] = useState(false);
  const [commsMode, setCommsMode] = useState<"audio" | "chat" | "video" | null>(null);
  const [commsInputText, setCommsInputText] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: "doctor",
      text: "Namaste! I've reviewed your metabolic telemetry and glycemic profile. How can I assist you with your hormonal health today?",
      time: "Just now"
    }
  ]);
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [bookingConfirmedDoctor, setBookingConfirmedDoctor] = useState<DoctorProfile | null>(null);

  const specialties = [
    "All",
    "Gynecology",
    "Endocrinology",
    "Diabetology",
    "Psychiatry",
    "General Medicine"
  ];

  // Tag matcher for Personal / Private Issues (Psychiatrists, Gynecologists specializing in Endometriosis/PCOS)
  const isPersonalDoctor = (doc: DoctorProfile) => {
    const s = doc.specialty.toLowerCase();
    const a = (doc.about || "").toLowerCase();
    const c = (doc.credentials || "").toLowerCase();
    return (
      s.includes("psychiatry") ||
      s.includes("gynecology") ||
      a.includes("pcos") ||
      a.includes("endometriosis") ||
      c.includes("pcos") ||
      c.includes("mental")
    );
  };

  const filteredDoctors = doctorsList.filter((doc) => {
    if (isPersonalConsultFilter && !isPersonalDoctor(doc)) {
      return false;
    }
    const matchesSpecialty =
      selectedSpecialty === "All" ||
      doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.credentials && doc.credentials.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSpecialty && matchesSearch;
  });

  const handleHeroPersonalConsultClick = () => {
    setIsPersonalConsultFilter(true);
    setSelectedSpecialty("All");
    const el = document.getElementById("doctor-directory-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleOpenDoctorProfile = (doctor: DoctorProfile) => {
    setSelectedDoctorForModal(doctor);
    setCommsMode(null);
    setIsBookingSuccess(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commsInputText.trim()) return;
    const newMsg = {
      sender: "patient",
      text: commsInputText.trim(),
      time: "Just now"
    };
    setChatMessages(prev => [...prev, newMsg]);
    setCommsInputText("");

    // Simulated doctor response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          sender: "doctor",
          text: "I note this in your clinical record. Let's maintain the low-glycemic fiber sequencing and continue inositol at current dosage.",
          time: "Just now"
        }
      ]);
    }, 1200);
  };

  const handleBookFromModal = (doctor: DoctorProfile) => {
    setBookingConfirmedDoctor(doctor);
    setIsBookingSuccess(true);
    setTimeout(() => {
      setIsBookingSuccess(false);
      setSelectedDoctorForModal(null);
    }, 2200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* ============================================================ */}
      {/* 1. TOP HERO: PRIVATE CONSULTATION HERO BUTTON                */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#076584] via-[#04939D] to-[#0a2938] p-6 sm:p-8 text-white border-2 border-[#0EA6B7]/40 shadow-xl">
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-[#77C86F]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-[#2CAC7F]/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#CBEFE0] text-xs font-black uppercase tracking-wider border border-white/20">
              <Lock className="w-3.5 h-3.5 text-[#77C86F]" />
              <span>DPDP Encrypted • 100% Anonymous Health Vault</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Clinical Directory &amp; Specialist Care
            </h1>
            <p className="text-teal-50 text-sm sm:text-base font-normal leading-relaxed">
              Browse 30 verified clinical endocrinologists, gynecologists, diabetologists, and psychiatrists. 
              Review clinical experience, patient reviews, and consultation fees.
            </p>
          </div>
          {/* MASSIVE DISTINCT PRIVATE CONSULTATION HERO BUTTON */}
          <button
            type="button"
            onClick={handleHeroPersonalConsultClick}
            className="btn-healthysis-primary group relative px-6 py-5 rounded-2xl text-white font-black text-base shadow-2xl shadow-[#04939D]/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-left shrink-0 border border-white/25"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 shadow-xs border border-white/25">
                <Lock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="block text-sm sm:text-base font-black text-white">
                  Book a Personal Consultation (Private &amp; Confidential)
                </span>
                <span className="block text-xs font-semibold text-teal-100 opacity-90">
                  Filters directory to sensitive Psychiatry &amp; PCOS specialists
                </span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. INFINITE DOCTOR MARQUEE CAROUSEL                          */}
      {/* ============================================================ */}
      <InfiniteDoctorCarousel />

      {/* Filtered by Personal Consultation Banner */}
      {isPersonalConsultFilter && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white border-2 border-teal-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm sm:text-base block">
                Filtered: Personal &amp; Private Consultation Specialists
              </span>
              <span className="text-xs text-teal-200 font-medium">
                Showing {filteredDoctors.length} specialists tagged for sensitive care (Psychiatrists, Endometriosis &amp; PCOS Gynecologists)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPersonalConsultFilter(false)}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Show All 30 Doctors</span>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. SEARCH & SPECIALTY FILTER CHIPS                          */}
      {/* ============================================================ */}
      <div id="doctor-directory-section" className="bg-white dark:bg-slate-900 border border-[#DCEAEC] dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 transition-colors duration-200">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-[#829AA3] dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by doctor name, specialty, hospital or city (e.g. Aditi, AIIMS, Bengaluru)..."
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-[#DCEAEC] dark:border-slate-800 focus:border-[#0EA6B7] focus:ring-2 focus:ring-[#0EA6B7]/20 text-[#123F55] dark:text-slate-100 font-medium text-sm placeholder-[#829AA3] dark:placeholder-slate-500 transition-all bg-white dark:bg-slate-950"
          />
        </div>

        {/* Specialty Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {specialties.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-4 py-2.5 rounded-xl font-extrabold whitespace-nowrap transition-all touch-target ${
                selectedSpecialty === spec
                  ? "bg-healthysis-signature text-white shadow-xs"
                  : "bg-[#F8FBFC] dark:bg-slate-950 hover:bg-[#DDF2F0] dark:hover:bg-slate-800 text-[#123F55] dark:text-slate-300 border border-[#DCEAEC] dark:border-slate-800"
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. EXPANDED DIRECTORY (30 DOCTORS LIST)                      */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Showing {filteredDoctors.length} Specialists
          </p>
          <span className="text-xs text-teal-700 dark:text-teal-400 font-bold">
            Tap any card to view detailed background &amp; reviews
          </span>
        </div>

        {filteredDoctors.map((doc) => {
          return (
            <div
              key={doc.id}
              onClick={() => handleOpenDoctorProfile(doc)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:border-teal-500 dark:hover:border-teal-400 hover:shadow-md transition-all cursor-pointer group space-y-4"
            >
              {/* Main Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Doctor Avatar */}
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${doc.avatarColor} text-white flex items-center justify-center font-black text-xl shadow-md shrink-0 relative group-hover:scale-105 transition-transform`}>
                    {doc.avatarInitials}
                    {doc.verified && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white font-black" title="Verified Specialist">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Doctor Meta */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                        {doc.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300">
                        {doc.specialty}
                      </span>
                      {doc.feeNumber && doc.feeNumber >= 1200 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Premium Specialist
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {doc.credentials}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <strong>{doc.experienceYears} Years</strong> Exp.
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-teal-800 dark:text-teal-300 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        {doc.patientsCuredCount}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {doc.city}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating & Action Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(doc.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200 dark:text-slate-700 fill-slate-200 dark:fill-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">{doc.rating}</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">({doc.reviews.length} reviews)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {doc.consultationFee}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDoctorProfile(doc);
                      }}
                      className="px-4 py-2 bg-teal-600 group-hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs touch-target active:scale-95"
                    >
                      View Profile &rarr;
                    </button>
                  </div>
                </div>
              </div>

              {/* Sample Review Preview Snippet */}
              {doc.reviews.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 truncate max-w-xl">
                    <MessageSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span className="truncate italic">
                      &ldquo;{doc.reviews[0].comment}&rdquo; &mdash;{" "}
                      <strong className="text-slate-700 dark:text-slate-300">{doc.reviews[0].author}</strong>
                    </span>
                  </div>
                  <span className="text-teal-700 dark:text-teal-400 font-bold text-[11px] shrink-0 ml-2 group-hover:underline">
                    Read all {doc.reviews.length} reviews
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {filteredDoctors.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <Stethoscope className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">No specialists found matching query</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500">Try clearing the search query or selecting &quot;All&quot; specialties.</p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 5. INTERACTIVE DOCTOR PROFILE FULL MODAL / SLIDE-OVER        */}
      {/* ============================================================ */}
      {selectedDoctorForModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-br from-slate-50 to-teal-50/50 dark:from-slate-900 dark:to-teal-950/40 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${selectedDoctorForModal.avatarColor} text-white flex items-center justify-center font-black text-2xl shadow-lg shrink-0 relative`}>
                  {selectedDoctorForModal.avatarInitials}
                  {selectedDoctorForModal.verified && (
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs text-white font-black" title="Verified Specialist">
                      ✓
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                      {selectedDoctorForModal.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {selectedDoctorForModal.specialty}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-semibold">
                    {selectedDoctorForModal.credentials}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>{selectedDoctorForModal.city}, India</span>
                    <span>•</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Medical Council Verified</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDoctorForModal(null)}
                className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
              {/* STATS ROW: Experience, Patients Cured, Ongoing Treatments */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Experience
                  </span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                    {selectedDoctorForModal.experienceYears} Years
                  </span>
                </div>
                <div className="space-y-0.5 border-x border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Patients Cured
                  </span>
                  <span className="text-base sm:text-lg font-black text-teal-700 dark:text-teal-400">
                    {selectedDoctorForModal.patientsCuredCount}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Active Care
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    {selectedDoctorForModal.ongoingTreatmentsCount || "75 Active Patients"}
                  </span>
                </div>
              </div>

              {/* ============================================================ */}
              {/* CONNECT ACTION BAR (Directly below stats)                     */}
              {/* 1. Audio Call (Green)                                        */}
              {/* 2. Secure Chat (Blue)                                        */}
              {/* 3. Video Consult (Purple)                                    */}
              {/* ============================================================ */}
              <div className="bg-gradient-to-r from-teal-50 via-slate-50 to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-3xl p-5 border-2 border-teal-200/80 dark:border-teal-900/60 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                      Connect With Specialist
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Online Now
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* 1. Audio Call (Green) */}
                  <button
                    type="button"
                    onClick={() => setCommsMode("audio")}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group touch-target shadow-xs"
                  >
                    <div className="w-13 h-13 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform mb-2">
                      <Phone className="w-5 h-5 stroke-[2.3]" />
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                      Audio Call
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                      Free 1st Consult
                    </span>
                  </button>

                  {/* 2. Secure Chat (Blue) */}
                  <button
                    type="button"
                    onClick={() => setCommsMode("chat")}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all group touch-target shadow-xs"
                  >
                    <div className="w-13 h-13 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 group-hover:scale-105 transition-transform mb-2">
                      <MessageSquare className="w-5 h-5 stroke-[2.3]" />
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                      Secure Chat
                    </span>
                    <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                      DPDP Encrypted
                    </span>
                  </button>

                  {/* 3. Video Consult (Purple) */}
                  <button
                    type="button"
                    onClick={() => setCommsMode("video")}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all group touch-target shadow-xs"
                  >
                    <div className="w-13 h-13 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 group-hover:scale-105 transition-transform mb-2">
                      <Video className="w-5 h-5 stroke-[2.3]" />
                    </div>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                      Video Consult
                    </span>
                    <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-400">
                      HD Tele-Room
                    </span>
                  </button>
                </div>
              </div>

              {/* SIMULATED ACTIVE COMMS OVERLAY */}
              {commsMode === "audio" && (
                <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Encrypted Tele-Consult Call • 00:38</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCommsMode(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Minimize
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-lg animate-pulse">
                        {selectedDoctorForModal.avatarInitials}
                      </div>
                      <div>
                        <span className="font-extrabold text-sm block">{selectedDoctorForModal.name}</span>
                        <span className="text-xs text-emerald-300">Speaking with patient...</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCommsMode(null)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 touch-target"
                      >
                        <PhoneOff className="w-4 h-4" />
                        <span>End Call</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {commsMode === "chat" && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                        Secure DPDP Consultation Chat with {selectedDoctorForModal.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCommsMode(null)}
                      className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Close
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 text-xs">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                          msg.sender === "doctor"
                            ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                            : "ml-auto bg-teal-600 text-white"
                        }`}
                      >
                        <span className="font-bold block text-[10px] opacity-75 mb-0.5">
                          {msg.sender === "doctor" ? selectedDoctorForModal.name : "You"}
                        </span>
                        <span>{msg.text}</span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={commsInputText}
                      onChange={(e) => setCommsInputText(e.target.value)}
                      placeholder="Type a clinical query (e.g., dosage, food advice)..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:border-teal-500 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </form>
                </div>
              )}

              {commsMode === "video" && (
                <div className="p-4 rounded-2xl bg-slate-950 text-white space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                    <span className="font-bold text-purple-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                      Video Room #PS-742 Connected
                    </span>
                    <button
                      type="button"
                      onClick={() => setCommsMode(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      Exit Room
                    </button>
                  </div>
                  <div className="aspect-video bg-slate-900 rounded-xl relative flex items-center justify-center border border-slate-800">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 rounded-full bg-purple-600/40 text-purple-300 border border-purple-400/50 flex items-center justify-center mx-auto text-xl font-bold">
                        {selectedDoctorForModal.avatarInitials}
                      </div>
                      <span className="font-extrabold text-sm block">
                        {selectedDoctorForModal.name} (Live Video)
                      </span>
                      <span className="text-xs text-slate-400 block">
                        Full HD encrypted stream running smoothly
                      </span>
                    </div>

                    <div className="absolute bottom-3 right-3 w-28 h-20 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                      Your Camera
                    </div>
                  </div>
                  <div className="flex justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setCommsMode(null)}
                      className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 touch-target"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>End Video Session</span>
                    </button>
                  </div>
                </div>
              )}

              {/* BACKGROUND: Hospitals/Clinics worked in, Educational background */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Educational Background &amp; Training
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedDoctorForModal.education || "MBBS, MD - Specialization in Internal Medicine, Advanced Clinical Fellowship."}
                </p>

                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 pt-2">
                  <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Hospitals &amp; Clinical Affiliations
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDoctorForModal.hospitals && selectedDoctorForModal.hospitals.length > 0 ? (
                    selectedDoctorForModal.hospitals.map((hosp, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                      >
                        {hosp}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">Apollo Hospitals, Manipal Healthcare</span>
                  )}
                </div>

                {selectedDoctorForModal.about && (
                  <div className="pt-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      Clinical Philosophy
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {selectedDoctorForModal.about}
                    </p>
                  </div>
                )}
              </div>

              {/* REVIEWS SECTION: Expandable mixed reviews */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    Patient Reviews ({selectedDoctorForModal.reviews.length})
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.round(selectedDoctorForModal.rating)
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200 dark:text-slate-700 fill-slate-200 dark:fill-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                    <span>{selectedDoctorForModal.rating} out of 5</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {selectedDoctorForModal.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">{rev.author}</span>
                          <div className="flex text-amber-400">
                            {[...Array(rev.rating)].map((_, idx) => (
                              <Star key={idx} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{rev.date}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* STICKY BOTTOM BUTTON: Book Consultation - ₹[Fee] */}
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky bottom-0 z-10 shadow-lg">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Consultation Fee
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {selectedDoctorForModal.consultationFee}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> / session</span>
                </span>
              </div>

              {isBookingSuccess ? (
                <div className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-md animate-in zoom-in-95">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Consultation Booked!</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBookFromModal(selectedDoctorForModal)}
                  className="px-6 sm:px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-lg shadow-teal-700/25 transition-all transform active:scale-95 touch-target flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Consultation &mdash; {selectedDoctorForModal.consultationFee}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. MODAL: PRIVATE & CONFIDENTIAL CONSULTATION HERO MODAL     */}
      {/* ============================================================ */}
      {isPrivateHeroModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center font-black">
                  <Lock className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-lg">
                    Private &amp; Confidential Consultation
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sovereign DPDP End-to-End Encryption</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivateHeroModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 space-y-2">
                <span className="font-extrabold text-teal-900 dark:text-teal-200 text-sm block">
                  Zero Family / Third-Party Data Exposure
                </span>
                <p className="leading-relaxed">
                  Your identity is protected under your platform ID (e.g., PS-742). The consulting physician receives only your metabolic trends, glycemic curves, and clinical symptoms without your phone number or household identity.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">Choose Confidential Specialist Domain:</span>
                <div className="grid grid-cols-2 gap-2">
                  {["PCOS & Hormones", "Thyroid & Cortisol", "Diabetology & Insulin", "Burnout & Sleep"].map((dom, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setIsPrivateHeroModalOpen(false);
                        setSelectedSpecialty(i === 0 ? "Gynecology" : i === 1 ? "Endocrinology" : i === 2 ? "Diabetology" : "Psychiatry");
                      }}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50/50 dark:hover:bg-slate-700 text-left font-bold text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      {dom} &rarr;
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivateHeroModalOpen(false)}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl text-sm transition-all shadow-md touch-target active:scale-95"
              >
                Explore Confidential Doctors List
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
