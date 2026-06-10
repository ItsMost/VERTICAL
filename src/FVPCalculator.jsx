import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Zap, TrendingUp, AlertCircle, Info, CheckCircle, 
  Activity, FileText, Sparkles, RefreshCw, Play, ArrowLeftRight 
} from 'lucide-react';

// Animated counter helper
const AnimatedCounter = ({ value, duration = 1000, decimals = 1 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const startTime = performance.now();
    const updateCount = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      setCount(start + easeProgress * (end - start));
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };
    requestAnimationFrame(updateCount);
  }, [value, duration]);
  return <span className="font-mono">{count.toFixed(decimals)}</span>;
};

// Heuristic Force-Time presets generator
const generateDemoForceData = (type, mass, samplingRate = 1000) => {
  const dt = 1 / samplingRate;
  const BW = mass * 9.81;
  const data = [];
  
  // Total duration: 2.2 seconds
  const totalPoints = Math.round(2.2 * samplingRate);
  
  // Custom biomechanical configurations
  let peakForceFactor = 2.6; 
  let propulsionDuration = 0.25; 
  let brakingDuration = 0.20;
  let unweightingDuration = 0.30;
  let flightDuration = 0.45; 
  let timeToPeakFactor = 0.6; 
  
  if (type === 'low_rfd') {
    // Strong but slow
    peakForceFactor = 2.7;
    propulsionDuration = 0.36; 
    timeToPeakFactor = 0.8; 
    flightDuration = 0.38; 
  } else if (type === 'low_force') {
    // Fast but weak
    peakForceFactor = 1.8;
    propulsionDuration = 0.18; 
    timeToPeakFactor = 0.4; 
    flightDuration = 0.40; 
  } else if (type === 'elite') {
    // Elite athlete
    peakForceFactor = 2.95;
    propulsionDuration = 0.22;
    timeToPeakFactor = 0.48;
    flightDuration = 0.54; 
  }
  
  const peakForce = BW * peakForceFactor;
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i * dt;
    let force = BW;
    
    if (t < 0.4) {
      // Standing phase
      force = BW + (Math.random() - 0.5) * 8;
    } else if (t < 0.4 + unweightingDuration) {
      // Unweighting
      const progress = (t - 0.4) / unweightingDuration;
      force = BW - (BW * 0.45) * Math.sin(progress * Math.PI);
    } else if (t < 0.4 + unweightingDuration + brakingDuration) {
      // Braking
      const progress = (t - (0.4 + unweightingDuration)) / brakingDuration;
      force = (BW * 0.55) + (BW * 0.75) * progress; 
    } else if (t < 0.4 + unweightingDuration + brakingDuration + propulsionDuration) {
      // Propulsion
      const tProp = t - (0.4 + unweightingDuration + brakingDuration);
      const progress = tProp / propulsionDuration;
      
      if (progress < timeToPeakFactor) {
        const pSub = progress / timeToPeakFactor;
        force = (BW * 1.3) + (peakForce - BW * 1.3) * Math.sin(pSub * Math.PI / 2);
      } else {
        const pSub = (progress - timeToPeakFactor) / (1 - timeToPeakFactor);
        force = peakForce * Math.cos(pSub * Math.PI / 2);
      }
    } else if (t < 0.4 + unweightingDuration + brakingDuration + propulsionDuration + flightDuration) {
      // Flight (feet in the air = 0 force)
      force = 0;
    } else {
      // Landing
      const tLanding = t - (0.4 + unweightingDuration + brakingDuration + propulsionDuration + flightDuration);
      if (tLanding < 0.05) {
        const progress = tLanding / 0.05;
        force = (BW * 3.8) * Math.sin(progress * Math.PI / 2);
      } else if (tLanding < 0.2) {
        const progress = (tLanding - 0.05) / 0.15;
        force = (BW * 3.8) - (BW * 2.8) * progress;
      } else {
        force = BW + (Math.random() - 0.5) * 8;
      }
    }
    
    // Noise simulation
    if (force > 15) {
      force += (Math.random() - 0.5) * 12;
    } else {
      force = Math.max(0, force + (Math.random() - 0.5) * 2);
    }
    
    data.push(Math.round(force));
  }
  
  return data;
};

// Generate Mock Force Data array from Key Metrics
const generateCurveFromMetrics = (mass, samplingRate, movementType, peakForce, timeToPeakMs, flightTime) => {
  const dt = 1 / samplingRate;
  const BW = mass * 9.81;
  const data = [];
  
  const timeToPeakSec = timeToPeakMs / 1000;
  
  const standingDur = 0.3;
  const unweightingDur = movementType === 'sj' ? 0 : 0.25;
  const brakingDur = movementType === 'sj' ? 0 : 0.20;
  const propulsionDur = timeToPeakSec * 1.5; 
  
  const totalSec = standingDur + unweightingDur + brakingDur + propulsionDur + flightTime + 0.3;
  const totalPoints = Math.round(totalSec * samplingRate);
  
  const t_unweight_start = standingDur;
  const t_braking_start = t_unweight_start + unweightingDur;
  const t_prop_start = t_braking_start + brakingDur;
  const t_takeoff = t_prop_start + propulsionDur;
  const t_landing = t_takeoff + flightTime;
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i * dt;
    let force = BW;
    
    if (t < t_unweight_start) {
      force = BW;
    } else if (t < t_braking_start) {
      const progress = (t - t_unweight_start) / unweightingDur;
      force = BW - (BW * 0.4) * Math.sin(progress * Math.PI);
    } else if (t < t_prop_start) {
      const progress = (t - t_braking_start) / brakingDur;
      force = (BW * 0.6) + (BW * 0.65) * progress;
    } else if (t < t_takeoff) {
      const progress = (t - t_prop_start) / propulsionDur;
      const progressToPeak = timeToPeakSec / propulsionDur;
      if (progress < progressToPeak) {
        const pSub = progress / progressToPeak;
        force = (BW * 1.25) + (peakForce - BW * 1.25) * Math.sin(pSub * Math.PI / 2);
      } else {
        const pSub = (progress - progressToPeak) / (1 - progressToPeak);
        force = peakForce * Math.cos(pSub * Math.PI / 2);
      }
    } else if (t < t_landing) {
      force = 0;
    } else {
      const tLanding = t - t_landing;
      if (tLanding < 0.05) {
        const progress = tLanding / 0.05;
        force = (BW * 3.2) * Math.sin(progress * Math.PI / 2);
      } else if (tLanding < 0.20) {
        const progress = (tLanding - 0.05) / 0.15;
        force = (BW * 3.2) - (BW * 2.2) * progress;
      } else {
        force = BW;
      }
    }
    
    if (force > 5) {
      force += (Math.random() - 0.5) * 5;
    }
    data.push(Math.round(force));
  }
  
  return data;
};

