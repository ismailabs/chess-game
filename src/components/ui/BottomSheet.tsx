import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  className = "",
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`glass w-full max-w-lg rounded-t-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto transform transition-transform duration-300 ease-out ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div className="flex justify-center -mt-2 mb-4">
          <div className="w-12 h-1.5 rounded-full bg-[var(--outline)]" />
        </div>

        <div className="flex items-center justify-between pb-3 border-b border-[var(--outline)]">
          {title && (
            <h3 className="text-lg font-bold font-heading text-[var(--on-surface)]">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container)] cursor-pointer transition-colors"
            aria-label="Close sheet"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
