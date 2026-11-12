import { CheckCircle, Download, Share2, X } from 'lucide-react';
import { useData } from '../../context/DataContext';

/** Full-screen progress ring while the analysis video is being rendered. */
export function ExportProgressOverlay({ progress, status }: { progress: number; status?: string }) {
  const { t } = useData();
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/60 p-6" role="dialog" aria-modal="true" aria-busy="true">
      <div className="card p-8 flex flex-col items-center gap-4 max-w-sm w-full text-center animate-fade-in">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={r} className="stroke-border" strokeWidth="6" fill="transparent" />
            <circle cx="40" cy="40" r={r} className="stroke-accent transition-all duration-200" strokeWidth="6" fill="transparent"
              strokeDasharray={c} strokeDashoffset={c * (1 - progress / 100)} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center font-bold text-lg text-accent font-mono tabular-nums">{progress}%</div>
        </div>
        <h3 className="text-lg font-bold">{t.jumpConsole.exportingTitle}</h3>
        {status && <p className="text-sm text-accent font-bold animate-pulse">{status}</p>}
        <p className="text-xs text-muted leading-relaxed">{t.jumpConsole.exportingHint}</p>
      </div>
    </div>
  );
}

/** Shows the exported video with share / save actions. */
export function ExportSuccessModal({ url, fileName, onShare, onClose }: { url: string; fileName: string; onShare: () => void; onClose: () => void }) {
  const { t } = useData();
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="card p-6 md:p-8 flex flex-col items-center gap-5 max-w-md w-full text-center relative">
        <button onClick={onClose} aria-label={t.media.close} className="icon-btn absolute top-3 end-3"><X size={18} /></button>
        <div className="w-14 h-14 bg-accent/10 border border-accent/30 rounded-2xl flex items-center justify-center text-accent">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-xl font-bold">{t.ui.jcVideoExportedSuccessfully}</h3>
        <p className="text-xs text-muted leading-relaxed -mt-2">{t.ui.jcYourVideoAnalysisIs}</p>
        <div className="w-full rounded-2xl overflow-hidden border border-border bg-black aspect-video">
          <video src={url} controls playsInline autoPlay muted loop className="w-full h-full object-contain" />
        </div>
        <div className="grid grid-cols-2 gap-3 w-full">
          <button onClick={onShare} className="btn-primary"><Share2 size={16} />{t.ui.jcShareVideo}</button>
          <a href={url} download={fileName} className="btn-ghost"><Download size={16} />{t.ui.jcSaveVideo}</a>
        </div>
        <p className="w-full p-3 rounded-xl border border-accent/20 bg-surface-2 text-xs text-accent text-start">{t.ui.jcIphoneIpadUsersTo}</p>
      </div>
    </div>
  );
}
