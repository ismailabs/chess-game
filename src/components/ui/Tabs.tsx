import React from "react";

export interface TabsProps {
  tabs: { id: string; label: string; count?: number; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = "",
}) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1 border-b border-[var(--outline)] overflow-x-auto scrollbar-thin ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors relative ${
              isActive
                ? "text-[var(--primary-text)]"
                : "text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]"
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  isActive
                    ? "bg-[var(--primary)]/15 text-[var(--primary-text)]"
                    : "bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]"
                }`}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-[var(--primary)]" />
            )}
          </button>
        );
      })}
    </div>
  );
};
