import { useMemo } from 'react';
import type { JumpMechanicsStats, GCTAnalysis, ElasticityQuadrantData } from './types/athletics';
import {
  jumpHeightFromFlightTime,
  takeoffVelocityFromJumpHeight,
  samozinoMeanForceN,
  samozinoMeanPowerW,
  sayersPeakPowerW,
  harmanPeakPowerW,
  harmanMeanPowerW,
  pushOffAccelerationMs2,
  pushOffDurationSec,
  rsiFromHeight,
  rsiFromFlightTime,
  realDurationFromVideo,
  gctCategory,
  eccentricUtilizationRatio,
  reactiveIndex,
  eurQuadrant,
  HPO_ESTIMATE_FRACTION,
} from './lib/biomechanics';

/**
 * Presentation wrapper around `gctCategory` (labels + colour for the UI).
 */
export function classifyGCT(contactTimeSec: number): GCTAnalysis {
  const cat = gctCategory(contactTimeSec);
  if (cat === 'elite_fast') {
    return {
      category: 'elite_fast',
      labelAr: 'دورة استطالة سريعة (Fast SSC)',
      labelEn: 'Fast SSC (< 170 ms)',
      zoneColor: 'var(--color-success)',
      descriptionAr: 'زمن تلامس أقل من 170ms: استجابة مطاطية سريعة.',
      descriptionEn: 'Ground contact under 170 ms: fast, elastic stretch-shortening cycle.',
    };
  }
  if (cat === 'moderate') {
    return {
      category: 'moderate',
      labelAr: 'دورة استطالة متوسطة (Moderate SSC)',
      labelEn: 'Moderate SSC (170–250 ms)',
      zoneColor: 'var(--color-accent)',
      descriptionAr: 'زمن تلامس بين 170 و 250ms.',
      descriptionEn: 'Ground contact between 170 and 250 ms.',
    };
  }
  if (cat === 'slow') {
    return {
      category: 'slow',
      labelAr: 'دورة استطالة بطيئة (Slow SSC)',
      labelEn: 'Slow SSC (> 250 ms)',
      zoneColor: 'var(--color-warning)',
      descriptionAr: 'زمن تلامس أكبر من 250ms: القفزة تعتمد على القوة أكثر من المطاطية.',
      descriptionEn: 'Ground contact over 250 ms: strength-driven rather than elastic.',
    };
  }
  return {
    category: 'moderate',
    labelAr: 'غير محدد',
    labelEn: 'Unspecified',
    zoneColor: 'var(--color-muted)',
    descriptionAr: 'لا توجد بيانات تلامس كافية',
    descriptionEn: 'Insufficient contact data',
  };
}

/**
 * EUR (CMJ no-arms / SJ) quadrant + reactive index (DJ / CMJ no-arms).
 * `djHeightCm` must be a real drop-jump height; pass 0 when none exists.
 */
export function calculateElasticityQuadrant(cmjNoArmsHeight: number, sjHeight: number, djHeight: number = 0): ElasticityQuadrantData {
  const cmj = Number(cmjNoArmsHeight) || 0;
  const sj = Number(sjHeight) || 0;
  const dj = Number(djHeight) || 0;
  const eurRaw = eccentricUtilizationRatio(cmj, sj);
  const riRaw = reactiveIndex(dj, cmj);
  const eur = eurRaw === null ? 0 : Number(eurRaw.toFixed(2));
  const ri = riRaw === null ? 0 : Number(riRaw.toFixed(2));
  const q = eurQuadrant(eurRaw === null ? null : eur);
  const base = { eur, reactiveIndex: ri, cmjHeight: cmj, sjHeight: sj, djHeight: dj };
  if (q === 'elastic_dominant') {
    return { ...base, quadrant: q, titleAr: 'مطاطي (Elastic-Dominant)', titleEn: 'Elastic-Dominant',
      descriptionAr: 'EUR أعلى من 1.15: استغلال عالي للمرحلة اللامركزية؛ ركّز على القوة المركزية.',
      descriptionEn: 'EUR above 1.15: high stretch-shortening use. Prioritise concentric strength.', color: 'var(--color-accent)' };
  }
  if (q === 'strength_dominant') {
    return { ...base, quadrant: q, titleAr: 'معتمد على القوة (Strength-Dominant)', titleEn: 'Strength-Dominant',
      descriptionAr: 'EUR أقل من 1.05: استغلال ضعيف للمرحلة اللامركزية؛ ركّز على البلايومتريك السريع.',
      descriptionEn: 'EUR below 1.05: poor stretch-shortening use. Prescribe fast reactive plyometrics.', color: 'var(--color-warning)' };
  }
  if (q === 'well_balanced_elite') {
    return { ...base, quadrant: q, titleAr: 'متوازن (Balanced)', titleEn: 'Balanced',
      descriptionAr: 'EUR بين 1.05 و 1.15.',
      descriptionEn: 'EUR between 1.05 and 1.15.', color: 'var(--color-success)' };
  }
  return { ...base, quadrant: 'general_deficit', titleAr: 'غير مكتمل (يتطلب CMJ بدون يدين و SJ)', titleEn: 'Needs CMJ (no arms) and SJ',
    descriptionAr: 'لحساب EUR لازم قفزة CMJ بدون أذرع و Squat Jump.',
    descriptionEn: 'Both CMJ (no arms) and Squat Jump are required to calculate EUR.', color: 'var(--color-muted)' };
}

