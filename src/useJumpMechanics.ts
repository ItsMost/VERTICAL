import { useState, useEffect } from 'react';
import type { 
  JumpMechanicsStats, 
  GCTAnalysis, 
  FVPProfile, 
  FVPPoint, 
  VBTZoneInfo, 
  VBTZoneName, 
  CNSReadiness, 
  ElasticityQuadrantData 
} from './types/athletics';

export const GRAVITY = 9.80665; // Standard acceleration due to gravity (m/s^2)

/**
 * 1. Ground Contact Time (GCT) Classification
 * - < 170ms: Elite Fast SSC (Elastic/Reactive)
 * - 170ms - 250ms: Moderate SSC
 * - > 250ms: Slow SSC (Strength-dependent)
 */
export function classifyGCT(contactTimeSec: number): GCTAnalysis {
  const gctMs = contactTimeSec * 1000;
  if (gctMs <= 0 || !Number.isFinite(gctMs)) {
    return {
      category: 'moderate',
      labelAr: 'غير محدد',
      labelEn: 'Unspecified',
      zoneColor: '#94a3b8',
      descriptionAr: 'لا توجد بيانات تلامس كافية',
      descriptionEn: 'Insufficient contact data',
    };
  }

  if (gctMs < 170) {
    return {
      category: 'elite_fast',
      labelAr: 'دورة استطالة سريعة نادرة (Fast SSC ⚡)',
      labelEn: 'Elite Fast SSC (Elastic/Reactive)',
      zoneColor: '#10b981', // Neon Emerald
      descriptionAr: 'كفاءة مطاطية خارقة؛ زمن تلامس أقل من 170ms يعكس أوتار متفجرة وصلابة وترية مثالية.',
      descriptionEn: 'Elite tendon stiffness and reactive stretch-shortening cycle under 170ms.',
    };
  } else if (gctMs <= 250) {
    return {
      category: 'moderate',
      labelAr: 'دورة استطالة متوسطة (Moderate SSC ⚖️)',
      labelEn: 'Moderate SSC (Elastic-Strength)',
      zoneColor: '#0ea5e9', // Electric Cyan
      descriptionAr: 'توازن جيد بين المرونة والقوة العضلية؛ يحتاج لتمارين هبوط سريعة لتقليل زمن التلامس.',
      descriptionEn: 'Balanced elastic and muscular contribution; drop jump training recommended to reduce GCT.',
    };
  } else {
    return {
      category: 'slow',
      labelAr: 'دورة استطالة بطيئة (Slow SSC 🏋️)',
      labelEn: 'Slow SSC (Strength-Dependent)',
      zoneColor: '#f59e0b', // Amber
      descriptionAr: 'زمن تلامس يزيد عن 250ms؛ القفزة تعتمد بشكل أساسي على القوة القصوى وتتطلب تطوير الصلابة الوترية.',
      descriptionEn: 'GCT exceeds 250ms; movement is muscularly driven. Prescribe reactive plyometrics.',
    };
  }
}

/**
 * 2. Standardized RSI Calculation
 * - 'height_gct': Jump Height (m) / Contact Time (s) [Standard Bosco / DJ RSI]
 * - 'flight_gct': Flight Time (s) / Contact Time (s) [RSI-modified flight ratio]
 */
export function calculateRSI(
  jumpHeightCm: number,
  flightTimeSec: number,
  contactTimeSec: number,
  method: 'height_gct' | 'flight_gct' = 'height_gct'
): number {
  if (contactTimeSec <= 0 || !Number.isFinite(contactTimeSec)) return 0;
  if (method === 'height_gct') {
    const heightM = jumpHeightCm / 100;
    return heightM > 0 ? Number((heightM / contactTimeSec).toFixed(2)) : 0;
  } else {
    return flightTimeSec > 0 ? Number((flightTimeSec / contactTimeSec).toFixed(2)) : 0;
  }
}

/**
 * 3. Flight-Time Method: H = 1/8 * g * t^2
 */
export function calculateJumpHeightFromFlightTime(flightTimeSec: number): number {
  if (flightTimeSec <= 0) return 0;
  const heightM = 0.125 * GRAVITY * Math.pow(flightTimeSec, 2); // 1.2258 * t^2
  return Number((heightM * 100).toFixed(2));
}

/**
 * 4. Impulse-Momentum Method: H = v^2 / (2 * g)
 */
