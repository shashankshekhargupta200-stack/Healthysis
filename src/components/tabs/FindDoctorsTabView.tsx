"use client";

import React, { useState } from "react";
import { usePulse } from "@/context/PulseContext";
import {
  Stethoscope,
  Search,
  Star,
  MapPin,
  MessageSquare,
  Lock,
  Building2,
  GraduationCap,
  Sparkles,
  X,
  Phone,
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

  const specialties = [
    "All",
    "Gynecology",
    "Endocrinology",
    "Diabetology",
    "Psychiatry",
    "General Medicine",
    "Cardiology",
    "Surgery"
  ];

  // Tag matcher for Personal / Private Issues (Psychiatrists, Gynecologists specializing in Endometriosis/PCOS)
  const isPersonalDoctor = (doc: DoctorProfile) => {
    const s = doc.specialty.toLowerCase();
    const a = (doc.about || "").toLowerCase();
    const c = (doc.credentials || "").toLowerCase();
    return (
      s.includes("psychiatry") ||
      s.includes("gynecology") ||
      (doc.subspecialty || "").toLowerCase().includes("pcos") ||
      a.includes("pcos") ||
      a.includes("endometriosis") ||
      c.includes("pcos") ||
      c.includes("mental")
    );
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredDoctors = doctorsList.filter((doc) => {
    if (isPersonalConsultFilter && !isPersonalDoctor(doc)) {
      return false;
    }
    const specialtiesToSearch = `${doc.specialty} ${doc.subspecialty || ""}`.toLowerCase();
    const matchesSpecialty =
      selectedSpecialty === "All" ||
      specialtiesToSearch.includes(selectedSpecialty.toLowerCase());
    const searchableDetails = [
      doc.name,
      doc.specialty,
      doc.subspecialty,
      doc.credentials,
      doc.city,
      doc.clinicAddress,
      ...(doc.hospitals ?? [])
    ].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch =
      !normalizedSearch || searchableDetails.includes(normalizedSearch);
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
              Browse {doctorsList.length} clinical specialists in Prayagraj. Listings have not been independently verified; call the clinic to confirm details and availability.
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
            <span>Show All {doctorsList.length} Doctors</span>
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
            placeholder="Search by name, specialty, qualification, hospital, address, or city (e.g. Prayagraj)..."
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
      {/* 4. EXPANDED DIRECTORY                                         */}
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
                      {doc.subspecialty && (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {doc.subspecialty}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {doc.credentials}
                    </p>

                    <p className="flex items-start gap-1.5 pt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span>{doc.clinicAddress || doc.city}</span>
                    </p>
                  </div>
                </div>

                {/* Rating & Action Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                  {doc.rating > 0 ? <div className="flex items-center gap-1.5">
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
                  </div> : <span className="text-xs text-slate-500 dark:text-slate-400">No rating data</span>}

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {doc.phone && (
                      <a
                        href={`tel:${doc.phone.replace(/[^\d+]/g, "")}`}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-700 px-3 py-2 text-xs font-extrabold text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call {doc.phone}
                      </a>
                    )}
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

              {/* Only render review previews when review data exists. */}
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
                    <span className={selectedDoctorForModal.verified ? "font-bold text-emerald-700 dark:text-emerald-400" : "font-medium text-amber-700 dark:text-amber-400"}>
                      {selectedDoctorForModal.verified ? "Directory verified" : "Verification not independently confirmed"}
                    </span>
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
              {/* Only show numeric clinical data when it has been supplied. */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Experience
                  </span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                    {selectedDoctorForModal.experienceYears > 0 ? `${selectedDoctorForModal.experienceYears} Years` : "Not listed"}
                  </span>
                </div>
                <div className="space-y-0.5 border-x border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Patient Count
                  </span>
                  <span className="text-base sm:text-lg font-black text-teal-700 dark:text-teal-400">
                    {selectedDoctorForModal.patientsCuredCount === "Not listed" ? "Not listed" : selectedDoctorForModal.patientsCuredCount}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Active Care
                  </span>
                  <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    {selectedDoctorForModal.ongoingTreatmentsCount || "Not listed"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/30">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Contact Clinic
                </h4>
                <p className="mt-2 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400" />
                  <span>{selectedDoctorForModal.clinicAddress || selectedDoctorForModal.city}</span>
                </p>
                {selectedDoctorForModal.phone && (
                  <a
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800"
                    href={`tel:${selectedDoctorForModal.phone.replace(/[^\d+]/g, "")}`}
                  >
                    <Phone className="h-4 w-4" />
                    Call {selectedDoctorForModal.phone} to ask about booking
                  </a>
                )}
              </div>

              {/* BACKGROUND: Hospitals/Clinics worked in, Educational background */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Educational Background &amp; Training
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedDoctorForModal.education || "No additional qualification details supplied."}
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
                    <span className="text-xs text-slate-500 dark:text-slate-400">No other affiliations supplied.</span>
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

              {selectedDoctorForModal.reviews.length > 0 && (
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
              )}
            </div>

            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky bottom-0 z-10 shadow-lg">
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Consultation fee
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {selectedDoctorForModal.consultationFee}
                </span>
              </div>

              {selectedDoctorForModal.phone && (
                <a
                  href={`tel:${selectedDoctorForModal.phone.replace(/[^\d+]/g, "")}`}
                  className="px-6 sm:px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-lg shadow-teal-700/25 transition-all flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call to ask about booking</span>
                </a>
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
