import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Script from "next/script";

import { ToastProvider } from "@/components/ui/Toast";
import { UserProvider } from "@/lib/user-context";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

// Nunito is a free rounded font that looks close to Duolingo's own typeface.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Duolingo - learn Spanish",
  description: "A Duolingo clone: learn Spanish with bite-sized, gamified lessons",
};

/**
 * Root layout: wraps EVERY page (including the full-screen lesson player).
 * Providers placed here are available everywhere:
 *   UserProvider  -> the learner's stats (hearts, XP, streak ...)
 *   ToastProvider -> small pop-up messages
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: THEME_SCRIPT may add class="dark" before React loads
    <html lang="en" className={`${nunito.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        {/* Runs before the page becomes interactive, so dark mode never "flashes" white */}
        <Script id="theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <UserProvider>
          <ToastProvider>{children}</ToastProvider>
        </UserProvider>
      </body>
    </html>
  );
}
