import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * BaseModal — Accessible portal modal.
 * Props: open, onClose, children, maxWidth (tailwind class), className
 */
export default function BaseModal({ open, onClose, children, maxWidth = "max-w-2xl", className = "" }) {
  const overlayRef = useRef(null);

  /* Trap scroll */
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape" && open) onClose?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`
          relative z-10 w-full ${maxWidth} max-h-[92vh] overflow-y-auto
          rounded-3xl border border-zinc-800 bg-zinc-950
          shadow-2xl shadow-black/60
          animate-[slideUp_0.2s_ease]
          ${className}
        `}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
