"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import { isNetworkError, readUserLocalData } from "@/lib/localUserData";
import type { HealthResumeData } from "@/types";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isGuest?: boolean;
}

interface AuthProfile {
  id: string;
  full_name: string;
  phone: string | null;
  patient_id: string | null;
}

type AuthCredentials =
  | { kind: "email"; email: string }
  | { kind: "phone"; email: string; phone: string };

interface AuthApiResponse {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
  profileWarning?: string;
  session?: {
    access_token: string;
    refresh_token: string;
  } | null;
}

interface AuthContextValue {
  session: Session | null;
  user: AuthUser | null;
  isReady: boolean;
  authError: string | null;
  isPasswordRecovery: boolean;
  isAuthenticated: boolean;
  signIn: (identifier: string, password: string) => Promise<boolean>;
  signUp: (name: string, identifier: string, password: string) => Promise<"email" | null | false>;
  loginAsGuest: (customName?: string) => void;
  requestPasswordReset: (email: string) => Promise<void>;
  verifyPasswordResetOtp: (email: string, token: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const GUEST_SESSION_KEY = "healthysis_active_session";

function readGuestSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(GUEST_SESSION_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (
      isRecord(parsed)
      && parsed.isGuest === true
      && parsed.id === "guest_user_917388302228"
      && typeof parsed.name === "string"
      && typeof parsed.phone === "string"
      && typeof parsed.email === "string"
    ) {
      return {
        id: parsed.id,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        isGuest: true
      };
    }
  } catch (error: unknown) {
    console.warn("Could not restore guest session.", error);
  }
  return null;
}

function isEmailIdentifier(identifier: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function formatAuthIdentifierInput(value: string): string {
  if (value.includes("@")) return value;

  const digits = value.replace(/\D/g, "");
  if (/^\s*\+91/.test(value)) return `+91${digits.slice(2, 12)}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return digits;
}

function normalizeIdentifier(identifier: string): AuthCredentials {
  const cleanIdentifier = identifier.trim();
  if (isEmailIdentifier(cleanIdentifier)) return { kind: "email", email: cleanIdentifier.toLowerCase() };

  const digits = cleanIdentifier.replace(/\D/g, "");
  const mobile = digits.length === 10 ? digits : digits.startsWith("91") ? digits.slice(2) : "";
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    throw new Error("Enter a valid email address or a 10-digit Indian mobile number.");
  }

  const phone = `+91${mobile}`;
  const clean12DigitPhone = phone.slice(1);
  return {
    kind: "phone",
    email: `${clean12DigitPhone}@healthysis.app`,
    phone
  };
}

function toAuthUser(session: Session | null, profile: AuthProfile | null): AuthUser | null {
  if (!session) return null;
  const authUser = session.user;
  const metadataName = authUser.user_metadata?.full_name;
  const metadataPhone = authUser.user_metadata?.phone;
  const isInternalEmail = authUser.email?.endsWith("@healthysis.app") ?? false;
  const nameFromMetadata = typeof metadataName === "string" && metadataName.trim()
    ? metadataName
    : undefined;
  const phoneFromMetadata = typeof metadataPhone === "string" ? metadataPhone : undefined;

  return {
    id: authUser.id,
    name: profile?.full_name || nameFromMetadata || authUser.email?.split("@")[0] || "User",
    email: isInternalEmail ? undefined : authUser.email ?? undefined,
    phone: profile?.phone || profile?.patient_id || phoneFromMetadata
      || (isInternalEmail ? `+${authUser.email?.split("@")[0]}` : undefined)
  };
}

async function postAuthRequest(path: string, payload: Record<string, string | null>): Promise<AuthApiResponse> {
  let response: Response | undefined;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    return { success: false, error: "Could not reach the authentication server. Check your connection and try again." };
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    return { success: false, error: "Could not read the authentication server response. Please try again." };
  }
  let result: unknown = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { error: text || `Server error (${response.status})` };
  }
  if (
    !response.ok
    || !isRecord(result)
    || result.success !== true
    || ("error" in result && typeof result.error === "string")
  ) {
    const message = isRecord(result) && "error" in result
      && typeof result.error === "string"
      ? result.error
      : `Authentication failed with status ${response.status}`;
    return { success: false, error: message };
  }
  const session = isRecord(result.session)
    && typeof result.session.access_token === "string"
    && typeof result.session.refresh_token === "string"
    ? {
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token
    }
    : null;
  return {
    success: true,
    requiresEmailConfirmation: result.requiresEmailConfirmation === true,
    profileWarning: typeof result.profileWarning === "string" ? result.profileWarning : undefined,
    session
  };
}

async function establishAuthSession(
  response: AuthApiResponse
): Promise<Session> {
  if (
    !response.session
    || typeof response.session.access_token !== "string"
    || typeof response.session.refresh_token !== "string"
  ) {
    throw new Error("Authentication succeeded without returning a session.");
  }
  const { data, error } = await getSupabaseClient().auth.setSession({
    access_token: response.session.access_token,
    refresh_token: response.session.refresh_token
  });
  if (error) throw error;
  if (!data.session) throw new Error("Supabase did not persist the authenticated session.");
  return data.session;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [guestUser, setGuestUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    let unsubscribe: (() => void) | undefined;

    const initializeSession = async () => {
      const restoredGuest = readGuestSession();
      if (restoredGuest) {
        setGuestUser(restoredGuest);
        setIsReady(true);
        return;
      }
      await Promise.resolve();
      if (!active) return;
      try {
        const supabase = getSupabaseClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
          receivedAuthEvent = true;
          if (!active) return;
          setProfile((currentProfile) =>
            currentProfile?.id === nextSession?.user.id ? currentProfile : null
          );
          setSession(nextSession);
          setIsPasswordRecovery(event === "PASSWORD_RECOVERY");
          setAuthError(null);
          setIsReady(true);
        });
        unsubscribe = () => subscription.unsubscribe();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (active && !receivedAuthEvent) {
          setSession(data.session);
          setIsReady(true);
        }
      } catch (error: unknown) {
        console.error("Could not initialize the Supabase session.", error);
        if (active) {
          setAuthError(error instanceof Error ? error.message : "Could not initialize authentication.");
          setIsReady(true);
        }
      }
    };

    void initializeSession();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const userId = session?.user.id;
    if (userId) {
      const loadProfile = async () => {
        try {
          const { data, error } = await getSupabaseClient()
            .from("profiles")
            .select("id, full_name, phone, patient_id")
            .eq("id", userId)
            .maybeSingle();
          if (error) throw error;
          if (active) setProfile(data);
        } catch (error: unknown) {
          console.error("Could not load the authenticated user's profile.", error);
          if (isNetworkError(error)) {
            const resume = readUserLocalData<HealthResumeData | null>(userId, "healthfolio", null);
            if (active && resume) {
              setProfile({
                id: userId,
                full_name: resume.fullName,
                phone: resume.phone || null,
                patient_id: resume.patientId || null
              });
            }
          } else if (active) {
            setAuthError(error instanceof Error ? error.message : "Could not load your profile.");
          }
        }
      };

      void loadProfile();
    }
    return () => {
      active = false;
    };
  }, [session?.user.id]);

  const signIn = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    setAuthError(null);
    const credentials = normalizeIdentifier(identifier);
    const response = await postAuthRequest("/api/auth/signin", {
      identifier: credentials.email,
      password
    });
    if (!response.success) {
      setAuthError(response.error ?? "Sign-in failed. Please try again.");
      return false;
    }

    try {
      const nextSession = await establishAuthSession(response);
      setProfile(null);
      setGuestUser(null);
      if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_SESSION_KEY);
      setSession(nextSession);
      setIsPasswordRecovery(false);
      return true;
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : "Could not establish your session.");
      return false;
    }
  }, []);

  const signUp = useCallback(async (name: string, identifier: string, password: string): Promise<"email" | null | false> => {
    setAuthError(null);
    const credentials = normalizeIdentifier(identifier);
    const formattedPhone = credentials.kind === "phone" ? credentials.phone : null;
    const response = await postAuthRequest("/api/auth/signup", {
      name: name.trim(),
      email: credentials.email,
      phone: formattedPhone,
      password
    });
    if (!response.success) {
      setAuthError(response.error ?? "Account creation failed. Please try again.");
      return false;
    }

    if (!response.session) {
      if (credentials.kind === "phone" && response.requiresEmailConfirmation) {
        setAuthError(
          "Supabase requires email confirmation for this phone alias, but the alias cannot receive email. Disable email confirmation for this project or sign up with a real email address."
        );
        return false;
      }
      return "email";
    }

    try {
      const nextSession = await establishAuthSession(response);
      setProfile(null);
      setGuestUser(null);
      if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_SESSION_KEY);
      setSession(nextSession);
      setIsPasswordRecovery(false);
      setAuthError(null);
      return null;
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : "Could not establish your session.");
      return false;
    }
  }, []);

  const loginAsGuest = useCallback((customName?: string) => {
    const guest: AuthUser = {
      id: "guest_user_917388302228",
      name: customName?.trim() || "Shashank Shekhar Gupta",
      phone: "+917388302228",
      email: "guest@healthysis.local",
      isGuest: true
    };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guest));
      } catch (error: unknown) {
        console.warn("Could not persist guest session.", error);
      }
    }
    setSession(null);
    setProfile(null);
    setGuestUser(guest);
    setAuthError(null);
    setIsPasswordRecovery(false);
    setIsReady(true);
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailIdentifier(normalizedEmail)) throw new Error("Enter a valid email address.");
    const redirectTo = typeof window === "undefined"
      ? undefined
      : `${window.location.origin}/?reset=true`;
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(normalizedEmail, {
      ...(redirectTo ? { redirectTo } : {})
    });
    if (error) throw error;
  }, []);

  const verifyPasswordResetOtp = useCallback(async (email: string, token: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isEmailIdentifier(normalizedEmail)) throw new Error("Enter a valid email address.");
    const { data, error } = await getSupabaseClient().auth.verifyOtp({
      email: normalizedEmail,
      token: token.trim(),
      type: "recovery"
    });
    if (error) throw error;
    if (!data.session) throw new Error("The recovery code did not create a valid session.");
    setSession(data.session);
    setIsPasswordRecovery(true);
    setAuthError(null);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
    const { error } = await getSupabaseClient().auth.updateUser({ password });
    if (error) throw error;
    setIsPasswordRecovery(false);
  }, []);

  const logout = useCallback(async () => {
    if (guestUser) {
      if (typeof window !== "undefined") window.localStorage.removeItem(GUEST_SESSION_KEY);
      setGuestUser(null);
      setSession(null);
      setProfile(null);
      setIsPasswordRecovery(false);
      return;
    }
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
    setSession(null);
    setProfile(null);
    setIsPasswordRecovery(false);
  }, [guestUser]);

  const user = useMemo(() => guestUser ?? toAuthUser(session, profile), [guestUser, session, profile]);
  const isAuthenticated = Boolean(session || guestUser);
  const value = useMemo(() => ({
    session,
    user,
    isReady,
    authError,
    isPasswordRecovery,
    isAuthenticated,
    signIn,
    signUp,
    loginAsGuest,
    requestPasswordReset,
    verifyPasswordResetOtp,
    updatePassword,
    logout
  }), [
    session,
    user,
    isReady,
    authError,
    isPasswordRecovery,
    isAuthenticated,
    signIn,
    signUp,
    loginAsGuest,
    requestPasswordReset,
    verifyPasswordResetOtp,
    updatePassword,
    logout
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