export function calculateJumpHeightFromVelocity(takeoffVelocityMs: number): number {
  if (takeoffVelocityMs <= 0) return 0;
  const heightM = Math.pow(takeoffVelocityMs, 2) / (2 * GRAVITY);
  return Number((heightM * 100).toFixed(2));
}

/**
 * 5. Takeoff velocity from height: v = sqrt(2 * g * H)
 */
export function calculateTakeoffVelocityFromHeight(heightMeters: number): number {
  if (heightMeters <= 0) return 0;
  return Number(Math.sqrt(2 * GRAVITY * heightMeters).toFixed(2));
}

/**
 * 6. Samozino Force-Velocity Profile (FVP) Calculation
 * Calculates F0, V0, Pmax, Sfv, SfvOpt, and FVImb% with strict guards against NaN and Infinity
 */
export function calculateFVPProfile(
  points: FVPPoint[],
  bodyMassKg: number,
  legLengthM: number = 1.0
): FVPProfile | null {
  if (!points || points.length < 2 || bodyMassKg <= 0) return null;

  const validPoints = points.filter(
    (p) => p.jumpHeightCm > 0 && p.loadKg >= 0 && Number.isFinite(p.jumpHeightCm)
  );
  if (validPoints.length < 2) return null;

  const pushDistanceM = Math.max(0.2, (legLengthM > 2 ? legLengthM / 100 : legLengthM) * 0.45);

  // Compute Force and Velocity for each point using Samozino's validated equations
  const xyData: { f: number; v: number; load: number }[] = validPoints.map((pt) => {
    const totalMass = bodyMassKg + pt.loadKg;
    const hM = pt.jumpHeightCm / 100;
    const v = Math.sqrt((GRAVITY * hM) / 2);
    const meanForce = totalMass * (GRAVITY * (hM / pushDistanceM + 1));
    const forcePerKg = meanForce / bodyMassKg; // Normalized to body weight (N/kg)
    return { f: forcePerKg, v, load: pt.loadKg };
  });

  // Linear Regression: Force = F0 + Sfv * Velocity -> y = F, x = V
  const n = xyData.length;
  let sumV = 0;
  let sumF = 0;
  let sumV2 = 0;
  let sumVF = 0;
  let sumF2 = 0;

  for (const pt of xyData) {
    sumV += pt.v;
    sumF += pt.f;
    sumV2 += pt.v * pt.v;
    sumVF += pt.v * pt.f;
    sumF2 += pt.f * pt.f;
  }

  const denominator = n * sumV2 - sumV * sumV;
  if (Math.abs(denominator) < 1e-6) return null;

  const slope = (n * sumVF - sumV * sumF) / denominator; // Sfv (should be negative)
  const intercept = (sumF - slope * sumV) / n; // F0 (N/kg)

  // Guard against non-physiological regressions
  if (intercept <= 0 || Number.isNaN(intercept) || !Number.isFinite(intercept)) return null;

  // F0 is theoretical max force (N/kg)
  const F0 = intercept;
  // V0 is theoretical max velocity when F = 0 -> V0 = -F0 / slope
  const V0 = slope < 0 ? -F0 / slope : 0;
  if (V0 <= 0 || Number.isNaN(V0) || !Number.isFinite(V0)) return null;

  // Pmax = (F0 * V0) / 4 (W/kg)
  const Pmax = (F0 * V0) / 4;

  // Pearson R-squared
  const numeratorR = n * sumVF - sumV * sumF;
  const denomR = Math.sqrt((n * sumV2 - sumV * sumV) * (n * sumF2 - sumF * sumF));
  const r = denomR > 0 ? numeratorR / denomR : 0;
  const rSquared = Math.max(0, Math.min(1, r * r));

  // Samozino Optimal Slope: SfvOpt = -(F0 / V0) optimal ratio (approx - (g / v_opt))
  // Heuristic benchmark for vertical jumping: optimal F0 ~ 30-40 N/kg, V0 ~ 2.5-3.5 m/s, SfvOpt ~ -10 N·s/m/kg
  const Sfv = slope;
  const SfvOpt = - (F0 / Math.max(2.5, V0 * 0.95)); // Target reference slope
  const FVImbPercent = SfvOpt !== 0 ? Math.round((Sfv / SfvOpt) * 100) : 100;

  let profileType: 'force_deficit' | 'velocity_deficit' | 'well_balanced';
  let prescriptionAr: string;
  let prescriptionEn: string;

  if (FVImbPercent < 85) {
    profileType = 'force_deficit';
    prescriptionAr = 'عجز شديد في القوة (High Force Deficit) -> أولوية لتمارين القوة القصوى والسكوات الثقيل (Heavy Slow Resistance / 85%+ 1RM).';
    prescriptionEn = 'High Force Deficit -> Prioritize Heavy Slow Resistance & Maximum Strength (>85% 1RM).';
  } else if (FVImbPercent > 115) {
    profileType = 'velocity_deficit';
    prescriptionAr = 'عجز في السرعة (Velocity Deficit) -> أولوية للقفز المتفجر والباليستي مع أحمال خفيفة أو قفز بمساعدة مطاط (Ballistics & Overspeed).';
    prescriptionEn = 'Velocity Deficit -> Prioritize Ballistic Jumps, Light Resisted & Assisted Plyometrics.';
  } else {
    profileType = 'well_balanced';
    prescriptionAr = 'ملف مثالي متوازن (Well-Balanced Elite) -> تدريب القوة المتفجرة عبر كامل منحنى القوة والسرعة للحفاظ على القدرة القصوى.';
    prescriptionEn = 'Well-Balanced Profile -> Maintain balanced power across the entire Force-Velocity spectrum.';
  }

  return {
    F0: Number(F0.toFixed(2)),
    V0: Number(V0.toFixed(2)),
    Pmax: Number(Pmax.toFixed(2)),
    Sfv: Number(Sfv.toFixed(2)),
    SfvOpt: Number(SfvOpt.toFixed(2)),
    FVImbPercent,
    profileType,
    prescriptionAr,
    prescriptionEn,
    rSquared: Number(rSquared.toFixed(2)),
  };
}

