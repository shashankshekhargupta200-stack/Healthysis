import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Healthysis • Autonomous Metabolic & PCOS Health Platform",
  description: "Private, accessible, modern web platform for continuous PCOS and metabolic management. DPDP compliant with sovereign on-device health telemetry.",
  icons: {
    icon: "/healthysis-icon.png",
    shortcut: "/healthysis-icon.png",
    apple: "/healthysis-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full bg-[#F8FBFC] dark:bg-slate-950 text-[#123F55] dark:text-slate-200 flex flex-col antialiased selection:bg-[#0EA6B7] selection:text-white font-sans transition-colors duration-200">
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
