import React from "react";
import { X } from "lucide-react";

export interface ToastProps {
  visible: boolean;
  onClose?: () => void;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  onClose,
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`glass fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 px-4 py-3 rounded-2xl shadow-xl max-w-md w-[calc(100%-2rem)] ${className}`}
    >
      {icon && <div className="shrink-0 text-[var(--primary)]">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[var(--on-surface)] truncate">
          {title}
        </div>
        {description && (
          <div className="text-xs text-[var(--on-surface-variant)] truncate">
            {description}
          </div>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-[var(--primary)] text-[var(--on-primary)] text-xs font-bold shadow-sm cursor-pointer hover:bg-[var(--primary-hover)]"
        >
          {action.label}
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] cursor-pointer"
          aria-label="Dismiss toast"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
