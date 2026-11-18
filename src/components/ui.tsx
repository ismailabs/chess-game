import { TIME_CONTROLS } from "../../supabase/functions/game-action/rules.ts";

export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={`btn ${o.value === value ? "btn-primary" : ""}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function TimeControlPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Time control" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TIME_CONTROLS.map((t) => (
        <button key={t.id} role="radio" aria-checked={t.id === value} onClick={() => onChange(t.id)}
          className={`rounded-xl border px-3 py-2.5 text-left transition ${t.id === value ? "border-moss bg-moss-soft shadow-xs" : "border-line bg-card hover:bg-[#efece3]"}`}>
          <div className="text-base font-semibold">{t.id === "unlimited" ? "∞ Unlimited" : t.id}</div>
          <div className="text-xs text-ink-soft">{t.kind}</div>
        </button>
      ))}
    </div>
  );
}

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-line bg-card p-5 ${className}`}>{children}</div>
);