/**
 * 7. VBT Mean Concentric Velocity (MCV) Zone Mapping
 * - Absolute Strength: < 0.50 m/s
 * - Accelerative Strength: 0.50 - 0.75 m/s
 * - Strength-Speed: 0.75 - 1.00 m/s
 * - Speed-Strength: 1.00 - 1.30 m/s
 * - Starting Strength / Speed: > 1.30 m/s
 */
export function getVBTZone(mcvMs: number): VBTZoneInfo {
  if (mcvMs < 0.50) {
    return {
      zone: 'absolute_strength',
      minVel: 0,
      maxVel: 0.50,
      labelAr: 'القوة القصوى المطلقة (Absolute Strength)',
      labelEn: 'Absolute Strength (<0.50 m/s)',
      color: '#ef4444', // Crimson Red
      targetAdaptationAr: 'تطوير أقصى تجنيد للألياف العصبية (1RM / أوزان فائقة)',
      targetAdaptationEn: 'Maximal motor unit recruitment & maximum 1RM strength',
    };
  } else if (mcvMs < 0.75) {
    return {
      zone: 'accelerative_strength',
      minVel: 0.50,
      maxVel: 0.75,
      labelAr: 'قوة التسارع (Accelerative Strength)',
      labelEn: 'Accelerative Strength (0.50-0.75 m/s)',
      color: '#f59e0b', // Amber
      targetAdaptationAr: 'تطوير القوة ضد مقاومات عالية إلى متوسطة',
      targetAdaptationEn: 'High force output against heavy-to-moderate resistance',
    };
  } else if (mcvMs < 1.00) {
    return {
      zone: 'strength_speed',
      minVel: 0.75,
      maxVel: 1.00,
      labelAr: 'القوة المميزة بالسرعة (Strength-Speed)',
      labelEn: 'Strength-Speed (0.75-1.00 m/s)',
      color: '#00f0ff', // Electric Blue
      targetAdaptationAr: 'ذروة إنتاج القدرة الحركية (Peak Power Output)',
      targetAdaptationEn: 'Optimal peak power output zone',
    };
  } else if (mcvMs < 1.30) {
    return {
      zone: 'speed_strength',
      minVel: 1.00,
      maxVel: 1.30,
      labelAr: 'السرعة المميزة بالقوة (Speed-Strength)',
      labelEn: 'Speed-Strength (1.00-1.30 m/s)',
      color: '#10b981', // Neon Emerald
      targetAdaptationAr: 'سرعة تحريك المقاومة الخفيفة بمعدل عالي',
      targetAdaptationEn: 'High-speed movement against moderate-to-light resistance',
    };
  } else {
    return {
      zone: 'starting_strength',
      minVel: 1.30,
      maxVel: 3.00,
      labelAr: 'السرعة الانفجارية والبدء (Starting Strength)',
      labelEn: 'Starting Strength (>1.30 m/s)',
      color: '#a855f7', // Violet
      targetAdaptationAr: 'تطوير أقصى سرعة حركية وبداية انقباض فورية',
      targetAdaptationEn: 'Maximal contraction velocity & ballistic intent',
    };
  }
}