export default function FVPCalculator({ activePlayer }) {
  // Navigation: 'ftc' (Force-Time Curve) vs 'fvp' (Force-Velocity Profile)
  const [activeSubTab, setActiveSubTab] = useState('ftc');

  // ==========================================
  // STATE FOR FORCE-TIME CURVE (FTC) ANALYSIS
  // ==========================================
  const [athleteMass, setAthleteMass] = useState(activePlayer?.weight_kg || 75);
  const [samplingRate, setSamplingRate] = useState(1000);
  const [movementType, setMovementType] = useState('cmj'); // 'cmj', 'sj', 'dj'
  const [inputMode, setInputMode] = useState('raw'); // 'raw' or 'metrics'
  
  const [rawForceInput, setRawForceInput] = useState('');
  
  // Key metrics inputs (fallback mode)
  const [metricPeakForce, setMetricPeakForce] = useState('');
  const [metricTimeToPeak, setMetricTimeToPeak] = useState('');
  const [metricFlightTime, setMetricFlightTime] = useState('');
  const [metricContactTime, setMetricContactTime] = useState('');

  const [ftcResult, setFtcResult] = useState(null);

  // Sync athlete weight if active player change
  useEffect(() => {
    if (activePlayer?.weight_kg) {
      setAthleteMass(activePlayer.weight_kg);
    }
  }, [activePlayer]);

  // Handle Load Demo Presets
  const loadPreset = (type) => {
    const mass = parseFloat(athleteMass) || 75;
    const rate = parseFloat(samplingRate) || 1000;
    const data = generateDemoForceData(type, mass, rate);
    setRawForceInput(data.join(', '));
    setInputMode('raw');
    if (type === 'elite' || type === 'low_rfd') {
      setMovementType('cmj');
    } else if (type === 'low_force') {
      setMovementType('cmj');
    }
  };

  const handleFTCAnalyze = () => {
    const mass = parseFloat(athleteMass);
    const rate = parseFloat(samplingRate);
    if (!mass || mass <= 0) return alert('الرجاء إدخال كتلة اللاعب بشكل صحيح');
    if (!rate || rate <= 0) return alert('الرجاء إدخال معدل أخذ العينات بشكل صحيح');

    let forceArray = [];

    if (inputMode === 'raw') {
      // Parse raw text
      if (!rawForceInput.trim()) return alert('الرجاء إدخال قيم القوة الخام أو اختيار لاعب تجريبي');
      
      const parts = rawForceInput.split(/[\s,;\n]+/);
      for (let part of parts) {
        const val = parseFloat(part);
        if (!isNaN(val)) {
          forceArray.push(val);
        }
      }

      if (forceArray.length < 50) {
        return alert('البيانات المدخلة قصيرة جداً لتحليل بيوميكانيكي دقيق (الحد الأدنى 50 عينة)');
      }
    } else {
      // Key metrics manual input
      const pForce = parseFloat(metricPeakForce);
      const tPeak = parseFloat(metricTimeToPeak);
      const fTime = parseFloat(metricFlightTime);
      const cTime = parseFloat(metricContactTime) || 0.2;

      if (!pForce || pForce <= 0) return alert('الرجاء إدخال ذروة القوة بشكل صحيح');
      if (!tPeak || tPeak <= 0) return alert('الرجاء إدخال زمن الوصول للذروة بشكل صحيح');
      if (!fTime || fTime <= 0) return alert('الرجاء إدخال زمن الطيران بشكل صحيح');

      forceArray = generateCurveFromMetrics(mass, rate, movementType, pForce, tPeak, fTime);
    }

    // Biomechanical calculations
    const dt = 1 / rate;
    const BW = mass * 9.81;

    // Moving average smoothing (window size = 5)
    const smoothed = [];
    for (let i = 0; i < forceArray.length; i++) {
      const start = Math.max(0, i - 2);
      const end = Math.min(forceArray.length - 1, i + 2);
      let sum = 0;
      for (let j = start; j <= end; j++) sum += forceArray[j];
      smoothed.push(sum / (end - start + 1));
    }

    // Integrate to find acceleration, velocity and displacement
    const velocity = [0];
    const displacement = [0];
    for (let i = 1; i < smoothed.length; i++) {
      const acc = (smoothed[i] - BW) / mass;
      const v = velocity[i - 1] + acc * dt;
      velocity.push(v);
      displacement.push(displacement[i - 1] + v * dt);
    }

    // Detect Takeoff & Landing
    let i_takeoff = -1;
    let i_landing = -1;

    for (let i = 5; i < smoothed.length; i++) {
      if (smoothed[i] < 20 && i_takeoff === -1) {
        let staysLow = true;
        const checkRange = Math.min(smoothed.length, i + Math.round(0.04 * rate)); // check 40ms ahead
        for (let j = i; j < checkRange; j++) {
          if (smoothed[j] > 45) {
            staysLow = false;
            break;
          }
        }
        if (staysLow) i_takeoff = i;
      }
      if (i_takeoff !== -1 && i > i_takeoff && smoothed[i] > 120 && i_landing === -1) {
        i_landing = i;
      }
    }

    if (i_takeoff === -1) i_takeoff = smoothed.length - 1;

    // Find Propulsion Start
    let i_prop_start = 0;
    if (movementType === 'sj') {
      // Squat Jump ( SJ ): starts when force exceeds BW + 30N
      for (let i = 0; i < i_takeoff; i++) {
        if (smoothed[i] > BW + 30) {
          i_prop_start = i;
          break;
        }
      }
    } else {
      // CMJ or DJ: transitions when velocity becomes positive after countermovement dip
      let minVel = 0;
      let idxMinVel = 0;
      for (let i = 0; i < i_takeoff; i++) {
        if (velocity[i] < minVel) {
          minVel = velocity[i];
          idxMinVel = i;
        }
      }
      i_prop_start = idxMinVel;
    }

    // Find Countermovement Start (for CMJ/DJ braking analysis)
    let i_start = 0;
    for (let i = 0; i < i_prop_start; i++) {
      if (smoothed[i] < BW - 25) {
        i_start = i;
        break;
      }
    }
    if (i_start === 0 && i_prop_start > 0) {
      i_start = Math.max(0, i_prop_start - Math.round(0.25 * rate));
    }

    // Peak Force in propulsion
    const peakForce = Math.max(...smoothed.slice(i_prop_start, i_takeoff));
    const i_peak = smoothed.indexOf(peakForce);
    const timeToPeakMs = (i_peak - i_prop_start) * dt * 1000;
    const relativePeakForce = peakForce / BW;

    // Displacement analysis (Squat Depth)
    const minDisp = Math.min(...displacement.slice(i_start, i_takeoff));
    const squatDepthCm = Math.abs(minDisp) * 100;

    // RFD Propulsive phase calculations (Early: 0-50ms, Late: 0-200ms)
    const idx50 = Math.min(i_takeoff, i_prop_start + Math.round(0.050 * rate));
    const idx200 = Math.min(i_takeoff, i_prop_start + Math.round(0.200 * rate));

    const rfd50 = (smoothed[idx50] - smoothed[i_prop_start]) / 0.050;
    const rfd200 = (smoothed[idx200] - smoothed[i_prop_start]) / 0.200;

    // Max instant RFD (over any 20ms slope during propulsion)
    let maxRfd = 0;
    const step20ms = Math.round(0.02 * rate);
    for (let i = i_prop_start; i < i_takeoff - step20ms; i++) {
      const slope = (smoothed[i + step20ms] - smoothed[i]) / 0.02;
      if (slope > maxRfd) maxRfd = slope;
    }

    // Concentric Impulse
    let concentricImpulse = 0;
    for (let i = i_prop_start; i < i_takeoff; i++) {
      concentricImpulse += smoothed[i] * dt;
    }

    // Jump height via Takeoff Velocity vs Flight Time
    const v_takeoff = velocity[i_takeoff];
    const heightFromVel = (v_takeoff * v_takeoff) / (2 * 9.81); // in meters

    let computedFlightTime = 0;
    let heightFromFlight = 0;

    if (inputMode === 'metrics') {
      computedFlightTime = parseFloat(metricFlightTime);
      heightFromFlight = (9.81 * computedFlightTime * computedFlightTime) / 8;
    } else if (i_landing !== -1) {
      computedFlightTime = (i_landing - i_takeoff) * dt;
      heightFromFlight = (9.81 * computedFlightTime * computedFlightTime) / 8;
    }

    const finalHeight = heightFromFlight > 0 ? heightFromFlight : heightFromVel;
    const finalFlightTime = computedFlightTime > 0 ? computedFlightTime : (v_takeoff * 2) / 9.81;

    // Contact time and RSI (Drop Jump)
    let contactTime = 0;
    let rsi = 0;
    if (movementType === 'dj') {
      if (inputMode === 'metrics') {
        contactTime = parseFloat(metricContactTime) || 0.2;
      } else {
        // Touchdown is the initial contact when force shoots above 80N
        let i_touchdown = 0;
        for (let i = 0; i < i_prop_start; i++) {
          if (smoothed[i] > 80) {
            i_touchdown = i;
            break;
          }
        }
        contactTime = (i_takeoff - i_touchdown) * dt;
      }
      rsi = finalHeight / contactTime;
    }

    // Phase Breakdown Diagnostic
    let jumperClass = "متوازن (Balanced)";
    let breakdownAdvice = "";
    const isElitePeak = relativePeakForce >= 2.5;
    const isEliteRFD = rfd50 >= 12000;

    if (relativePeakForce >= 2.4 && rfd50 < 8000) {
      jumperClass = "قوة مسيطرة (Force Dominant / Velocity Deficit)";
      breakdownAdvice = "اللاعب يمتلك قوة مطلقة ممتازة (Relative Peak Force عالية) ولكنه يستغرق وقتاً طويلاً لتوليد هذه القوة. حركته بطيئة وتفتقر للتفجير السريع.";
    } else if (relativePeakForce < 2.2 && rfd50 >= 10000) {
      jumperClass = "سرعة مسيطرة (Velocity Dominant / Force Deficit)";
      breakdownAdvice = "اللاعب متفجر وسريع جداً في توليد القوة المبكرة، ولكنه يفتقر للقوة الهيكلية العضلية القصوى. يخرج من الأرض بسرعة لكن بقوة دفع محدودة.";
    } else if (isElitePeak && isEliteRFD) {
      jumperClass = "لاعب نخبة متكامل (Elite Balanced Jumper)";
      breakdownAdvice = "يمتلك اللاعب توازناً مثالياً بيوميكانيكياً: إنتاج قوة قصوى هائل (>2.5 من وزن الجسم) متزامن مع معدل نقل طاقة وانفجار فائق السرعة.";
    } else {
      jumperClass = "ضعف ثنائي متكامل (General Deficit Jumper)";
      breakdownAdvice = "يعاني اللاعب من نقص متزامن في القوة الهيكلية وفي سرعة الانفجار العضلي. يحتاج لبناء أساس متين من القوة العضلية أولاً.";
    }

    // Red flags
    const redFlags = [];
    if (relativePeakForce < 2.3) {
      redFlags.push({
        title: "ضعف القوة النسبية (Low Relative Peak Force)",
        desc: `القوة القصوى بلغت فقط ${relativePeakForce.toFixed(2)} BW، وهي أقل من الهدف الرياضي للنخبة (أكبر من 2.5 BW). اللاعب بحاجة لزيادة التجنيد العضلي.`
      });
    }
    if (rfd50 < 8000) {
      redFlags.push({
        title: "نقص التفجير العضلي المبكر (Low Early RFD)",
        desc: `معدل تطوير القوة في أول 50 جزء من الثانية منخفض جداً (${Math.round(rfd50).toLocaleString()} N/s). يشير لضعف التنشيط العصبي السريع للألياف العضلية.`
      });
    }
    if (timeToPeakMs > 250) {
      redFlags.push({
        title: "تأخر الوصول لذروة القوة (Prolonged Time to Peak)",
        desc: `استغرق اللاعب ${Math.round(timeToPeakMs)}ms للوصول لأقصى قوة، وهو معدل بطيء يسهل على الخصم قراءته ويقلل من الاستفادة من دورة التمدد والتقلص.`
      });
    }
    if (movementType === 'cmj' && (i_prop_start - i_start) * dt > 0.45) {
      redFlags.push({
        title: "فترة كبح حركة ممتدة (Prolonged Braking Phase)",
        desc: `مرحلة الهبوط والنزول استغرقت وقتاً طويلاً (${Math.round((i_prop_start - i_start) * dt * 1000)}ms). يدل على ضعف القوة اللامركزية (Eccentric) في إيقاف الوزن وإعادة توجيهه.`
      });
    }

    // Recommendations
    const recommendations = [];
    if (relativePeakForce < 2.3 || jumperClass.includes("Force Deficit")) {
      recommendations.push({
        title: "تطوير القوة العضلية القصوى (Max Strength Load)",
        exercises: ["Back Squats (أوزان ثقيلة +85% 1RM)", "Bulgarian Split Squats (تركيز أوزان)", "Hex Bar Deadlifts (قوة دفع أرضي)"]
      });
    }
    if (rfd50 < 8000 || jumperClass.includes("Velocity Deficit")) {
      recommendations.push({
        title: "التدريبات البالستية والانفجارية (Ballistics & Power)",
        exercises: ["Loaded Trap Bar Jumps (بوزن 10-30% من أقصى وزن)", "Banded Squat Jumps (مقاومة عكسية)", "Hang Cleans / Kettlebell Swings (تطوير الفركشن العصبي)"]
      });
    }
    if (redFlags.some(f => f.title.includes("Braking"))) {
      recommendations.push({
        title: "تقوية الكبح والتحميل اللامركزي (Eccentric & SSC)",
        exercises: ["Depth Jumps (السقوط من صندوق 40 سم والارتداد المباشر)", "Tempo Eccentric Squats (نزول بطيء في 4-6 ثوانٍ)", "Altitude Landings (ثبات فوري عند الهبوط)"]
      });
    }
    // general fallback
    if (recommendations.length === 0) {
      recommendations.push({
        title: "الحفاظ على الأداء وتطوير التنسيق الحركي",
        exercises: ["Complex Training (دمج أوزان ثقيلة مع قفز فوري)", "Speed Play (قفزات حواجز متتالية)", "Single Leg Jumps (توازن دفع أحادي)"]
      });
    }

    setFtcResult({
      mass,
      samplingRate: rate,
      movementType,
      BW,
      peakForce,
      timeToPeakMs,
      relativePeakForce,
      rfd50,
      rfd200,
      maxRfd,
      concentricImpulse,
      flightTime: finalFlightTime,
      jumpHeight: finalHeight,
      squatDepthCm,
      contactTime,
      rsi,
      jumperClass,
      breakdownAdvice,
      redFlags,
      recommendations,
      smoothed,
      i_start,
      i_prop_start,
      i_peak,
      i_takeoff,
      i_landing
    });
  };

  // ==========================================
  // STATE & LOGIC FOR FORCE-VELOCITY PROFILE (FVP)
  // ==========================================
  const [jumps, setJumps] = useState([
    { weight: 0, flightTime: '' },
    { weight: 10, flightTime: '' },
    { weight: 20, flightTime: '' },
    { weight: 30, flightTime: '' }
  ]);
  const [seasonPeriod, setSeasonPeriod] = useState('Off-Season');
  const [trainingAge, setTrainingAge] = useState('Intermediate (1-3 years)');
  
  const [fvpResult, setFvpResult] = useState(null);

  const handleJumpChange = (index, field, value) => {
    const newJumps = [...jumps];
    newJumps[index][field] = value;
    setJumps(newJumps);
  };

  const handleFVPAnalyze = () => {
    if (!activePlayer) return alert("يرجى اختيار لاعب أولاً!");

    const mass = parseFloat(activePlayer.weight_kg);
    const legLength = parseFloat(activePlayer.leg_length_m) || 1.0;
    const h_po = legLength * 0.45; 
    const g = 9.81;

    let points = [];

    for (let i = 0; i < jumps.length; i++) {
      const extraWeight = parseFloat(jumps[i].weight) || 0;
      const ft = parseFloat(jumps[i].flightTime);

      if (!ft || ft <= 0) return alert(`يرجى إدخال زمن الطيران للقفزة رقم ${i + 1} بشكل صحيح.`);

      const h = (g * ft * ft) / 8; 
      const v_takeoff = (g * ft) / 2; 
      const mean_v = v_takeoff / 2; 
      
      const totalMass = mass + extraWeight;
      const mean_f = totalMass * g * ((h / h_po) + 1); 

      points.push({ v: mean_v, f: mean_f, weight: extraWeight });
    }

    let n = points.length;
    let sum_v = 0, sum_f = 0;
    points.forEach(p => { sum_v += p.v; sum_f += p.f; });
    const mean_v_all = sum_v / n;
    const mean_f_all = sum_f / n;

    let numerator = 0, denominator = 0;
    points.forEach(p => {
      numerator += (p.v - mean_v_all) * (p.f - mean_f_all);
      denominator += (p.v - mean_v_all) * (p.v - mean_v_all);
    });

    const slope = numerator / denominator;
    const isDistorted = slope >= 0;
    const effectiveSlope = isDistorted ? -50 : slope;

    const F0 = mean_f_all - effectiveSlope * mean_v_all; 
    const V0 = -F0 / effectiveSlope;                     
    const Pmax = (F0 * V0) / 4;                 
    const f0_rel = F0 / mass; 

    // Optimal FVP Calculations based on push-off height and max power
    const Sopt_rel = -22.5;
    const Sopt = Sopt_rel * mass; // Optimal slope in N·s/m
    const V0_opt = 2 * Math.sqrt(Pmax / Math.abs(Sopt));
    const F0_opt = V0_opt * Math.abs(Sopt);
    const fvpIndex = (effectiveSlope / Sopt) * 100;

    let diagnosis = "";
    let advice = "";
    let color = "";

    if (V0 < 3.0 && f0_rel >= 24) {
        // Velocity Deficit
        diagnosis = "عجز في السرعة (Velocity Deficit)";
        if (seasonPeriod === 'In-Season' || seasonPeriod === 'Competition-Phase') {
            advice = `اللاعب يمتلك قوة هيكلية ممتازة ولكنه يعاني من عجز حاد في السرعة حركياً. ونظراً لكوننا حالياً في فترة المنافسات/داخل الموسم (${seasonPeriod})، يُنصح بتجنب الأحمال التدريبية الثقيلة لتجنب الإجهاد البدني المتراكم. يجب التركيز الكامل على تدريبات البلايومترك السريع والخفيف (Fast/Light Plyometrics) والوثبات البالستية بوزن الجسم لزيادة القدرة وسرعة الارتقاء الحركي الميكانيكي.`;
        } else {
            advice = `اللاعب يمتلك قوة هيكلية ممتازة ولكن سرعته الحركية متدنية. ونظراً لأننا في فترة الإعداد خارج الموسم (${seasonPeriod})، يوصى بتمارين القوة الانفجارية والقدرة البالستية متوسطة الأحمال (30-40% من أقصى وزن) مثل قفز القرفصاء المحمل (Loaded Squat Jumps) لبناء القدرة السريعة تدريجياً.`;
        }
        color = "text-blue-400 border-blue-500 bg-blue-900/20";
    } else if (f0_rel < 24 && V0 >= 3.0) {
        // Force Deficit
        diagnosis = "عجز في القوة (Force Deficit)";
        if (seasonPeriod === 'In-Season' || seasonPeriod === 'Competition-Phase') {
            advice = `اللاعب سريع للغاية ذو حركة مطاطية مرنة، ولكنه يفتقر للقوة المطلقة الكافية للتغلب على مقاومة الأحمال. نظراً للتواجد داخل الموسم/المنافسات (${seasonPeriod})، يوصى بتطبيق تدريبات التحميل الرياضي المركب (Complex Training) والتدريب المتباين (Contrast Training) لدمج تمرين قوة خفيف مع ارتداد فوري دون تراكم الإجهاد البدني.`;
        } else {
            advice = `يعاني اللاعب من عجز واضح في القوة الأساسية رغم تمتعه بسرعة حركية جيدة. فترة الإعداد خارج الموسم (${seasonPeriod}) هي التوقيت المثالي للتركيز على تدريبات المقاومة الثقيلة لزيادة القوة القصوى (Heavy Resistance Training >80% 1RM) مثل القرفصاء الخلفي (Back Squats) والرفعة المميتة (Deadlifts) لبناء قاعدة القوة.`;
        }
        color = "text-orange-400 border-orange-500 bg-orange-900/20";
    } else if (f0_rel < 24 && V0 < 3.0) {
        // Weak/General Deficit
        diagnosis = "عجز عام (General Deficit)";
        if (seasonPeriod === 'In-Season' || seasonPeriod === 'Competition-Phase') {
            advice = `يظهر اللاعب عجزاً عاماً متزامناً في القوة والسرعة. نظراً للتواجد داخل الموسم، يجب التركيز على صيانة البنية البدنية والوقاية من الإصابات مع تخفيف أحجام وثبات القفز لتجنب التحميل الزائد للمفاصل.`;
        } else {
            advice = `يعاني اللاعب من نقص عام في القوة العضلية والسرعة الحركية على حد سواء. فترة الإعداد الحالية (${seasonPeriod}) تتطلب البدء الفوري ببناء قاعدة القوة العامة والكتلة العضلية الداعمة للمفاصل ثم تدرج القوة الانفجارية لاحقاً.`;
        }
        color = "text-red-400 border-red-500 bg-red-900/20";
    } else {
        // Balanced
        diagnosis = "ملف متوازن (Well-Balanced Profile)";
        advice = `يمتلك اللاعب توازناً بيوميكانيكياً رائعاً ومثالياً بين القوة والسرعة. يُنصح بالاستمرار في التدريبات المختلطة المتنوعة للحفاظ على زوايا المنحنى وتطوير القدرة القصوى (Pmax).`;
        color = "text-emerald-400 border-emerald-500 bg-emerald-900/20";
    }

    if (trainingAge === 'Beginner (<1 year)') {
        advice += " (تنبيه ميكانيكي حركي: نظراً لكون العمر التدريبي للاعب مبتدئ/ناشئ، تجب الأولوية التامة لسلامة الحركة وإتقان تكنيك الأداء والنزول قبل زيادة أي أحمال خارجية.)";
    } else if (trainingAge === 'Advanced (>3 years)') {
        advice += " (تنويه: بما أن العمر التدريبي للاعب متقدم، يمكن دمج تدريبات بلايومترك عالية الشدة وتدريبات تباين متطورة لتحقيق الاستفادة الميكانيكية القصوى.)";
    }

    setFvpResult({
      F0, V0, Pmax, diagnosis, advice, color, points, isDistorted,
      F0_opt, V0_opt, Sopt, fvpIndex
    });
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 md:p-6 shadow-2xl animate-fade-in text-right">
      
      {/* ================= DUAL SUB-TAB NAVIGATION ================= */}
      <div className="flex bg-black/40 p-1.5 rounded-xl border border-gray-800 mb-6 max-w-md mx-auto">
        <button
          onClick={() => setActiveSubTab('ftc')}
          className={`flex-1 py-2 rounded-lg font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'ftc' 
              ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Activity size={16} />
          منحنى القوة والزمن (FTC)
        </button>
        <button
          onClick={() => setActiveSubTab('fvp')}
          className={`flex-1 py-2 rounded-lg font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'fvp' 
              ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp size={16} />
          بروفايل القوة والسرعة (FVP)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ================= TAB 1: FORCE-TIME CURVE (FTC) VIEW ==================== */}
      {/* ========================================================================= */}
      {activeSubTab === 'ftc' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              تحليل منحنى القوة والزمن البيوميكانيكي (Force-Time Curve Analysis)
            </h3>
            <p className="text-gray-400 text-xs md:text-sm mt-1.5 max-w-xl mx-auto">
              قم بتحليل قفزة اللاعب باستخدام قيم القوة الخام المستخرجة من لوحة القياس (Force Plate) للحصول على تقرير بيوميكانيكي مفصل.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* FTC FORM PANEL */}
            <div className="lg:col-span-5 bg-black/20 p-5 rounded-2xl border border-gray-800 space-y-4">
              <h4 className="font-bold text-white text-sm border-b border-gray-800 pb-2 flex items-center gap-1.5">
                <Sparkles className="text-amber-500" size={16} /> مدخلات التحليل
              </h4>

              {/* Mass and Sampling Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs text-gray-400 font-bold">وزن اللاعب (Mass - kg):</label>
                  <input
                    type="number"
                    value={athleteMass}
                    onChange={(e) => setAthleteMass(e.target.value)}
                    className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-lg p-2 text-xs font-mono outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-gray-400 font-bold">معدل العينات (Rate - Hz):</label>
                  <input
                    type="number"
                    value={samplingRate}
                    onChange={(e) => setSamplingRate(e.target.value)}
                    className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-lg p-2 text-xs font-mono outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Movement Type */}
              <div className="space-y-1">
                <label className="block text-xs text-gray-400 font-bold">نوع الحركة (Movement Type):</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-lg p-2 text-xs font-bold outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="cmj">قفزة من وضع الحركة (Countermovement Jump - CMJ)</option>
                  <option value="sj">قفزة من وضع الثبات (Squat Jump - SJ)</option>
                  <option value="dj">قفزة السقوط والارتداد (Drop Jump - DJ)</option>
                </select>
              </div>

              {/* Input Mode Selector */}
              <div className="space-y-1">
                <label className="block text-xs text-gray-400 font-bold">طريقة إدخال البيانات:</label>
                <div className="flex bg-black/35 rounded-lg border border-gray-800 p-1">
                  <button
                    type="button"
                    onClick={() => setInputMode('raw')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                      inputMode === 'raw' ? 'bg-[#1f2937] text-orange-400' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    بيانات لوحة القوة الخام (Raw Array)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('metrics')}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                      inputMode === 'metrics' ? 'bg-[#1f2937] text-orange-400' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    المؤشرات المباشرة (Key Metrics)
                  </button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {inputMode === 'raw' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs text-gray-400 font-bold">مصفوفة القوة الخام (Raw Force - Newtons):</label>
                    <span className="text-[10px] text-gray-500 font-mono">القيم بالنيوتن مفصولة بفاصلة</span>
                  </div>
                  <textarea
                    value={rawForceInput}
                    onChange={(e) => setRawForceInput(e.target.value)}
                    rows={4}
                    placeholder="2100, 2150, 1950, 1600, 1200, 800, 450..."
                    className="w-full bg-[#1a202c] text-white border border-gray-700 rounded-xl p-2.5 text-[10px] font-mono outline-none focus:border-orange-500 resize-y"
                  />
                  
                  {/* Preset buttons */}
                  <div className="space-y-1.5 pt-1">
                    <span className="block text-[10px] text-gray-400 font-bold">توليد بيانات تجريبية سريعة:</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => loadPreset('elite')}
                        className="py-1 px-2 text-[9px] font-bold rounded-lg border border-emerald-900 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 transition-colors"
                      >
                        ⚡ لاعب نخبة متكامل
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPreset('low_rfd')}
                        className="py-1 px-2 text-[9px] font-bold rounded-lg border border-blue-900 bg-blue-950/20 text-blue-400 hover:bg-blue-950/40 transition-colors"
                      >
                        🐢 لاعب قوي وبطيء
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPreset('low_force')}
                        className="py-1 px-2 text-[9px] font-bold rounded-lg border border-orange-950 bg-orange-900/10 text-orange-400 hover:bg-orange-900/20 transition-colors"
                      >
                        💥 لاعب سريع بدون قوة
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs text-gray-400 font-bold">ذروة القوة (Peak Force - N):</label>
                      <input
                        type="number"
                        placeholder="e.g. 2100"
                        value={metricPeakForce}
                        onChange={(e) => setMetricPeakForce(e.target.value)}
                        className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-lg p-2 text-xs font-mono outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs text-gray-400 font-bold">زمن القوة القصوى (ms):</label>
                      <input
                        type="number"
                        placeholder="e.g. 180"
                        value={metricTimeToPeak}
                        onChange={(e) => setMetricTimeToPeak(e.target.value)}
                        className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-lg p-2 text-xs font-mono outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs text-gray-400 font-bold">زمن الطيران (Flight Time - s):</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 0.52"
                        value={metricFlightTime}
                        onChange={(e) => setMetricFlightTime(e.target.value)}
                        className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-lg p-2 text-xs font-mono outline-none"
                      />
                    </div>
                    {movementType === 'dj' && (
                      <div className="space-y-1">
                        <label className="block text-xs text-gray-400 font-bold">زمن التلامس (Contact - s):</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 0.18"
                          value={metricContactTime}
                          onChange={(e) => setMetricContactTime(e.target.value)}
                          className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-lg p-2 text-xs font-mono outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleFTCAnalyze}
                className="w-full py-3 mt-4 btn-orange-gradient rounded-xl font-black text-sm flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
              >
                <Activity size={16} /> تحليل منحنى القوة والحركة
              </button>
            </div>

            {/* INTERACTIVE SVG VISUALIZER */}
            <div className="lg:col-span-7 bg-black/30 p-5 rounded-2xl border border-gray-800 h-full flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white text-sm border-b border-gray-800 pb-2 mb-4">
                  📈 رسم بياني لمنحنى القوة والزمن (Force-Time Plot)
                </h4>
                
                {ftcResult ? (
                  <div className="relative w-full overflow-hidden">
                    
                    {/* SVG Curve */}
                    <div className="w-full bg-[#0b0f19] p-3 rounded-xl border border-cyan-950/40 relative">
                      <svg viewBox="0 0 500 240" className="w-full overflow-visible">
                        <defs>
                          {/* Shading gradients */}
                          <linearGradient id="brakingGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.15"/>
                            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.01"/>
                          </linearGradient>
                          <linearGradient id="propulsionGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2"/>
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.01"/>
                          </linearGradient>
                          <linearGradient id="curveGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#00f5d4" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </linearGradient>
                        </defs>

                        {/* Grid Lines */}
                        <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                        <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                        <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                        <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

                        {(() => {
                          const data = ftcResult.smoothed;
                          const total = data.length;
                          const maxForce = Math.max(...data, ftcResult.BW * 1.5);
                          const minForce = 0;
                          
                          const scaleX = (idx) => 40 + (idx / (total - 1)) * 440;
                          const scaleY = (val) => 190 - (val / maxForce) * 160;

                          // Phase pixel locations
                          const xStart = scaleX(ftcResult.i_start);
                          const xPropStart = scaleX(ftcResult.i_prop_start);
                          const xTakeoff = scaleX(ftcResult.i_takeoff);
                          const xLanding = scaleX(ftcResult.i_landing);
                          const yBW = scaleY(ftcResult.BW);

                          // Generate path points
                          const points = data.map((val, idx) => `${scaleX(idx).toFixed(1)},${scaleY(val).toFixed(1)}`).join(' L ');
                          
                          // Shading paths
                          let brakingPointsStr = "";
                          if (ftcResult.i_prop_start > ftcResult.i_start) {
                            const brakingPoints = data.slice(ftcResult.i_start, ftcResult.i_prop_start + 1).map((val, idx) => {
                              const globalIdx = ftcResult.i_start + idx;
                              return `${scaleX(globalIdx).toFixed(1)},${scaleY(val).toFixed(1)}`;
                            });
                            brakingPointsStr = `M ${xStart.toFixed(1)},190 L ${brakingPoints.join(' L ')} L ${xPropStart.toFixed(1)},190 Z`;
                          }

                          let propulsionPointsStr = "";
                          if (ftcResult.i_takeoff > ftcResult.i_prop_start) {
                            const propPoints = data.slice(ftcResult.i_prop_start, ftcResult.i_takeoff + 1).map((val, idx) => {
                              const globalIdx = ftcResult.i_prop_start + idx;
                              return `${scaleX(globalIdx).toFixed(1)},${scaleY(val).toFixed(1)}`;
                            });
                            propulsionPointsStr = `M ${xPropStart.toFixed(1)},190 L ${propPoints.join(' L ')} L ${xTakeoff.toFixed(1)},190 Z`;
                          }

                          return (
                            <>
                              {/* Shaded Areas */}
                              {brakingPointsStr && <path d={brakingPointsStr} fill="url(#brakingGradient)" />}
                              {propulsionPointsStr && <path d={propulsionPointsStr} fill="url(#propulsionGradient)" />}

                              {/* Bodyweight Horizontal Line */}
                              <line 
                                x1="40" 
                                y1={yBW} 
                                x2="480" 
                                y2={yBW} 
                                stroke="#ec4899" 
                                strokeWidth="1" 
                                strokeDasharray="3,3" 
                              />
                              <text x="45" y={yBW - 4} fill="#ec4899" fontSize="6.5" fontWeight="bold">وزن الجسم (BW = {Math.round(ftcResult.BW)}N)</text>

                              {/* Main Curve Path */}
                              <path 
                                d={`M ${points}`} 
                                fill="none" 
                                stroke="url(#curveGradient)" 
                                strokeWidth="2.5" 
                                style={{ filter: 'drop-shadow(0 0 2px rgba(0, 245, 212, 0.3))' }}
                              />

                              {/* Markers */}
                              {/* Peak Force dot */}
                              <circle 
                                cx={scaleX(ftcResult.i_peak)} 
                                cy={scaleY(ftcResult.peakForce)} 
                                r="5.5" 
                                fill="#f59e0b" 
                                stroke="#fff" 
                                strokeWidth="1.5" 
                              />
                              <text 
                                x={scaleX(ftcResult.i_peak)} 
                                y={scaleY(ftcResult.peakForce) - 8} 
                                fill="#fff" 
                                fontSize="7" 
                                fontWeight="bold" 
                                textAnchor="middle"
                              >
                                ذروة القوة: {Math.round(ftcResult.peakForce)}N
                              </text>

                              {/* Takeoff point */}
                              <circle 
                                cx={xTakeoff} 
                                cy={scaleY(data[ftcResult.i_takeoff])} 
                                r="4" 
                                fill="#06b6d4" 
                                stroke="#fff" 
                                strokeWidth="1" 
                              />
                              <text x={xTakeoff - 5} y={scaleY(data[ftcResult.i_takeoff]) - 6} fill="#06b6d4" fontSize="6.5" fontWeight="bold">الإقلاع</text>

                              {/* Landing point */}
                              {ftcResult.i_landing !== -1 && (
                                <>
                                  <circle 
                                    cx={xLanding} 
                                    cy={scaleY(data[ftcResult.i_landing])} 
                                    r="4" 
                                    fill="#10b981" 
                                    stroke="#fff" 
                                    strokeWidth="1" 
                                  />
                                  <text x={xLanding + 5} y={scaleY(data[ftcResult.i_landing]) - 6} fill="#10b981" fontSize="6.5" fontWeight="bold">الهبوط</text>
                                </>
                              )}

                              {/* Axis Lines */}
                              <line x1="40" y1="190" x2="480" y2="190" stroke="#4b5563" strokeWidth="1" />
                              <line x1="40" y1="20" x2="40" y2="190" stroke="#4b5563" strokeWidth="1" />

                              {/* Labels */}
                              <text x="35" y="194" fill="#9ca3af" fontSize="6.5" textAnchor="end">0N</text>
                              <text x="35" y={scaleY(ftcResult.peakForce)} fill="#9ca3af" fontSize="6.5" textAnchor="end">{Math.round(ftcResult.peakForce)}N</text>
                              
                              <text x="260" y="210" fill="#9ca3af" fontSize="7" textAnchor="middle" fontWeight="bold">الزمن (تتابع المنحنى بالثانية)</text>
                              <text x="20" y="105" fill="#9ca3af" fontSize="7" textAnchor="middle" fontWeight="bold" transform="rotate(-90 20 105)">القوة (N)</text>
                            </>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Legends info */}
                    <div className="flex justify-center gap-4 mt-3 text-[10px] font-bold text-gray-400">
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-2 bg-pink-500/20 border border-pink-500 rounded"></span> مرحلة الكبح (Braking)</span>
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-2 bg-cyan-500/20 border border-cyan-500 rounded"></span> مرحلة الدفع (Propulsion)</span>
                      <span className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 border-t border-dashed border-pink-500 inline-block"></span> خط وزن الجسم (BW)</span>
                    </div>

                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-xl bg-black/10">
                    <Activity size={32} className="opacity-30 mb-2 animate-pulse" />
                    <span className="text-xs">الرجاء إدخال البيانات والضغط على زر التحليل للرسم</span>
                  </div>
                )}
              </div>

              {/* Quick stats brief inside visualizer */}
              {ftcResult && (
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-800 text-center font-bold">
                  <div className="bg-black/40 p-2 rounded-xl border border-gray-800">
                    <span className="block text-[9px] text-gray-400">الارتفاع الفعلي</span>
                    <span className="text-base text-orange-400 font-mono">
                      {(ftcResult.jumpHeight * 100).toFixed(1)} <span className="text-[10px] text-gray-500">سم</span>
                    </span>
                    <span className="block text-[8px] text-gray-500 font-mono">
                      ({(ftcResult.jumpHeight * 39.3701).toFixed(1)} بوصة)
                    </span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-xl border border-gray-800">
                    <span className="block text-[9px] text-gray-400">القوة النسبية القصوى</span>
                    <span className="text-base text-cyan-400 font-mono">
                      {ftcResult.relativePeakForce.toFixed(2)} <span className="text-[10px] text-gray-500">BW</span>
                    </span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-xl border border-gray-800">
                    <span className="block text-[9px] text-gray-400">معدل توليد القوة RFD (Early)</span>
                    <span className="text-xs text-amber-400 font-mono mt-1 block">
                      {Math.round(ftcResult.rfd50).toLocaleString()} <span className="text-[9px] text-gray-500">N/s</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ========================================================================= */}
          {/* ================= FTC ATHLETIC ANALYSIS REPORT OUTPUT =================== */}
          {/* ========================================================================= */}
          {ftcResult && (
            <div className="border-t border-gray-800 pt-6 space-y-6 animate-fade-in text-right">
              
              {/* Diagnosis Alert Banner */}
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row items-center gap-4 justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-500/80 block mb-1">التشخيص الحركي والبيوميكانيكي للجسم (FTC Profile Classification)</span>
                  <h4 className="text-xl font-black text-white">{ftcResult.jumperClass}</h4>
                  <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
                    {ftcResult.breakdownAdvice}
                  </p>
                </div>
                {ftcResult.rsi > 0 && (
                  <div className="shrink-0 bg-orange-950/40 border border-orange-500/30 px-4 py-2.5 rounded-xl text-center">
                    <span className="block text-[10px] text-gray-400">مؤشر RSI (القفز والارتداد)</span>
                    <span className="text-2xl font-black text-orange-400 font-mono">{ftcResult.rsi.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Executive Metrics ( المؤشرات التنفيذية ) */}
                <div className="bg-black/25 p-5 rounded-2xl border border-gray-800 space-y-3">
                  <h5 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-800 pb-2">
                    <span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block shadow-[0_0_8px_#f97316]"></span>
                    🎯 المؤشرات التنفيذية (Executive Metrics)
                  </h5>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-gray-300">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 font-bold">
                          <th className="py-2 text-right">المؤشر البيوميكانيكي</th>
                          <th className="py-2 text-center">القيمة المقاسة</th>
                          <th className="py-2 text-left">التقييم الرياضي</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-800/40">
                          <td className="py-2.5 font-bold">ارتفاع الوثبة (Jump Height)</td>
                          <td className="py-2.5 text-center font-mono text-white">
                            {(ftcResult.jumpHeight * 100).toFixed(1)} cm / {(ftcResult.jumpHeight * 39.3701).toFixed(1)}"
                          </td>
                          <td className="py-2.5 text-left text-emerald-400 font-bold">
                            {ftcResult.jumpHeight * 100 > 60 ? 'نخبة (Elite)' : ftcResult.jumpHeight * 100 > 40 ? 'متوسط ممتاز' : 'يحتاج تطوير'}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-800/40">
                          <td className="py-2.5 font-bold">أقصى قوة مطلقة (Peak Force)</td>
                          <td className="py-2.5 text-center font-mono text-white">
                            {Math.round(ftcResult.peakForce)} N
                          </td>
                          <td className="py-2.5 text-left text-gray-400">
                            {Math.round(ftcResult.peakForce)} نيوتن
                          </td>
                        </tr>
                        <tr className="border-b border-gray-800/40">
                          <td className="py-2.5 font-bold">أقصى قوة نسبية (Relative Force)</td>
                          <td className="py-2.5 text-center font-mono text-orange-400 font-bold">
                            {ftcResult.relativePeakForce.toFixed(2)} BW
                          </td>
                          <td className={`py-2.5 text-left font-bold ${ftcResult.relativePeakForce >= 2.5 ? 'text-emerald-400' : 'text-amber-500'}`}>
                            {ftcResult.relativePeakForce >= 2.5 ? 'نخبة (>2.5 BW)' : 'أقل من النخبة'}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-800/40">
                          <td className="py-2.5 font-bold">معدل إنتاج القوة المبكر (RFD 0-50ms)</td>
                          <td className="py-2.5 text-center font-mono text-cyan-400">
                            {Math.round(ftcResult.rfd50).toLocaleString()} N/s
                          </td>
                          <td className={`py-2.5 text-left font-bold ${ftcResult.rfd50 >= 10000 ? 'text-emerald-400' : 'text-amber-500'}`}>
                            {ftcResult.rfd50 >= 10000 ? 'متفجر جداً' : 'انفجار بطيء'}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-800/40">
                          <td className="py-2.5 font-bold">معدل إنتاج القوة المتأخر (RFD 0-200ms)</td>
                          <td className="py-2.5 text-center font-mono text-cyan-400">
                            {Math.round(ftcResult.rfd200).toLocaleString()} N/s
                          </td>
                          <td className="py-2.5 text-left text-gray-400">مرحلة الدفع الكلي</td>
                        </tr>
                        <tr className="border-b border-gray-800/40">
                          <td className="py-2.5 font-bold">الدفع الانقباضي (Concentric Impulse)</td>
                          <td className="py-2.5 text-center font-mono text-white">
                            {ftcResult.concentricImpulse.toFixed(1)} N·s
                          </td>
                          <td className="py-2.5 text-left text-gray-400">مساحة الدفع فوق الصفر</td>
                        </tr>
                        {ftcResult.rsi > 0 && (
                          <tr className="border-b border-gray-800/40">
                            <td className="py-2.5 font-bold">مؤشر القوة التفاعلية (RSI)</td>
                            <td className="py-2.5 text-center font-mono text-orange-400 font-bold">
                              {ftcResult.rsi.toFixed(2)}
                            </td>
                            <td className={`py-2.5 text-left font-bold ${ftcResult.rsi >= 2.0 ? 'text-emerald-400' : 'text-amber-500'}`}>
                              {ftcResult.rsi >= 2.0 ? 'نخبة تفاعلية' : 'تفاعل متوسط'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Phase Breakdown Analysis ( تحليل مراحل القفز ) */}
                <div className="bg-black/25 p-5 rounded-2xl border border-gray-800 space-y-4">
                  <h5 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-800 pb-2">
                    <span className="w-2.5 h-2.5 bg-cyan-500 rounded-full inline-block shadow-[0_0_8px_#06b6d4]"></span>
                    📈 تحليل مراحل القفز (Phase Breakdown Analysis)
                  </h5>

                  <div className="space-y-4 text-xs leading-relaxed text-gray-300">
                    <div>
                      <span className="font-bold text-orange-400 block mb-1">مرحلة الكبح وإيقاف الهبوط (Braking Phase):</span>
                      <p>
                        استغرقت مرحلة كبح الحركة والنزول للأسفل حوالي 
                        <span className="text-white font-mono font-bold mx-1">
                          {Math.round((ftcResult.i_prop_start - ftcResult.i_start) * dt * 1000)}
                        </span> 
                        ملي ثانية، ووصل عمق القرفصاء التمهيدي إلى 
                        <span className="text-white font-mono font-bold mx-1">
                          {ftcResult.squatDepthCm.toFixed(1)}
                        </span>
                        سم. 
                        {ftcResult.squatDepthCm > 35 
                          ? ' هذا العمق الكبير يزيد من زمن الكبح ولكنه يسمح بتخزين طاقة لامرئية إذا كانت عضلات اللاعب تمتلك قوة لامركزية كافية لإيقاف الوزن وإعادة التوجيه.' 
                          : ' هذا العمق الضحل يشير لقفز سريع ومباشر ولكنه يحد من مسافة التسارع الفعلي للجسم للأعلى.'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-cyan-400 block mb-1">مرحلة الدفع والانطلاق (Propulsion Phase):</span>
                      <p>
                        استغرقت مرحلة الدفع الكلي للأعلى 
                        <span className="text-white font-mono font-bold mx-1">
                          {Math.round((ftcResult.i_takeoff - ftcResult.i_prop_start) * dt * 1000)}
                        </span>
                        ملي ثانية. ووصل اللاعب لأقصى قوة دفع له بعد 
                        <span className="text-white font-mono font-bold mx-1">
                          {Math.round(ftcResult.timeToPeakMs)}
                        </span>
                        ملي ثانية من بدء الدفع. كلما قل هذا الزمن، زادت قدرة اللاعب على سرعة الخروج من الأرض (Rate of Acceleration).
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-emerald-400 block mb-1">مقارنة الطيران ومحصلة السرعة (Flight Outcomes):</span>
                      <p>
                        سرعة انطلاق اللاعب لحظة الإقلاع بلغت 
                        <span className="text-white font-mono font-bold mx-1">
                          {ftcResult.velocity[ftcResult.i_takeoff].toFixed(2)}
                        </span>
                        متر/ثانية، مما أنتج تحليقاً هوائياً حراً استمر لمدة 
                        <span className="text-white font-mono font-bold mx-1">
                          {ftcResult.flightTime.toFixed(3)}
                        </span>
                        ثانية.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 3. Red Flags / Biomechanical Flaws ( الملاحظات والعيوب ) */}
                <div className="bg-black/25 p-5 rounded-2xl border border-gray-800 space-y-3">
                  <h5 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-800 pb-2">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block shadow-[0_0_8px_#ef4444]"></span>
                    ⚠️ العيوب والملاحظات البيوميكانيكية (Red Flags)
                  </h5>

                  {ftcResult.redFlags.length > 0 ? (
                    <div className="space-y-3">
                      {ftcResult.redFlags.map((flag, idx) => (
                        <div key={idx} className="flex gap-2.5 bg-red-950/10 border border-red-500/20 p-3 rounded-xl">
                          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                          <div>
                            <span className="block text-xs font-bold text-white">{flag.title}</span>
                            <span className="block text-[11px] text-gray-400 mt-1 leading-relaxed">{flag.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2 bg-emerald-950/10 border border-emerald-500/20 p-4 rounded-xl text-center items-center justify-center text-xs text-emerald-400 font-bold">
                      <CheckCircle size={16} /> لا توجد مؤشرات ضعف حرجة. أداء اللاعب متوازن وممتاز!
                    </div>
                  )}
                </div>

                {/* 4. Training Recommendations ( التوصيات التدريبية ) */}
                <div className="bg-black/25 p-5 rounded-2xl border border-gray-800 space-y-4">
                  <h5 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-gray-800 pb-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block shadow-[0_0_8px_#10b981]"></span>
                    🏋️‍♂️ التوصيات التدريبية المقترحة (Training Recommendations)
                  </h5>

                  <div className="space-y-4">
                    {ftcResult.recommendations.map((rec, idx) => (
                      <div key={idx} className="space-y-2">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block"></span>
                          {rec.title}
                        </span>
                        <div className="grid grid-cols-1 gap-1.5 text-[11px] text-gray-300 bg-black/30 p-2.5 rounded-xl border border-gray-850">
                          {rec.exercises.map((ex, exIdx) => (
                            <span key={exIdx} className="flex items-center gap-1 text-gray-400">
                              • <strong className="text-white font-medium">{ex}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= TAB 2: FORCE-VELOCITY PROFILE (FVP) VIEW ============== */}
      {/* ========================================================================= */}
      {activeSubTab === 'fvp' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
              منحنى القوة والسرعة لقفز متعدد الأوزان (Force-Velocity Profile - Samozino)
            </h3>
            <p className="text-gray-400 text-xs md:text-sm mt-1.5 max-w-xl mx-auto">
              قم بإجراء 4 قفزات بأوزان إضافية مختلفة لتحديد بروفايل القوة والسرعة للاعب بدقة.
            </p>
          </div>

          {/* Metadata selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6 bg-black/20 p-4 rounded-2xl border border-gray-800">
            <div className="space-y-1 text-right">
              <label className="block text-xs text-gray-400 font-bold">فترة الموسم (Season Period):</label>
              <select
                value={seasonPeriod}
                onChange={(e) => setSeasonPeriod(e.target.value)}
                className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-lg p-2 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="off_season">خارج الموسم (Off-Season)</option>
                <option value="in_season">داخل الموسم (In-Season)</option>
                <option value="competition_phase">فترة المنافسات (Competition-Phase)</option>
              </select>
            </div>
            <div className="space-y-1 text-right">
              <label className="block text-xs text-gray-400 font-bold">العمر التدريبي (Training Age):</label>
              <select
                value={trainingAge}
                onChange={(e) => setTrainingAge(e.target.value)}
                className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-lg p-2 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="beginner">مبتدئ / ناشئ (Beginner &lt;1 year)</option>
                <option value="intermediate">متوسط (Intermediate 1-3 years)</option>
                <option value="advanced">متقدم (Advanced &gt;3 years)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8 text-right">
            {jumps.map((jump, index) => (
              <div key={index} className="bg-black/20 p-5 rounded-2xl border border-gray-800 text-center transition-all hover:border-orange-500/50">
                <h4 className="font-bold text-white mb-4 bg-gray-900 py-2 rounded-xl border border-gray-800">
                  قفزة {index + 1}
                </h4>
                
                {/* Weight Telemetry Input */}
                <div className="mb-4 space-y-2 text-right">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">الوزن الإضافي:</span>
                    <span className="text-orange-400 font-mono font-bold bg-orange-950/40 px-2 py-0.5 rounded border border-orange-500/30">{jump.weight} kg</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleJumpChange(index, 'weight', Math.max(0, parseInt(jump.weight || 0) - 5))} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white font-bold flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5" 
                      value={jump.weight || 0} 
                      onChange={(e) => handleJumpChange(index, 'weight', Number(e.target.value))} 
                      className="flex-1 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                    />
                    <button type="button" onClick={() => handleJumpChange(index, 'weight', Math.min(100, parseInt(jump.weight || 0) + 5))} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white font-bold flex items-center justify-center">+</button>
                  </div>
                  <div className="flex gap-1.5 justify-center">
                    {[0, 10, 20, 30, 40].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => handleJumpChange(index, 'weight', w)}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${parseInt(jump.weight || 0) === w ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'}`}
                      >
                        {w}kg
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flight Time Telemetry Input */}
                <div className="space-y-2 text-right">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">زمن الطيران:</span>
                    <span className="text-orange-400 font-mono font-bold bg-orange-950/40 px-2 py-0.5 rounded border border-orange-500/30">{(parseFloat(jump.flightTime) || 0).toFixed(3)} s</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleJumpChange(index, 'flightTime', Math.max(0.2, (parseFloat(jump.flightTime) || 0.5) - 0.01).toFixed(3))} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white font-bold flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="0.200" 
                      max="1.000" 
                      step="0.005" 
                      value={parseFloat(jump.flightTime) || 0.500} 
                      onChange={(e) => handleJumpChange(index, 'flightTime', parseFloat(e.target.value).toFixed(3))} 
                      className="flex-1 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                    />
                    <button type="button" onClick={() => handleJumpChange(index, 'flightTime', Math.min(1.0, (parseFloat(jump.flightTime) || 0.5) + 0.01).toFixed(3))} className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white font-bold flex items-center justify-center">+</button>
                  </div>
                  <div className="flex gap-1.5 justify-center">
                    {[0.4, 0.5, 0.6, 0.7].map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => handleJumpChange(index, 'flightTime', f.toFixed(3))}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${(parseFloat(jump.flightTime) || 0).toFixed(3) === f.toFixed(3) ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'}`}
                      >
                        {f.toFixed(2)}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mb-8">
            <button onClick={handleFVPAnalyze} className="px-14 py-4 btn-orange-gradient rounded-2xl font-black text-xl shadow-lg transition-transform hover:scale-105 active:scale-95">
              رسم منحنى القوة والسرعة
            </button>
          </div>

          {fvpResult && (
            <div className="space-y-6 border-t border-gray-800 pt-6 text-right">
              
              {fvpResult.isDistorted && (
                <div className="p-5 rounded-2xl border border-orange-500/30 bg-orange-950/25 text-orange-400 text-right text-xs leading-relaxed mb-6">
                  <div className="flex items-center gap-2 font-black mb-2 text-sm text-orange-300">
                    <AlertCircle size={18} />
                    <span>⚠️ تنبيه بيوميكانيكي: حدوث انهيار للتنسيق الحركي (Mechanical/Coordination Breakdown)</span>
                  </div>
                  <p>
                    أظهرت نتائج الاختبار علاقة طردية أو مسطحة غير طبيعية في منحنى القوة والسرعة ($Slope \geq 0$). في الأحوال الطبيعية، تنخفض سرعة الارتقاء مع زيادة الحمل الخارجي. حدوث العكس يشير إلى أن اللاعب يواجه <strong>خللاً في التوظيف العصبي العضلي</strong> أو <strong>قصوراً في زوايا الدفع</strong> تحت الأحمال الخفيفة، أو ربما تعمد عدم بذل الجهد الكامل في القفزة الأولى بدون أوزان. تم تفعيل نظام الحماية الرياضي وتجاوز القطع الانحداري التلقائي لرسم النقاط بنجاح دون إيقاف النظام.
                  </p>
                </div>
              )}

              <div className={`p-6 rounded-2xl border shadow-lg text-center ${fvpResult.color}`}>
                 <p className="text-sm font-bold opacity-80 mb-2">التشخيص الميكانيكي (FVP Diagnosis)</p>
                 <h4 className="text-3xl font-black mb-3 text-white">{fvpResult.diagnosis}</h4>
                 <p className="text-sm opacity-90 max-w-xl mx-auto leading-relaxed">
                   💡 {fvpResult.advice}
                 </p>
              </div>

              {/* SVG F-V Curve Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* SVG Curve Plot */}
                <div className="lg:col-span-8 bg-black/30 p-6 rounded-2xl border border-gray-800 shadow-inner flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-gray-300">مقارنة منحنى القوة والسرعة الميكانيكي الحيوي (F-V Curve Plot)</h4>
                    <div className="flex gap-4 text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-orange-400">
                        <span className="w-3.5 h-0.5 bg-orange-500 inline-block"></span> المنحنى الفعلي
                      </span>
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <span className="w-3.5 h-0.5 border-t-2 border-dashed border-cyan-400 inline-block"></span> المنحنى المثالي (Target)
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative h-72 flex items-end">
                    {/* Y-axis Label */}
                    <div className="absolute left-2 top-2 text-[10px] text-gray-500 font-bold vertical-text">القوة (Force - N)</div>
                    <div className="absolute left-12 top-4 bottom-12 w-0.5 bg-gray-700"></div>
                    <span className="absolute left-6 top-4 text-[10px] text-gray-500 font-bold">
                      {Math.max(fvpResult.F0, fvpResult.F0_opt || fvpResult.F0).toFixed(0)}
                    </span>
                    <span className="absolute left-8 bottom-12 text-[10px] text-gray-500 font-bold">0</span>

                    {/* X-axis Label */}
                    <div className="absolute left-12 bottom-12 right-4 h-0.5 bg-gray-700"></div>
                    <div className="absolute right-4 bottom-4 text-[10px] text-gray-500 font-bold">السرعة (Velocity - m/s)</div>
                    <span className="absolute right-12 bottom-14 text-[10px] text-gray-500 font-bold">
                      {Math.max(fvpResult.V0, fvpResult.V0_opt || fvpResult.V0).toFixed(1)}
                    </span>

                    <svg className="absolute left-12 bottom-12" style={{ width: 'calc(100% - 4.5rem)', height: 'calc(100% - 4.5rem)', overflow: 'visible' }}>
                      {/* Grid Lines */}
                      <line x1="0" y1="0" x2="100%" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      
                      {(() => {
                        const maxF_chart = Math.max(fvpResult.F0, fvpResult.F0_opt || fvpResult.F0) * 1.15;
                        const maxV_chart = Math.max(fvpResult.V0, fvpResult.V0_opt || fvpResult.V0) * 1.15;

                        // Actual Curve Coordinates
                        const actX1 = 0;
                        const actY1 = (1 - (fvpResult.F0 / maxF_chart)) * 100;
                        const actX2 = (fvpResult.V0 / maxV_chart) * 100;
                        const actY2 = 100;

                        // Optimal Curve Coordinates
                        const optX1 = 0;
                        const optY1 = (1 - ((fvpResult.F0_opt || fvpResult.F0) / maxF_chart)) * 100;
                        const optX2 = ((fvpResult.V0_opt || fvpResult.V0) / maxV_chart) * 100;
                        const optY2 = 100;

                        return (
                          <>
                            {/* Optimal Target Curve */}
                            <line 
                              x1={`${optX1}%`} 
                              y1={`${optY1}%`} 
                              x2={`${optX2}%`} 
                              y2={`${optY2}%`} 
                              stroke="#06b6d4" 
                              strokeWidth="3" 
                              strokeDasharray="5,5"
                              style={{ filter: 'drop-shadow(0px 0px 4px rgba(6, 182, 212, 0.4))' }}
                            />

                            {/* Actual Curve */}
                            <line 
                              x1={`${actX1}%`} 
                              y1={`${actY1}%`} 
                              x2={`${actX2}%`} 
                              y2={`${actY2}%`} 
                              stroke="#ea580c" 
                              strokeWidth="3.5" 
                              style={{ filter: 'drop-shadow(0px 0px 4px rgba(234, 88, 12, 0.4))' }}
                            />

                            {/* Plotted load points */}
                            {fvpResult.points.map((pt, i) => {
                              const px = (pt.v / maxV_chart) * 100;
                              const py = 100 - (pt.f / maxF_chart) * 100;
                              return (
                                <g key={i}>
                                  <circle 
                                    cx={`${px}%`} 
                                    cy={`${py}%`} 
                                    r="6" 
                                    fill="#f59e0b" 
                                    stroke="#fff" 
                                    strokeWidth="2" 
                                  />
                                  <text 
                                    x={`${px}%`} 
                                    y={`${py - 8}%`} 
                                    fill="#f59e0b" 
                                    fontSize="9" 
                                    fontWeight="bold"
                                    textAnchor="middle"
                                  >
                                    {pt.weight}kg
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Deficit HUD Panel */}
                <div className="lg:col-span-4 bg-black/30 p-6 rounded-2xl border border-gray-800 flex flex-col justify-between text-right">
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-sm text-white border-b border-gray-800 pb-2 flex items-center gap-1.5">
                      📊 مؤشر عجز الفاعلية (Deficit Index)
                    </h4>
                    
                    {/* Deficit Percentage calculation */}
                    {(() => {
                      const fIndex = fvpResult.fvpIndex || 100;
                      let forceDef = 0;
                      let velDef = 0;
                      let statusText = "";
                      let statusDesc = "";

                      if (fIndex < 90) {
                        forceDef = Math.round(100 - fIndex);
                        statusText = "عجز في القوة (Force Deficit)";
                        statusDesc = `اللاعب يعاني من عجز بنسبة ${forceDef}% في إنتاج القوة. يُوصى بالتركيز على تدريبات المقاومة الثقيلة لرفع القوة المطلقة.`;
                      } else if (fIndex > 110) {
                        velDef = Math.round(fIndex - 100);
                        statusText = "عجز في السرعة (Velocity Deficit)";
                        statusDesc = `اللاعب يعاني من عجز بنسبة ${velDef}% في السرعة الحركية. يُوصى بالتركيز على تدريبات البلايومترك الخفيفة وتدريبات السرعة.`;
                      } else {
                        statusText = "ملف متوازن (Well-Balanced)";
                        statusDesc = "اللاعب يمتلك توزيعاً مثالياً ومتوازناً بين القوة والسرعة حركياً.";
                      }

                      return (
                        <div className="space-y-4 text-xs">
                          <div>
                            <span className="text-gray-400 block mb-1">نسبة التوافق مع المنحنى المثالي:</span>
                            <span className="text-base font-black text-white font-mono">{fIndex.toFixed(1)}%</span>
                          </div>

                          {/* Force Deficit bar */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-gray-300">عجز القوة (Force Deficit)</span>
                              <span className="font-mono font-bold text-orange-400">{forceDef}%</span>
                            </div>
                            <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-gray-800">
                              <div 
                                className="bg-gradient-to-r from-orange-600 to-orange-400 h-full transition-all duration-1000"
                                style={{ width: `${forceDef}%` }}
                              />
                            </div>
                          </div>

                          {/* Velocity Deficit bar */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-gray-300">عجز السرعة (Velocity Deficit)</span>
                              <span className="font-mono font-bold text-cyan-400">{velDef}%</span>
                            </div>
                            <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-gray-800">
                              <div 
                                className="bg-gradient-to-r from-cyan-600 to-cyan-400 h-full transition-all duration-1000"
                                style={{ width: `${velDef}%` }}
                              />
                            </div>
                          </div>

                          <div className="bg-black/20 p-3 rounded-xl border border-gray-800 mt-2 space-y-1">
                            <span className="font-black text-cyan-400 block">{statusText}</span>
                            <p className="text-[10px] text-gray-400 leading-relaxed">{statusDesc}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="text-[10px] text-gray-500 leading-relaxed pt-4 border-t border-gray-800/50 mt-4">
                    * يتم احتساب المنحنى المثالي (Target F-V Curve) تلقائياً استناداً إلى نموذج Samozino الميكانيكي الحيوي لضمان أفضل انتقال للقدرة.
                  </div>
                </div>
              </div>

              {/* LaTeX Biomechanical Equations */}
              <div className="glass-panel p-4 rounded-xl border border-cyan-800/20 text-center bg-black/10">
                <span className="block text-xs text-gray-400 mb-2">تقرير المعادلات البيوميكانيكية (LaTeX Report)</span>
                <div className="latex-equations font-mono text-cyan-400 text-xs md:text-sm space-y-1.5" dir="ltr">
                  <div>{"$$F_0 = " + fvpResult.F0.toFixed(1) + " \\text{ N}$$"}</div>
                  <div>{"$$V_0 = " + fvpResult.V0.toFixed(2) + " \\text{ m/s}$$"}</div>
                  <div>{"$$P_{max} = " + fvpResult.Pmax.toFixed(0) + " \\text{ W}$$"}</div>
                </div>
              </div>

              {/* Metric Cards & Speedometer Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center items-center">
                
                {/* Speedometer Gauge card */}
                <div className="bg-[#1f2937]/30 p-4 rounded-2xl border border-orange-500/30 relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="absolute inset-0 bg-orange-600/5"></div>
                  
                  {/* SVG Speedometer Needle Gauge for Velocity V0 */}
                  <div className="relative w-48 h-28 flex flex-col items-center justify-center overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 100 55">
                      <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
                      <path 
                        d="M 15 50 A 35 35 0 0 1 85 50" 
                        fill="none" 
                        stroke="url(#fvpGaugeGradient)" 
                        strokeWidth="6" 
                        strokeLinecap="round"
                        strokeDasharray={110}
                        strokeDashoffset={110 - (110 * Math.min(4.0, fvpResult.V0) / 4.0)}
                        style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                      />
                      <path d="M 46 16 A 35 35 0 0 1 54 16" fill="none" stroke="#10b981" strokeWidth="6" />
                      
                      {(() => {
                        const angle = -180 + (Math.min(4.0, fvpResult.V0) / 4.0) * 180;
                        const fillRadian = (angle * Math.PI) / 180;
                        const x2 = 50 + 30 * Math.cos(fillRadian);
                        const y2 = 50 + 30 * Math.sin(fillRadian);
                        return (
                          <line x1="50" y1="50" x2={x2} y2={y2} stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                        );
                      })()}
                      <circle cx="50" cy="50" r="3" fill="#f59e0b" />
                      <defs>
                        <linearGradient id="fvpGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ea580c" />
                          <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute bottom-1 text-center">
                      <span className="text-[9px] text-gray-400 font-bold">السرعة القصوى (V0)</span>
                      <div className="text-base font-black text-white font-mono"><AnimatedCounter value={fvpResult.V0} decimals={2} /> m/s</div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1f2937]/30 p-5 rounded-2xl border border-gray-800 relative">
                  <span className="block text-xs text-gray-400 mb-2">أقصى قوة نظرية (F0)</span>
                  <span className="text-3xl font-black text-white"><AnimatedCounter value={fvpResult.F0} decimals={0} /> <span className="text-xs text-gray-500 font-bold">N</span></span>
                  {activePlayer?.weight_kg && (
                    <span className="block text-[10px] text-gray-500 mt-1 font-mono">({(fvpResult.F0 / activePlayer.weight_kg).toFixed(1)} N/kg)</span>
                  )}
                </div>
                
                <div className="bg-[#1f2937]/30 p-5 rounded-2xl border border-gray-800 relative">
                  <span className="block text-xs text-gray-400 mb-2">أقصى سرعة نظرية (V0)</span>
                  <span className="text-3xl font-black text-white"><AnimatedCounter value={fvpResult.V0} decimals={2} /> <span className="text-xs text-gray-500 font-bold">m/s</span></span>
                </div>

                <div className="bg-[#1f2937]/30 p-5 rounded-2xl border border-gray-800 relative">
                  <span className="block text-xs text-gray-400 mb-2">ذروة القدرة القصوى (Pmax)</span>
                  <span className="text-3xl font-black text-orange-500"><AnimatedCounter value={fvpResult.Pmax} decimals={0} /> <span className="text-xs text-orange-500/50 font-bold">W</span></span>
                  {activePlayer?.weight_kg && (
                    <span className="block text-[10px] text-orange-500/50 mt-1 font-mono">({(fvpResult.Pmax / activePlayer.weight_kg).toFixed(1)} W/kg)</span>
                  )}
                </div>
              </div>


            </div>
          )}
        </div>
      )}

    </div>
  );
}