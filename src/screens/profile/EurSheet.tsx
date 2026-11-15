import { AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { EUR_BAND } from '../../lib/biomechanics';
import { EUR_MAX_DAYS_APART, type EurPair } from '../../lib/athleteStats';
import { fill } from '../../i18n/screens';
import { Sheet, MiniStat, Pill, shortDate } from '../../ui';

const SCALE = { min: 0.9, max: 1.3 };
const pos = (v: number) => Math.min(100, Math.max(0, ((v - SCALE.min) / (SCALE.max - SCALE.min)) * 100));

export default function EurSheet({ open, onClose, pair }: { open: boolean; onClose: () => void; pair: EurPair }) {
  const { t, language } = useData();
  const { gap } = pair;
  const band = { low: EUR_BAND.low.toFixed(2), high: EUR_BAND.high.toFixed(2) };
  const typeLabel = gap.type === 'strength_dominant' ? t.s.eurZoneLow : gap.type === 'elastic_dominant' ? t.s.eurZoneHigh : t.s.eurZoneMid;
  const tone = gap.type === 'well_balanced_elite' ? 'success' : gap.type === 'strength_dominant' ? 'warning' : 'accent';

  return (
    <Sheet open={open} onClose={onClose} title={t.s.eurSheetTitle}>
      {/* the two jumps */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-control)] bg-surface-2 border border-border p-3">
          <MiniStat label={t.s.eurCmjLabel} value={pair.cmjCm.toFixed(1)} unit="cm" />
          <p className="text-[11px] text-faint mt-0.5">{shortDate(pair.cmjAt, language)}</p>
        </div>
        <div className="rounded-[var(--radius-control)] bg-surface-2 border border-border p-3">
          <MiniStat label={t.s.eurSjLabel} value={pair.sjCm.toFixed(1)} unit="cm" />
          <p className="text-[11px] text-faint mt-0.5">{shortDate(pair.sjAt, language)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="font-mono tabular-nums text-sm text-muted" dir="ltr">
          EUR = {pair.cmjCm.toFixed(1)} ÷ {pair.sjCm.toFixed(1)} = <span className="text-2xl font-bold text-text">{gap.eur.toFixed(2)}</span>
        </p>
        <Pill tone={tone}>{typeLabel}</Pill>
      </div>

      <p className="text-xs text-faint -mt-2">{t.s.eurWhichJumps}</p>

      {pair.daysApart > EUR_MAX_DAYS_APART && (
        <p className="flex gap-2 text-xs text-warning"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{fill(t.s.eurNotSameDay, { days: pair.daysApart })}</p>
      )}

      {/* scale */}
      <div dir="ltr" aria-hidden>
        <div className="relative h-3 rounded-full overflow-hidden flex">
          <div className="bg-warning/70" style={{ width: `${pos(EUR_BAND.low)}%` }} />
          <div className="bg-success/70" style={{ width: `${pos(EUR_BAND.high) - pos(EUR_BAND.low)}%` }} />
          <div className="bg-accent/70 flex-1" />
        </div>
        <div className="relative h-5">
          <span className="absolute -top-[18px] w-1 h-6 -ms-0.5 rounded-full bg-text ring-2 ring-surface" style={{ left: `${pos(gap.eur)}%` }} />
          <span className="absolute top-1 text-[11px] font-mono text-faint -translate-x-1/2" style={{ left: `${pos(EUR_BAND.low)}%` }}>{band.low}</span>
          <span className="absolute top-1 text-[11px] font-mono text-faint -translate-x-1/2" style={{ left: `${pos(EUR_BAND.high)}%` }}>{band.high}</span>
        </div>
        <div className="grid grid-cols-3 text-[11px] font-semibold">
          <span className="text-warning">{t.s.eurZoneLow}</span>
          <span className="text-success text-center">{t.s.eurZoneMid}</span>
          <span className="text-accent text-end">{t.s.eurZoneHigh}</span>
        </div>
      </div>

      {/* deficit */}
      <section className="rounded-[var(--radius-control)] border border-border p-3 space-y-3">
        <h3 className="text-sm font-semibold">{t.s.eurDeficitTitle}</h3>
        {gap.limiting === null ? (
          <p className="text-sm text-success">{fill(t.s.eurNoDeficit, band)}</p>
        ) : (
          <>
            <p className="text-sm">{gap.limiting === 'cmj' ? t.s.eurLacksElastic : t.s.eurLacksStrength}</p>
            <div>
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>{gap.limiting === 'cmj' ? 'CMJ' : 'SJ'}</span>
                <span className="font-mono" dir="ltr">{gap.currentCm!.toFixed(1)} / {gap.targetCm!.toFixed(1)} cm</span>
              </div>
              <div className="relative h-3 rounded-full bg-surface-2 border border-border overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={gap.targetCm!} aria-valuenow={gap.currentCm!}>
                <div className={`absolute inset-y-0 start-0 ${gap.limiting === 'cmj' ? 'bg-warning' : 'bg-accent'}`} style={{ width: `${(gap.currentCm! / gap.targetCm!) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-faint mt-1">
                <span>{t.s.eurNow}</span>
                <span>{t.s.eurTarget}</span>
              </div>
            </div>
            <p className="text-sm text-muted">
              {fill(gap.limiting === 'cmj' ? t.s.eurNeedCmj : t.s.eurNeedSj, {
                cm: gap.gapCm!.toFixed(1),
                pct: gap.gapPct!.toFixed(1),
                target: gap.targetCm!.toFixed(1),
                edge: gap.limiting === 'cmj' ? band.low : band.high,
              })}
            </p>
            <p className="text-sm">{gap.type === 'strength_dominant' ? t.s.eurStrengthAdvice : t.s.eurElasticAdvice}</p>
          </>
        )}
      </section>

      <p className="text-sm text-muted leading-relaxed">{t.s.eurWhat}</p>

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold">{t.s.eurProtocolTitle}</h3>
        <ul className="list-disc ps-5 text-sm text-muted space-y-1">
          <li>{t.s.eurProtocolSj}</li>
          <li>{t.s.eurProtocolCmj}</li>
          <li>{t.s.eurProtocolRule}</li>
        </ul>
      </section>

      <p className="text-[11px] text-faint">{fill(t.s.eurBandNote, band)} · McGuigan et al. 2006, <i>JSCR</i> 20:992</p>
    </Sheet>
  );
}
