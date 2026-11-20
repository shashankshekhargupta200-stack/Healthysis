"use client";

import { useState, useEffect, type ReactNode } from "react";
import { PulseProvider, usePulse } from "@/context/PulseContext";
import { VaultUploadProvider } from "@/context/VaultUploadContext";
import { useAuth } from "@/context/AuthContext";
import { LoginScreen } from "@/components/LoginScreen";
import { SplashScreen } from "@/components/SplashScreen";
import { Navbar } from "@/components/Navbar";
import { Dashboard } from "@/components/Dashboard";
import { BottomNavBar } from "@/components/BottomNavBar";
import { SOSModal } from "@/components/SOSModal";
import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";
import { ProfileSidebar } from "@/components/ProfileSidebar";
import { Lock } from "lucide-react";

function MainApp() {
  const { user, isReady, isPasswordRecovery } = useAuth();
  const {
    activeTab,
    isSidebarOpen,
    setIsSidebarOpen,
    showSplash,
    setShowSplash
  } = usePulse();
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);

  // 1. Strict DRM & Privacy: Screen-Recording / Background Screenshot Obfuscation
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentHidden(document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // 2. Strict DRM & Privacy: Print & Save Block
  // Intercept Ctrl+P / Cmd+P and Ctrl+S / Cmd+S. Exception: Allow printing ONLY on Doctor Brief tab or modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;

      // Print Prevention (Ctrl+P / Cmd+P)
      if (isModifier && (e.key === "p" || e.key === "P")) {
        const isDoctorBriefAccessible = activeTab === "healthfolio" || activeTab === "doctor-brief";
        if (!isDoctorBriefAccessible) {
          e.preventDefault();
        }
      }

      // Save Prevention (Ctrl+S / Cmd+S)
      if (isModifier && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div role="status" aria-label="Loading session" className="h-8 w-8 animate-spin rounded-full border-4 border-[#DCEAEC] border-t-[#04939D]" />
      </div>
    );
  }
  if (isPasswordRecovery) return <LoginScreen />;
  if (!user) return <LoginScreen />;

  // 0. OPENING ANIMATED SPLASH PAGE
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className={`min-h-screen bg-[#F8FBFC] text-[#123F55] flex flex-col font-sans selection:bg-[#0EA6B7] selection:text-white relative select-none ${
        isDocumentHidden ? "privacy-obfuscated" : ""
      }`}
      style={isDocumentHidden ? { filter: "blur(24px)", WebkitFilter: "blur(24px)" } : undefined}
    >
      {/* Background Screenshot Obfuscation Privacy Veil */}
      {isDocumentHidden && (
        <div className="fixed inset-0 z-[100] bg-[#123F55]/90 backdrop-blur-3xl flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#0EA6B7]/20 text-[#0EA6B7] flex items-center justify-center mb-4 border border-[#0EA6B7]/40 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black">Confidential DPDP Health Vault</h2>
          <p className="text-xs text-[#C6E2F1] max-w-sm mt-1">
            Data obscured from background window capture and system app switcher. Return to Healthysis to resume.
          </p>
        </div>
      )}

      {/* Top Full-Width Navigation Bar */}
      <Navbar onOpenProfile={() => setIsSidebarOpen(true)} />

      {/* Main Unified Dashboard */}
      <main className="flex-1 w-full">
        <Dashboard />
      </main>

      {/* Fixed Persistent Bottom Navigation Bar (Dock) */}
      <BottomNavBar />

      {/* Global Modals & Drawers */}
      <ProfileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <SOSModal />
      <PrivacyPolicyModal />
    </div>
  );
}

function UserScopedPulseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <PulseProvider key={user?.id ?? "anonymous"}>
      <VaultUploadProvider>
        {children}
      </VaultUploadProvider>
    </PulseProvider>
  );
}

export default function HomePage() {
  return (
    <UserScopedPulseProvider>
      <MainApp />
    </UserScopedPulseProvider>
  );
}
