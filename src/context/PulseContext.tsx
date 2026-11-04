"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  UserProfile,
  Language,
  NavigationTab,
  MythCard,
  DoctorProfile,
  HealthResumeData
} from "@/types";
import { createEmptyHealthResume } from "@/lib/healthResumeDefaults";
import { useAuth } from "@/context/AuthContext";

interface PulseContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  healthResume: HealthResumeData;
  updateHealthResume: (updates: Partial<HealthResumeData>) => void;
  isSosOpen: boolean;
  setIsSosOpen: (open: boolean) => void;
  isPrivacyPolicyOpen: boolean;
  setIsPrivacyPolicyOpen: (open: boolean) => void;
  pendingMealImage: File | null;
  setPendingMealImage: (image: File | null) => void;
  mythCards: MythCard[];
  doctorsList: DoctorProfile[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setLanguage: (lang: Language) => void;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isHidingCondition: boolean;
  setIsHidingCondition: (val: boolean) => void;
  showSplash: boolean;
  setShowSplash: (show: boolean) => void;
  replaySplash: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  theme: string;
  resolvedTheme?: string;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  signOut: () => Promise<void>;
}

const PulseContext = createContext<PulseContextType | undefined>(undefined);

const VALID_TABS: NavigationTab[] = [
  "home",
  "healthfolio",
  "snap",
  "find-doctors",
  "user-profile"
];

function createEmptyProfile(name = "", phone = ""): UserProfile {
  return {
    name,
    age: 0,
    dob: "",
    height: "",
    weight: "",
    phone,
    role: "patient",
    uniqueId: phone,
    language: "en",
    onboarded: Boolean(name && phone),
    isHidingCondition: false,
    createdAt: ""
  };
}

export function PulseProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme: nextTheme, setTheme: setNextTheme, resolvedTheme } = useTheme();
  const currentTheme = nextTheme || "light";

  const toggleTheme = () => {
    if (nextTheme === "light") {
      setNextTheme("dark");
    } else if (nextTheme === "dark") {
      setNextTheme("system");
    } else {
      setNextTheme("light");
    }
  };

  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile>(() =>
    createEmptyProfile(user?.name ?? "", user?.id ?? "")
  );
  const [healthResume, setHealthResume] = useState<HealthResumeData>(() =>
    createEmptyHealthResume(user?.name ?? "", user?.id ?? "")
  );
  const [activeTab, setActiveTabState] = useState<NavigationTab>("home");
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
  const [pendingMealImage, setPendingMealImage] = useState<File | null>(null);

  const mythCards: MythCard[] = [];
  const [searchQuery, setSearchQuery] = useState("");

  const updateHealthResume = useCallback((updates: Partial<HealthResumeData>) => {
    setHealthResume(prev => ({ ...prev, ...updates }));
  }, []);

  // 1. SPA History & Popstate Event Listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    let tabParam = params.get("tab") as NavigationTab | null;
    if (tabParam === "doctor-brief") tabParam = "healthfolio";
    if (tabParam === "truth-engine") tabParam = "user-profile";

    if (tabParam && VALID_TABS.includes(tabParam)) {
      setTimeout(() => setActiveTabState(tabParam as NavigationTab), 0);
    } else {
      const url = new URL(window.location.href);
      if (!url.searchParams.has("tab")) {
        url.searchParams.set("tab", "home");
        window.history.replaceState({ tab: "home" }, "", url.toString());
      }
    }

    const handlePopState = (event: PopStateEvent) => {
      const currentParams = new URLSearchParams(window.location.search);
      let poppedTab = currentParams.get("tab") as NavigationTab | null;
      if (poppedTab === "doctor-brief") poppedTab = "healthfolio";
      if (poppedTab === "truth-engine") poppedTab = "user-profile";

      if (poppedTab && VALID_TABS.includes(poppedTab)) {
        setActiveTabState(poppedTab);
      } else if (event.state?.tab && VALID_TABS.includes(event.state.tab)) {
        setActiveTabState(event.state.tab);
      } else {
        setActiveTabState("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setActiveTab = (newTab: NavigationTab) => {
    if (newTab === activeTab) return;
    setActiveTabState(newTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newTab);
      window.history.pushState({ tab: newTab }, "", url.toString());
    }
  };

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const setLanguage = (lang: Language) => {
    updateProfile({ language: lang });
  };

  const signOut = async () => {
    await logout();
    setIsSidebarOpen(false);
    setActiveTabState("home");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("tab");
      window.history.replaceState({ tab: "home" }, "", url.pathname);
    }
  };

  const replaySplash = () => {
    setShowSplash(true);
  };

  return (
    <PulseContext.Provider
      value={{
        profile,
        updateProfile,
        healthResume,
        updateHealthResume,
        isSosOpen,
        setIsSosOpen,
        isPrivacyPolicyOpen,
        setIsPrivacyPolicyOpen,
        pendingMealImage,
        setPendingMealImage,
        mythCards,
        doctorsList: [],
        searchQuery,
        setSearchQuery,
        setLanguage,
        activeTab,
        setActiveTab,
        isHidingCondition: profile.isHidingCondition ?? false,
        setIsHidingCondition: (val: boolean) => updateProfile({ isHidingCondition: val }),
        isSidebarOpen,
        setIsSidebarOpen,
        theme: currentTheme,
        resolvedTheme,
        setTheme: setNextTheme,
        toggleTheme,
        signOut,
        showSplash,
        setShowSplash,
        replaySplash
      }}
    >
      {children}
    </PulseContext.Provider>
  );
}

export function usePulse() {
  const context = useContext(PulseContext);
  if (!context) {
    throw new Error("usePulse must be used within a PulseProvider");
  }
  return context;
}