/**
 * 8. CNS Readiness & Fatigue Tracking
 * Baseline is 14-day rolling average of best CMJ.
 * - < 3% drop: Optimal / Ready (Green)
 * - 3-7% drop: Moderate Fatigue (Yellow)
 * - > 7% drop: High CNS Fatigue (Red - Reduce Volume)
 */
export function calculateCNSReadiness(
  todayCmj: number,
  baselineHistory: number[]
): CNSReadiness {
  if (!baselineHistory || baselineHistory.length === 0 || todayCmj <= 0) {
    return {
      baselineCmj: todayCmj > 0 ? todayCmj : 0,
      todayCmj: todayCmj > 0 ? todayCmj : 0,
      percentDrop: 0,
      status: 'optimal',
      statusLabelAr: 'جاهزية مثالية (Optimal)',
      statusLabelEn: 'Optimal CNS Readiness',
      recommendationAr: 'الجهاز العصبي بكامل طاقته؛ متاح لأداء جلسات الشدة العالية.',
      recommendationEn: 'CNS is fresh. Ready for high-intensity power sessions.',
      color: '#10b981',
    };
  }

  const validBaseline = baselineHistory.filter((v) => v > 0);
  const baselineCmj =
    validBaseline.length > 0
      ? validBaseline.reduce((a, b) => a + b, 0) / validBaseline.length
      : todayCmj;

  const percentDrop =
    baselineCmj > 0 ? Number((((baselineCmj - todayCmj) / baselineCmj) * 100).toFixed(1)) : 0;

  if (percentDrop < 3) {
    return {
      baselineCmj: Number(baselineCmj.toFixed(1)),
      todayCmj: Number(todayCmj.toFixed(1)),
      percentDrop: Math.max(0, percentDrop),
      status: 'optimal',
      statusLabelAr: 'جاهزية عصبية ممتازة ⚡',
      statusLabelEn: 'Optimal Freshness',
      recommendationAr: 'الجهاز العصبي منتعش (انخفاض أقل من 3%)؛ جاهز للقفز والسرعة والشدة القصوى.',
      recommendationEn: 'Fresh neuromuscular state (<3% drop). Full capacity for high intensity.',
      color: '#10b981',
    };
  } else if (percentDrop <= 7) {
    return {
      baselineCmj: Number(baselineCmj.toFixed(1)),
      todayCmj: Number(todayCmj.toFixed(1)),
      percentDrop,
      status: 'moderate_fatigue',
      statusLabelAr: 'إجهاد عصبي طفيف ⚠️',
      statusLabelEn: 'Moderate Fatigue',
      recommendationAr: 'انخفاض في القفز بين 3% و 7%؛ يوصى بتقليل عدد المحاولات وتجنب الفشل العضلي.',
      recommendationEn: 'Moderate fatigue (3-7% drop). Cap total explosive volume.',
      color: '#f59e0b',
    };
  } else {
    return {
      baselineCmj: Number(baselineCmj.toFixed(1)),
      todayCmj: Number(todayCmj.toFixed(1)),
      percentDrop,
      status: 'high_cns_fatigue',
      statusLabelAr: 'إجهاد عصبي مرتفع 🛑',
      statusLabelEn: 'High CNS Fatigue',
      recommendationAr: 'انخفاض يفوق 7% في القفز! يجب تخفيض حجم الشدة بنسبة 50% أو الاكتفاء بالاستشفاء.',
      recommendationEn: 'High CNS fatigue (>7% drop). Deload or reduce explosive volume immediately.',
      color: '#ef4444',
    };
  }
}

/**
 * 9. Elasticity vs. Strength Quadrant (EUR & DJ/CMJ Ratio)
 * - EUR = CMJ / SJ (Eccentric Utilization Ratio, typically 1.05 - 1.15)
 * - Reactive Index = Drop Jump / CMJ
 */
