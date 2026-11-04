import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserRole } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate unique ID: HS-XXX for Healthysis patients, DR-XXX for doctors
export function generatePlatformId(role: UserRole): string {
  const num = Math.floor(100 + Math.random() * 900); // 3-digit random number (100-999)
  const prefix = role === "doctor" ? "DR" : "HS";
  return `${prefix}-${num}`;
}
