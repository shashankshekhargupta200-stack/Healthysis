"use client";

import React from "react";
import Image from "next/image";

interface HealthysisLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
  subtitle?: string;
}

export function HealthysisLogo({
  size = "md",
  showWordmark = true,
  className = "",
  subtitle
}: HealthysisLogoProps) {
  // Dimensions map
  const dimensions = {
    sm: { icon: 32, font: "text-lg", subFont: "text-[10px]" },
    md: { icon: 42, font: "text-2xl", subFont: "text-xs" },
    lg: { icon: 56, font: "text-3xl", subFont: "text-xs" },
    xl: { icon: 84, font: "text-4xl sm:text-5xl", subFont: "text-sm" },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Signature H Logo with subtle glow and rounded container */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105"
        style={{ width: dimensions.icon, height: dimensions.icon }}
      >
        <Image
          src="/healthysis-icon.png"
          alt="Healthysis Logo"
          width={dimensions.icon}
          height={dimensions.icon}
          className="w-full h-full object-contain drop-shadow-sm"
          priority
        />
      </div>

      {/* Brand Typography */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className={`font-black tracking-tight leading-none ${dimensions.font}`}>
            <span className="text-[#123F55]">Healthy</span>
            <span className="text-[#2CAC7F]">sis</span>
          </div>
          {subtitle && (
            <span className={`text-[#537783] font-medium tracking-normal mt-0.5 ${dimensions.subFont}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