export function calculateElasticityQuadrant(
  cmjHeight: number,
  sjHeight: number,
  djHeight: number
): ElasticityQuadrantData {
  const cmj = parseFloat(String(cmjHeight)) || 0;
  const sj = parseFloat(String(sjHeight)) || (cmj > 0 ? cmj * 0.92 : 0);
  const dj = parseFloat(String(djHeight)) || (cmj > 0 ? cmj * 0.95 : 0);

  const eur = sj > 0 ? Number((cmj / sj).toFixed(2)) : 1.08;
  const reactiveIndex = cmj > 0 ? Number((dj / cmj).toFixed(2)) : 0.98;

  let quadrant: ElasticityQuadrantData['quadrant'];
  let titleAr: string;
  let titleEn: string;
  let descriptionAr: string;
  let descriptionEn: string;
  let color: string;

  if (eur >= 1.15 && reactiveIndex >= 0.98) {
    quadrant = 'elastic_dominant';
    titleAr = 'مطاطي متفجر (Elastic-Dominant ⚡)';
    titleEn = 'Elastic-Dominant Profile';
    descriptionAr = 'استغلال عالي جداً لمنعكس الاستطالة؛ اللاعب يملك أوتار قوية ولكنه يحتاج لزيادة القوة البحتة (Squat/Concentric).';
    descriptionEn: 'High stretch-shortening utilization. Tendons are reactive; prioritize raw concentric strength.',
    color = '#00f0ff';
  } else if (eur < 1.05 && reactiveIndex < 0.95) {
    quadrant = 'strength_dominant';
    titleAr = 'قوة عضلية طاغية (Strength-Dominant 🏋️)';
    titleEn = 'Strength/Muscular-Dominant';
    descriptionAr = 'فارق ضئيل بين CMJ و SJ؛ اللاعب يعتمد على العضلات فقط ويفقد استغلال مطاطية الأوتار؛ ركز على البلايومتريكس السريع.';
    descriptionEn: 'EUR < 1.05 shows poor stretch reflex usage. Prescribe fast reactive plyometrics & drop jumps.',
    color = '#f59e0b';
  } else if (eur >= 1.05 && eur < 1.15 && reactiveIndex >= 0.95 && cmj >= 45) {
    quadrant = 'well_balanced_elite';
    titleAr = 'نخبة متوازنة (Well-Balanced Elite 👑)';
    titleEn = 'Well-Balanced Elite';
    descriptionAr = 'توازن استثنائي بين القوة العضلية الانقباضية والمطاطية الوترية مع رقم قفز مرتفع.';
    descriptionEn: 'Exceptional balance between concentric power and reactive tendon stiffness.',
    color = '#10b981';
  } else {
    quadrant = 'general_deficit';
    titleAr = 'تأسيس شامل (General Deficit 🎯)';
    titleEn = 'General Athletic Deficit';
    descriptionAr = 'يحتاج اللاعب لتطوير متزامن في القوة الأساسية والمرونة السريعة لرفع مستوى القفز.';
    descriptionEn: 'Athlete requires foundational development in both concentric strength and elastic rebound.',
    color = '#94a3b8';
  }

  return {
    eur,
    reactiveIndex,
    cmjHeight: cmj,
    sjHeight: sj,
    djHeight: dj,
    quadrant,
    titleAr,
    titleEn,
    descriptionAr,
    descriptionEn,
    color,
  };
}

/**
 * 10. Main Biomechanics Hook
 */