const EMPTY: JumpMechanicsStats = {
  heightCm: '', heightInches: '', flightTime: '', takeoffVelocity: '', meanPower: '',
  harmanPeakPower: '', harmanMeanPower: '', sayersPeakPower: '', pushAcceleration: '', pushDuration: '',
  contactTime: '', rsi: '', meanForce: '', hpoEstimated: false, gctAnalysis: null,
};

const fmt = (v: number | null, d: number) => (v === null || !Number.isFinite(v) ? '' : v.toFixed(d));

/**
 * Video-based jump analysis. All maths comes from `lib/biomechanics`.
 * `hpoM` is the measured push-off distance; when missing, leg length × 0.45 is
 * used and `hpoEstimated` is set so the UI can show a badge.
 */
export function useJumpMechanics(
  cameraFps: number = 240,
  videoFps: number = 30,
  takeoffTime: number = 0,
  landingTime: number = 0,
  bodyMass: number | string = 0,
  legLength: number | string = 0,
  boxTouchdownTime: number = 0,
  landingCorrectionMs: number | string = 0,
  jumpType: string = 'cmj',
  _boxHeight: number = 30,
  useManualFrameDuration: boolean = false,
  manualFrameDuration: number = 0.033,
  rsiMethod: 'height_gct' | 'flight_gct' = 'height_gct',
  hpoM: number | string | null = null,
): JumpMechanicsStats {
  return useMemo(() => {
    if (!(takeoffTime > 0 && landingTime > takeoffTime)) return EMPTY;
    const frameDur = useManualFrameDuration && manualFrameDuration > 0 ? manualFrameDuration : null;
    const rawFlight = realDurationFromVideo(landingTime - takeoffTime, cameraFps, videoFps, frameDur);
    const flight = Math.max(0.01, rawFlight - (parseFloat(String(landingCorrectionMs)) || 0) / 1000);

    const mass = parseFloat(String(bodyMass));
    const leg = parseFloat(String(legLength));
    const measuredHpo = parseFloat(String(hpoM));
    const hpoEstimated = !(measuredHpo > 0);
    const hpo = !hpoEstimated ? measuredHpo : leg > 0 ? leg * HPO_ESTIMATE_FRACTION : null;

    const hM = jumpHeightFromFlightTime(flight);
    if (hM === null) return EMPTY;
    const hCm = hM * 100;
    const vTO = takeoffVelocityFromJumpHeight(hM);
    const meanForce = hpo ? samozinoMeanForceN(mass, hM, hpo) : null;
    const meanPower = hpo ? samozinoMeanPowerW(mass, hM, hpo) : null;

    let ct: number | null = null;
    let rsi: number | null = null;
    let gctAnalysis: GCTAnalysis | null = null;
    if (jumpType === 'dj' && boxTouchdownTime > 0 && takeoffTime > boxTouchdownTime) {
      ct = realDurationFromVideo(takeoffTime - boxTouchdownTime, cameraFps, videoFps, frameDur);
      if (ct > 0) {
        rsi = rsiMethod === 'flight_gct' ? rsiFromFlightTime(flight, ct) : rsiFromHeight(hM, ct);
        gctAnalysis = classifyGCT(ct);
      }
    }

    return {
      heightCm: hCm.toFixed(2),
      heightInches: (hCm / 2.54).toFixed(2),
      flightTime: flight.toFixed(3),
      takeoffVelocity: fmt(vTO, 2),
      meanPower: fmt(meanPower, 2),
      harmanPeakPower: fmt(harmanPeakPowerW(hCm, mass), 2),
      harmanMeanPower: fmt(harmanMeanPowerW(hCm, mass), 2),
      sayersPeakPower: fmt(sayersPeakPowerW(hCm, mass), 2),
      pushAcceleration: hpo ? fmt(pushOffAccelerationMs2(hM, hpo), 2) : '',
      pushDuration: hpo ? fmt(pushOffDurationSec(hM, hpo), 3) : '',
      contactTime: ct && ct > 0 ? ct.toFixed(3) : '',
      rsi: fmt(rsi, 2),
      meanForce: fmt(meanForce, 2),
      hpoEstimated,
      gctAnalysis,
    };
  }, [cameraFps, videoFps, takeoffTime, landingTime, bodyMass, legLength, boxTouchdownTime, landingCorrectionMs, jumpType,
    useManualFrameDuration, manualFrameDuration, rsiMethod, hpoM]);
}

export default useJumpMechanics;
