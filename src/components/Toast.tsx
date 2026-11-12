import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; message: string }

type Listener = (items: ToastItem[]) => void;
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l(items));

function push(kind: ToastKind, message: string, ms = kind === 'error' ? 6000 : 3000) {
  const id = nextId++;
  items = [...items, { id, kind, message }].slice(-4);
  emit();
  setTimeout(() => dismiss(id), ms);
  return id;
}
function dismiss(id: number) {
  items = items.filter(t => t.id !== id);
  emit();
}

/** Usable anywhere (components, context callbacks, plain functions). */
export const toast = Object.assign((message: string) => push('info', message), {
  success: (m: string) => push('success', m),
  error: (m: string) => push('error', m),
  info: (m: string) => push('info', m),
  dismiss,
});

const ICON = { success: CheckCircle2, error: AlertTriangle, info: Info };

export function Toaster({ closeLabel = 'Close' }: { closeLabel?: string }) {
  const [list, setList] = useState<ToastItem[]>(items);
  useEffect(() => {
    listeners.add(setList);
    return () => { listeners.delete(setList); };
  }, []);
  return (
    <div className="toaster" aria-live="polite" role="status">
      {list.map(t => {
        const Icon = ICON[t.kind];
        return (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : undefined}>
            <Icon size={18} className="shrink-0" aria-hidden />
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label={closeLabel}>
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
