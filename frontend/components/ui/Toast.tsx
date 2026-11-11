"use client";

/**
 * Small messages that slide in at the top and disappear after 3 seconds.
 *
 * Usage in any component:
 *   const showToast = useToast();
 *   showToast("Achievement unlocked!", "🏆", "success");
 */
import { createContext, useCallback, useContext, useState } from "react";

import { cn } from "@/lib/cn";

type Tone = "default" | "success" | "error";
type ToastItem = { id: number; message: string; icon?: string; tone: Tone };
type ShowToast = (message: string, icon?: string, tone?: Tone) => void;

const ToastContext = createContext<ShowToast>(() => {});

const TONES: Record<Tone, string> = {
  default: "border-line text-ink",
  success: "border-green text-green-dark",
  error: "border-red text-red",
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback<ShowToast>((message, icon, tone = "default") => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, icon, tone }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "flex animate-slide-down items-center gap-3 rounded-2xl border-2 bg-surface px-5 py-3 font-bold shadow-lg",
              TONES[toast.tone],
            )}
          >
            {toast.icon && <span className="text-2xl">{toast.icon}</span>}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