export function useJumpMechanics(
  cameraFps: number = 240,
  videoFps: number = 30,
  takeoffTime: number = 0,
  landingTime: number = 0,
  bodyMass: number | string = 72,
  legLength: number | string = 1.0,
  boxTouchdownTime: number = 0,
  landingCorrectionMs: number | string = 0,
  jumpType: string = 'cmj',
  boxHeight: number = 30,
  useManualFrameDuration: boolean = false,
  manualFrameDuration: number = 0.033,
  rsiMethod: 'height_gct' | 'flight_gct' = 'height_gct'
): JumpMechanicsStats {
  const [stats, setStats] = useState<JumpMechanicsStats>({
    heightCm: '',
    heightInches: '',
    flightTime: '',
    takeoffVelocity: '',
    meanPower: '',
    harmanPeakPower: '',
    harmanMeanPower: '',
    sayersPeakPower: '',
    pushAcceleration: '',
    pushDuration: '',
    contactTime: '',
    rsi: '',
    meanForce: '',
    peakForce: '',
    gctAnalysis: null,
  });

  useEffect(() => {
    if (takeoffTime > 0 && landingTime > takeoffTime) {
      // 1. Raw video time delta
      const videoDeltaTime = Math.abs(landingTime - takeoffTime);

      // 2. Slow-Motion Scaling Factor
      let rawFlightTime: number;
      if (useManualFrameDuration && manualFrameDuration > 0) {
        const takeoffFrame = takeoffTime * videoFps;
        const landingFrame = landingTime * videoFps;
        rawFlightTime = Math.abs(landingFrame - takeoffFrame) / cameraFps;
      } else {
        rawFlightTime = videoDeltaTime * (videoFps / cameraFps);
      }
      const realFlightTime = Math.max(0.01, rawFlightTime - (parseFloat(String(landingCorrectionMs)) || 0) / 1000);

      // 3. Physical Constants & Parameters
      const mass = parseFloat(String(bodyMass)) || 70;
      let rawLeg = parseFloat(String(legLength)) || 1.0;
      if (rawLeg > 2) rawLeg = rawLeg / 100;
      const pushDistance = rawLeg * 0.45; // Estimated push-off displacement

      // 4. Calculate Vertical Jump Height: H = 1/8 * g * t^2
      const heightCm = calculateJumpHeightFromFlightTime(realFlightTime);
      const heightMeters = heightCm / 100;
      const heightInches = heightCm * 0.393701;

      // 5. Takeoff Velocity (m/s)
      const v_takeoff = calculateTakeoffVelocityFromHeight(heightMeters);

      // 6. Mean Force & Power (Samozino model)
      const meanForce = mass * GRAVITY * (heightMeters / pushDistance + 1);
      const power = meanForce * (v_takeoff / 2);

      // 7. Sayers and Harman empirical power equations
      const sayersPeak = 60.7 * heightCm + 45.3 * mass - 2055;
      const harmanPeak = 61.9 * heightCm + 36.0 * mass - 1822;
      const harmanMean = 21.2 * heightCm + 23.0 * mass - 1393;

      // 8. Push-off dynamics
      const pushAcc = v_takeoff > 0 ? Math.pow(v_takeoff, 2) / (2 * pushDistance) : 0;
      const pushDur = v_takeoff > 0 ? (2 * pushDistance) / v_takeoff : 0;

      // 9. Drop Jump Calculations (RSI & Contact Time)
      let contactTimeSec = 0;
      let rsiVal = 0;
      let gctAnalysis: GCTAnalysis | null = null;

      if (jumpType === 'dj' && boxTouchdownTime > 0 && takeoffTime > boxTouchdownTime) {
        if (useManualFrameDuration && manualFrameDuration > 0) {
          const contactFrames = (takeoffTime - boxTouchdownTime) * videoFps;
          contactTimeSec = contactFrames / cameraFps;
        } else {
          contactTimeSec = (takeoffTime - boxTouchdownTime) * (videoFps / cameraFps);
        }
        if (contactTimeSec > 0) {
          rsiVal = calculateRSI(heightCm, realFlightTime, contactTimeSec, rsiMethod);
          gctAnalysis = classifyGCT(contactTimeSec);
        }
      }

      setStats({
        heightCm: heightCm.toFixed(2),
        heightInches: heightInches.toFixed(2),
        flightTime: realFlightTime.toFixed(3),
        takeoffVelocity: v_takeoff.toFixed(2),
        meanPower: power.toFixed(2),
        harmanPeakPower: Math.max(0, harmanPeak).toFixed(2),
        harmanMeanPower: Math.max(0, harmanMean).toFixed(2),
        sayersPeakPower: Math.max(0, sayersPeak).toFixed(2),
        pushAcceleration: pushAcc.toFixed(2),
        pushDuration: pushDur.toFixed(3),
        contactTime: contactTimeSec > 0 ? contactTimeSec.toFixed(3) : '',
        rsi: rsiVal > 0 ? rsiVal.toFixed(2) : '',
        meanForce: meanForce.toFixed(2),
        peakForce: (meanForce * 1.5).toFixed(2),
        gctAnalysis,
      });
    } else {
      setStats({
        heightCm: '',
        heightInches: '',
        flightTime: '',
        takeoffVelocity: '',
        meanPower: '',
        harmanPeakPower: '',
        harmanMeanPower: '',
        sayersPeakPower: '',
        pushAcceleration: '',
        pushDuration: '',
        contactTime: '',
        rsi: '',
        meanForce: '',
        peakForce: '',
        gctAnalysis: null,
      });
    }
  }, [
    cameraFps,
    videoFps,
    takeoffTime,
    landingTime,
    bodyMass,
    legLength,
    boxTouchdownTime,
    landingCorrectionMs,
    jumpType,
    boxHeight,
    useManualFrameDuration,
    manualFrameDuration,
    rsiMethod,
  ]);

  return stats;
}

export default useJumpMechanics;
