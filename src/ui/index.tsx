import { useEffect, useId, useRef, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { X } from 'lucide-react';
import type { Level } from '../lib/athleteStats';
import { useData } from '../context/DataContext';

/* ------------------------------------------------------------------ format */

export const DASH = '—';
export function fmt(v: number | null | undefined, digits = 1): string {
  return v === null || v === undefined || !Number.isFinite(v) ? DASH : v.toFixed(digits);
}
export function signed(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return DASH;
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(digits)}`;
}
export function shortDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return DASH;
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

/* ------------------------------------------------------------------ layout */

export function Card({ title, icon, action, children, className = '', id }: { title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`rounded-[var(--radius-card)] bg-surface border border-border p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 mb-3">
          {title && <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">{icon}{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** One big number per card. */
export function Metric({ value, unit, className = '' }: { value: string; unit?: string; className?: string }) {
  return (
    <p className={`font-mono tabular-nums font-bold leading-none text-[2.5rem] sm:text-[2.75rem] text-text ${className}`} dir="ltr">
      {value}
      {unit && value !== DASH && <span className="text-base font-medium text-muted ms-1.5">{unit}</span>}
    </p>
  );
}

/** Small secondary figure: label on top, value below. */
export function MiniStat({ label, value, unit, tone }: { label: ReactNode; value: string; unit?: string; tone?: 'success' | 'warning' | 'danger' | 'accent' }) {
  const color = tone ? { success: 'text-success', warning: 'text-warning', danger: 'text-danger', accent: 'text-accent' }[tone] : 'text-text';
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted truncate">{label}</p>
      <p className={`font-mono tabular-nums font-semibold text-lg ${color}`} dir="ltr">
        {value}
        {unit && value !== DASH && <span className="text-xs font-medium text-muted ms-1">{unit}</span>}
      </p>
    </div>
  );
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' }) {
  const cls = {
    neutral: 'bg-surface-2 text-muted border-border',
    accent: 'bg-accent-soft text-accent border-accent/30',
    success: 'bg-success/12 text-success border-success/30',
    warning: 'bg-warning/12 text-warning border-warning/30',
    danger: 'bg-danger/12 text-danger border-danger/30',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>{children}</span>;
}

export function LevelPill({ level }: { level: Level | null }) {
  const { t } = useData();
  if (!level) return null;
  const map = {
    elite: { tone: 'accent' as const, label: t.s.levelElite },
    excellent: { tone: 'success' as const, label: t.s.levelExcellent },
    good: { tone: 'neutral' as const, label: t.s.levelGood },
    developing: { tone: 'warning' as const, label: t.s.levelDeveloping },
  }[level];
  return <Pill tone={map.tone}>{map.label}</Pill>;
}

export function Segmented<T extends string>({ value, onChange, options, label, size = 'md' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode }[]; label?: string; size?: 'md' | 'sm' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 p-1 rounded-[var(--radius-control)] bg-surface-2 border border-border overflow-x-auto no-scrollbar">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 shrink-0 whitespace-nowrap rounded-[calc(var(--radius-control)-4px)] px-3 ${size === 'sm' ? 'min-h-[40px] text-xs' : 'min-h-[44px] text-sm'} font-semibold transition-colors ${
            value === o.value ? 'bg-accent text-accent-ink' : 'text-muted hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ forms */

export function Field({ label, hint, suffix, ...props }: { label: ReactNode; hint?: ReactNode; suffix?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <div className="relative">
        <input id={id} {...props} className={`field ${suffix ? 'pe-12' : ''} ${props.className ?? ''}`} />
        {suffix && <span className="absolute inset-y-0 end-3 flex items-center text-xs text-faint pointer-events-none">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
    </div>
  );
}

export function SelectField({ label, children, ...props }: { label: ReactNode; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      <select id={id} {...props} className="field appearance-none">{children}</select>
    </div>
  );
}

/* ------------------------------------------------------------------ sheet */

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, footer, wide = false }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const { t } = useData();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center print:hidden" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <button type="button" aria-label={t.s.close} className="absolute inset-0 bg-black/60 backdrop-blur-[2px] cursor-default" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className={`relative w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} max-h-[92svh] flex flex-col bg-surface border border-border rounded-t-[1.5rem] sm:rounded-[1.5rem] shadow-2xl outline-none animate-fade-in`}
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border">
          <h2 className="text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t.s.close} className="icon-btn -me-2"><X size={20} /></button>
        </header>
        <div className="overflow-y-auto px-5 py-4 space-y-4">{children}</div>
        {footer && <footer className="px-5 py-3 border-t border-border flex gap-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">{footer}</footer>}
      </div>
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-faint">{children}</p>;
}
