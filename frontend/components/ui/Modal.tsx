"use client";

import { useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose?: () => void; // leave out to make the modal impossible to dismiss
  children: React.ReactNode;
};

/** Centered pop-up over a dark backdrop. Closes on backdrop click or Escape. */
export default function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md animate-pop rounded-3xl bg-surface p-6 text-center"
        onClick={(event) => event.stopPropagation()} // clicks inside don't close it
      >
        {children}
      </div>
    </div>
  );
}
