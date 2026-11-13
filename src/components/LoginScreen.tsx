"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, KeyRound, Mail, Phone, UserRound } from "lucide-react";
import { formatAuthIdentifierInput, useAuth } from "@/context/AuthContext";
import { HealthysisLogo } from "@/components/HealthysisLogo";

type AuthView = "auth" | "forgotPassword" | "verifyRecovery" | "newPassword";

function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Authentication failed. Please try again.";
  if (/AuthRetryableFetchError|Failed to fetch|fetch failed/i.test(message)) {
    return `${message}. Check your internet connection and confirm the Supabase project URL and public anon key are correct.`;
  }
  return message;
}

export function LoginScreen() {
  const router = useRouter();
  const {
    authError,
    isPasswordRecovery,
    loginAsGuest,
    signIn,
    signUp,
    requestPasswordReset,
    verifyPasswordResetOtp,
    updatePassword
  } = useAuth();
  const [activeView, setActiveView] = useState<AuthView>("auth");
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryToken, setRecoveryToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const view: AuthView = isPasswordRecovery ? "newPassword" : activeView;

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (mode === "signUp") {
        const verification = await signUp(name, identifier, password);
        if (!verification) return;
        // If email confirmation is still flagged by the client, bypass or inform cleanly
        if (verification === "email") {
          // If you turned off email confirmation in Supabase, sign them straight in:
          const autoSignedIn = await signIn(identifier, password);
          if (!autoSignedIn) return;
        }
      } else {
        const signedIn = await signIn(identifier, password);
        if (!signedIn) return;
      }

      router.replace("/");
      router.replace("/");
    } catch (authError: unknown) {
      console.error(`Supabase ${mode === "signUp" ? "sign-up" : "sign-in"} failed.`, authError);
      setError(getAuthErrorMessage(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    router.replace("/?tab=home");
  };

  const handleRequestReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(recoveryEmail);
      setActiveView("verifyRecovery");
      setNotice("Password reset link/OTP sent to your email.");
    } catch (resetError: unknown) {
      console.error("Could not request a Supabase password reset.", resetError);
      setError(getAuthErrorMessage(resetError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyRecovery = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      await verifyPasswordResetOtp(recoveryEmail, recoveryToken);
      setActiveView("newPassword");
      setNotice("Email verified. Choose a new password.");
    } catch (verifyError: unknown) {
      console.error("Could not verify the Supabase password recovery code.", verifyError);
      setError(getAuthErrorMessage(verifyError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      await updatePassword(newPassword);
      setNotice("Your password has been updated.");
      router.replace("/");
    } catch (updateError: unknown) {
      console.error("Could not update the Supabase password.", updateError);
      setError(getAuthErrorMessage(updateError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showError = error ?? (view === "auth" ? authError : null);
  const heading = view === "forgotPassword"
    ? "Reset your password"
    : view === "verifyRecovery"
      ? "Verify recovery code"
      : view === "newPassword"
        ? "Choose a new password"
        : pendingEmailConfirmation
          ? "Confirm your email"
          : mode === "signUp" ? "Create your account" : "Sign in";

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F8FBFC] dark:bg-slate-950 p-4">
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-[#DCEAEC] bg-white p-7 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <HealthysisLogo size="lg" showWordmark />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#123F55] dark:text-slate-100">{heading}</h1>
            <p className="mt-2 text-sm text-[#537783] dark:text-slate-400">
              {view === "forgotPassword"
                ? "Enter the email address registered with your account."
                : view === "verifyRecovery"
                  ? `Enter the recovery code sent to ${recoveryEmail}, or open the reset link in your email.`
                  : view === "newPassword"
                    ? "Use at least 8 characters for your new password."
                    : pendingEmailConfirmation
                      ? `A confirmation link was sent to ${identifier}.`
                      : "Use your email address or 10-digit Indian mobile number and password."}
            </p>
          </div>
        </div>

        {showError && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
            {showError}
          </p>
        )}

        {pendingEmailConfirmation && view === "auth" ? (
          <div className="space-y-4">
            {notice && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-[#076584]">{notice}</p>}
            <button
              type="button"
              onClick={() => { setPendingEmailConfirmation(false); setMode("signIn"); setNotice(null); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-healthysis-signature py-3 font-bold text-white"
            >
              Continue to sign in <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : view === "forgotPassword" ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[#123F55] dark:text-slate-200">Email address</span>
              <span className="flex items-center gap-2 rounded-xl border border-[#DCEAEC] px-3 dark:border-slate-700">
                <Mail className="h-4 w-4 text-[#829AA3]" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={recoveryEmail}
                  onChange={(event) => setRecoveryEmail(event.target.value)}
                  className="w-full bg-transparent py-3 text-sm outline-none"
                  placeholder="name@example.com"
                />
              </span>
            </label>
            {notice && <p role="status" className="text-sm text-[#076584]">{notice}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-healthysis-signature py-3 font-bold text-white disabled:opacity-50"
            >
              {isSubmitting ? "Sending…" : "Send reset link / OTP"}
            </button>
            <button
              type="button"
              onClick={() => { setActiveView("auth"); setError(null); setNotice(null); }}
              className="flex w-full items-center justify-center gap-2 py-2 text-sm font-bold text-[#076584]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </button>
          </form>
        ) : view === "verifyRecovery" ? (
          <form onSubmit={handleVerifyRecovery} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[#123F55] dark:text-slate-200">Email recovery code</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                value={recoveryToken}
                onChange={(event) => setRecoveryToken(event.target.value)}
                className="w-full rounded-xl border border-[#DCEAEC] bg-transparent px-3 py-3 text-sm outline-none dark:border-slate-700"
                placeholder="Enter code from email"
              />
            </label>
            {notice && <p role="status" className="text-sm text-[#076584]">{notice}</p>}
            <button
              type="submit"
              disabled={isSubmitting || !recoveryToken.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-healthysis-signature py-3 font-bold text-white disabled:opacity-50"
            >
              {isSubmitting ? "Verifying…" : "Verify code"}
            </button>
            <button
              type="button"
              onClick={() => { setActiveView("auth"); setError(null); setNotice(null); }}
              className="w-full py-2 text-sm font-bold text-[#076584]"
            >
              Back to sign in
            </button>
          </form>
        ) : view === "newPassword" ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[#123F55] dark:text-slate-200">New password</span>
              <span className="flex items-center gap-2 rounded-xl border border-[#DCEAEC] px-3 dark:border-slate-700">
                <KeyRound className="h-4 w-4 text-[#829AA3]" />
                <input
                  autoComplete="new-password"
                  minLength={8}
                  required
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full bg-transparent py-3 text-sm outline-none"
                  placeholder="At least 8 characters"
                />
              </span>
            </label>
            {notice && <p role="status" className="text-sm text-[#076584]">{notice}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-healthysis-signature py-3 font-bold text-white disabled:opacity-50"
            >
              {isSubmitting ? "Updating…" : "Update password"}
            </button>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F8FBFC] p-1 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => { setMode("signIn"); setError(null); setNotice(null); }}
                aria-pressed={mode === "signIn"}
                className={`rounded-lg py-2 text-sm font-bold ${mode === "signIn" ? "bg-white text-[#076584] shadow-sm dark:bg-slate-800" : "text-[#537783]"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("signUp"); setError(null); setNotice(null); }}
                aria-pressed={mode === "signUp"}
                className={`rounded-lg py-2 text-sm font-bold ${mode === "signUp" ? "bg-white text-[#076584] shadow-sm dark:bg-slate-800" : "text-[#537783]"}`}
              >
                Create account
              </button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {mode === "signUp" && (
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold text-[#123F55] dark:text-slate-200">Name</span>
                  <span className="flex items-center gap-2 rounded-xl border border-[#DCEAEC] px-3 dark:border-slate-700">
                    <UserRound className="h-4 w-4 text-[#829AA3]" />
                    <input
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full bg-transparent py-3 text-sm outline-none"
                      placeholder="Your name"
                    />
                  </span>
                </label>
              )}
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-[#123F55] dark:text-slate-200">Email or phone</span>
                <span className="flex items-center gap-2 rounded-xl border border-[#DCEAEC] px-3 dark:border-slate-700">
                  {identifier.includes("@")
                    ? <Mail className="h-4 w-4 text-[#829AA3]" />
                    : <Phone className="h-4 w-4 text-[#829AA3]" />}
                  <input
                    autoComplete="username"
                    autoCapitalize="none"
                    inputMode={identifier.includes("@") ? "email" : "tel"}
                    required
                    value={identifier}
                    onChange={(event) => setIdentifier(formatAuthIdentifierInput(event.target.value))}
                    className="w-full bg-transparent py-3 text-sm outline-none"
                    placeholder="name@example.com or 10-digit mobile"
                  />
                </span>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-bold text-[#123F55] dark:text-slate-200">Password</span>
                <span className="flex items-center gap-2 rounded-xl border border-[#DCEAEC] px-3 dark:border-slate-700">
                  <KeyRound className="h-4 w-4 text-[#829AA3]" />
                  <input
                    autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                    minLength={mode === "signUp" ? 8 : undefined}
                    required
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent py-3 text-sm outline-none"
                    placeholder={mode === "signUp" ? "At least 8 characters" : "Password"}
                  />
                </span>
                {mode === "signIn" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryEmail(isEmailIdentifierForUi(identifier) ? identifier.trim() : "");
                      setActiveView("forgotPassword");
                      setError(null);
                      setNotice(null);
                    }}
                    className="mt-1 block text-sm font-bold text-[#076584]"
                  >
                    Forgot password?
                  </button>
                )}
              </label>
              {notice && <p role="status" className="text-sm text-[#076584]">{notice}</p>}
              <button
                type="submit"
                disabled={isSubmitting || Boolean(authError)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-healthysis-signature py-3 font-bold text-white disabled:opacity-50"
              >
                {isSubmitting ? "Please wait…" : mode === "signUp" ? "Create account" : "Sign in"}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
            <button
              type="button"
              onClick={handleGuestLogin}
              className="flex w-full items-center justify-center rounded-xl border-2 border-[#04939D] bg-[#DDF2F0]/50 py-3 font-bold text-[#076584] transition-colors hover:bg-[#DDF2F0]"
            >
              Continue as Guest (Demo Mode)
            </button>
            <p className="text-center text-xs text-[#829AA3]">
              Indian mobile numbers are saved with +91 and use password sign-in. Email confirmation may be required for email accounts.
            </p>
          </>
        )}
      </section>
    </main>
  );
}

function isEmailIdentifierForUi(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
