"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useAppStore } from "@/store";

export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border shadow-xl text-xs backdrop-blur transition-all animate-in slide-in-from-right ${
            toast.type === "success"
              ? "bg-[#14182B]/95 border-[#5FD3A0] text-[#5FD3A0]"
              : toast.type === "error"
              ? "bg-[#14182B]/95 border-[#FF7A7A] text-[#FF7A7A]"
              : "bg-[#262B52]/95 border-[#3A4178] text-[#EDEAF6]"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          {toast.type === "info" && <Info className="w-4 h-4 text-[#FFC66B] shrink-0 mt-0.5" />}

          <p className="flex-1 text-[#EDEAF6] leading-snug">{toast.message}</p>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-[#9AA3D6] hover:text-[#EDEAF6] shrink-0 p-0.5"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
