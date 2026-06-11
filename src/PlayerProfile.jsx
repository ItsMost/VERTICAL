import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, TrendingUp, Clock, Zap, ArrowUpCircle, AlertCircle, BookOpen, X, ShieldAlert, Award, User, Scale, Calendar, Trophy, FileText, ChevronLeft, Target, Plus, Trash2, Edit3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './supabaseClient';

export default function PlayerProfile({ activePlayer, playerHistory, onHistoryChange }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, biomechanics, critique, history
  const [showBenchmarks, setShowBenchmarks] = useState(false);

  // Manual entry modal states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isEditingMeasurement, setIsEditingMeasurement] = useState(false);
  const [editingJumpId, setEditingJumpId] = useState(null);

  // Print language selection states
  const [printLang, setPrintLang] = useState('ar');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handlePrintReport = (lang) => {
    setPrintLang(lang);
    setIsPrintModalOpen(false);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const [manualForm, setManualForm] = useState({
    testType: 'sj_no_arms',
    created_at: new Date().toISOString().substring(0, 10),
    jumpHeightCm: '',
    flightTimeSec: '',
    contactTimeSec: '',
    rsiScore: '',
    meanForceNewtons: '',
    peakPowerWatts: ''
  });

  const handleManualFormChange = (field, value) => {
    let updated = { ...manualForm, [field]: value };
    const weight = parseFloat(activePlayer?.weight_kg) || 72;
    const legLength = parseFloat(activePlayer?.leg_length_m) || 1.0;

    const calcFlightTime = (heightCm) => {
      return Math.sqrt((8 * (parseFloat(heightCm) / 100)) / 9.81);
    };

    const calcHeight = (flightSec) => {
      return 1.22625 * Math.pow(parseFloat(flightSec), 2) * 100;
    };

    if (field === 'jumpHeightCm') {
      const hVal = parseFloat(value);
      if (hVal > 0) {
        updated.flightTimeSec = calcFlightTime(hVal).toFixed(3);
        const peakPower = 61.9 * hVal + 36.0 * weight - 1822;
        updated.peakPowerWatts = peakPower > 0 ? peakPower.toFixed(0) : '0';

        const pushDistance = legLength * 0.45;
        const takeoffForce = weight * 9.81 * ((hVal / 100) / pushDistance + 1);
        updated.meanForceNewtons = takeoffForce > 0 ? takeoffForce.toFixed(0) : '0';

        if (updated.testType === 'rsi' && parseFloat(updated.contactTimeSec) > 0) {
          updated.rsiScore = ((hVal / 100) / parseFloat(updated.contactTimeSec)).toFixed(2);
        }
      } else {
        updated.flightTimeSec = '';
        updated.peakPowerWatts = '';
        updated.meanForceNewtons = '';
        updated.rsiScore = '';
      }
    } else if (field === 'flightTimeSec') {
      const ftVal = parseFloat(value);
      if (ftVal > 0) {
        const height = calcHeight(ftVal);
        updated.jumpHeightCm = height.toFixed(1);

        const peakPower = 61.9 * height + 36.0 * weight - 1822;
        updated.peakPowerWatts = peakPower > 0 ? peakPower.toFixed(0) : '0';

        const pushDistance = legLength * 0.45;
        const takeoffForce = weight * 9.81 * ((height / 100) / pushDistance + 1);
        updated.meanForceNewtons = takeoffForce > 0 ? takeoffForce.toFixed(0) : '0';

        if (updated.testType === 'rsi' && parseFloat(updated.contactTimeSec) > 0) {
          updated.rsiScore = ((height / 100) / parseFloat(updated.contactTimeSec)).toFixed(2);
        }
      } else {
        updated.jumpHeightCm = '';
        updated.peakPowerWatts = '';
        updated.meanForceNewtons = '';
        updated.rsiScore = '';
      }
    } else if (field === 'contactTimeSec') {
      const ctVal = parseFloat(value);
      const hVal = parseFloat(updated.jumpHeightCm);
      if (ctVal > 0 && hVal > 0) {
        updated.rsiScore = ((hVal / 100) / ctVal).toFixed(2);
      } else {
        updated.rsiScore = '';
      }
    } else if (field === 'testType') {
      if (value !== 'rsi') {
        updated.contactTimeSec = '';
        updated.rsiScore = '';
      }
    }

    setManualForm(updated);
  };

  const handleOpenManualEntryModal = (jump = null) => {
    if (jump) {
      setIsEditingMeasurement(true);
      setEditingJumpId(jump.id);
      setManualForm({
        testType: jump.test_type,
        created_at: new Date(jump.created_at).toISOString().substring(0, 10),
        jumpHeightCm: jump.jump_height_cm,
        flightTimeSec: jump.flight_time_sec,
        contactTimeSec: jump.contact_time_sec || '',
        rsiScore: jump.rsi_score || '',
        meanForceNewtons: jump.mean_force_newtons || '',
        peakPowerWatts: jump.peak_power_watts || ''
      });
    } else {
      setIsEditingMeasurement(false);
      setEditingJumpId(null);
      setManualForm({
        testType: 'sj_no_arms',
        created_at: new Date().toISOString().substring(0, 10),
        jumpHeightCm: '',
        flightTimeSec: '',
        contactTimeSec: '',
        rsiScore: '',
        meanForceNewtons: '',
        peakPowerWatts: ''
      });
    }
    setIsManualModalOpen(true);
  };

  const handleSaveManualEntry = async (e) => {
    e.preventDefault();
    if (!activePlayer) return;

    const record = {
      player_id: activePlayer.id,
      test_type: manualForm.testType,
      created_at: new Date(manualForm.created_at).toISOString(),
      jump_height_cm: parseFloat(manualForm.jumpHeightCm) || 0,
      flight_time_sec: parseFloat(manualForm.flightTimeSec) || 0,
      contact_time_sec: manualForm.testType === 'rsi' ? parseFloat(manualForm.contactTimeSec) || null : null,
      rsi_score: manualForm.testType === 'rsi' ? parseFloat(manualForm.rsiScore) || null : null,
      peak_power_watts: parseFloat(manualForm.peakPowerWatts) || 0,
      mean_force_newtons: parseFloat(manualForm.meanForceNewtons) || 0,
      takeoff_velocity_ms: Math.sqrt(2 * 9.81 * (parseFloat(manualForm.jumpHeightCm) / 100)) || 0
    };

    if (isEditingMeasurement && editingJumpId) {
      const { data, error } = await supabase
        .from('lab_jump_measurements')
        .update(record)
        .eq('id', editingJumpId)
        .select();

      if (!error && data) {
        alert("✅ تم تحديث القياس بنجاح!");
        const updatedHistory = playerHistory.map(j => j.id === editingJumpId ? data[0] : j);
        if (onHistoryChange) onHistoryChange(updatedHistory);
        setIsManualModalOpen(false);
      } else {
        alert("خطأ في تحديث القياس: " + error.message);
      }
    } else {
      const { data, error } = await supabase
        .from('lab_jump_measurements')
        .insert([record])
        .select();

      if (!error && data) {
        alert("✅ تم إضافة القياس بنجاح!");
        const updatedHistory = [...playerHistory, data[0]];
        if (onHistoryChange) onHistoryChange(updatedHistory);
        setIsManualModalOpen(false);
      } else {
        alert("خطأ في إضافة القياس: " + error.message);
      }
    }
  };

  const handleDeleteJump = async (id) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا القياس نهائياً؟")) return;

    const { error } = await supabase
      .from('lab_jump_measurements')
      .delete()
      .eq('id', id);

    if (!error) {
      alert("✅ تم حذف القياس بنجاح!");
      const updatedHistory = playerHistory.filter(j => j.id !== id);
      if (onHistoryChange) onHistoryChange(updatedHistory);
    } else {
      alert("خطأ في حذف القياس: " + error.message);
    }
  };

  if (!activePlayer) return null;

  const latestJump = playerHistory && playerHistory.length > 0 ? playerHistory[playerHistory.length - 1] : null;

  // Age calculation
  const currentYear = new Date().getFullYear();
  const birthYear = activePlayer.date_of_birth ? parseInt(activePlayer.date_of_birth.substring(0, 4)) : currentYear;
  const age = currentYear - birthYear;

  // Load physical parameters from localStorage
  const playerHeight = localStorage.getItem(`player_height_${activePlayer.id}`) || '—';
  const playerStandingReach = localStorage.getItem(`standing_reach_${activePlayer.id}`) || '—';
  const standingReachNum = parseFloat(playerStandingReach);

  // Dynamic Benchmarking Engine
  const evaluateMetric = (type, value) => {
    if (!value || isNaN(value)) return { text: 'غير متوفر', color: 'text-gray-400', bg: 'bg-gray-700', progress: 0, range: '' };

    const isFemale = activePlayer.gender === 'female';
    const isYouth = age < 17;
    const youthFactor = isYouth ? 0.85 : 1.0;

    if (type === 'jump_in') {
      let elite = (isFemale ? 26 : 34) * youthFactor;
      let excellent = (isFemale ? 22 : 30) * youthFactor;
      let good = (isFemale ? 18 : 26) * youthFactor;
      let fair = (isFemale ? 15 : 22) * youthFactor;

      if (value < fair) return { text: 'تحت المتوسط ⚠️', color: 'text-red-400', bg: '#ef4444', progress: 25, range: `المعدل الجيد: +${good.toFixed(1)}"` };
      if (value < good) return { text: 'مقبول ⚡', color: 'text-orange-400', bg: '#f97316', progress: 45, range: `المعدل الجيد: +${good.toFixed(1)}"` };
      if (value < excellent) return { text: 'جيد ⭐', color: 'text-teal-400', bg: '#14b8a6', progress: 65, range: `الممتاز: +${excellent.toFixed(1)}"` };
      if (value < elite) return { text: 'ممتاز 🏆', color: 'text-emerald-400', bg: '#10b981', progress: 85, range: `النخبة: +${elite.toFixed(1)}"` };
      return { text: 'نخبة أولمبية 👑', color: 'text-cyan-400', bg: '#06b6d4', progress: 100, range: `أعلى من ${elite.toFixed(1)}"` };
    }
    
    if (type === 'flight_time') {
      let elite = (isFemale ? 0.65 : 0.75) * youthFactor;
      let excellent = (isFemale ? 0.58 : 0.68) * youthFactor;
      let good = (isFemale ? 0.52 : 0.60) * youthFactor;
      
      if (value < good) return { text: 'تلامس بطيء', color: 'text-red-400', bg: '#ef4444', progress: 40, range: `الهدف: +${excellent.toFixed(2)}s` };
      if (value < excellent) return { text: 'جيد ⚡', color: 'text-teal-400', bg: '#14b8a6', progress: 65, range: `الهدف: +${excellent.toFixed(2)}s` };
      if (value < elite) return { text: 'ممتاز ⭐', color: 'text-emerald-400', bg: '#10b981', progress: 85, range: `النخبة: +${elite.toFixed(2)}s` };
      return { text: 'تحليق نخبة 👑', color: 'text-cyan-400', bg: '#06b6d4', progress: 100, range: `أطول من ${elite.toFixed(2)}s` };
    }

    if (type === 'relative_power') {
      let elite = (isFemale ? 52 : 65) * youthFactor;
      let excellent = (isFemale ? 45 : 55) * youthFactor;
      let good = (isFemale ? 38 : 45) * youthFactor;

      if (value < good) return { text: 'قدرة منخفضة', color: 'text-red-400', bg: '#ef4444', progress: 30, range: `المعدل الجيد: +${good.toFixed(1)} W/kg` };
      if (value < excellent) return { text: 'جيد ⚡', color: 'text-teal-400', bg: '#14b8a6', progress: 60, range: `المعدل الممتاز: +${excellent.toFixed(1)} W/kg` };
      if (value < elite) return { text: 'ممتاز ⭐', color: 'text-emerald-400', bg: '#10b981', progress: 85, range: `النخبة: +${elite.toFixed(1)} W/kg` };
      return { text: 'قدرة متفجرة 👑', color: 'text-cyan-400', bg: '#06b6d4', progress: 100, range: `أعلى من ${elite.toFixed(1)} W/kg` };
    }

    if (type === 'rsi') {
      let elite = 2.5;
      let excellent = 2.0;
      let good = 1.5;
      let fair = 1.0;

      if (value < fair) return { text: 'صلابة منخفضة ⚠️', color: 'text-red-400', bg: '#ef4444', progress: 25, range: `المعدل الجيد: +${good.toFixed(1)}` };
      if (value < good) return { text: 'تفاعل مقبول ⚡', color: 'text-orange-400', bg: '#f97316', progress: 45, range: `المعدل الجيد: +${good.toFixed(1)}` };
      if (value < excellent) return { text: 'تفاعل جيد ⭐', color: 'text-teal-400', bg: '#14b8a6', progress: 65, range: `الممتاز: +${excellent.toFixed(1)}` };
      if (value < elite) return { text: 'ممتاز 🏆', color: 'text-emerald-400', bg: '#10b981', progress: 85, range: `النخبة: +${elite.toFixed(1)}` };
      return { text: 'نخبة تفاعلية 👑', color: 'text-cyan-400', bg: '#06b6d4', progress: 100, range: `أعلى من ${elite.toFixed(1)}` };
    }

    return { text: '', color: '', bg: '', progress: 0, range: '' };
  };

  const chartData = playerHistory
    .filter(j => j.test_type === 'standard' || j.test_type === 'rsi')
    .map((jump, index) => ({
      name: `T${index + 1}`,
      heightInches: parseFloat((jump.jump_height_cm * 0.393701).toFixed(1)),
      heightCm: parseFloat(jump.jump_height_cm),
      date: new Date(jump.created_at).toLocaleDateString('ar-EG')
    }));

  const heightCm = latestJump ? parseFloat(latestJump.jump_height_cm) : 0;
  const heightInches = parseFloat((heightCm * 0.393701).toFixed(1));
  const flightTime = latestJump ? parseFloat(latestJump.flight_time_sec) : 0;
  const velocity = latestJump ? parseFloat(latestJump.takeoff_velocity_ms) : 0;
  const peakPower = latestJump ? parseFloat(latestJump.peak_power_watts) : 0;
  const meanPower = latestJump ? parseFloat(latestJump.mean_power_watts) : 0;
  const relativePower = activePlayer.weight_kg > 0 ? parseFloat((peakPower / activePlayer.weight_kg).toFixed(1)) : 0;

  const evalHeight = evaluateMetric('jump_in', heightInches);
  const evalFlight = evaluateMetric('flight_time', flightTime);
  const evalPower = evaluateMetric('relative_power', relativePower);

  // Sayers & Harman biomechanical models
  const mass = activePlayer.weight_kg;
  const sayersPeak = 60.7 * heightCm + 45.3 * mass - 2055;
  const harmanPeak = 61.9 * heightCm + 36.0 * mass - 1822;
  const harmanMean = 21.2 * heightCm + 23.0 * mass - 1393;

  // Max touch reach (Standing reach + jump height)
  const maxReachCmj = (standingReachNum && heightCm) ? (standingReachNum + heightCm).toFixed(0) : null;
  
  // Calculate average of history to check performance trend
  const cmjHistory = playerHistory.filter(j => j.test_type === 'standard');
  const avgHistoryCm = cmjHistory.length > 1 
    ? cmjHistory.slice(0, -1).reduce((sum, j) => sum + parseFloat(j.jump_height_cm), 0) / (cmjHistory.length - 1)
    : heightCm;
  const trendPct = heightCm - avgHistoryCm;

  const maxRsi = playerHistory ? playerHistory.reduce((max, j) => {
    const val = parseFloat(j.rsi_score) || 0;
    return val > max ? val : max;
  }, 0) : 0;

  const latestRsiJump = playerHistory ? playerHistory.filter(j => j.test_type === 'rsi').pop() : null;
  const latestRsiVal = latestRsiJump ? parseFloat(latestRsiJump.rsi_score) : 0;
  const evalRsi = evaluateMetric('rsi', latestRsiVal || maxRsi);

  // Biomechanical unified diagnostics variables
  const getLatestTestHeight = (type) => {
    const list = playerHistory.filter(j => j.test_type === type);
    return list.length > 0 ? parseFloat(list[list.length - 1].jump_height_cm) : 0;
  };

  const getLatestTestRsi = () => {
    const list = playerHistory.filter(j => j.test_type === 'rsi');
    return list.length > 0 ? parseFloat(list[list.length - 1].rsi_score) : 0;
  };

  const sjNoArms = getLatestTestHeight('sj_no_arms');
  const cmjNoArms = getLatestTestHeight('cmj_no_arms');
  const sjArms = getLatestTestHeight('sj_arms');
  const cmjArms = getLatestTestHeight('cmj_arms');
  const approachJump = getLatestTestHeight('approach');
  const latestRsi = getLatestTestRsi() || latestRsiVal || maxRsi;

  const eur = sjNoArms > 0 ? cmjNoArms / sjNoArms : 0;
  const armSwing = cmjNoArms > 0 ? ((cmjArms - cmjNoArms) / cmjNoArms) * 100 : 0;
  const velocityConversion = cmjArms > 0 ? ((approachJump - cmjArms) / cmjArms) * 100 : 0;

  const generateUnifiedDiagnostic = () => {
    if (!sjNoArms && !cmjNoArms && !sjArms && !cmjArms && !approachJump) {
      return "يرجى تسجيل نتائج الاختبارات الخمسة المحددة (Squat Jump و CMJ مع وبدون يدين و Approach Jump) للحصول على تقرير تشخيصي متكامل.";
    }

    let report = "";
    
    // Tendons & Ankle stiffness
    if (eur > 0 && eur < 1.05) {
      report += "🔴 يعاني اللاعب من عجز واضح في مطاطية الأوتار واستغلال الدورة المطاطية الانقباضية (Tendon Elastic Deficit)؛ حيث أن ارتفاع قفزته مع الهبوط المتتابع لا يزيد عن قفزة البدء من الثبات. يُنصح بالتركيز الفوري على تدريبات البلايومترك السريع (Fast SSC) مثل الحجل السريع وقفز الحواجز المنخفضة لبناء طاقة ارتداد الكاحل.\n\n";
    } else if (eur > 1.15) {
      report += "🟢 يمتلك اللاعب قدرة مطاطية ممتازة في الأوتار، ولكنه يعاني من نقص في القوة العضلية الانقباضية الصرفة (Concentric Force Deficit)؛ قفزات الثبات لديه ضعيفة مقارنة بالقفز الارتدادي. يُنصح بشدة بإدخال تدريبات القوة القصوى للأرجل بوزن ثقيل (>80% 1RM) مثل القرفصاء الخلفي والرفعة المميتة لإنشاء قاعدة قوة ثابتة.\n\n";
    } else if (eur >= 1.05 && eur <= 1.15) {
      report += "✨ يُظهر اللاعب توازناً ممتازاً في الكفاءة المطاطية (EUR)؛ الأوتار تعمل بانسجام تام مع ألياف العضلات الانقباضية لاسترداد وتخزين الطاقة.\n\n";
    }

    // Arm coordination
    if (cmjNoArms > 0 && cmjArms > 0) {
      if (armSwing < 10) {
        report += "⚠️ يُسجل اللاعب مساهمة ضعيفة لحركة الذراعين (<10%)؛ هناك غياب واضح للتنسيق الحركي بين الأطراف العلوية والسفلية (Poor Arm-Leg Coordination) أو ضعف في عضلات الكتف والظهر. يجب التركيز على تكنيك أرجحة الذراعين وتطوير سرعة انقباض الجزء العلوي من الجسم.\n\n";
      } else if (armSwing > 15) {
        report += "🔵 يستعين اللاعب بأرجحة الذراعين بنسبة عالية (>15%) للتعويض عن ضعف نسبي في عضلات الأرجل؛ يعتمد بشكل أساسي على الدفع الحركي للجزء العلوي. يُنصح بتدريبات تقوية الجزء السفلي المنفصلة.\n\n";
      } else {
        report += "✨ أرجحة الذراعين ومساهمتها الحركية تقع في النسبة الرياضية المثالية (10% - 15%)، مما يعكس توافقاً عصبياً عضلياً رائعاً.\n\n";
      }
    }

    // Speed / Velocity conversion
    if (cmjArms > 0 && approachJump > 0) {
      if (velocityConversion < 10) {
        report += "🔴 يُعاني اللاعب من عجز في التحويل الأفقي للعمودي (Velocity/Conversion Deficit)؛ لا يمكنه الاستفادة من سرعة الجري والاقتراب لزيادة ارتفاع قفزته. يتطلب ذلك تمارين تحسين الخطوة قبل الأخيرة (Penultimate Step) والارتقاء الأفقي السريع، وتدريبات الحجل والوثب الأفقي الديناميكي.\n\n";
      } else {
        report += "✨ تحويل السرعة الأفقية إلى عمودية في الاقتراب يقع في النطاق المثالي الممتاز (+10%)، مما يعني استغلالاً ميكانيكياً ممتازاً لقوة الاندفاع الحركي.\n\n";
      }
    }

    // Drop Jump RSI status
    if (latestRsi > 0) {
      if (latestRsi < 1.5) {
        report += "⚠️ مؤشر القوة الارتدادية (RSI) منخفض؛ يعكس ضعفاً في صلابة المفاصل (Ankle Stiffness) وزمن تلامس طويل مع الأرض. يحتاج اللاعب لتدريبات قفز بلايومترك هبوطي (Drop Jumps) بارتفاعات منخفضة (20-30 سم) لتقصير زمن التلامس.\n\n";
      } else if (latestRsi > 2.2) {
        report += "👑 مؤشر القوة التفاعلية (RSI) ممتاز؛ يعكس مستويات نخبة في صلابة الأوتار وقدرة انفجارية عالية وسرعة استجابة عصبية عضلية مذهلة.\n\n";
      }
    }

    return report;
  };

  const generateUnifiedDiagnosticEN = () => {
    if (!sjNoArms && !cmjNoArms && !sjArms && !cmjArms && !approachJump) {
      return "Please log all 5 vertical jump tests (Squat Jump and CMJ with & without arms, and Approach Jump) to generate an integrated biomechanical report.";
    }

    let report = "";
    
    // Tendons & Ankle stiffness
    if (eur > 0 && eur < 1.05) {
      report += "🔴 The athlete exhibits a Tendon Elastic Deficit; CMJ height does not exceed SJ height. Focus on fast SSC plyometrics (e.g., depth jumps, fast pogo jumps) to increase tendon stiffness and elastic recoil.\n\n";
    } else if (eur > 1.15) {
      report += "🟢 The athlete possesses excellent tendon elasticity but has a Concentric Force Deficit. SJ is weak compared to rebound jumps. Focus on high-intensity lower-body strength training (>80% 1RM squats, deadlifts) to build force output.\n\n";
    } else if (eur >= 1.05 && eur <= 1.15) {
      report += "✨ The athlete shows an optimal Elastic Utilization Ratio (EUR). The tendon system works in perfect harmony with concentric muscle fibers to store and release energy.\n\n";
    }

    // Arm coordination
    if (cmjNoArms > 0 && cmjArms > 0) {
      if (armSwing < 10) {
        report += "⚠️ Weak arm swing contribution (<10%) indicating poor upper-lower body motor coordination. Focus on arm swing mechanics, timing, and shoulder power.\n\n";
      } else if (armSwing > 15) {
        report += "🔵 High arm swing contribution (>15%), suggesting the athlete relies heavily on upper body momentum to compensate for relative lower body strength deficits. Focus on lower body strength development.\n\n";
      } else {
        report += "✨ Arm swing contribution is in the optimal range (10% - 15%), showing great neuromuscular coordination.\n\n";
      }
    }

    // Speed / Velocity conversion
    if (cmjArms > 0 && approachJump > 0) {
      if (velocityConversion < 10) {
        report += "🔴 Velocity Conversion Deficit (<10%). The athlete fails to transfer horizontal approach speed into vertical jump height. Emphasize penultimate step mechanics, horizontal bounds, and rapid takeoff drills.\n\n";
      } else {
        report += "✨ Velocity conversion is excellent (+10%), representing efficient transfer of horizontal kinetic momentum to vertical lift.\n\n";
      }
    }

    // Drop Jump RSI status
    if (latestRsi > 0) {
      if (latestRsi < 1.5) {
        report += "⚠️ Reactive Strength Index (RSI) is low, indicating long ground contact times and poor ankle stiffness. Implement depth jumps from low box heights (20-30 cm) focusing on short contact times.\n\n";
      } else if (latestRsi > 2.2) {
        report += "👑 Reactive Strength Index (RSI) is elite, showing high ankle stiffness, explosive tendon response, and excellent reactive capacity.\n\n";
      }
    }

    return report;
  };

  const unifiedDiagnosticText = generateUnifiedDiagnostic();

  // Calculate overall rating (Biomechanical Score)
  const overallRating = maxRsi > 0 
    ? Math.round((evalHeight.progress + evalFlight.progress + evalPower.progress + evalRsi.progress) / 4)
    : Math.round((evalHeight.progress + evalFlight.progress + evalPower.progress) / 3);

  const tabs = [
    { id: 'overview', name: 'الملخص الحركي', icon: Trophy },
    { id: 'biomechanics', name: 'النماذج الحركية والقدرة', icon: Zap },
    { id: 'critique', name: 'التشخيص ونقاط التطوير', icon: Target },
    { id: 'history', name: 'سجل القياسات الكامل', icon: FileText }
  ];

  const [selectedMetric, setSelectedMetric] = useState(null);

  return (
    <div className="space-y-6 text-right relative" style={{ direction: "rtl" }}>
      
      {/* Inject custom printable CSS styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Hide screen-only components */
          header, nav, .floating-dock, button, .tabs-container, .screen-only {
            display: none !important;
          }
          
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Cairo', sans-serif !important;
          }

          /* Show print report and format beautifully */
          .print-report-sheet {
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 30px !important;
            border: 2px solid #000000 !important;
            border-radius: 12px !important;
          }

          .print-header {
            border-bottom: 3px double #000000 !important;
            padding-bottom: 15px !important;
            margin-bottom: 25px !important;
          }
          
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }

          .print-table th, .print-table td {
            border: 1px solid #999999 !important;
            padding: 8px !important;
            text-align: center !important;
          }

          .print-table th {
            background-color: #f3f4f6 !important;
            color: #000000 !important;
          }

          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }
        }
      `}} />

      {/* ======================================================== */}
      {/* SCREEN VIEW (HIDDEN ON PRINT)                           */}
      {/* ======================================================== */}
      <div className="screen-only space-y-6">
        
        {/* Modern Athlete Passport Header */}
        <div className="glass-panel p-6 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-6 relative overflow-hidden transition-all duration-300">
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center gap-5 z-10">
            {/* Athlete Initial Badge */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white text-3xl font-black shadow-[0_0_20px_rgba(6,182,212,0.35)] border border-cyan-400/30 font-mono">
              {activePlayer.full_name ? activePlayer.full_name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'P'}
            </div>
            
            <div className="text-center sm:text-right">
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mb-1.5">
                <h2 className="text-3xl font-black text-white leading-none">{activePlayer.full_name}</h2>
                {overallRating >= 85 ? (
                  <span className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] px-2.5 py-1 rounded-xl font-black flex items-center gap-1">
                    <Award size={12} /> تصنيف النخبة
                  </span>
                ) : overallRating >= 70 ? (
                  <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-1 rounded-xl font-black flex items-center gap-1">
                    <Award size={12} /> تصنيف ممتاز
                  </span>
                ) : (
                  <span className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-[10px] px-2.5 py-1 rounded-xl font-black flex items-center gap-1">
                    <Award size={12} /> تصنيف متوسط
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs font-bold">
                مستوى القياس المعياري لـ {activePlayer.gender === 'female' ? 'السيدات' : 'الرجال'} | {age} عاماً | لاعب منتخب جمهورية مصر العربية 🇪🇬
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 z-10 shrink-0">
            <button onClick={() => setShowBenchmarks(true)} className="px-4 py-3 bg-slate-900/80 hover:bg-slate-800 text-gray-300 border border-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs cursor-pointer shadow-md">
              <BookOpen size={14} className="text-cyan-400" /> الجداول المعيارية
            </button>
             <button onClick={() => setIsPrintModalOpen(true)} className="px-5 py-3 btn-orange-gradient rounded-xl font-black flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] text-xs cursor-pointer shadow-lg">
              <Download size={14} /> تصدير تقرير PDF
            </button>
          </div>
        </div>

        {/* Physical Attributes Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#111827]/40 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0"><Scale size={18} /></div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block mb-0.5">الوزن الحالي</span>
              <span className="text-sm font-black text-white font-mono">{activePlayer.weight_kg} <span className="text-[10px] text-gray-500">kg</span></span>
            </div>
          </div>
          <div className="bg-[#111827]/40 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0"><Calendar size={18} /></div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block mb-0.5">العمر الحقيقي</span>
              <span className="text-sm font-black text-white font-mono">{age} <span className="text-[10px] text-gray-500">سنة</span></span>
            </div>
          </div>
          <div className="bg-[#111827]/40 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0"><User size={18} /></div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block mb-0.5">طول القامة</span>
              <span className="text-sm font-black text-white font-mono">{playerHeight} <span className="text-[10px] text-gray-500">cm</span></span>
            </div>
          </div>
          <div className="bg-[#111827]/40 border border-gray-800/80 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0"><Target size={18} /></div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold block mb-0.5">الوصول من الثبات</span>
              <span className="text-sm font-black text-white font-mono">{playerStandingReach} <span className="text-[10px] text-gray-500">cm</span></span>
            </div>
          </div>
        </div>

        {/* Tab Selection Header */}
        <div className="tabs-container flex border-b border-gray-800/80 bg-[#111827]/25 p-1 rounded-2xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer
                  ${isActive 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 shadow-md scale-[1.01]' 
                    : 'text-gray-400 hover:text-white'}`}
              >
                <Icon size={16} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        {!latestJump ? (
          <div className="glass-panel p-16 text-center border border-gray-800/60 shadow-xl rounded-3xl flex flex-col items-center justify-center">
            <AlertCircle size={56} className="text-yellow-500 mb-4 opacity-40 animate-pulse" />
            <h3 className="text-xl font-bold text-white mb-2">لا توجد قفزات مسجلة حتى الآن</h3>
            <p className="text-gray-400 text-xs max-w-sm mx-auto leading-relaxed">
              قم بإجراء قياسات حركية أو مؤشر RSI للاعب لتوليد التقارير الميكانيكية المعيارية هنا.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                {/* Visual Cockpit Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Radial Bio-Score Ring Card */}
                  <div className="glass-panel p-6 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
                    <h3 className="text-sm font-bold text-gray-400 mb-6">الكفاءة البيوميكانيكية العامة</h3>
                    
                    <div className="relative w-36 h-36 flex items-center justify-center bg-black/10 rounded-full border border-gray-800/30 mb-6">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="42" 
                          fill="none" 
                          stroke="url(#radialBioGrad)" 
                          strokeWidth="6" 
                          strokeDasharray="263.89"
                          strokeDashoffset={263.89 - (263.89 * overallRating) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="radialBioGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#14b8a6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                        <span className="text-3xl font-black text-white font-mono leading-none">{overallRating}%</span>
                        <span className="text-[9px] text-gray-500 font-extrabold uppercase mt-1">BIO GRADE</span>
                      </div>
                    </div>

                    <p className={`text-sm font-extrabold mb-1.5 ${evalHeight.color}`}>{evalHeight.text}</p>
                    <p className="text-[10px] text-gray-450 leading-relaxed max-w-[200px]">
                      مستوى اللياقة الميكانيكية للارتقاء بناءً على وزن اللاعب وزمن الطيران.
                    </p>
                  </div>

                  {/* Core Metric Visual Cards */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Gauge Card: Jump Height */}
                    <div 
                      onClick={() => setSelectedMetric({
                        title: 'الارتقاء الأقصى (CMJ Height)',
                        value: `${heightInches}" (${heightCm} cm)`,
                        rating: evalHeight.text,
                        ratingColor: evalHeight.color,
                        desc: 'يقيس الارتفاع العمودي الأقصى لمركز ثقل الجسم خلال الوثبة العمودية من الثبات مع أرجحة ذراعين. وهو المعيار الأساسي للقدرة الانفجارية للأطراف السفلية.',
                        importance: 'مؤشر مباشر على تجنيد الألياف العضلية السريعة (Type II) وسرعة إنتاج القوة العمودية ضد الأرض. حاسم جداً للاعبي الطائرة والسلة للارتقاء الفعال.',
                        benchmarks: [
                          { label: 'نخبة أولمبية 👑', value: age < 17 ? '+28.9"' : '+34.0" (النساء: +26.0")' },
                          { label: 'ممتاز 🏆', value: age < 17 ? '25.5" - 28.9"' : '30.0" - 33.9" (النساء: 22.0" - 25.9")' },
                          { label: 'جيد ⭐', value: age < 17 ? '22.1" - 25.5"' : '26.0" - 29.9" (النساء: 18.0" - 21.9")' },
                          { label: 'مقبول ⚡', value: age < 17 ? '18.7" - 22.1"' : '22.0" - 25.9" (النساء: 15.0" - 17.9")' },
                          { label: 'تحت المتوسط ⚠️', value: age < 17 ? '<18.7"' : '<22.0" (النساء: <15.0")' }
                        ],
                        tips: [
                          'تدريبات القفز مع أوزان متوسطة (Jump Squats 30% 1RM).',
                          'تدريبات القوة القصوى للأطراف السفلية (Back Squats 85%+ 1RM).',
                          'تدريبات الدفع الأفقي والعمودي الأحادي (Single Leg Bounds).'
                        ]
                      })}
                      className="bg-[#111827]/30 border border-gray-850 p-5 rounded-3xl flex flex-col justify-between hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-gray-400 font-bold">الوثبة الانفجارية القصوى</span>
                          <span className="text-cyan-400 bg-cyan-950/20 border border-cyan-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">CMJ</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                          <span className="text-4xl font-black text-white font-mono">{heightInches}</span>
                          <span className="text-gray-400 font-bold text-xs">إنش</span>
                          <span className="text-gray-500 text-xs font-mono mr-1.5">({heightCm} cm)</span>
                        </div>
                        <p className={`text-xs font-bold ${evalHeight.color}`}>{evalHeight.text}</p>
                      </div>
                      
                      <div className="mt-4">
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: `${evalHeight.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-gray-500 mt-2 font-mono">
                          <span>0</span>
                          <span>الهدف: {evalHeight.range.split(':').pop() || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gauge Card: Flight Time */}
                    <div 
                      onClick={() => setSelectedMetric({
                        title: 'زمن الطيران المعلق (Flight Time)',
                        value: `${flightTime.toFixed(3)} s`,
                        rating: evalFlight.text,
                        ratingColor: evalFlight.color,
                        desc: 'الوقت المستغرق بالثواني منذ لحظة مغادرة أصابع القدم للأرض وحتى لحظة أول ملامسة للقدمين للأرض مرة أخرى.',
                        importance: 'يرتبط رياضياً وعضوياً بمقدار الدفع الحركي المتولد لحظة الإقلاع. يعكس مدى قدرة اللاعب على تحقيق تسارع رأسي عالٍ للجسم والتغلب على الجاذبية الأرضية.',
                        benchmarks: [
                          { label: 'تحليق نخبة 👑', value: age < 17 ? '+0.64s' : '+0.75s (النساء: +0.65s)' },
                          { label: 'ممتاز ⭐', value: age < 17 ? '0.58s - 0.64s' : '0.68s - 0.74s (النساء: 0.58s - 0.64s)' },
                          { label: 'جيد ⚡', value: age < 17 ? '0.51s - 0.58s' : '0.60s - 0.67s (النساء: 0.52s - 0.57s)' },
                          { label: 'تلامس بطيء ⚠️', value: age < 17 ? '<0.51s' : '<0.60s (النساء: <0.52s)' }
                        ],
                        tips: [
                          'تمارين القفز الارتدادي السريع (Pogo Jumps).',
                          'تدريبات التوافق العصبي العضلي للقدمين والسرعة الحركية.',
                          'تدريبات القفز فوق الصناديق المتتالية لزيادة زمن التعليق الحركي.'
                        ]
                      })}
                      className="bg-[#111827]/30 border border-gray-855 p-5 rounded-3xl flex flex-col justify-between hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-gray-400 font-bold">زمن الطيران المعلق</span>
                          <span className="text-teal-400 bg-teal-950/20 border border-teal-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">Flight</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                          <span className="text-4xl font-black text-white font-mono">{flightTime.toFixed(3)}</span>
                          <span className="text-gray-400 font-bold text-xs">ثانية</span>
                        </div>
                        <p className={`text-xs font-bold ${evalFlight.color}`}>{evalFlight.text}</p>
                      </div>
                      
                      <div className="mt-4">
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: `${evalFlight.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-gray-500 mt-2 font-mono">
                          <span>0</span>
                          <span>{evalFlight.range}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gauge Card: Power Density */}
                    <div 
                      onClick={() => setSelectedMetric({
                        title: 'كثافة القدرة الميكانيكية (Relative Power)',
                        value: `${relativePower > 0 ? relativePower : (harmanPeak / mass).toFixed(1)} W/kg`,
                        rating: evalPower.text,
                        ratingColor: evalPower.color,
                        desc: 'القدرة الميكانيكية المتولدة مقسومة على وزن اللاعب الفعلي. وهي أهم مقياس بيوميكانيكي يربط القوة بالوزن (Power-to-Weight Ratio).',
                        importance: 'حاسم للسرعات الحركية العالية وبدء الانطلاق. زيادة نسبة القدرة للوزن تتيح تسارعاً رأسياً فائقاً دون إرهاق عضلات الأرجل بكتلة جسم زائدة.',
                        benchmarks: [
                          { label: 'قدرة متفجرة 👑', value: age < 17 ? '+55.3 W/kg' : '+65.0 W/kg (النساء: +52.0 W/kg)' },
                          { label: 'ممتاز ⭐', value: age < 17 ? '46.8 - 55.3 W/kg' : '55.0 - 64.9 W/kg (النساء: 45.0 - 51.9 W/kg)' },
                          { label: 'جيد ⚡', value: age < 17 ? '38.3 - 46.8 W/kg' : '45.0 - 54.9 W/kg (النساء: 38.0 - 44.9 W/kg)' },
                          { label: 'قدرة منخفضة ⚠️', value: age < 17 ? '<38.3 W/kg' : '<45.0 W/kg (النساء: <38.0 W/kg)' }
                        ],
                        tips: [
                          'تدريبات الأولمبيك ليفت السريعة (Hang Clean, Snatch).',
                          'تدريبات القفز مع مقاومة عكسية (Banded Jump Squats).',
                          'تحسين التكوين الجسماني وخفض نسبة الدهون لزيادة القوة النسبية.'
                        ]
                      })}
                      className="bg-[#111827]/30 border border-gray-855 p-5 rounded-3xl flex flex-col justify-between hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-gray-400 font-bold">كثافة القدرة الميكانيكية</span>
                          <span className="text-purple-400 bg-purple-950/20 border border-purple-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">W/kg</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                          <span className="text-4xl font-black text-white font-mono">{relativePower > 0 ? relativePower : (harmanPeak / mass).toFixed(1)}</span>
                          <span className="text-gray-400 font-bold text-xs">W/kg</span>
                        </div>
                        <p className={`text-xs font-bold ${evalPower.color}`}>{evalPower.text}</p>
                      </div>
                      
                      <div className="mt-4">
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-500" style={{ width: `${evalPower.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-gray-500 mt-2 font-mono">
                          <span>0</span>
                          <span>{evalPower.range}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gauge Card: RSI Score */}
                    <div 
                      onClick={() => setSelectedMetric({
                        title: 'مؤشر القوة التفاعلية (RSI Score)',
                        value: `${latestRsiVal > 0 ? latestRsiVal.toFixed(2) : (maxRsi > 0 ? maxRsi.toFixed(2) : '—')}`,
                        rating: evalRsi.text,
                        ratingColor: evalRsi.color,
                        desc: 'مؤشر القوة التفاعلية (Reactive Strength Index)، ويتم حسابه بقسمة زمن الطيران على زمن التلامس مع الأرض (Tf / Tc) في قفزة السقوط والارتداد.',
                        importance: 'يقيس صلابة الأوتار (Joint Stiffness) وكفاءة دورة التمدد والتقلص (SSC). يعكس قدرة الجهاز العصبي والعضلي على امتصاص طاقة السقوط وإعادة استخدامها كقوة ارتداد دفعية فورا.',
                        benchmarks: [
                          { label: 'نخبة تفاعلية 👑', value: '+2.50' },
                          { label: 'ممتاز 🏆', value: '2.00 - 2.49' },
                          { label: 'تفاعل جيد ⭐', value: '1.50 - 1.99' },
                          { label: 'تفاعل مقبول ⚡', value: '1.00 - 1.49' },
                          { label: 'صلابة منخفضة ⚠️', value: '<1.00' }
                        ],
                        tips: [
                          'قفز العمق (Depth Jumps من صندوق 30-40 سم بالارتداد الفوري).',
                          'تمارين الهبوط المعجل والارتداد السريع (Accelerated Plyometrics).',
                          'الحجل السريع على ساق واحدة مع تثبيت الحوض والركبة لزيادة الصلابة.'
                        ]
                      })}
                      className="bg-[#111827]/30 border border-gray-855 p-5 rounded-3xl flex flex-col justify-between hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-gray-400 font-bold">مؤشر الارتداد التفاعلي</span>
                          <span className="text-yellow-455 bg-yellow-950/20 border border-yellow-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">RSI</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mb-1.5">
                          <span className="text-4xl font-black text-white font-mono">{latestRsiVal > 0 ? latestRsiVal.toFixed(2) : (maxRsi > 0 ? maxRsi.toFixed(2) : '—')}</span>
                          <span className="text-gray-400 font-bold text-xs">Index</span>
                        </div>
                        <p className={`text-xs font-bold ${evalRsi.color}`}>{evalRsi.text}</p>
                      </div>
                      
                      <div className="mt-4">
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-500" style={{ width: `${evalRsi.progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] text-gray-500 mt-2 font-mono">
                          <span>0</span>
                          <span>{evalRsi.range}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Additional Volleyball/Basketball Specific KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-black/25 border border-gray-800/60 p-4 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">الوصول الأقصى للارتقاء 🏐</span>
                    <span className="text-2xl font-black text-cyan-400 font-mono">{maxReachCmj || '—'} <span className="text-xs text-gray-500">سم</span></span>
                  </div>
                  <div className="bg-black/25 border border-gray-800/60 p-4 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">مؤشر الإنجاز البدني للوثب</span>
                    <span className="text-2xl font-black text-white font-mono">{heightCm.toFixed(1)} <span className="text-xs text-gray-500">سم</span></span>
                  </div>
                  <div className="bg-black/25 border border-gray-800/60 p-4 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">مقارنة بأداء الجولة السابقة</span>
                    <span className={`text-2xl font-black font-mono flex items-center justify-center gap-1.5 ${trendPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trendPct >= 0 ? `+${trendPct.toFixed(1)}` : trendPct.toFixed(1)} 
                      <span className="text-xs">{trendPct >= 0 ? '📈' : '📉'}</span>
                    </span>
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 2: BIOMECHANICS & MODELS */}
            {activeTab === 'biomechanics' && (
              <motion.div key="biomechanics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Sayers & Harman calculations */}
                  <div className="glass-panel p-5 shadow-lg flex flex-col justify-between">
                    <h4 className="text-base font-black text-white mb-4 border-b border-gray-800/80 pb-2.5 flex items-center gap-2">
                      <Zap className="text-cyan-400" size={16} /> نماذج القدرة الميكانيكية للارتقاء (Mechanical Power Models)
                    </h4>
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between items-center bg-black/15 p-3.5 rounded-xl border border-gray-850">
                        <div>
                          <span className="font-extrabold text-white block">Sayers Peak Power</span>
                          <span className="text-[9px] text-gray-500">مبني على وزن الجسم وارتفاع الوثب</span>
                        </div>
                        <span className="font-mono font-black text-white text-base">{sayersPeak > 0 ? sayersPeak.toFixed(0) : '0'} <span className="text-xs text-gray-500 font-normal">Watt</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-black/15 p-3.5 rounded-xl border border-gray-850">
                        <div>
                          <span className="font-extrabold text-white block">Harman Peak Power</span>
                          <span className="text-[9px] text-gray-500">النموذج الذهبي لقياس القدرة المتفجرة القصوى</span>
                        </div>
                        <span className="font-mono font-black text-white text-base">{harmanPeak > 0 ? harmanPeak.toFixed(0) : '0'} <span className="text-xs text-gray-500 font-normal">Watt</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-black/15 p-3.5 rounded-xl border border-gray-850">
                        <div>
                          <span className="font-extrabold text-white block">Harman Mean Power</span>
                          <span className="text-[9px] text-gray-500">متوسط القدرة المنتجة خلال كامل زمن التحليق</span>
                        </div>
                        <span className="font-mono font-black text-white text-base">{harmanMean > 0 ? harmanMean.toFixed(0) : '0'} <span className="text-xs text-gray-500 font-normal">Watt</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-black/15 p-3.5 rounded-xl border border-gray-850">
                        <div>
                          <span className="font-extrabold text-cyan-455 block">سرعة الانطلاق عند الإقلاع (Takeoff V)</span>
                          <span className="text-[9px] text-gray-500">السرعة المتجهة لحظة مغادرة القدمين للأرض</span>
                        </div>
                        <span className="font-mono font-black text-cyan-400 text-base">{velocity > 0 ? velocity.toFixed(2) : Math.sqrt(2 * 9.81 * (heightCm/100)).toFixed(2)} <span className="text-xs text-gray-500 font-normal">m/s</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Gradient Area Chart */}
                  <div className="glass-panel p-5 shadow-lg flex flex-col justify-between">
                    <h4 className="text-base font-black text-white mb-4 border-b border-gray-800/80 pb-2.5 flex items-center gap-2">
                      <TrendingUp className="text-cyan-400" size={16} /> منحنى تقدم ارتفاع الوثب للاعب (cm)
                    </h4>
                    <div className="h-56 w-full" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                          <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickMargin={5} />
                          <YAxis stroke="#6b7280" fontSize={11} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', textAlign: 'right' }} />
                          <Area type="monotone" dataKey="heightCm" name="الارتفاع (Cm)" stroke="#06b6d4" strokeWidth={3.5} fillOpacity={1} fill="url(#chartGradient)" dot={{ fill: '#06b6d4', r: 5, strokeWidth: 2, stroke: '#030712' }} activeDot={{ r: 7 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

            {/* TAB 3: CRITIQUE & TRAINING ADVICE */}
            {activeTab === 'critique' && (
              <motion.div key="critique" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                
                {/* 1. Integrated Diagnostics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* EUR Card */}
                  <div className="glass-card p-5 border border-cyan-500/20 shadow-inner flex flex-col justify-between text-right">
                    <div>
                      <span className="text-[10px] text-cyan-400 font-bold block mb-1">مؤشر الاستغلال المطاطي للأوتار (Elastic Utilization Ratio)</span>
                      <h4 className="text-2xl font-black text-white font-mono">{eur > 0 ? eur.toFixed(2) : '—'}</h4>
                      <p className="text-[9px] text-gray-400 mt-1 leading-normal">النسبة بين CMJ (بدون يدين) و Squat Jump. المعدل المرجعي العلمي: 1.05 - 1.15.</p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-gray-850 flex justify-between items-center text-[10px]">
                      <span className="text-gray-500">التقييم الميكانيكي:</span>
                      <span className={`font-black ${
                        eur === 0 ? 'text-gray-500' :
                        eur < 1.05 ? 'text-red-400' :
                        eur > 1.15 ? 'text-orange-400' : 'text-emerald-400'
                      }`}>
                        {eur === 0 ? 'غير متوفر' :
                         eur < 1.05 ? 'عجز أوتار (Tendon Deficit) ⚠️' :
                         eur > 1.15 ? 'عجز قوة عضلية (Force Deficit) 🏋️‍♂️' : 'كفاءة ممتازة (Optimal) ✨'}
                      </span>
                    </div>
                  </div>

                  {/* Arm Swing Card */}
                  <div className="glass-card p-5 border border-cyan-500/20 shadow-inner flex flex-col justify-between text-right">
                    <div>
                      <span className="text-[10px] text-cyan-400 font-bold block mb-1">مساهمة الذراعين الحركية (Arm Swing Contribution)</span>
                      <h4 className="text-2xl font-black text-white font-mono">{armSwing > 0 ? `${armSwing.toFixed(1)}%` : '—'}</h4>
                      <p className="text-[9px] text-gray-400 mt-1 leading-normal">نسبة الزيادة الميكانيكية بفضل أرجحة اليدين. المعدل المرجعي: 10% - 15%.</p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-gray-850 flex justify-between items-center text-[10px]">
                      <span className="text-gray-500">التقييم الحركي:</span>
                      <span className={`font-black ${
                        armSwing === 0 ? 'text-gray-500' :
                        armSwing < 10 ? 'text-red-400' :
                        armSwing > 15 ? 'text-orange-400' : 'text-emerald-400'
                      }`}>
                        {armSwing === 0 ? 'غير متوفر' :
                         armSwing < 10 ? 'تنسيق ذراعين ضعيف ⚠️' :
                         armSwing > 15 ? 'اعتماد مفرط على اليدين 🔄' : 'تنسيق مثالي (Optimal) ✨'}
                      </span>
                    </div>
                  </div>

                  {/* Speed Conversion Card */}
                  <div className="glass-card p-5 border border-cyan-500/20 shadow-inner flex flex-col justify-between text-right">
                    <div>
                      <span className="text-[10px] text-cyan-400 font-bold block mb-1">مؤشر تحويل السرعة الأفقية (Velocity Conversion)</span>
                      <h4 className="text-2xl font-black text-white font-mono">{velocityConversion > 0 ? `${velocityConversion.toFixed(1)}%` : '—'}</h4>
                      <p className="text-[9px] text-gray-400 mt-1 leading-normal">الزيادة الناتجة عن الاقتراب الحركي (Approach vs CMJ). النطاق المستهدف: +10% فما فوق.</p>
                    </div>
                    <div className="mt-4 pt-2.5 border-t border-gray-850 flex justify-between items-center text-[10px]">
                      <span className="text-gray-500">تقييم التحويل:</span>
                      <span className={`font-black ${
                        velocityConversion === 0 ? 'text-gray-500' :
                        velocityConversion < 10 ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {velocityConversion === 0 ? 'غير متوفر' :
                         velocityConversion < 10 ? 'عجز سرعة/اقتراب ⚠️' : 'تحويل ممتاز للسرعة ✨'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Comprehensive Biomechanical Report Card */}
                <div className="glass-panel p-6 shadow-xl text-right">
                  <h4 className="text-sm font-black text-white mb-4 border-b border-gray-800/80 pb-2.5 flex items-center gap-2">
                    📝 التقرير التشخيصي المتكامل للأداء والبدء الحركي
                  </h4>
                  <div className="bg-black/20 border border-gray-850 p-5 rounded-2xl mb-6 text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                    {unifiedDiagnosticText}
                  </div>

                  <h4 className="text-sm font-black text-white mb-4 border-b border-gray-800/80 pb-2.5 flex items-center gap-2">
                    🔬 التقييم العضلي العصبي ونقاط التطوير الموجهة
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Strengths Card */}
                    <div className="bg-emerald-950/15 border border-emerald-500/25 p-5 rounded-2xl">
                      <h5 className="font-extrabold text-emerald-400 mb-3 flex items-center gap-2">
                        <span>🌟 نقاط القوة والتميز الحركي</span>
                      </h5>
                      <p className="text-xs text-gray-300 leading-relaxed space-y-2.5">
                        {((relativePower || (harmanPeak / mass)) >= 50) 
                          ? "• يتمتع اللاعب بكفاءة توليد طاقة انفجارية قوية وممتازة بالنسبة لوزنه الحالي. هذا يدعم بقوة سرعة ارتداده الرأسي وقدرته على الارتقاء بسرعة." 
                          : "• يتميز اللاعب باستقرار حركي جيد وتوازن هيكلي واضح خلال مرحلة الثبات والنزول القرفصائي التحضيري."}
                        <br /><br />
                        {maxRsi >= 2.2 
                          ? "• يظهر مؤشر القوة التفاعلية (RSI) كفاءة عالية جداً للأوتار وصلابة ممتازة بمفصل الكاحل، مما يساعد على اختصار زمن الاحتكاك بالأرض وتحويل القوة الأفقية لقوة دافعة رأسية." 
                          : "• يُظهر تماسكاً جيداً أثناء مراحل الهبوط والامتصاص العضلي، مما يقلل بشكل ملموس من احتمالية إصابات الرباط الصليبي."}
                      </p>
                    </div>

                    {/* Development Points Card */}
                    <div className="bg-amber-950/15 border border-amber-500/25 p-5 rounded-2xl">
                      <h5 className="font-extrabold text-amber-400 mb-3 flex items-center gap-2">
                        <span>⚡ خطة تطوير القدرة والانفجارية</span>
                      </h5>
                      <p className="text-xs text-gray-300 leading-relaxed space-y-2.5">
                        {((relativePower || (harmanPeak / mass)) < 50) 
                          ? "• يوصى بشدة ببرنامج لزيادة القوة المطلقة للجزء السفلي (Squats & Hex-Bar Deadlifts) بهدف تحسين إنتاج القوة الابتدائية القصوى للارتقاء." 
                          : "• لزيادة التطوير وتخطي عجز الأداء، يفضل تفعيل تدريبات القوة البالستية وحمل المقاومة الانفجارية لضمان الحفاظ على مستويات القدرة العالية."}
                        <br /><br />
                        {maxRsi < 2.0 
                          ? "• هناك عجز تفاعلي في الكاحل (Ankle Stiffness deficit). يجب التركيز على تمرينات البلايومترك السريع (Pogo jumps و Jump rope) لتقليص زمن الاحتكاك بالأرض وزيادة معدل الارتداد." 
                          : "• يوصى بالتركيز على تكنيك ميكانيكا الذراعين وتنسيق حركة الصعود لضمان استغلال الزخم الزاوي ونقل القوة الرأسية لارتفاع أفضل."}
                      </p>
                    </div>

                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB 4: COMPLETE HISTORY LOG */}
            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="glass-panel p-5 shadow-lg overflow-hidden">
                <div className="flex justify-between items-center mb-4 border-b border-gray-800/80 pb-2.5">
                  <h4 className="text-base font-black text-white">سجل قياسات اللاعب الكاملة</h4>
                  <button 
                    onClick={() => handleOpenManualEntryModal()} 
                    className="px-3 py-1.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-600/35 transition-all cursor-pointer shadow-md"
                  >
                    <Plus size={14} /> تسجيل رقم يدوي
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-450 font-black">
                        <th className="pb-3 text-right">التاريخ</th>
                        <th className="pb-3 text-center">نوع الاختبار</th>
                        <th className="pb-3 text-center">الارتفاع (cm)</th>
                        <th className="pb-3 text-center">زمن الطيران (s)</th>
                        <th className="pb-3 text-center">زمن التلامس (s)</th>
                        <th className="pb-3 text-center">القدرة القصوى (W)</th>
                        <th className="pb-3 text-center">مؤشر RSI</th>
                        <th className="pb-3 text-center">التحكم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerHistory.slice().reverse().map((jump) => {
                        const testNamesArabic = { 
                          sj_no_arms: 'Squat Jump (بدون يدين)', 
                          cmj_no_arms: 'CMJ (بدون يدين)', 
                          sj_arms: 'Squat Jump (باليدين)', 
                          cmj_arms: 'CMJ (باليدين)', 
                          approach: 'الاقتراب (Approach)', 
                          rsi: 'الوثب الساقط (RSI)', 
                          standard: 'CMJ معتاد' 
                        };
                        const testName = testNamesArabic[jump.test_type] || jump.test_type || 'وثبة عامة';
                        return (
                          <tr key={jump.id} className="border-b border-gray-855 hover:bg-black/10 transition-colors">
                            <td className="py-3.5 font-mono text-gray-400">{new Date(jump.created_at).toLocaleDateString('ar-EG')}</td>
                            <td className="py-3.5 text-center font-bold text-cyan-400">{testName}</td>
                            <td className="py-3.5 text-center font-mono font-black text-white">{parseFloat(jump.jump_height_cm).toFixed(1)}</td>
                            <td className="py-3.5 text-center font-mono text-gray-300">{parseFloat(jump.flight_time_sec).toFixed(3)}</td>
                            <td className="py-3.5 text-center font-mono text-gray-300">{jump.contact_time_sec ? parseFloat(jump.contact_time_sec).toFixed(3) : '—'}</td>
                            <td className="py-3.5 text-center font-mono text-gray-300">{jump.peak_power_watts && parseFloat(jump.peak_power_watts) > 0 ? parseFloat(jump.peak_power_watts).toFixed(0) : '—'}</td>
                            <td className="py-3.5 text-center font-mono font-black text-teal-400">{jump.rsi_score ? parseFloat(jump.rsi_score).toFixed(2) : '—'}</td>
                            <td className="py-3.5 text-center">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => handleOpenManualEntryModal(jump)} className="p-1 hover:text-cyan-400 text-gray-500 transition-all cursor-pointer" title="تعديل"><Edit3 size={13} /></button>
                                <button onClick={() => handleDeleteJump(jump.id)} className="p-1 hover:text-red-400 text-gray-500 transition-all cursor-pointer" title="حذف"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}

        {/* Metric Explanation Modal */}
        <AnimatePresence>
          {selectedMetric && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-right" style={{ direction: 'rtl' }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0b1329] border border-cyan-950/40 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Close Button */}
                <button 
                  type="button" 
                  onClick={() => setSelectedMetric(null)} 
                  className="absolute top-4 left-4 text-gray-400 hover:text-white transition-all bg-black/20 p-2 rounded-full border border-gray-800 cursor-pointer"
                >
                  <X size={16} />
                </button>

                <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 mb-2 pb-2 border-b border-gray-850 flex items-center gap-2">
                  📊 {selectedMetric.title}
                </h3>

                <div className="space-y-4 text-xs leading-relaxed text-gray-300">
                  {/* Current Athlete Value Card */}
                  <div className="bg-cyan-950/20 border border-cyan-500/20 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-gray-500 block">قياس اللاعب الحالي</span>
                      <span className="text-xl font-black text-white font-mono">{selectedMetric.value}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-gray-500 block">تقييم النطاق</span>
                      <span className={`text-sm font-extrabold ${selectedMetric.ratingColor}`}>{selectedMetric.rating}</span>
                    </div>
                  </div>

                  {/* Physics Description */}
                  <div>
                    <span className="block font-black text-white text-xs mb-1">🔍 ما هو هذا القياس؟</span>
                    <p className="text-gray-305 font-medium">{selectedMetric.desc}</p>
                  </div>

                  {/* Importance for Performance */}
                  <div>
                    <span className="block font-black text-white text-xs mb-1">🏃‍♂️ الأهمية الفسيولوجية والرياضية</span>
                    <p className="text-gray-305 font-medium">{selectedMetric.importance}</p>
                  </div>

                  {/* Sports Benchmarks table */}
                  <div>
                    <span className="block font-black text-white text-xs mb-2">🏆 الجداول المعيارية للقياس (Sports Science Standards)</span>
                    <div className="overflow-x-auto rounded-xl border border-gray-850">
                      <table className="w-full text-center text-[10px]">
                        <thead>
                          <tr className="bg-black/40 text-gray-400 font-bold border-b border-gray-850">
                            <th className="p-2">التصنيف</th>
                            <th className="p-2">المدى المستهدف</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMetric.benchmarks.map((b, idx) => (
                            <tr key={idx} className="border-b border-gray-900 last:border-b-0 hover:bg-black/10">
                              <td className="p-2 font-bold text-gray-250">{b.label}</td>
                              <td className="p-2 font-mono text-cyan-400 font-bold">{b.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Training tips list */}
                  <div className="bg-teal-950/10 border border-teal-500/10 p-4 rounded-2xl space-y-2">
                    <span className="block font-black text-teal-400 text-xs">💪 نصائح تدريبية مقترحة للتطوير:</span>
                    <ul className="list-disc list-inside space-y-1.5 text-gray-300 pr-2">
                      {selectedMetric.tips.map((t, idx) => (
                        <li key={idx} className="font-medium">{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Manual Entry Modal */}
        <AnimatePresence>
          {isManualModalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-right" style={{ direction: 'rtl' }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0b1329] border border-cyan-950/40 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                {/* Close Button */}
                <button 
                  type="button" 
                  onClick={() => setIsManualModalOpen(false)} 
                  className="absolute top-4 left-4 text-gray-400 hover:text-white transition-all bg-black/20 p-2 rounded-full border border-gray-800 cursor-pointer animate-hover"
                >
                  <X size={16} />
                </button>

                <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 mb-4 pb-2 border-b border-gray-850 flex items-center gap-2">
                  📝 {isEditingMeasurement ? 'تعديل قياس مسجل' : 'تسجيل قياس يدوي جديد'}
                </h3>

                <form onSubmit={handleSaveManualEntry} className="space-y-4">
                  
                  {/* Test Type Select */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">نوع القياس / الاختبار</label>
                    <select
                      value={manualForm.testType}
                      onChange={(e) => handleManualFormChange('testType', e.target.value)}
                      className="w-full bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                      required
                    >
                      <option value="sj_no_arms">Squat Jump (بدون يدين)</option>
                      <option value="cmj_no_arms">CMJ (بدون يدين)</option>
                      <option value="sj_arms">Squat Jump (باليدين)</option>
                      <option value="cmj_arms">CMJ (باليدين)</option>
                      <option value="approach">الاقتراب (Approach)</option>
                      <option value="rsi">الوثب الساقط (RSI)</option>
                      <option value="standard">CMJ معتاد</option>
                    </select>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">تاريخ القياس</label>
                    <input
                      type="date"
                      value={manualForm.created_at}
                      onChange={(e) => handleManualFormChange('created_at', e.target.value)}
                      className="w-full bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Jump Height (cm) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">ارتفاع الوثبة (سم)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="مثال: 45.5"
                        value={manualForm.jumpHeightCm}
                        onChange={(e) => handleManualFormChange('jumpHeightCm', e.target.value)}
                        className="w-full bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                        required
                      />
                    </div>

                    {/* Flight Time (seconds) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">زمن الطيران (ثانية)</label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="مثال: 0.610"
                        value={manualForm.flightTimeSec}
                        onChange={(e) => handleManualFormChange('flightTimeSec', e.target.value)}
                        className="w-full bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Contact Time (only for RSI) */}
                  {manualForm.testType === 'rsi' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">زمن التلامس مع الأرض (ثانية)</label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="مثال: 0.200"
                        value={manualForm.contactTimeSec}
                        onChange={(e) => handleManualFormChange('contactTimeSec', e.target.value)}
                        className="w-full bg-slate-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                        required
                      />
                    </div>
                  )}

                  {/* Smart Calculations Output Grid */}
                  <div className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-4 space-y-2.5">
                    <span className="block text-[10px] text-cyan-400 font-bold mb-1">📊 الحسابات التلقائية المباشرة (Sayers & Harman Models):</span>
                    
                    <div className="grid grid-cols-2 gap-3 text-[11px] leading-relaxed">
                      <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-gray-850">
                        <span className="text-gray-400">القدرة القصوى:</span>
                        <span className="font-mono font-bold text-white">{manualForm.peakPowerWatts || '0'} W</span>
                      </div>
                      <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-gray-850">
                        <span className="text-gray-400">متوسط القوة:</span>
                        <span className="font-mono font-bold text-white">{manualForm.meanForceNewtons || '0'} N</span>
                      </div>
                      {manualForm.testType === 'rsi' && (
                        <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-gray-850 col-span-2">
                          <span className="text-teal-400 font-bold">مؤشر القوة التفاعلية (RSI):</span>
                          <span className="font-mono font-bold text-teal-400">{manualForm.rsiScore || '0.00'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 btn-orange-gradient rounded-xl font-black text-xs cursor-pointer shadow-lg hover:scale-[1.01] transition-transform text-center"
                    >
                      حفظ القياس
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManualModalOpen(false)}
                      className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-gray-300 border border-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>

                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* PDF Language Selector Modal */}
        <AnimatePresence>
          {isPrintModalOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md text-right screen-only font-cairo" style={{ direction: 'rtl' }}>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0b1329] border border-cyan-950/40 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
              >
                {/* Close Button */}
                <button 
                  type="button" 
                  onClick={() => setIsPrintModalOpen(false)} 
                  className="absolute top-4 left-4 text-gray-400 hover:text-white transition-all bg-black/20 p-2 rounded-full border border-gray-800 cursor-pointer"
                >
                  <X size={16} />
                </button>

                <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 mb-4 pb-2 border-b border-gray-850 flex items-center gap-2">
                  🖨️ لغة تصدير التقرير / Report Language
                </h3>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                  اختر لغة طباعة التقرير الفني لملف اللاعب. سيتم تهيئة التنسيقات والاتجاهات تلقائياً بناءً على اختيارك.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Arabic Button */}
                  <button
                    type="button"
                    onClick={() => handlePrintReport('ar')}
                    className="p-5 bg-slate-900 hover:bg-cyan-950/20 hover:border-cyan-500/50 border border-gray-800 rounded-2xl flex flex-col items-center gap-2 text-center transition-all cursor-pointer group"
                  >
                    <span className="text-2xl">🇪🇬</span>
                    <span className="text-sm font-black text-white group-hover:text-cyan-400">التقرير بالعربية</span>
                    <span className="text-[10px] text-gray-500">من اليمين إلى اليسار (RTL)</span>
                  </button>

                  {/* English Button */}
                  <button
                    type="button"
                    onClick={() => handlePrintReport('en')}
                    className="p-5 bg-slate-900 hover:bg-cyan-955/20 hover:border-cyan-500/50 border border-gray-800 rounded-2xl flex flex-col items-center gap-2 text-center transition-all cursor-pointer group"
                  >
                    <span className="text-2xl">🇬🇧</span>
                    <span className="text-sm font-black text-white group-hover:text-cyan-400">English Report</span>
                    <span className="text-[10px] text-gray-500">Left to Right (LTR)</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>

      {/* ======================================================== */}
      {/* PRINT-ONLY A4 REPORT SHEET (HIDDEN ON SCREEN)             */}
      {/* ======================================================== */}
      <div 
        className="hidden print-report-sheet" 
        style={{ display: 'none', direction: printLang === 'ar' ? 'rtl' : 'ltr' }}
      >
        
        {/* Report Official Banner */}
        <div className={`print-header flex justify-between items-center pb-5 mb-5 border-b-2 border-black ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
          {printLang === 'ar' ? (
            <>
              <div className="text-right">
                <h1 className="text-2xl font-black text-black">مختبر الأداء الرياضي والميكانيكا الحيوية 🧪</h1>
                <p className="text-xs text-gray-700">تقرير قياسات الأداء الحركي والارتقاء المتكامل</p>
              </div>
              <div className="text-left text-xs font-mono text-gray-600">
                <p>تاريخ استخراج التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
                <p>المشرف: رئيس الجهاز الفني</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-left">
                <h1 className="text-2xl font-black text-black">Sports Performance & Biomechanics Lab 🧪</h1>
                <p className="text-xs text-gray-700">Integrated Biomechanical & Vertical Jump Performance Report</p>
              </div>
              <div className="text-right text-xs font-mono text-gray-600">
                <p>Report Date: {new Date().toLocaleDateString('en-US')}</p>
                <p>Supervisor: Technical Director</p>
              </div>
            </>
          )}
        </div>

        {/* Athlete specs */}
        <div className={`bg-gray-100 p-4 rounded-xl border border-gray-300 mb-6 ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
          <h3 className="text-sm font-black text-black mb-3">
            {printLang === 'ar' ? 'بيانات اللاعب الشخصية والبدنية' : 'Athlete Personal & Physical Metrics'}
          </h3>
          <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs">
            {printLang === 'ar' ? (
              <>
                <div><strong className="text-gray-700">الاسم الكامل:</strong> {activePlayer.full_name}</div>
                <div><strong className="text-gray-700">الوزن:</strong> {activePlayer.weight_kg} كجم</div>
                <div><strong className="text-gray-700">العمر:</strong> {age} سنوات</div>
                <div><strong className="text-gray-700">النوع:</strong> {activePlayer.gender === 'female' ? 'أنثى' : 'ذكر'}</div>
                <div><strong className="text-gray-700">طول القامة:</strong> {playerHeight} سم</div>
                <div><strong className="text-gray-700">الوصول من الثبات:</strong> {playerStandingReach} سم</div>
              </>
            ) : (
              <>
                <div><strong className="text-gray-700">Full Name:</strong> {activePlayer.full_name}</div>
                <div><strong className="text-gray-700">Weight:</strong> {activePlayer.weight_kg} kg</div>
                <div><strong className="text-gray-700">Age:</strong> {age} years</div>
                <div><strong className="text-gray-700">Gender:</strong> {activePlayer.gender === 'female' ? 'Female' : 'Male'}</div>
                <div><strong className="text-gray-700">Height:</strong> {playerHeight} cm</div>
                <div><strong className="text-gray-700">Standing Reach:</strong> {playerStandingReach} cm</div>
              </>
            )}
          </div>
        </div>

        {/* Core numbers */}
        <div className={`mb-6 ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
          <h3 className="text-sm font-black text-black mb-3">
            {printLang === 'ar' ? 'نتائج قياسات الاختبار الأخير' : 'Latest Test Session Results'}
          </h3>
          <table className="print-table text-xs">
            <thead>
              {printLang === 'ar' ? (
                <tr>
                  <th>ارتفاع الوثب (سم)</th>
                  <th>ارتفاع الوثب (إنش)</th>
                  <th>زمن الطيران المعلق (ثانية)</th>
                  <th>كثافة القدرة الميكانيكية (W/kg)</th>
                  <th>أقصى ارتفاع للوصول (سم)</th>
                  <th>مؤشر RSI الأقصى</th>
                </tr>
              ) : (
                <tr>
                  <th>Jump Height (cm)</th>
                  <th>Jump Height (in)</th>
                  <th>Flight Time (s)</th>
                  <th>Relative Power (W/kg)</th>
                  <th>Max Touch Reach (cm)</th>
                  <th>Max RSI Index</th>
                </tr>
              )}
            </thead>
            <tbody>
              <tr>
                <td className="font-bold">{heightCm.toFixed(1)}</td>
                <td className="font-bold">{heightInches}</td>
                <td>{flightTime.toFixed(3)}</td>
                <td>{relativePower > 0 ? relativePower : (harmanPeak / mass).toFixed(1)}</td>
                <td className="font-bold text-blue-800">{maxReachCmj || '—'}</td>
                <td className="font-bold text-cyan-800">{maxRsi > 0 ? maxRsi.toFixed(2) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mechanical equations */}
        <div className={`mb-6 ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
          <h3 className="text-sm font-black text-black mb-3">
            {printLang === 'ar' ? 'تقديرات القدرة الانفجارية (Mechanical Power)' : 'Biomechanical Power Outputs (Sayers & Harman Models)'}
          </h3>
          <div className="print-grid text-xs">
            <div className="border border-gray-300 p-3 rounded-lg bg-gray-50">
              <p className="font-bold mb-1">
                {printLang === 'ar' ? 'Sayers Peak Power (القدرة القصوى)' : 'Sayers Peak Power'}
              </p>
              <p className="text-lg font-mono font-black text-black">
                {sayersPeak.toFixed(0)} <span className="text-xs font-normal">{printLang === 'ar' ? 'وات' : 'Watts'}</span>
              </p>
            </div>
            <div className="border border-gray-300 p-3 rounded-lg bg-gray-50">
              <p className="font-bold mb-1">
                {printLang === 'ar' ? 'Harman Peak Power (القدرة القصوى)' : 'Harman Peak Power'}
              </p>
              <p className="text-lg font-mono font-black text-black">
                {harmanPeak.toFixed(0)} <span className="text-xs font-normal">{printLang === 'ar' ? 'وات' : 'Watts'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Diagnostics block */}
        <div className={`mb-6 ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
          <h3 className="text-sm font-black text-black mb-3">
            {printLang === 'ar' ? 'التشخيص والتوصيات الميكانيكية الحيوية المتكاملة' : 'Integrated Biomechanical Diagnostics & Critique'}
          </h3>
          
          {/* Diagnostic Metrics Row */}
          <table className="print-table text-[10px] mb-4">
            <thead>
              {printLang === 'ar' ? (
                <tr>
                  <th>مؤشر الاستغلال المطاطي للأوتار (EUR)</th>
                  <th>مساهمة الذراعين الحركية (Arm Swing)</th>
                  <th>مؤشر تحويل السرعة الأفقية (Velocity Conversion)</th>
                </tr>
              ) : (
                <tr>
                  <th>Elastic Utilization Ratio (EUR)</th>
                  <th>Arm Swing Contribution</th>
                  <th>Velocity Conversion (Approach vs CMJ)</th>
                </tr>
              )}
            </thead>
            <tbody>
              <tr>
                <td className="font-mono font-bold text-sm">
                  {eur > 0 ? eur.toFixed(2) : '—'}
                  <div className="text-[9px] font-bold text-gray-700">
                    {eur === 0 ? (printLang === 'ar' ? 'غير متوفر' : 'N/A') :
                     eur < 1.05 ? (printLang === 'ar' ? 'عجز أوتار ⚠️' : 'Tendon Deficit ⚠️') :
                     eur > 1.15 ? (printLang === 'ar' ? 'عجز قوة عضلية 🏋️‍♂️' : 'Force Deficit 🏋️‍♂️') : (printLang === 'ar' ? 'كفاءة ممتازة ✨' : 'Optimal ✨')}
                  </div>
                </td>
                <td className="font-mono font-bold text-sm">
                  {armSwing > 0 ? `${armSwing.toFixed(1)}%` : '—'}
                  <div className="text-[9px] font-bold text-gray-700">
                    {armSwing === 0 ? (printLang === 'ar' ? 'غير متوفر' : 'N/A') :
                     armSwing < 10 ? (printLang === 'ar' ? 'تنسيق ذراعين ضعيف ⚠️' : 'Weak Arm Swing ⚠️') :
                     armSwing > 15 ? (printLang === 'ar' ? 'اعتماد مفرط على اليدين 🔄' : 'High Arm Swing 🔄') : (printLang === 'ar' ? 'تنسيق مثالي ✨' : 'Optimal ✨')}
                  </div>
                </td>
                <td className="font-mono font-bold text-sm">
                  {velocityConversion > 0 ? `${velocityConversion.toFixed(1)}%` : '—'}
                  <div className="text-[9px] font-bold text-gray-700">
                    {velocityConversion === 0 ? (printLang === 'ar' ? 'غير متوفر' : 'N/A') :
                     velocityConversion < 10 ? (printLang === 'ar' ? 'عجز سرعة/اقتراب ⚠️' : 'Velocity Deficit ⚠️') : (printLang === 'ar' ? 'تحويل ممتاز ✨' : 'Excellent ✨')}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Diagnostic Narrative Text */}
          <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-[11px] leading-relaxed whitespace-pre-line text-gray-800 font-mono">
            {printLang === 'ar' ? unifiedDiagnosticText : generateUnifiedDiagnosticEN()}
          </div>
        </div>

        {/* Complete Historical Jump Log */}
        <div className={`mb-8 ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
          <h3 className="text-sm font-black text-black mb-3">
            {printLang === 'ar' ? 'سجل قياسات اللاعب التاريخي الكامل' : 'Complete Historical Jump Log'}
          </h3>
          <table className="print-table text-[10px]">
            <thead>
              {printLang === 'ar' ? (
                <tr>
                  <th>التاريخ</th>
                  <th>نوع الاختبار</th>
                  <th>الارتفاع (سم)</th>
                  <th>الطيران (ثانية)</th>
                  <th>التلامس (ثانية)</th>
                  <th>القدرة (W)</th>
                  <th>مؤشر RSI</th>
                </tr>
              ) : (
                <tr>
                  <th>Date</th>
                  <th>Test Type</th>
                  <th>Height (cm)</th>
                  <th>Flight Time (s)</th>
                  <th>Contact Time (s)</th>
                  <th>Peak Power (W)</th>
                  <th>RSI Score</th>
                </tr>
              )}
            </thead>
            <tbody>
              {playerHistory.slice().reverse().map((jump) => {
                const testNamesArabic = { 
                  sj_no_arms: 'Squat Jump (بدون يدين)', 
                  cmj_no_arms: 'CMJ (بدون يدين)', 
                  sj_arms: 'Squat Jump (باليدين)', 
                  cmj_arms: 'CMJ (باليدين)', 
                  approach: 'الاقتراب (Approach)', 
                  rsi: 'الوثب الساقط (RSI)', 
                  standard: 'CMJ معتاد' 
                };
                const testNamesEnglish = { 
                  sj_no_arms: 'Squat Jump (No Arms)', 
                  cmj_no_arms: 'CMJ (No Arms)', 
                  sj_arms: 'Squat Jump (Arms)', 
                  cmj_arms: 'CMJ (Arms)', 
                  approach: 'Approach Jump', 
                  rsi: 'Drop Jump (RSI)', 
                  standard: 'Standard CMJ' 
                };
                const testName = printLang === 'ar' 
                  ? (testNamesArabic[jump.test_type] || jump.test_type) 
                  : (testNamesEnglish[jump.test_type] || jump.test_type);
                return (
                  <tr key={jump.id}>
                    <td className="font-mono">{new Date(jump.created_at).toLocaleDateString(printLang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                    <td className="font-bold">{testName}</td>
                    <td className="font-mono">{parseFloat(jump.jump_height_cm).toFixed(1)}</td>
                    <td className="font-mono">{parseFloat(jump.flight_time_sec).toFixed(3)}</td>
                    <td className="font-mono">{jump.contact_time_sec ? parseFloat(jump.contact_time_sec).toFixed(3) : '—'}</td>
                    <td className="font-mono">{jump.peak_power_watts && parseFloat(jump.peak_power_watts) > 0 ? parseFloat(jump.peak_power_watts).toFixed(0) : '—'}</td>
                    <td className="font-mono font-bold">{jump.rsi_score ? parseFloat(jump.rsi_score).toFixed(2) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Validation signatures with Mahmoud Ali & Mostafa Ali */}
        <div className="mt-12 flex justify-between items-center text-xs pt-8 border-t border-dashed border-gray-400">
          <div className="text-center w-52">
            <p className="font-black text-gray-900">
              {printLang === 'ar' ? 'أخصائي القياس الحركي' : 'Biokinetic Specialist'}
            </p>
            <p className="text-xs text-gray-800 mt-1 font-bold">
              {printLang === 'ar' ? 'محمود علي' : 'Mahmoud Ali'}
            </p>
            <div className="h-10"></div>
            <p className="text-gray-500">....................................</p>
          </div>
          
          <div className="text-center w-52">
            <p className="font-black text-gray-900">
              {printLang === 'ar' ? 'مساعد أخصائي القياس الحركي' : 'Assistant Biokinetic Specialist'}
            </p>
            <p className="text-xs text-gray-800 mt-1 font-bold">
              {printLang === 'ar' ? 'مصطفى علي' : 'Mostafa Ali'}
            </p>
            <div className="h-10"></div>
            <p className="text-gray-500">....................................</p>
          </div>
        </div>

      </div>

      {/* Benchmarks Modal Dialogue */}
      <AnimatePresence>
        {showBenchmarks && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div initial={{ scale: 0.93, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 15 }} className="glass-panel p-6 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative text-right">
              <button onClick={() => setShowBenchmarks(false)} className="absolute top-4 left-4 p-2 bg-slate-900 hover:bg-red-500/20 text-gray-400 hover:text-red-500 rounded-full transition-colors cursor-pointer border border-gray-850"><X size={20}/></button>
              
              <div className="text-center mb-6">
                <BookOpen size={40} className="mx-auto text-cyan-400 mb-2" />
                <h2 className="text-2xl font-black text-white">الجداول المعيارية للأداء الرياضي</h2>
                <p className="text-gray-400 text-sm">مستندة لبيانات الميكانيكا الحيوية الرياضية للشباب والكبار</p>
              </div>

              <div className="space-y-6">
                
                {/* Men Table */}
                <div className="bg-black/20 p-4 rounded-2xl border border-slate-800">
                  <h3 className="text-lg font-bold text-cyan-400 mb-3 border-b border-slate-800 pb-2">معايير الرجال (18+ سنة)</h3>
                  <div className="grid grid-cols-4 text-center text-xs font-bold text-gray-450 mb-2">
                    <div>التقييم</div><div>الارتفاع (cm)</div><div>الطيران (s)</div><div>القدرة (W/kg)</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-4 text-center items-center bg-cyan-950/20 p-2 rounded-xl border border-cyan-500/30"><span className="text-cyan-400 font-bold">نخبة عالمية</span><span>85+</span><span>0.75+</span><span>65+</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-teal-500 font-bold">ممتاز</span><span>76 - 84</span><span>0.68 - 0.74</span><span>55 - 64</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-teal-400 font-bold">جيد</span><span>66 - 75</span><span>0.60 - 0.67</span><span>45 - 54</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-gray-400 font-bold">مقبول</span><span>55 - 65</span><span>0.55 - 0.59</span><span>38 - 44</span></div>
                  </div>
                </div>

                {/* Women Table */}
                <div className="bg-black/20 p-4 rounded-2xl border border-slate-800">
                  <h3 className="text-lg font-bold text-cyan-400 mb-3 border-b border-slate-800 pb-2">معايير السيدات (18+ سنة)</h3>
                  <div className="grid grid-cols-4 text-center text-xs font-bold text-gray-455 mb-2">
                    <div>التقييم</div><div>الارتفاع (cm)</div><div>الطيران (s)</div><div>القدرة (W/kg)</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-4 text-center items-center bg-cyan-950/20 p-2 rounded-xl border border-cyan-500/30"><span className="text-cyan-400 font-bold">نخبة عالمية</span><span>66+</span><span>0.65+</span><span>52+</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-teal-500 font-bold">ممتاز</span><span>56 - 65</span><span>0.58 - 0.64</span><span>45 - 51</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-teal-400 font-bold">جيد</span><span>46 - 55</span><span>0.52 - 0.57</span><span>38 - 44</span></div>
                    <div className="grid grid-cols-4 text-center items-center bg-black/40 p-2 rounded-xl border border-gray-850"><span className="text-gray-400 font-bold">مقبول</span><span>38 - 45</span><span>0.48 - 0.51</span><span>32 - 37</span></div>
                  </div>
                </div>

                {/* Egyptian volleyball club benchmarks */}
                <div className="bg-black/20 p-4 rounded-2xl border border-orange-500/30">
                  <h3 className="text-lg font-bold text-orange-400 mb-3 border-b border-orange-500/20 pb-2">🏐 معايير الأندية المصرية - الكرة الطائرة</h3>
                  <div className="grid grid-cols-5 text-center text-xs font-bold text-gray-450 mb-2">
                    <div>النادي</div><div>نخبة (Elite)</div><div>ممتاز</div><div>جيد</div><div>مقبول</div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="grid grid-cols-5 text-center items-center bg-red-950/15 p-2 rounded-xl border border-red-500/20"><span className="text-red-400 font-bold">الأهلي</span><span>+34" (86+)</span><span>30"-33"</span><span>26"-29"</span><span>22"-25"</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-white/[0.02] p-2 rounded-xl border border-gray-750"><span className="text-white font-bold">الزمالك</span><span>+34" (86+)</span><span>30"-33"</span><span>26"-29"</span><span>22"-25"</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-blue-950/15 p-2 rounded-xl border border-blue-500/20"><span className="text-blue-400 font-bold">سموحة</span><span>+32" (81+)</span><span>28"-31"</span><span>24"-27"</span><span>20"-23"</span></div>
                    <div className="grid grid-cols-5 text-center items-center bg-yellow-950/15 p-2 rounded-xl border border-yellow-500/20"><span className="text-yellow-400 font-bold">سبورتنج</span><span>+32" (81+)</span><span>28"-31"</span><span>24"-27"</span><span>20"-23"</span></div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 text-center">* معايير السيدات (18+): نخبة: +26" (66+) | ممتاز: 22"-25" | جيد: 18"-21"</p>
                </div>

                <div className="bg-cyan-950/10 border border-cyan-500/30 p-4 rounded-xl flex gap-2">
                  <ShieldAlert className="text-cyan-455 shrink-0" size={18} />
                  <div>
                     <p className="text-xs text-cyan-400 font-bold mb-0.5">معايير الناشئين والناشئات (أقل من 17 سنة):</p>
                     <p className="text-xs text-gray-405 leading-relaxed">يقوم المحرك تلقائياً بتخفيض الحدود المعيارية السابقة بنسبة 15% لملاءمة معدلات التطور البدني والفسيولوجي لسن اللاعب المحدد. ينطبق هذا على جميع الأندية والمنتخبات أعلاه.</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}