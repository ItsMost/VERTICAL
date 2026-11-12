import { AlertTriangle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { useData } from '../context/DataContext';

/** Skeleton shown while data or a lazy screen is loading. */
export function ScreenLoading() {
  const { t } = useData();
  return (
    <div className="space-y-3" aria-busy="true" aria-label={t.common.loadingData}>
      <div className="skeleton h-24" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-48" />
      <p className="text-center text-sm text-muted">{t.common.loadingData}</p>
    </div>
  );
}

export function ScreenError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useData();
  return (
    <div className="card state-box tone-danger" role="alert">
      <AlertTriangle size={32} className="text-danger" />
      <h2 className="text-lg font-bold text-text">{t.common.loadFailedTitle}</h2>
      <p className="text-sm max-w-sm">{message}</p>
      {onRetry && <button className="btn-primary" onClick={onRetry}>{t.common.retry}</button>}
    </div>
  );
}

export function ScreenEmpty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card state-box">
      <Inbox size={32} className="text-faint" />
      <h2 className="text-base font-bold text-text">{title}</h2>
      {children}
    </div>
  );
}
