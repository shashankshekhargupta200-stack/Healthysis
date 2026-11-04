"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Clock, Utensils } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase";
import { isNetworkError, readUserLocalData } from "@/lib/localUserData";

interface MealLog {
  id: string;
  food_name: string;
  calories: number;
  macros: {
    protein?: number;
    carbs?: number;
    fats?: number;
  };
  timestamp: string;
}

export function HomeTabView() {
  const { user, session } = useAuth();
  const userId = user?.id;
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadMeals = async () => {
      await Promise.resolve();
      try {
        if (user?.isGuest && userId) {
          if (active) setMeals(readUserLocalData(userId, "meal_logs", []));
          return;
        }
        const supabase = getSupabaseClient();
        const authenticatedUserId = await requireAuthenticatedUser(supabase, session?.user.id);
        const { data, error } = await supabase
          .from("meal_logs")
          .select("id, food_name, calories, macros, timestamp")
          .eq("user_id", authenticatedUserId)
          .order("timestamp", { ascending: false })
          .limit(30);
        if (error) throw error;
        if (active) setMeals((data ?? []) as MealLog[]);
      } catch (error: unknown) {
        console.error("Could not load the user's dashboard meal data.", error);
        if (isNetworkError(error) && userId) {
          if (active) setMeals(readUserLocalData(userId, "meal_logs", []));
        } else if (active) {
          setLoadError(error instanceof Error ? error.message : "Could not load your meal data.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadMeals();
    return () => {
      active = false;
    };
  }, [session?.user.id, user?.isGuest, userId]);

  const today = new Date().toDateString();
  const todayMeals = meals.filter((meal) => new Date(meal.timestamp).toDateString() === today);
  const caloriesToday = todayMeals.reduce((total, meal) => total + Number(meal.calories), 0);
  const mostRecentMeal = meals[0];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 animate-in fade-in duration-200">
      <section className="rounded-3xl bg-healthysis-signature p-8 text-center text-white shadow-xl">
        <p className="text-xs font-extrabold uppercase tracking-wider text-teal-50">Personal health dashboard</p>
        <h1 className="mt-3 text-3xl font-black sm:text-4xl">Welcome, {user?.name ?? ""}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-teal-50">
          Your dashboard reflects only meal records saved to your profile.
        </p>
      </section>

      {loadError && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-[#DCEAEC] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase text-[#537783]">Meals today</p>
          <p className="mt-2 text-3xl font-black">{isLoading ? "…" : todayMeals.length}</p>
        </article>
        <article className="rounded-2xl border border-[#DCEAEC] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase text-[#537783]">Calories logged today</p>
          <p className="mt-2 text-3xl font-black">{isLoading ? "…" : caloriesToday}</p>
        </article>
        <article className="rounded-2xl border border-[#DCEAEC] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase text-[#537783]">Latest meal</p>
          <p className="mt-2 flex items-center gap-2 text-lg font-black">
            <Clock className="h-4 w-4 text-[#04939D]" />
            {isLoading ? "Loading…" : mostRecentMeal?.food_name ?? "No meals logged"}
          </p>
        </article>
      </section>

      <section className="space-y-4 rounded-3xl border border-[#DCEAEC] bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-[#04939D]" />
          <h2 className="text-xl font-black">Recent meal logs</h2>
        </div>
        {isLoading ? (
          <div role="status" className="flex items-center gap-3 py-8 text-sm text-[#537783]">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#DCEAEC] border-t-[#04939D]" />
            Loading your meals…
          </div>
        ) : meals.length === 0 ? (
          <p className="py-6 text-sm text-[#537783]">No meals have been saved to this profile yet.</p>
        ) : (
          <ul className="divide-y divide-[#DCEAEC] dark:divide-slate-800">
            {meals.map((meal) => (
              <li key={meal.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-bold">{meal.food_name}</p>
                  <p className="text-xs text-[#537783]">{new Date(meal.timestamp).toLocaleString()}</p>
                </div>
                <p className="text-sm font-bold">{meal.calories} kcal</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
