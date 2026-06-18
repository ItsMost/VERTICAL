import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, TrendingUp, Clock, Zap, ArrowUpCircle, AlertCircle, BookOpen, X, ShieldAlert, Award, User, Scale, Calendar, Trophy, FileText, ChevronLeft, Target, Plus, Trash2, Edit3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from './supabaseClient';

export default function PlayerProfile({ activePlayer, playerHistory, onHistoryChange, language = 'ar', onEditPlayer }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, biomechanics, critique, history
  const [showBenchmarks, setShowBenchmarks] = useState(false);

  // Manual entry modal states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isEditingMeasurement, setIsEditingMeasurement] = useState(false);
  const [editingJumpId, setEditingJumpId] = useState(null);

  // Print language selection states
  const [printLang, setPrintLang] = useState('ar');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printStep, setPrintStep] = useState(1);
  const [printWithInfographics, setPrintWithInfographics] = useState(true);

  const handlePrintLanguageSelect = (lang) => {
    setPrintLang(lang);
    setPrintStep(2);
  };

  const handlePrintReportFinal = (withInfographics) => {
    setPrintWithInfographics(withInfographics);
    setIsPrintModalOpen(false);
    setTimeout(() => {
      window.print();
      // Reset step for next time after some delay
      setTimeout(() => {
        setPrintStep(1);
      }, 1000);
    }, 300);
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

  // Leg length to cm helper
  const getLegLengthCm = (val) => {
    const num = parseFloat(val);
    if (!num || isNaN(num)) return '—';
    if (num > 5) return num.toFixed(0);
    return (num * 100).toFixed(0);
  };

  // Arm Swing evaluation helper
  const getArmSwingEvaluation = (val) => {
    if (!val || isNaN(val) || val === 0) {
      return {
        textAr: 'غير متوفر',
        textEn: 'N/A',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        borderColor: '#e5e7eb'
      };
    }
    if (val < 10) {
      return {
        textAr: 'تنسيق ذراعين ضعيف ⚠️',
        textEn: 'Poor Arm Coordination ⚠️',
        color: '#e11d48',
        bgColor: '#fff1f2',
        borderColor: '#fecdd3'
      };
    } else if (val > 15) {
      return {
        textAr: 'اعتماد مفرط على اليدين 🔄',
        textEn: 'High Arm Swing 🔄',
        color: '#dd6b20',
        bgColor: '#fffaf0',
        borderColor: '#fbd38d'
      };
    } else {
      return {
        textAr: 'تنسيق مثالي (Optimal) ✨',
        textEn: 'Optimal Coordination ✨',
        color: '#0d9488',
        bgColor: '#f0fdfa',
        borderColor: '#ccfbf1'
      };
    }
  };

  // Velocity Conversion evaluation helper
  const getVelocityConversionEvaluation = (val) => {
    if (!val || isNaN(val) || val === 0) {
      return {
        textAr: 'غير متوفر',
        textEn: 'N/A',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        borderColor: '#e5e7eb'
      };
    }
    if (val >= 10) {
      return {
        textAr: 'تحويل ممتاز للسرعة ✨',
        textEn: 'Excellent Speed Conversion ✨',
        color: '#0d9488',
        bgColor: '#f0fdfa',
        borderColor: '#ccfbf1'
      };
    } else {
      return {
        textAr: 'عجز سرعة/اقتراب ⚠️',
        textEn: 'Velocity Deficit ⚠️',
        color: '#e11d48',
        bgColor: '#fff1f2',
        borderColor: '#fecdd3'
      };
    }
  };

  // EUR evaluation helper
  const getEurEvaluation = (val) => {
    if (!val || isNaN(val) || val === 0) {
      return {
        textAr: 'غير متوفر',
        textEn: 'N/A',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        borderColor: '#e5e7eb'
      };
    }
    if (val >= 1.05 && val <= 1.15) {
      return {
        textAr: 'متوازن (عضلات وأوتار) ✨',
        textEn: 'Balanced (Optimal) ✨',
        color: '#0d9488',
        bgColor: '#f0fdfa',
        borderColor: '#ccfbf1'
      };
    } else if (val < 1.05) {
      return {
        textAr: 'ضعف أوتار / عضلات مسيطرة 🔴',
        textEn: 'Tendon Deficit / Muscles Dominant 🔴',
        color: '#dd6b20',
        bgColor: '#fffaf0',
        borderColor: '#fbd38d'
      };
    } else {
      return {
        textAr: 'الأوتار (العضلات تفتقر للقوة الصافية) ⚠️',
        textEn: 'Tendon Dominant (Force Deficit) ⚠️',
        color: '#b7791f',
        bgColor: '#fffbeb',
        borderColor: '#fef3c7'
      };
    }
  };

  // Load physical parameters from database or fallback to localStorage
  const playerHeight = activePlayer.height_cm || localStorage.getItem(`player_height_${activePlayer.id}`) || '—';
  const playerStandingReach = activePlayer.standing_reach_cm || localStorage.getItem(`standing_reach_${activePlayer.id}`) || '—';
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

  // Find the personal best vertical jump for CMJ with arms (highest jump height from cmj_arms test type)
  const pbJump = playerHistory && playerHistory.length > 0
    ? playerHistory.filter(j => j.test_type === 'cmj_arms' && parseFloat(j.jump_height_cm) > 0)
        .reduce((best, current) => {
          if (!best) return current;
          return parseFloat(current.jump_height_cm) > parseFloat(best.jump_height_cm) ? current : best;
        }, null)
    : null;

  // Fallback: If no cmj_arms exists, search for the highest jump of any test type
  const fallbackPbJump = playerHistory && playerHistory.length > 0
    ? playerHistory.filter(j => parseFloat(j.jump_height_cm) > 0)
        .reduce((best, current) => {
          if (!best) return current;
          return parseFloat(current.jump_height_cm) > parseFloat(best.jump_height_cm) ? current : best;
        }, null)
    : null;

  // Use CMJ with arms best jump for Visual Cockpit metrics, fallback to highest of any type, then latest
  const cockpitJump = pbJump || fallbackPbJump || latestJump;

  const heightCm = cockpitJump ? parseFloat(cockpitJump.jump_height_cm) : 0;
  const heightInches = parseFloat((heightCm * 0.393701).toFixed(1));
  const flightTime = cockpitJump ? parseFloat(cockpitJump.flight_time_sec) : 0;
  const velocity = cockpitJump ? parseFloat(cockpitJump.takeoff_velocity_ms) : 0;
  const peakPower = cockpitJump ? parseFloat(cockpitJump.peak_power_watts) : 0;
  const meanPower = cockpitJump ? parseFloat(cockpitJump.mean_power_watts) : 0;
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

  const getLatestJumpRecord = (type) => {
    const list = playerHistory ? playerHistory.filter(j => j.test_type === type) : [];
    return list.length > 0 ? list[list.length - 1] : null;
  };

  const sjNoArms = getLatestTestHeight('sj_no_arms');
  const cmjNoArms = getLatestTestHeight('cmj_no_arms');
  const sjArms = getLatestTestHeight('sj_arms');
  const cmjArms = getLatestTestHeight('cmj_arms');
  const approachJump = getLatestTestHeight('approach');
  const latestRsi = getLatestTestRsi() || latestRsiVal || maxRsi;

  const sjNoArmsRecord = getLatestJumpRecord('sj_no_arms');
  const cmjNoArmsRecord = getLatestJumpRecord('cmj_no_arms');
  const sjArmsRecord = getLatestJumpRecord('sj_arms');
  const cmjArmsRecord = getLatestJumpRecord('cmj_arms');
  const approachRecord = getLatestJumpRecord('approach');
  const rsiRecord = getLatestJumpRecord('rsi');

  const eur = sjNoArms > 0 ? cmjNoArms / sjNoArms : 0;
  const eurPctDiff = sjNoArms > 0 ? ((cmjNoArms - sjNoArms) / sjNoArms) * 100 : 0;
  const armSwing = cmjNoArms > 0 ? ((cmjArms - cmjNoArms) / cmjNoArms) * 100 : 0;
  const velocityConversion = cmjArms > 0 ? ((approachJump - cmjArms) / cmjArms) * 100 : 0;

  const generateUnifiedDiagnostic = () => {
    if (!sjNoArms && !cmjNoArms && !sjArms && !cmjArms && !approachJump) {
      return "يرجى تسجيل نتائج الاختبارات الخمسة المحددة (Squat Jump و CMJ مع وبدون يدين و Approach Jump) للحصول على تقرير تشخيصي متكامل.";
    }

    let report = "";
    
    // Tendons & SSC Efficiency (EUR)
    if (eur > 0) {
      if (eur >= 1.05 && eur <= 1.15) {
        report += `✨ مؤشر EUR: متوازن (عضلات وأوتار) (${eur.toFixed(2)} | +${eurPctDiff.toFixed(1)}%)\nاللاعب يمتلك توازناً ممتازاً وكويس جداً بين قوته العضلية وكفاءة الأوتار. هذا المعدل المثالي (من 5% إلى 15% زيادة للـ CMJ عن الـ Squat Jump) يعكس كفاءة ممتازة في دورة التمدد والتقصير (SSC) ومرونة واستغلال رائع لطاقة الأوتار المخزنة.\n\n`;
      } else if (eur < 1.05) {
        report += `🔴 مؤشر EUR: اعتماد عضلي / ضعف مطاطية الأوتار (${eur.toFixed(2)} | ${eurPctDiff >= 0 ? '+' : ''}${eurPctDiff.toFixed(1)}%)\nالنسبة قليلة (أقل من 5%)${eur < 1.00 ? '، وفي حالة كارثية حيث أن الـ Squat Jump أعلى من الـ CMJ (النسبة سالبة والـ EUR أقل من 1)' : ''}. هذا معناه أن اللاعب يعتمد تماماً على عضلاته ويمتلك قوة concentric عالية جداً، ولكنه يمتلك ضعفاً صريحاً في كفاءة الأوتار ومطاطيتها واستغلال دورة التمدد والتقصير (SSC). يُنصح بالتركيز الفوري على تمارين البلايومترك السريع (Fast SSC) لتنشيط وتطوير كفاءة أوتار كاحله.\n\n`;
      } else {
        report += `⚠️ مؤشر EUR: عجز قوة عضلية صافية (${eur.toFixed(2)} | +${eurPctDiff.toFixed(1)}%)\nالنسبة مرتفعة جداً (أكثر من 15%)، وهذا معناه أن اللاعب يعتمد على أوتاره والمطاطية الحركية بتاعته فقط، ويمتلك ضعفاً واضحاً وصريحاً في القوة العضلية الصافية الانقباضية (Concentric Force Deficit). يُنصح بشدة بإدخال تمارين الحديد والقوة القصوى للأرجل (>80% 1RM) لبناء أساس عضلي قوي.\n\n`;
      }
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

    // New summary recommendation block for weak tendon or strength performance
    const isWeakTendon = (eur > 0 && eur < 1.05) || (latestRsi > 0 && latestRsi < 1.5);
    const isWeakForce = (eur > 0 && eur > 1.15) || (cmjNoArms > 0 && cmjNoArms < 35);

    if (isWeakTendon && isWeakForce) {
      report += "💡 التوصية البدنية الأساسية (إعداد عام وتأسيس): اللاعب يمتلك ضعفاً عاماً في كل من مطاطية الأوتار (صلابة المفصل) والقوة العضلية الانقباضية الصافية. يُوصى بشدة ببرنامج إعداد بدني عام متكامل (GPP) يدمج تمارين الحديد الأساسية لزيادة قوة الأرجل مع تدريبات بلايومتركس تمهيدية خفيفة لبناء أساس حركي آمن للمفاصل والأوتار قبل زيادة أحمال القفز.\n\n";
    } else if (isWeakTendon) {
      report += "💡 التوصية البدنية الأساسية (تركيز أوتار ومطاطية): يظهر اللاعب نقصاً واضحاً في مطاطية الأوتار وصلابة الكاحل واستغلال الارتداد (Tendon/SSC Deficit). يُوصى بالتركيز المكثف على تمارين البلايومتركس السريعة (Fast SSC) كالحجل الخفيف (Pogo Jumps) وتدريبات قفز الحواجز المنخفضة، لتدريب أوتار الأرجل على تخزين طاقة الارتداد واستردادها بسرعة وتقصير زمن التلامس مع الأرض.\n\n";
    } else if (isWeakForce) {
      report += "💡 التوصية البدنية الأساسية (تركيز قوة عضلية): يعاني اللاعب من عجز واضح في القوة العضلية الانقباضية الصافية (Concentric Force Deficit). يُنصح بشدة بإدراج تدريبات القوة القصوى للجزء السفلي (كالقرفصاء الخلفي Squats والرفعة المميتة Deadlifts بأوزان >80% 1RM) لبناء أساس عضلي قوي يدعم دفع الأرض وإنتاج القدرة الانفجارية.\n\n";
    }

    return report;
  };

  const generateUnifiedDiagnosticEN = () => {
    if (!sjNoArms && !cmjNoArms && !sjArms && !cmjArms && !approachJump) {
      return "Please log all 5 vertical jump tests (Squat Jump and CMJ with & without arms, and Approach Jump) to generate an integrated biomechanical report.";
    }

    let report = "";
    
    // Tendons & SSC Efficiency (EUR)
    if (eur > 0) {
      if (eur >= 1.05 && eur <= 1.15) {
        report += `✨ EUR Index: Balanced (Muscles & Tendons) (${eur.toFixed(2)} | +${eurPctDiff.toFixed(1)}%)\nThe athlete exhibits an excellent balance between pure muscular strength and tendon elasticity. This optimal range (5% to 15% increase in CMJ over SJ) indicates high stretch-shortening cycle (SSC) efficiency and great utilization of elastic energy.\n\n`;
      } else if (eur < 1.05) {
        report += `🔴 EUR Index: Tendon Deficit / Poor SSC (${eur.toFixed(2)} | ${eurPctDiff >= 0 ? '+' : ''}${eurPctDiff.toFixed(1)}%)\nThe ratio is low (less than 5%)${eur < 1.00 ? ', and in a critical state where Squat Jump is greater than CMJ (EUR < 1.00)' : ''}. This indicates the athlete relies entirely on their muscles and concentric strength, but has a clear deficit in tendon stiffness and stretch-shortening cycle (SSC) efficiency. Focus on rapid plyometrics immediately.\n\n`;
      } else {
        report += `⚠️ EUR Index: Concentric Force Deficit (${eur.toFixed(2)} | +${eurPctDiff.toFixed(1)}%)\nThe ratio is high (above 15%). The athlete relies solely on tendon elasticity and recoil, and suffers from a clear deficit in raw concentric muscle force. Heavy resistance training (>80% 1RM) is highly recommended.\n\n`;
      }
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

    // New summary recommendation block for weak tendon or strength performance
    const isWeakTendon = (eur > 0 && eur < 1.05) || (latestRsi > 0 && latestRsi < 1.5);
    const isWeakForce = (eur > 0 && eur > 1.15) || (cmjNoArms > 0 && cmjNoArms < 35);

    if (isWeakTendon && isWeakForce) {
      report += "💡 Key Recommendation (General Conditioning): The athlete exhibits general deficits in both tendon elasticity (reactive capacity) and raw muscular force. A comprehensive General Physical Preparation (GPP) phase is highly recommended, combining compound strength work with low-intensity plyometrics to establish a safe joint and tendon baseline.\n\n";
    } else if (isWeakTendon) {
      report += "💡 Key Recommendation (Tendon Stiffness): The athlete shows a clear deficit in tendon stiffness and elastic recoil (Tendon/SSC Deficit). Focus on fast-SSC plyometrics, light pogo hops, and rapid rebounds to train the tendons for efficient energy storage, recoil, and minimized ground contact times.\n\n";
    } else if (isWeakForce) {
      report += "💡 Key Recommendation (Muscular Strength): The athlete exhibits a concentric muscular force deficit. Heavy lower-body resistance training (e.g., squats and deadlifts at >80% 1RM) is strongly recommended to build a solid muscular engine to support takeoff thrust.\n\n";
    }

    return report;
  };

  const unifiedDiagnosticText = language === 'en' ? generateUnifiedDiagnosticEN() : generateUnifiedDiagnostic();

  const generateDetailedPrescription = () => {
    const isEn = language === 'en';
    
    // Determine level
    let level = "";
    let levelBadge = "";
    let levelColor = "";
    
    if (heightCm >= 65 || latestRsiVal >= 2.5 || relativePower >= 65) {
      level = isEn ? "Elite Athlete (National/Professional Level)" : "لاعب فئة النخبة (مستوى محترف/منتخب)";
      levelBadge = isEn ? "Elite" : "النخبة";
      levelColor = "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
    } else if (heightCm >= 50 || latestRsiVal >= 1.8 || relativePower >= 52) {
      level = isEn ? "Advanced Athlete (High Performance Level)" : "لاعب متقدم (مستوى أداء عالٍ)";
      levelBadge = isEn ? "Advanced" : "متقدم";
      levelColor = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    } else if (heightCm >= 35 || latestRsiVal >= 1.2 || relativePower >= 38) {
      level = isEn ? "Intermediate Athlete (Developmental Level)" : "لاعب متوسط (مستوى تطويري)";
      levelBadge = isEn ? "Intermediate" : "متوسط";
      levelColor = "text-orange-400 border-orange-500/30 bg-orange-500/10";
    } else {
      level = isEn ? "Beginner / Needs Foundation (General Physical Prep)" : "لاعب مبتدئ / يحتاج تأسيس بدني عام";
      levelBadge = isEn ? "Beginner" : "مبتدئ";
      levelColor = "text-red-400 border-red-500/30 bg-red-500/10";
    }

    // Determine Strengths
    const strengths = [];
    if (eur >= 1.05 && eur <= 1.15) {
      strengths.push(isEn ? "Optimal Muscle-Tendon Balance (EUR in 1.05-1.15 range)" : "توازن مثالي بين القوة العضلية ومطاطية الأوتار (EUR 1.05-1.15)");
    } else if (eur > 1.15) {
      strengths.push(isEn ? "Excellent Tendon Elasticity & Recoil capacity" : "مرونة أوتار ممتازة وقدرة ارتداد عالية");
    }
    if (armSwing >= 10 && armSwing <= 15) {
      strengths.push(isEn ? "Optimal Arm-Leg Coordination (10%-15% arm swing boost)" : "توافق ممتاز بين حركة الذراعين والأرجل (10%-15% مساهمة الذراعين)");
    }
    if (velocityConversion >= 10) {
      strengths.push(isEn ? "Efficient Horizontal-to-Vertical Speed Conversion" : "كفاءة عالية في تحويل السرعة الأفقية إلى عمودية في الاقتراب");
    }
    if (latestRsiVal >= 2.0) {
      strengths.push(isEn ? "Elite Ankle Stiffness & Reactive Capacity (RSI >= 2.0)" : "صلابة كاحل ممتازة وقوة تفاعلية عالية (RSI >= 2.0)");
    }
    if (relativePower >= 52) {
      strengths.push(isEn ? "High Relative Power-to-Weight Ratio" : "كثافة قدرة ميكانيكية عالية بالنسبة للوزن");
    }
    if (heightCm >= 55) {
      strengths.push(isEn ? "Strong explosive vertical capacity" : "قدرة انفجارية عمودية قوية");
    }
    if (strengths.length === 0) {
      strengths.push(isEn ? "Needs to build foundational capacity" : "يحتاج إلى بناء الأساسيات البيوميكانيكية العامة أولاً");
    }

    // Determine Primary Deficit, Prescription, Projection, and Timeline
    let deficit = "";
    let prescription = "";
    let projection = "";
    let timeline = "";
    let deficitLabel = "";

    // Prioritize deficits
    if (heightCm < 35 || relativePower < 38 || (eur > 1.15 && heightCm < 50)) {
      // Concentric Deficit
      deficitLabel = isEn ? "Concentric Force Deficit" : "عجز في القوة العضلية الانقباضية الصافية";
      deficit = isEn 
        ? "The athlete lacks raw concentric force production. While tendon elasticity may be utilized, the muscular foundation is insufficient to generate high vertical takeoff velocity."
        : "يعاني اللاعب من ضعف صريح في القوة الانقباضية الصافية للعضلات (Concentric Force)؛ حتى وإن كانت أوتاره مطاطية، فإنه يفتقر إلى الأساس العضلي القوي اللازم لدفع الأرض بقوة.";
      
      prescription = isEn
        ? "Focus on heavy resistance training. Exercises: Back Squats (3-5 sets of 4-6 reps at >80% 1RM), Hex Bar Deadlifts, Leg Press. Focus on explosive intent during the concentric phase (intent to accelerate)."
        : "التركيز على تمارين القوة القصوى والحديد لبناء كتلة عضلية فعالة. التمارين: Squats خلفي (3-5 مجموعات، 4-6 تكرارات بوزن >80% من 1RM)، Hex Bar Deadlifts، مع التركيز على تسريع الوزن بأقصى قوة في مرحلة الصعود.";
      
      projection = isEn
        ? "Expected increase of +5 to +8 cm (+2.0\" to +3.1\") in standard CMJ height."
        : "تحسن متوقع في قفزة CMJ بمقدار +5 إلى +8 سم (+2.0 إلى +3.1 إنش).";
      
      timeline = isEn ? "6 - 8 Weeks" : "6 - 8 أسابيع";
    } else if (eur < 1.05 || (latestRsiVal > 0 && latestRsiVal < 1.5)) {
      // Tendon / SSC Deficit
      deficitLabel = isEn ? "Tendon Stiffness / SSC Deficit" : "ضعف في صلابة الأوتار ودورة التمدد والتقصير (SSC)";
      deficit = isEn
        ? "The athlete is 'muscle-bound' and relies heavily on slow, active muscle contraction rather than using the elastic stretch-shortening cycle (SSC) of the tendons. EUR index is low (<1.05)."
        : "اللاعب يعتمد بالكامل على عضلاته ولديه ضعف صريح في كفاءة الأوتار ومطاطيتها واستغلال طاقة الارتداد (EUR < 1.05)، مما يزيد من زمن التلامس مع الأرض ويقلل من القوة الانفجارية السريعة.";
      
      prescription = isEn
        ? "Focus on plyometrics and reactive stiffness. Exercises: Fast Pogo Jumps, Hurdle Hops, Drop Jumps (from 30cm box with minimal ground contact time < 0.2s), assisted jumps."
        : "التركيز على تدريبات البلايومترك السريع لتنشيط الأوتار وزيادة صلابة الكاحل. التمارين: Pogo Jumps سريعة، Hurdle Hops، Drop Jumps (سقوط من صندوق 30 سم والقفز الفوري بأقل زمن تلامس < 0.2 ثانية).";
      
      projection = isEn
        ? "Improvement of EUR ratio to the optimal 1.05-1.10 zone, and +0.3 to +0.5 increase in RSI score."
        : "تحسن في مؤشر EUR ليصل للمدى المثالي (1.05-1.10) وزيادة في مؤشر RSI بمقدار +0.3 إلى +0.5 وحدة.";
      
      timeline = isEn ? "4 - 6 Weeks" : "4 - 6 أسابيع";
    } else if (armSwing < 10) {
      // Arm-Leg Coordination Deficit
      deficitLabel = isEn ? "Upper-Lower Body Coordination Deficit" : "عجز التنسيق الحركي بين الذراعين والأرجل";
      deficit = isEn
        ? "Poor neuromuscular coordination. The athlete fails to synchronize the arm swing momentum with lower body takeoff drive, losing up to 10% of potential jump height."
        : "ضعف التوافق العضلي العصبي؛ لا يستطيع اللاعب مزامنة سرعة أرجحة الذراعين مع الدفع الحركي للجزء السفلي عند الارتقاء، مما يفقده حوالي 10% من ارتفاع قفزته المحتمل.";
      
      prescription = isEn
        ? "Focus on arm swing mechanics and timing. Exercises: Standing arm swing drills with light dumbbells (1-2 kg), wall jump drills focusing on arm extension, and conscious CMJ technique rehearsals."
        : "تدريبات تحسين تكنيك وتوقيت أرجحة الذراعين. التمارين: أرجحة ذراعين من الثبات بأوزان خفيفة (1-2 كجم)، تدريبات القفز بجانب الحائط مع امتداد كامل للذراعين، تكرار قفزة CMJ مع التركيز على توقيت الدفع.";
      
      projection = isEn
        ? "Immediate boost of +3 to +5 cm (+1.2\" to +2.0\") in vertical jump height through improved motor coordination."
        : "زيادة فورية في ارتفاع القفز بمقدار +3 إلى +5 سم (+1.2 إلى +2.0 إنش) بمجرد إتقان التوافق العصبي الحركي للذراعين.";
      
      timeline = isEn ? "2 - 3 Weeks" : "2 - 3 أسابيع";
    } else if (velocityConversion < 10 && approachJump > 0) {
      // Velocity Conversion Deficit
      deficitLabel = isEn ? "Horizontal-to-Vertical Velocity Conversion Deficit" : "عجز في تحويل السرعة الأفقية لعمودية";
      deficit = isEn
        ? "The athlete cannot transfer horizontal run-up momentum into vertical lift. This is usually due to weak deceleration capacity in the penultimate step or poor takeoff angle mechanics."
        : "يعاني اللاعب من صعوبة تحويل سرعة الاقتراب والجري إلى ارتقاء رأسي عمودي؛ الخطوة قبل الأخيرة (Penultimate Step) تفتقر للفرملة السريعة والتحويل الزاوي الصحيح.";
      
      prescription = isEn
        ? "Focus on deceleration, braking, and takeoff mechanics. Exercises: Penultimate step approach drills, single-leg jump takeoffs, horizontal bounds to immediate vertical leap, depth drops."
        : "التركيز على تكنيك الخطوة قبل الأخيرة والفرملة السريعة. التمارين: تدريبات الاقتراب من خطوتين وثلاث خطوات، الحجل الأفقي ثم الارتقاء العمودي الفوري، وتدريبات ثبات وتكنيك الارتقاء الأحادي.";
      
      projection = isEn
        ? "Expected increase of +6 to +10 cm (+2.4\" to +3.9\") in Approach Jump height."
        : "تحسن متوقع في قفزة الاقتراب (Approach Jump) بمقدار +6 إلى +10 سم (+2.4 إلى +3.9 إنش).";
      
      timeline = isEn ? "6 Weeks" : "6 أسابيع";
    } else {
      // General Physical Base Deficit
      deficitLabel = isEn ? "General Physical Base Deficit" : "الحاجة لبناء قاعدة إعداد بدني عام";
      deficit = isEn
        ? "Foundational strength and landing mechanics are suboptimal. Needs general physical conditioning to establish a baseline before specialized reactive training."
        : "عناصر القوة العامة وتكنيك الهبوط بحاجة لتطوير؛ يجب تأسيس اللاعب بدنياً وتهيئة مفاصله حركياً لحمايته من الإصابات قبل البدء في تدريبات عالية الشدة.";
      
      prescription = isEn
        ? "General physical preparation (GPP). Exercises: Core strengthening, bodyweight squats and lunges, goblet squats, landing mechanics training (jumping from a low box and holding a stable landing pose)."
        : "برنامج إعداد بدني عام (GPP). التمارين: تقوية عضلات الجذع، squats و lunges بوزن الجسم، تمارين الهبوط السليم (القفز الخفيف والثبات لـ 3 ثوانٍ بوضع متوازن).";
      
      projection = isEn
        ? "Improvement of +3 to +5 cm in jump height with significantly enhanced landing stability and reduced injury risk."
        : "زيادة عامة في جودة الحركة وتكامل الارتقاء (+3 إلى +5 سم) مع تحسين ثبات الهبوط وتقليل مخاطر الإصابة.";
      
      timeline = isEn ? "8 - 10 Weeks" : "8 - 10 أسابيع";
    }

    return {
      level,
      levelBadge,
      levelColor,
      strengths,
      deficitLabel,
      deficit,
      prescription,
      projection,
      timeline
    };
  };

  const jumpTestsConfig = [
    {
      type: 'sj_no_arms',
      nameAr: 'وثبة ثبات بدون أذرع (Squat Jump - No Arms)',
      nameEn: 'Squat Jump (No Arms)',
      value: sjNoArms,
      record: sjNoArmsRecord,
      icon: '🏋️‍♂️',
      desc: 'اختبار القفز من الثبات بدون أرجحة ذراعين. يقيس القوة الانقباضية الصافية للعضلات (Concentric Force Output) دون استغلال الطاقة المطاطية للأوتار.',
      importance: 'حاسم لتقييم قوة العضلات الصافية وعزل مساهمة الأوتار. ضعف هذا الرقم يشير إلى نقص القوة العضلية الانقباضية الصرفة.',
      benchmarks: [
        { label: 'نخبة أولمبية 👑', value: age < 17 ? '+24.0"' : '+29.0" (النساء: +22.0")' },
        { label: 'ممتاز 🏆', value: age < 17 ? '21.0" - 24.0"' : '25.0" - 28.9" (النساء: 18.0" - 21.9")' },
        { label: 'جيد ⭐', value: age < 17 ? '18.0" - 21.0"' : '21.0" - 24.9" (النساء: 15.0" - 17.9")' },
        { label: 'مقبول ⚡', value: age < 17 ? '15.0" - 18.0"' : '18.0" - 20.9" (النساء: 12.0" - 14.9")' },
        { label: 'تحت المتوسط ⚠️', value: age < 17 ? '<15.0"' : '<18.0" (النساء: <12.0")' }
      ],
      tips: [
        'تمارين القرفصاء من الثبات (Pause Squats 3s).',
        'تدريبات القوة الانفجارية من السكون (Dead-stop Squats / Pin Squats).',
        'تمارين دفع الأوزان الثقيلة (Leg Press >85% 1RM).'
      ]
    },
    {
      type: 'cmj_no_arms',
      nameAr: 'وثبة ارتداد بدون أذرع (CMJ - No Arms)',
      nameEn: 'Countermovement Jump (No Arms)',
      value: cmjNoArms,
      record: cmjNoArmsRecord,
      icon: '⚡',
      desc: 'وثبة ارتداد مع ثني الركبتين وبدون أذرع. تقيس كفاءة دورة التمدد والتقصير (SSC) ومطاطية أوتار الجزء السفلي بشكل معزول.',
      importance: 'تساعد في تحديد قدرة الأوتار على تخزين وإطلاق الطاقة المطاطية دون مساعدة الجزء العلوي. تستخدم لمقارنتها مع Squat Jump لحساب الـ EUR.',
      benchmarks: [
        { label: 'نخبة أولمبية 👑', value: age < 17 ? '+26.0"' : '+31.0" (النساء: +24.0")' },
        { label: 'ممتاز 🏆', value: age < 17 ? '22.0" - 26.0"' : '27.0" - 30.9" (النساء: 20.0" - 23.9")' },
        { label: 'جيد ⭐', value: age < 17 ? '19.0" - 22.0"' : '23.0" - 26.9" (النساء: 16.0" - 19.9")' },
        { label: 'مقبول ⚡', value: age < 17 ? '16.0" - 19.0"' : '19.0" - 22.9" (النساء: 13.0" - 15.9")' },
        { label: 'تحت المتوسط ⚠️', value: age < 17 ? '<16.0"' : '<19.0" (النساء: <13.0")' }
      ],
      tips: [
        'تمارين البلايومترك السريع (Countermovement Jumps with stick landing).',
        'الحجل والقفز المتتالي بوزن الجسم (Pogo Jumps).',
        'تدريبات السقوط والارتداد الخفيفة.'
      ]
    },
    {
      type: 'sj_arms',
      nameAr: 'وثبة ثبات باليدين (Squat Jump - With Arms)',
      nameEn: 'Squat Jump (With Arms)',
      value: sjArms,
      record: sjArmsRecord,
      icon: '🙌',
      desc: 'قفز من الثبات مع أرجحة ذراعين كاملة. يربط القوة العضلية الصافية للجزء السفلي مع حركة التنسيق للجزء العلوي.',
      importance: 'يقيس التوافق الحركي بين أرجحة الأذرع والقوة العضلية البسيطة. يساعد في عزل التنسيق الحركي للذراعين عن مرونة الأوتار.',
      benchmarks: [
        { label: 'نخبة أولمبية 👑', value: age < 17 ? '+27.0"' : '+33.0" (النساء: +25.0")' },
        { label: 'ممتاز 🏆', value: age < 17 ? '24.0" - 27.0"' : '29.0" - 32.9" (النساء: 21.0" - 24.9")' },
        { label: 'جيد ⭐', value: age < 17 ? '20.0" - 24.0"' : '25.0" - 28.9" (النساء: 17.0" - 20.9")' },
        { label: 'مقبول ⚡', value: age < 17 ? '17.0" - 20.0"' : '21.0" - 24.9" (النساء: 14.0" - 16.9")' },
        { label: 'تحت المتوسط ⚠️', value: age < 17 ? '<17.0"' : '<21.0" (النساء: <14.0")' }
      ],
      tips: [
        'تمارين القرفصاء السريع مع دفع اليدين لأعلى.',
        'تدريبات التنسيق العصبي العضلي للأطراف.',
        'تمارين أرجحة الذراعين المحملة بدمبلز خفيفة.'
      ]
    },
    {
      type: 'cmj_arms',
      nameAr: 'وثبة ارتداد باليدين (CMJ - With Arms)',
      nameEn: 'Countermovement Jump (With Arms)',
      value: cmjArms,
      record: cmjArmsRecord,
      icon: '🚀',
      desc: 'الوثب الارتدادي المعتاد بمساعدة الأذرع. يمثل القفز الطبيعي بأقصى أداء حركي متاح للاعب.',
      importance: 'الارتقاء الأقصى الأساسي للرياضيين. يجمع بين كفاءة الأوتار وقوة العضلات والتنسيق الحركي للأذرع لتحقيق أعلى طيران عمودي ممكن.',
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
    },
    {
      type: 'approach',
      nameAr: 'وثبة الاقتراب بالتجميع (Approach Jump)',
      nameEn: 'Approach Jump',
      value: approachJump,
      record: approachRecord,
      icon: '🏃‍♂️',
      desc: 'الارتقاء بالاقتراب وجري خطوتين أو أكثر والتجميع للارتقاء لأعلى نقطة. يقيس مدى كفاءة اللاعب في تحويل السرعة الأفقية إلى عمودية.',
      importance: 'حاسم للاعبي الكرة الطائرة وكرة السلة للارتقاء الفعلي أثناء اللعب. يقيم قدرة الجهاز الهيكلي العصبي العضلي على دمج القوة الأفقية بالعمودية.',
      benchmarks: [
        { label: 'نخبة أولمبية 👑', value: age < 17 ? '+32.0"' : '+38.0" (النساء: +30.0")' },
        { label: 'ممتاز 🏆', value: age < 17 ? '28.0" - 32.0"' : '33.0" - 37.9" (النساء: 25.0" - 29.9")' },
        { label: 'جيد ⭐', value: age < 17 ? '24.0" - 28.0"' : '29.0" - 32.9" (النساء: 21.0" - 24.9")' },
        { label: 'مقبول ⚡', value: age < 17 ? '20.0" - 24.0"' : '25.0" - 28.9" (النساء: 18.0" - 20.9")' },
        { label: 'تحت المتوسط ⚠️', value: age < 17 ? '<20.0"' : '<25.0" (النساء: <18.0")' }
      ],
      tips: [
        'تدريب خطوة الاقتراب قبل الأخيرة (Penultimate Step) والارتقاء السريع.',
        'تمارين الوثب المتعدد الأفقي والعمودي (Bounds and Hurdles).',
        'تدريبات السرعة والانفجار العضلي للأطراف السفلى.'
      ]
    }
  ];

  const getTranslatedConfig = (lang) => {
    return jumpTestsConfig.map(test => {
      let desc = test.desc;
      let importance = test.importance;
      let tips = test.tips;
      let name = lang === 'en' ? test.nameEn : test.nameAr.split('(')[0].trim();
      let benchmarks = test.benchmarks;
      
      if (lang === 'en') {
        if (test.type === 'sj_no_arms') {
          desc = 'Squat jump testing without arm swing. Measures pure concentric muscle force output without utilizing elastic tendon energy.';
          importance = 'Crucial for isolating concentric strength. Low scores point to raw force deficits.';
          tips = [
            'Pause squats from static position (3s pause).',
            'Explosive strength from static start (Dead-stop / Pin Squats).',
            'Heavy lower body pressing (Leg Press >85% 1RM).'
          ];
        } else if (test.type === 'cmj_no_arms') {
          desc = 'Countermovement jump testing without arm swing. Measures Stretch-Shortening Cycle (SSC) efficiency and lower body elastic tendon capacity.';
          importance = 'Helps determine elastic storage capacity without upper body assistance. Used to calculate EUR relative to Squat Jump.';
          tips = [
            'Rapid plyometric training (Countermovement Jumps with stick landing).',
            'Rhythmic vertical bounding (Pogo Jumps).',
            'Low box drop landing drills.'
          ];
        } else if (test.type === 'sj_arms') {
          desc = 'Squat jump testing with full arm swing. Connects lower body concentric power with upper body coordination.';
          importance = 'Measures motor coordination between arm swing and simple muscle force. Helps isolate arm coordination from tendon elasticity.';
          tips = [
            'Fast squats with upward hand drive.',
            'Upper-lower body neuromuscular coordination exercises.',
            'Weighted arm swings with light dumbbells.'
          ];
        } else if (test.type === 'cmj_arms') {
          desc = 'Standard countermovement jump with arm swing. Represents standard vertical jump capacity.';
          importance = 'The primary vertical leap for athletes. Integrates tendon elasticity, muscle power, and arm coordination for max height.';
          tips = [
            'Weighted jump squats (30% 1RM).',
            'Max strength training (Back Squats 85%+ 1RM).',
            'Single leg bounds and vertical drives.'
          ];
        } else if (test.type === 'approach') {
          desc = 'Approach jump testing with 2+ steps approach. Measures coordination and transfer of horizontal speed to vertical height.';
          importance = 'Vital for volleyball and basketball players during active gameplay. Assesses capacity to convert horizontal velocity to vertical leap.';
          tips = [
            'Penultimate step acceleration and fast takeoff drills.',
            'Horizontal to vertical bounding and hurdle jumps.',
            'Explosive sprinting and reactive drop jumps.'
          ];
        }
        
        benchmarks = test.benchmarks.map(b => {
          let label = b.label;
          if (label === 'نخبة أولمبية 👑') label = 'Olympic Elite 👑';
          else if (label === 'ممتاز 🏆') label = 'Excellent 🏆';
          else if (label === 'جيد ⭐') label = 'Good ⭐';
          else if (label === 'مقبول ⚡') label = 'Acceptable ⚡';
          else if (label === 'تحت المتوسط ⚠️') label = 'Below Average ⚠️';
          
          let value = b.value.replace('النساء:', 'Women:');
          return { label, value };
        });
      }
      
      return {
        ...test,
        name,
        desc,
        importance,
        benchmarks,
        tips
      };
    });
  };

  // Calculate overall rating (Biomechanical Score)
  const overallRating = maxRsi > 0 
    ? Math.round((evalHeight.progress + evalFlight.progress + evalPower.progress + evalRsi.progress) / 4)
    : Math.round((evalHeight.progress + evalFlight.progress + evalPower.progress) / 3);

  const tabs = [
    { id: 'overview', name: language === 'en' ? 'Overview' : 'الملخص الحركي', icon: Trophy },
    { id: 'biomechanics', name: language === 'en' ? 'Mechanical Models' : 'النماذج الحركية والقدرة', icon: Zap },
    { id: 'critique', name: language === 'en' ? 'Diagnostics' : 'التشخيص ونقاط التطوير', icon: Target },
    { id: 'history', name: language === 'en' ? 'History Log' : 'سجل القياسات الكامل', icon: FileText }
  ];

  const [selectedMetric, setSelectedMetric] = useState(null);

  const hasHistory = cmjArms > 0 || cmjNoArms > 0 || sjNoArms > 0;
  const chartCmjArms = cmjArms > 0 ? cmjArms : (hasHistory ? 0 : 49.6);
  const chartCmjNoArms = cmjNoArms > 0 ? cmjNoArms : (hasHistory ? 0 : 41.4);
  const chartSjNoArms = sjNoArms > 0 ? sjNoArms : (hasHistory ? 0 : 40.4);

  const maxChartVal = Math.max(chartCmjArms, chartCmjNoArms, chartSjNoArms, 50);
  const chartScale = 110 / maxChartVal;

  return (
    <div className={`space-y-6 relative ${language === 'en' ? 'text-left' : 'text-right'}`} style={{ direction: language === 'en' ? 'ltr' : 'rtl' }}>
      
      {/* Inject custom printable CSS styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');

        @media print {
          html, body, #root, #root > div, main, .app-container {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          /* Hide screen-only components */
          header, nav, .floating-dock, button, .tabs-container, .screen-only, .print-btn {
            display: none !important;
          }
          
          body, .print-report-sheet, .print-report-sheet * {
            font-family: 'Cairo', sans-serif !important;
          }
          
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Show print report */
          .print-report-sheet {
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 20px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }

          /* ============================================== */
          /* PRINT SIMPLE STYLES                            */
          /* ============================================== */
          .print-simple {
            border: 2px solid #1f2937 !important;
            border-radius: 12px !important;
            padding: 30px !important;
          }
          
          .print-simple .print-header {
            border-bottom: 3px double #000000 !important;
            padding-bottom: 15px !important;
            margin-bottom: 25px !important;
          }
          
          .print-simple .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-top: 15px !important;
          }

          .print-simple .print-table th, .print-simple .print-table td {
            border: 1px solid #999999 !important;
            padding: 8px !important;
            text-align: center !important;
          }

          .print-simple .print-table th {
            background-color: #f3f4f6 !important;
            color: #000000 !important;
          }

          .print-simple .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }

          /* ============================================== */
          /* PRINT INFOGRAPHICS STYLES                       */
          /* ============================================== */
          .print-infographics {
            border: none !important;
            padding: 10px !important;
          }

          /* Sporty Orange Accent Theme */
          .print-infographics .text-orange-primary {
            color: #ff6b00 !important;
          }

          .print-infographics .bg-orange-primary {
            background-color: #ff6b00 !important;
          }

          .print-infographics .border-orange-primary {
            border-color: #ff6b00 !important;
          }

          /* Slate structures */
          .print-infographics .slate-card {
            border: 1.5px solid #4b5563 !important;
            border-radius: 16px !important;
            background-color: #fcfdfe !important;
            padding: 16px !important;
            margin-bottom: 16px !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
          }

          /* Grid dashboard items */
          .print-infographics .dashboard-grid-2 {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }

          .print-infographics .dashboard-grid-3 {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
          }

          /* Dynamic Table in Infographics */
          .print-infographics .info-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: 1px solid #d1d5db !important;
            border-radius: 8px !important;
            overflow: hidden !important;
          }

          .print-infographics .info-table th {
            background-color: #ff6b00 !important;
            color: #ffffff !important;
            font-weight: 900 !important;
            padding: 10px !important;
            border: 1px solid #ff6b00 !important;
          }

          .print-infographics .info-table td {
            padding: 10px !important;
            border: 1px solid #e5e7eb !important;
            text-align: center !important;
          }

          .print-infographics .info-table tr:nth-child(even) {
            background-color: #f9fafb !important;
          }

          /* Diagnostic Callout Crimson Box */
          .print-infographics .crimson-callout {
            border-right: 5px solid #dd6b20 !important;
            background-color: #fffaf0 !important;
            border-top: 1.5px solid #fbd38d !important;
            border-bottom: 1.5px solid #fbd38d !important;
            border-left: 1.5px solid #fbd38d !important;
            padding: 15px !important;
            border-radius: 12px !important;
            margin-bottom: 16px !important;
          }
          
          /* LTR correction for English layouts */
          .print-infographics .ltr-direction {
            direction: ltr !important;
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
            
            <div className={`text-center ${language === 'en' ? 'sm:text-left' : 'sm:text-right'}`}>
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mb-1.5">
                <h2 className="text-3xl font-black text-white leading-none">{activePlayer.full_name}</h2>
                {overallRating >= 85 ? (
                  <span className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] px-2.5 py-1 rounded-xl font-black flex items-center gap-1">
                    <Award size={12} /> {language === 'en' ? 'Elite Rating' : 'تصنيف النخبة'}
                  </span>
                ) : overallRating >= 70 ? (
                  <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-1 rounded-xl font-black flex items-center gap-1">
                    <Award size={12} /> {language === 'en' ? 'Excellent Rating' : 'تصنيف ممتاز'}
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
            {onEditPlayer && (
              <button 
                onClick={() => onEditPlayer(activePlayer)} 
                className="px-4 py-3 bg-slate-900/80 hover:bg-slate-800 text-gray-300 border border-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs cursor-pointer shadow-md"
              >
                <Edit3 size={14} className="text-cyan-400" /> {language === 'en' ? 'Edit Profile' : 'تعديل البيانات'}
              </button>
            )}
            <button onClick={() => setShowBenchmarks(true)} className="px-4 py-3 bg-slate-900/80 hover:bg-slate-800 text-gray-300 border border-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs cursor-pointer shadow-md">
              <BookOpen size={14} className="text-cyan-400" /> {language === 'en' ? 'Normative Tables' : 'الجداول المعيارية'}
            </button>
             <button onClick={() => setIsPrintModalOpen(true)} className="px-5 py-3 btn-orange-gradient rounded-xl font-black flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] text-xs cursor-pointer shadow-lg">
              <Download size={14} /> {language === 'en' ? 'Export PDF Report' : 'تصدير تقرير PDF'}
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
                    <h3 className="text-sm font-bold text-gray-400 mb-6">{language === 'en' ? 'Overall Biomechanical Score' : 'الكفاءة البيوميكانيكية العامة'}</h3>
                    
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
                      {language === 'en' ? 'Jump mechanical fitness level based on weight and flight time.' : 'مستوى اللياقة الميكانيكية للارتقاء بناءً على وزن اللاعب وزمن الطيران.'}
                    </p>
                  </div>

                  {/* Core Metric Visual Cards */}
                  <div className="lg:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
                    
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
                      className="bg-[#111827]/30 border border-gray-850 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-between hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold">الوثبة الانفجارية القصوى</span>
                          <span className="text-cyan-400 bg-cyan-950/20 border border-cyan-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">CMJ</span>
                        </div>
                        <div className="flex items-baseline gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 flex-wrap">
                          <span className="text-2xl sm:text-4xl font-black text-white font-mono">{heightInches}</span>
                          <span className="text-gray-400 font-bold text-[10px] sm:text-xs">إنش</span>
                          <span className="text-gray-500 text-[9px] sm:text-xs font-mono">({heightCm} cm)</span>
                        </div>
                        <p className={`text-[10px] sm:text-xs font-bold ${evalHeight.color}`}>{evalHeight.text}</p>
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
                      className="bg-[#111827]/30 border border-gray-855 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-between hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold">زمن الطيران المعلق</span>
                          <span className="text-teal-400 bg-teal-950/20 border border-teal-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">Flight</span>
                        </div>
                        <div className="flex items-baseline gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 flex-wrap">
                          <span className="text-2xl sm:text-4xl font-black text-white font-mono">{flightTime.toFixed(3)}</span>
                          <span className="text-gray-400 font-bold text-[10px] sm:text-xs">ثانية</span>
                        </div>
                        <p className={`text-[10px] sm:text-xs font-bold ${evalFlight.color}`}>{evalFlight.text}</p>
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
                      className="bg-[#111827]/30 border border-gray-855 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-between hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold">كثافة القدرة الميكانيكية</span>
                          <span className="text-purple-400 bg-purple-950/20 border border-purple-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">W/kg</span>
                        </div>
                        <div className="flex items-baseline gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 flex-wrap">
                          <span className="text-2xl sm:text-4xl font-black text-white font-mono">{relativePower > 0 ? relativePower : (harmanPeak / mass).toFixed(1)}</span>
                          <span className="text-gray-400 font-bold text-[10px] sm:text-xs">W/kg</span>
                        </div>
                        <p className={`text-[10px] sm:text-xs font-bold ${evalPower.color}`}>{evalPower.text}</p>
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
                      className="bg-[#111827]/30 border border-gray-855 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-between hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer select-none"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold">مؤشر الارتداد التفاعلي</span>
                          <span className="text-yellow-500 bg-yellow-950/20 border border-yellow-800/30 text-[9px] px-2 py-0.5 rounded-lg font-bold">RSI</span>
                        </div>
                        <div className="flex items-baseline gap-1 sm:gap-1.5 mb-1 sm:mb-1.5 flex-wrap">
                          <span className="text-2xl sm:text-4xl font-black text-white font-mono">{latestRsiVal > 0 ? latestRsiVal.toFixed(2) : (maxRsi > 0 ? maxRsi.toFixed(2) : '—')}</span>
                          <span className="text-gray-400 font-bold text-[10px] sm:text-xs">Index</span>
                        </div>
                        <p className={`text-[10px] sm:text-xs font-bold ${evalRsi.color}`}>{evalRsi.text}</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
                  <div className="bg-black/25 border border-gray-800/60 p-3 sm:p-4 rounded-2xl text-center">
                    <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold block mb-1">الوصول الأقصى للارتقاء 🏐</span>
                    <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">{maxReachCmj || '—'} <span className="text-[10px] sm:text-xs text-gray-500">سم</span></span>
                  </div>
                  <div className="bg-black/25 border border-gray-800/60 p-3 sm:p-4 rounded-2xl text-center">
                    <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold block mb-1">مؤشر الإنجاز البدني للوثب</span>
                    <span className="text-xl sm:text-2xl font-black text-white font-mono">{heightCm.toFixed(1)} <span className="text-[10px] sm:text-xs text-gray-500">سم</span></span>
                  </div>
                  <div className="bg-black/25 border border-gray-800/60 p-3 sm:p-4 rounded-2xl text-center">
                    <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold block mb-1">مقارنة بأداء الجولة السابقة</span>
                    <span className={`text-xl sm:text-2xl font-black font-mono flex items-center justify-center gap-1 sm:gap-1.5 ${trendPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trendPct >= 0 ? `+${trendPct.toFixed(1)}` : trendPct.toFixed(1)} 
                      <span className="text-xs">{trendPct >= 0 ? '📈' : '📉'}</span>
                    </span>
                  </div>
                </div>

                {/* 5-Jump Profile Matrix Grid */}
                <div className="glass-panel p-6 shadow-lg space-y-4">
                  <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 border-b border-gray-800/85 pb-2.5 flex items-center justify-between">
                    <span>📊 مصفوفة اختبارات الوثب الخمسة (5-Jump Profile Matrix)</span>
                    <span className="text-[10px] text-gray-500 font-bold">آخر قراءة مسجلة لكل نوع اختبار (اضغط للتفاصيل)</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                    {getTranslatedConfig(language).map((test) => {
                      const valInches = parseFloat((test.value * 0.393701).toFixed(1));
                      const testEval = evaluateMetric('jump_in', valInches);
                      const dateStr = test.record ? new Date(test.record.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG') : (language === 'en' ? 'Not measured yet' : 'لم يقاس بعد');
                      return (
                        <div 
                          key={test.type}
                          onClick={() => setSelectedMetric({
                            title: test.name,
                            value: test.value > 0 ? `${valInches}" (${test.value.toFixed(1)} cm)` : '—',
                            rating: testEval.text,
                            ratingColor: testEval.color,
                            desc: test.desc,
                            importance: test.importance,
                            benchmarks: test.benchmarks,
                            tips: test.tips
                          })}
                          className="bg-black/20 border border-gray-850 hover:border-cyan-500/40 hover:bg-cyan-950/5 p-3.5 rounded-2xl flex flex-col justify-between transition-all cursor-pointer select-none"
                        >
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[14px]">{test.icon}</span>
                              <span className="text-[9px] text-gray-400 font-bold max-w-[80px] text-left truncate" title={test.nameEn}>{test.nameEn}</span>
                            </div>
                            <h4 className="text-[10px] text-gray-350 font-black mb-2 truncate" title={test.name}>{test.name}</h4>
                            {test.value > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-baseline gap-1 flex-wrap">
                                  <span className="text-xl sm:text-2xl font-black text-white font-mono">{valInches}</span>
                                  <span className="text-gray-500 text-[10px] font-bold">in</span>
                                  <span className="text-gray-455 font-mono text-[10px] mr-1">({test.value.toFixed(1)} cm)</span>
                                </div>
                                <span className={`text-[10px] font-black block ${testEval.color}`}>{testEval.text}</span>
                              </div>
                            ) : (
                              <div className="py-2">
                                <span className="text-xs text-gray-500 font-bold block">{language === 'en' ? 'Not Measured' : 'لم يقاس'}</span>
                                <span className="text-[9px] text-gray-600 block">{language === 'en' ? 'Click to view benchmarks' : 'اضغط لعرض المعايير'}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-3 pt-2 border-t border-gray-850/30 text-[8px] text-gray-500 font-mono">
                            📅 {dateStr}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* EUR Muscle-Tendon Balance Diagnostics Card */}
                {sjNoArms > 0 && cmjNoArms > 0 && (
                  <div className="glass-panel p-6 shadow-lg border border-cyan-950/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
                    
                    <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 border-b border-gray-800/80 pb-2.5 mb-4 flex items-center gap-2">
                      ⚖️ تشخيص توازن العضلات والأوتار (EUR Muscle-Tendon Diagnostics)
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                      {/* Left: Score board */}
                      <div className="bg-black/30 border border-gray-800 p-5 rounded-2xl text-center flex flex-col justify-center items-center">
                        <span className="text-xs text-gray-455 font-bold mb-2">مؤشر الاستغلال المطاطي (Elastic Utilization Ratio)</span>
                        <div className="flex items-baseline gap-1.5 justify-center mb-1">
                          <span className="text-5xl font-black text-white font-mono">{eur.toFixed(2)}</span>
                          <span className="text-gray-400 text-xs font-mono font-bold">Index</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full font-mono bg-white/5 ${
                            eur >= 1.05 && eur <= 1.15 ? 'text-emerald-400' : 'text-orange-400'
                          }`}>
                            {eurPctDiff >= 0 ? '+' : ''}{eurPctDiff.toFixed(1)}% فرق
                          </span>
                        </div>
                        <div className="mt-4 text-[10px] text-gray-450 leading-relaxed max-w-[200px]">
                          الهدف الرياضي النموذجي هو أن يزيد CMJ عن Squat Jump بنسبة <strong>5% إلى 15%</strong> (EUR: 1.05 - 1.15).
                        </div>
                      </div>

                      {/* Middle & Right: Diagnostics details */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="p-4 rounded-xl border bg-black/10 border-gray-805 space-y-2">
                          <span className="text-xs font-black text-white block">📋 {language === 'en' ? 'Physical & Physiological Balance Assessment:' : 'تقييم التوازن البدني والفسيولوجي:'}</span>
                          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                            {unifiedDiagnosticText.split('\n\n')[0]}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="bg-black/20 p-3.5 rounded-xl border border-gray-850">
                            <span className="text-[10px] text-gray-455 block mb-1">{language === 'en' ? 'Squat Jump (SJ - No Arms)' : 'ارتفاع ثبات بدون أذرع (SJ)'}</span>
                            <span className="text-base font-black text-white font-mono">{sjNoArms.toFixed(1)} <span className="text-xs text-gray-500 font-bold">{language === 'en' ? 'cm' : 'سم'}</span></span>
                          </div>
                          <div className="bg-black/20 p-3.5 rounded-xl border border-gray-850">
                            <span className="text-[10px] text-gray-455 block mb-1">{language === 'en' ? 'Countermovement Jump (CMJ - No Arms)' : 'ارتفاع ارتداد بدون أذرع (CMJ)'}</span>
                            <span className="text-base font-black text-white font-mono">{cmjNoArms.toFixed(1)} <span className="text-xs text-gray-500 font-bold">{language === 'en' ? 'cm' : 'سم'}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Physical Profile & Actionable Training Prescription Card */}
                {sjNoArms > 0 && cmjNoArms > 0 && (() => {
                  const presc = generateDetailedPrescription();
                  const isStandingReachValid = !isNaN(standingReachNum) && standingReachNum > 0;
                  const maxTouch = isStandingReachValid ? (standingReachNum + heightCm) : null;
                  return (
                    <>
                      <div className="glass-panel p-6 shadow-lg border border-cyan-950/40 relative overflow-hidden mt-6">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
                        
                        <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 border-b border-gray-800/80 pb-2.5 mb-4 flex items-center gap-2">
                          📋 {language === 'en' ? 'Physical Profile & Actionable Training Prescription' : 'التحليل الحركي والوصفة التدريبية المتكاملة'}
                        </h3>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Left Column: Level & Timeline */}
                          <div className="space-y-4">
                            {/* Athlete Level Badge */}
                            <div className="bg-black/30 border border-gray-800 p-5 rounded-2xl text-center flex flex-col justify-center items-center">
                              <span className="text-xs text-gray-400 font-bold mb-2">{language === 'en' ? 'Overall Athlete Level' : 'المستوى البدني العام'}</span>
                              <span className={`text-xs font-black px-4 py-2 rounded-xl border ${presc.levelColor} mb-2`}>
                                {presc.levelBadge}
                              </span>
                              <p className="text-[10px] text-gray-400 leading-relaxed font-bold mt-1 text-center">
                                {presc.level}
                              </p>
                            </div>

                            {/* Projection & Timeline Badge */}
                            <div className="bg-black/30 border border-gray-800 p-5 rounded-2xl text-center flex flex-col justify-center items-center">
                              <span className="text-xs text-gray-400 font-bold mb-1">{language === 'en' ? 'Improvement Timeline' : 'التحسن والجدول الزمني'}</span>
                              <span className="text-base font-black text-cyan-400 font-mono mb-1">{presc.timeline}</span>
                              <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                                {presc.projection}
                              </p>
                            </div>
                          </div>

                          {/* Right Columns: Strengths & Deficit details */}
                          <div className="lg:col-span-2 space-y-4">
                            {/* Strengths List */}
                            <div className="p-4 rounded-xl border bg-black/10 border-gray-800">
                              <span className="text-xs font-black text-emerald-400 block mb-2">✨ {language === 'en' ? 'Biomechanical Strengths:' : 'نقاط القوة الميكانيكية الحركية:'}</span>
                              <ul className="space-y-1 text-xs text-gray-300 list-disc list-inside">
                                {presc.strengths.map((s, idx) => (
                                  <li key={idx} className="leading-relaxed font-medium">{s}</li>
                                ))}
                              </ul>
                            </div>

                            {/* Primary Deficit Card */}
                            <div className="p-4 rounded-xl border bg-black/10 border-gray-800 space-y-2">
                              <span className="text-xs font-black text-orange-400 block">⚠️ {language === 'en' ? 'Primary Biomechanical Deficit:' : 'العجز الحركي الأساسي (عنق الزجاجة):'}</span>
                              <p className="text-xs text-gray-300 font-bold">
                                [{presc.deficitLabel}]
                              </p>
                              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                {presc.deficit}
                              </p>
                            </div>

                            {/* Actionable Training Prescription */}
                            <div className="p-4 rounded-xl border bg-cyan-950/10 border-cyan-500/10 space-y-2">
                              <span className="text-xs font-black text-cyan-400 block">💪 {language === 'en' ? 'Prescribed Training Intervention:' : 'البرنامج والتدخل التدريبي الموصى به:'}</span>
                              <p className="text-xs text-gray-300 leading-relaxed font-medium">
                                {presc.prescription}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Field-Specific Prediction Engine */}
                      <div className="glass-panel p-6 shadow-lg border border-cyan-950/40 relative overflow-hidden mt-6">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
                        
                        <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 border-b border-gray-800/80 pb-2.5 mb-4 flex items-center gap-2">
                          🔮 {language === 'en' ? 'Field-Specific Prediction Engine' : 'محرك التنبؤ الميداني الذكي'}
                        </h3>

                        {!isStandingReachValid ? (
                          <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl text-center">
                            <p className="text-xs text-amber-300 font-bold">
                              ⚠️ {language === 'en' 
                                ? 'Please edit the athlete\'s profile to add their Standing Reach to activate the Field-Specific Prediction Engine.' 
                                : 'يرجى تعديل الملف الشخصي للاعب وإضافة طول ذراعه مفرودة (Standing Reach) لتفعيل محرك التنبؤ الميداني.'}
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {/* Volleyball Net Card */}
                            {(() => {
                              const netHeight = activePlayer.gender === 'female' ? 224 : 243;
                              const vbOffset = maxTouch - netHeight;
                              const isAbove = vbOffset >= 0;
                              return (
                                <div className={`p-5 rounded-2xl border bg-black/30 flex flex-col justify-between transition-all duration-300 ${
                                  isAbove 
                                    ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                    : 'border-orange-500/20'
                                }`}>
                                  <div>
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="text-xs text-gray-400 font-bold">
                                        {language === 'en' ? 'Volleyball Net Comparison' : 'مقارنة شبكة الكرة الطائرة'}
                                      </span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                                        isAbove ? 'text-emerald-400 bg-emerald-950/30' : 'text-orange-400 bg-orange-950/30'
                                      }`}>
                                        {language === 'en' 
                                          ? `Official Net: ${netHeight}cm` 
                                          : `الارتفاع الرسمي: ${netHeight} سم`}
                                      </span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 mb-2">
                                      <span className={`text-3xl font-black font-mono ${isAbove ? 'text-emerald-400' : 'text-orange-400'}`}>
                                        {isAbove ? `+${vbOffset.toFixed(1)}` : vbOffset.toFixed(1)}
                                      </span>
                                      <span className="text-gray-400 font-bold text-xs">سم / cm</span>
                                    </div>
                                    <p className="text-xs text-gray-300 font-medium leading-relaxed">
                                      {language === 'en' 
                                        ? (isAbove 
                                            ? `Exceeds the ${activePlayer.gender === 'female' ? "women's" : "men's"} volleyball net by ${vbOffset.toFixed(1)} cm.` 
                                            : `Needs ${Math.abs(vbOffset).toFixed(1)} cm to reach the ${activePlayer.gender === 'female' ? "women's" : "men's"} volleyball net.`)
                                        : (isAbove 
                                            ? `يتجاوز ارتفاع شبكة ${activePlayer.gender === 'female' ? 'السيدات' : 'الرجال'} بمقدار +${vbOffset.toFixed(1)} سم.` 
                                            : `يحتاج إلى ${Math.abs(vbOffset).toFixed(1)} سم للوصول لارتفاع شبكة ${activePlayer.gender === 'female' ? 'السيدات' : 'الرجال'}.`)}
                                    </p>
                                  </div>
                                  <div className="mt-4 pt-3 border-t border-gray-800/50 flex justify-between items-center text-[10px] text-gray-500">
                                    <span>{language === 'en' ? 'Max Touch reached:' : 'أقصى نقطة وصول:'}</span>
                                    <span className="font-mono font-bold text-cyan-400">{maxTouch.toFixed(0)} سم / cm</span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Basketball Hoop Card */}
                            {(() => {
                              const bbHeight = 305;
                              const bbOffset = maxTouch - bbHeight;
                              const canDunk = bbOffset >= 0;
                              return (
                                <div className={`p-5 rounded-2xl border bg-black/30 flex flex-col justify-between transition-all duration-300 ${
                                  canDunk 
                                    ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-cyan-950/5' 
                                    : 'border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.05)] bg-amber-950/5'
                                }`}>
                                  <div>
                                    <div className="flex justify-between items-center mb-3">
                                      <span className="text-xs text-gray-400 font-bold">
                                        {language === 'en' ? 'Basketball Hoop Dunk Capacity' : 'القدرة على الدنك وحلقة السلة'}
                                      </span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold ${
                                        canDunk ? 'text-cyan-400 bg-cyan-950/30' : 'text-amber-400 bg-amber-950/30'
                                      }`}>
                                        {language === 'en' ? 'Hoop Height: 305cm' : 'ارتفاع الحلقة: 305 سم'}
                                      </span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 mb-2">
                                      <span className={`text-3xl font-black font-mono ${canDunk ? 'text-cyan-400 animate-pulse' : 'text-amber-500'}`}>
                                        {canDunk ? `+${bbOffset.toFixed(1)}` : bbOffset.toFixed(1)}
                                      </span>
                                      <span className="text-gray-400 font-bold text-xs">سم / cm</span>
                                    </div>
                                    <p className="text-xs text-gray-300 font-medium leading-relaxed">
                                      {language === 'en'
                                        ? (canDunk 
                                            ? `Dunk Capacity! Exceeds the official hoop height by ${bbOffset.toFixed(1)} cm.` 
                                            : `Needs ${Math.abs(bbOffset).toFixed(1)} cm to reach the basketball hoop.`)
                                        : (canDunk 
                                            ? `يقدر يعمل دَنك Dunk ويعدي الحلقة بـ +${bbOffset.toFixed(1)} سم.` 
                                            : `يحتاج إلى ${Math.abs(bbOffset).toFixed(1)} سم للوصول للحلقة 🏀`)}
                                    </p>
                                  </div>
                                  <div className="mt-4 pt-3 border-t border-gray-800/50 flex justify-between items-center text-[10px] text-gray-500">
                                    <span>{language === 'en' ? 'Dunk Potential:' : 'إمكانية الدنك:'}</span>
                                    <span className={`font-bold uppercase ${canDunk ? 'text-emerald-400' : 'text-amber-400'}`}>
                                      {canDunk 
                                        ? (language === 'en' ? '✓ Capable' : '✓ قادر') 
                                        : (language === 'en' ? '✗ Under Height' : '✗ تحت الارتفاع')}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Athlete Motivation & Cueing System */}
                      {(() => {
                        const activeMotDeficit = (() => {
                          const isPrimaryConcentricOrVelocity = 
                            presc.deficitLabel === "Concentric Force Deficit" || 
                            presc.deficitLabel === "عجز في القوة العضلية الانقباضية الصافية" ||
                            presc.deficitLabel === "Horizontal-to-Vertical Velocity Conversion Deficit" || 
                            presc.deficitLabel === "عجز في تحويل السرعة الأفقية لعمودية";

                          const isPrimaryTendon = 
                            presc.deficitLabel === "Tendon Stiffness / SSC Deficit" || 
                            presc.deficitLabel === "ضعف في صلابة الأوتار ودورة التمدد والتقصير (SSC)";

                          if (isPrimaryConcentricOrVelocity) return 'velocity';
                          if (isPrimaryTendon) return 'elastic';
                          if (velocityConversion < 10 || relativePower < 38) return 'velocity';
                          if (eur < 1.05 || (latestRsiVal > 0 && latestRsiVal < 1.5) || (latestRsi > 0 && latestRsi < 1.5)) return 'elastic';
                          return 'balanced';
                        })();

                        const motivationConfig = {
                          velocity: {
                            badgeText: language === 'en' ? "Velocity Deficit (Focus: Explosive RFD)" : "عجز في السرعة والانفجارية (التركيز: سرعة إطلاق القوة RFD)",
                            badgeColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
                            glowColor: "border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] bg-amber-950/5",
                            slangText: language === 'en'
                              ? "You are extremely strong and your body's motor is huge, but we need to release power faster. In the upcoming period, we won't lift heavy weights; we will focus on light loads (30% to 50% 1RM) but with maximum explosive intent in every single repetition (Maximal Intent) to make your legs fly and snatch the jump in fractions of a second!"
                              : "أنت قوي جداً وماتور جسمك ضخم، لكن ينقصنا أن نكون أسرع في إطلاق القوة. الفترة القادمة لن نرفع أوزاناً ثقيلة؛ سنركز على أحمال خفيفة (30% لـ 50%) ولكن بأقصى غل وانفجارية في كل تكرار (Maximal Intent) لتجعل رجلك تطير وتخطف النطة في أجزاء من الثانية!",
                            exercises: [
                              {
                                name: language === 'en' ? "Loaded Jump Squats (30-50% 1RM)" : "Jump Squats محمل (30-50% 1RM)",
                                cue: language === 'en' ? "Explode to the ceiling!" : "انفجر للسقف!"
                              },
                              {
                                name: language === 'en' ? "Assisted Plyometrics (Banded)" : "تمارين بلايومترك بمساعدة (حبال المقاومة)",
                                cue: language === 'en' ? "Fly up immediately!" : "طِير فوق فوراً!"
                              },
                              {
                                name: language === 'en' ? "Medicine Ball Throws" : "رمي الكرة الطبية (Med Ball)",
                                cue: language === 'en' ? "Snatch the jump!" : "اِخطف النطة!"
                              }
                            ]
                          },
                          elastic: {
                            badgeText: language === 'en' ? "Elastic Deficit (Focus: Tendon Stiffness & SSC)" : "عجز في مطاطية الأوتار (التركيز: القوة التفاعلية والصلابة)",
                            badgeColor: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
                            glowColor: "border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] bg-cyan-950/5",
                            slangText: language === 'en'
                              ? "Your muscles are very strong from a standstill, but your tendons need to act like a spring to store reactive energy. We will focus on fast plyometrics and ankle stiffness to minimize your ground contact time!"
                              : "عضلاتك قوية جداً من السكون، لكن أوتارك تحتاج أن تعمل كـ (السوستة) لتخزين الطاقة الارتدادية. سنركز على البلايمتركس السريع وتصلب الكاحل لتقليل زمن تلامس رجلك مع الأرض!",
                            exercises: [
                              {
                                name: language === 'en' ? "Fast Pogo Jumps" : "قفز Pogo سريع",
                                cue: language === 'en' ? "Touch and fly!" : "اِلمس واِطير!"
                              },
                              {
                                name: language === 'en' ? "Hurdle Hops" : "القفز فوق الحواجز",
                                cue: language === 'en' ? "Keep your legs like iron!" : "خلي رجلك حديد!"
                              },
                              {
                                name: language === 'en' ? "Drop Jumps (30cm box)" : "قفز السقوط من صندوق 30 سم",
                                cue: language === 'en' ? "Rebound like lightning!" : "الارتداد كالبرق!"
                              }
                            ]
                          },
                          balanced: {
                            badgeText: language === 'en' ? "Optimal Balance (Focus: Maintenance & Coordination)" : "توازن ميكانيكي ممتاز (التركيز: الحفاظ على القمة والتحكم الحركي)",
                            badgeColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                            glowColor: "border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] bg-emerald-950/5",
                            slangText: language === 'en'
                              ? "Your body is in an excellent state of balance between explosive strength and tendon elasticity. Our goal now is to maintain this balance and develop complex motor coordination to sustain peak mechanical performance."
                              : "جسمك في حالة توازن ممتازة بين القوة الانفجارية ومطاطية الأوتار. هدفنا الآن هو الحفاظ على هذا التوازن وتطوير التوافق الحركي المركب لضمان استمرار أعلى مستويات الأداء الميكانيكي.",
                            exercises: [
                              {
                                name: language === 'en' ? "Combined Reactive Jumps (Pogo & CMJ Combo)" : "قفز ارتدادي مدمج (Pogo & CMJ Combo)",
                                cue: language === 'en' ? "Maintain the rhythm!" : "حافظ على الريتم!"
                              },
                              {
                                name: language === 'en' ? "Single-Leg Jump to Stable Landing" : "القفز أحادي الجانب مع الثبات",
                                cue: language === 'en' ? "Solid as iron!" : "ثبات كالحديد!"
                              },
                              {
                                name: language === 'en' ? "Full Approach Jumps" : "تمارين الاقتراب الكامل",
                                cue: language === 'en' ? "Integrate speed and power!" : "تكامل القوة والسرعة!"
                              }
                            ]
                          }
                        };

                        const currentConfig = motivationConfig[activeMotDeficit];

                        return (
                          <div className={`glass-panel p-6 shadow-lg border relative overflow-hidden mt-6 ${currentConfig.glowColor}`}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800/80 pb-3 mb-4 gap-3">
                              <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 flex items-center gap-2">
                                ⚡ {language === 'en' ? 'Biomechanical Motivation & Cueing' : 'نظام التوجيه والتحفيز الحركي المخصص'}
                              </h3>
                              <span className={`text-[10px] sm:text-xs font-black px-3 py-1 rounded-xl border ${currentConfig.badgeColor} self-start sm:self-auto`}>
                                {currentConfig.badgeText}
                              </span>
                            </div>

                            <div className="space-y-4">
                              {/* Slang Motivation Section */}
                              <div className="bg-black/40 border border-gray-850 p-4.5 rounded-xl">
                                <span className="text-[10px] font-black text-gray-400 block mb-1">
                                  💬 {language === 'en' ? 'Coaching Message / Slang Motivation' : 'رسالة الكوتش الحماسية:'}
                                </span>
                                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-semibold italic">
                                  "{currentConfig.slangText}"
                                </p>
                              </div>

                              {/* Exercises & Cues Table */}
                              <div className="bg-black/20 border border-gray-850 rounded-xl overflow-hidden">
                                <div className="grid grid-cols-2 bg-gray-900/60 p-3 text-[10px] font-black text-gray-450 border-b border-gray-850">
                                  <div>{language === 'en' ? 'Recommended Exercise' : 'التمرين الموصى به'}</div>
                                  <div>{language === 'en' ? 'Active Coaching Cue' : 'التوجيه الحركي اللفظي'}</div>
                                </div>
                                <div className="divide-y divide-gray-850/50">
                                  {currentConfig.exercises.map((ex, idx) => (
                                    <div key={idx} className="grid grid-cols-2 p-3 text-xs items-center">
                                      <div className="font-bold text-gray-300">{ex.name}</div>
                                      <div className="font-extrabold text-cyan-400 animate-pulse">{ex.cue}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()}

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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
                  {/* EUR Card */}
                  <div className="glass-card p-4 sm:p-5 border border-cyan-500/20 shadow-inner flex flex-col justify-between text-right">
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
                  <div className="glass-card p-4 sm:p-5 border border-cyan-500/20 shadow-inner flex flex-col justify-between text-right">
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
                  <div className="glass-card p-4 sm:p-5 border border-cyan-500/20 shadow-inner flex flex-col justify-between text-right">
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
                  <h4 className="text-base font-black text-white">{language === 'en' ? 'Complete Athlete History Log' : 'سجل قياسات اللاعب الكاملة'}</h4>
                  <button 
                    onClick={() => handleOpenManualEntryModal()} 
                    className="px-3 py-1.5 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-600/35 transition-all cursor-pointer shadow-md"
                  >
                    <Plus size={14} /> {language === 'en' ? 'Log Manual Jump' : 'تسجيل رقم يدوي'}
                  </button>
                </div>
                
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-right text-xs" style={{ minWidth: '720px' }}>
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-450 font-black">
                        <th className={`pb-3 ${language === 'en' ? 'text-left' : 'text-right'}`}>{language === 'en' ? 'Date' : 'التاريخ'}</th>
                        <th className="pb-3 text-center">{language === 'en' ? 'Test Type' : 'نوع الاختبار'}</th>
                        <th className="pb-3 text-center">{language === 'en' ? 'Height (cm)' : 'الارتفاع (cm)'}</th>
                        <th className="pb-3 text-center">{language === 'en' ? 'Flight Time (s)' : 'زمن الطيران (s)'}</th>
                        <th className="pb-3 text-center">{language === 'en' ? 'Contact Time (s)' : 'زمن التلامس (s)'}</th>
                        <th className="pb-3 text-center">{language === 'en' ? 'Peak Power (W)' : 'القدرة القصوى (W)'}</th>
                        <th className="pb-3 text-center">{language === 'en' ? 'RSI Score' : 'مؤشر RSI'}</th>
                        <th className="pb-3 text-center">{language === 'en' ? 'Actions' : 'التحكم'}</th>
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
                        const testNamesEnglish = {
                          sj_no_arms: 'Squat Jump (No Arms)', 
                          cmj_no_arms: 'CMJ (No Arms)', 
                          sj_arms: 'Squat Jump (With Arms)', 
                          cmj_arms: 'CMJ (With Arms)', 
                          approach: 'Approach Jump', 
                          rsi: 'Drop Jump (RSI)', 
                          standard: 'Standard CMJ'
                        };
                        const testName = language === 'en'
                          ? (testNamesEnglish[jump.test_type] || jump.test_type || 'General Jump')
                          : (testNamesArabic[jump.test_type] || jump.test_type || 'وثبة عامة');
                        return (
                          <tr key={jump.id} className="border-b border-gray-855 hover:bg-black/10 transition-colors">
                            <td className="py-3.5 font-mono text-gray-400">{new Date(jump.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG')}</td>
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
                  onClick={() => { setIsPrintModalOpen(false); setPrintStep(1); }} 
                  className="absolute top-4 left-4 text-gray-400 hover:text-white transition-all bg-black/20 p-2 rounded-full border border-gray-800 cursor-pointer"
                >
                  <X size={16} />
                </button>

                {printStep === 1 ? (
                  <>
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
                        onClick={() => handlePrintLanguageSelect('ar')}
                        className="p-5 bg-slate-900 hover:bg-cyan-955/20 hover:border-cyan-500/50 border border-gray-800 rounded-2xl flex flex-col items-center gap-2 text-center transition-all cursor-pointer group"
                      >
                        <span className="text-2xl">🇪🇬</span>
                        <span className="text-sm font-black text-white group-hover:text-cyan-400">التقرير بالعربية</span>
                        <span className="text-[10px] text-gray-500">من اليمين إلى اليسار (RTL)</span>
                      </button>

                      {/* English Button */}
                      <button
                        type="button"
                        onClick={() => handlePrintLanguageSelect('en')}
                        className="p-5 bg-slate-900 hover:bg-cyan-955/20 hover:border-cyan-500/50 border border-gray-800 rounded-2xl flex flex-col items-center gap-2 text-center transition-all cursor-pointer group"
                      >
                        <span className="text-2xl">🇬🇧</span>
                        <span className="text-sm font-black text-white group-hover:text-cyan-400">English Report</span>
                        <span className="text-[10px] text-gray-500">Left to Right (LTR)</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 mb-4 pb-2 border-b border-gray-850 flex items-center gap-2">
                      📊 نمط التقرير / Report Style
                    </h3>
                    <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                      اختر طريقة عرض التقرير. هل تفضله بتصميم بصري حديث (Infographics) أم بتنسيق مبسط مناسب للطباعة المكتبية (Text-Only)؟
                    </p>

                    <div className="flex flex-col gap-3">
                      {/* With Infographics Button */}
                      <button
                        type="button"
                        onClick={() => handlePrintReportFinal(true)}
                        className="p-4 bg-slate-900 hover:bg-orange-950/20 hover:border-orange-500/50 border border-gray-800 rounded-2xl flex items-center gap-4 text-right transition-all cursor-pointer group"
                      >
                        <span className="text-2xl">📊</span>
                        <div className="flex-1">
                          <span className="block text-sm font-black text-white group-hover:text-orange-400">تقرير بصري ولوحة معلومات (With Infographics)</span>
                          <span className="block text-[10px] text-gray-500 mt-1">يحتوي على رسومات بيانية ملونة، بطاقات ذكية، وتنسيق رياضي حديث.</span>
                        </div>
                      </button>

                      {/* Without Infographics Button */}
                      <button
                        type="button"
                        onClick={() => handlePrintReportFinal(false)}
                        className="p-4 bg-slate-900 hover:bg-slate-800 hover:border-gray-650 border border-gray-800 rounded-2xl flex items-center gap-4 text-right transition-all cursor-pointer group"
                      >
                        <span className="text-2xl">📄</span>
                        <div className="flex-1">
                          <span className="block text-sm font-black text-white group-hover:text-white">جدول بسيط وموفر للحبر (Text-Only Table)</span>
                          <span className="block text-[10px] text-gray-500 mt-1">تنسيق كلاسيكي خالٍ من الألوان الثقيلة ومناسب تماماً للطباعة العادية.</span>
                        </div>
                      </button>
                    </div>

                    {/* Back Button */}
                    <button
                      type="button"
                      onClick={() => setPrintStep(1)}
                      className="mt-4 w-full py-2 bg-slate-950 text-gray-400 hover:text-white border border-slate-900 hover:border-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      ← الرجوع لاختيار اللغة / Back to Language
                    </button>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>

                  {/* ======================================================== */}
      {/* PRINT-ONLY A4 REPORT SHEET (HIDDEN ON SCREEN)             */}
      {/* ======================================================== */}
      <div 
        className={`hidden print-report-sheet ${printWithInfographics ? 'print-infographics' : 'print-simple'}`} 
        style={{ display: 'none', direction: printLang === 'ar' ? 'rtl' : 'ltr' }}
      >
        {printWithInfographics ? (
          /* ======================================================== */
          /* 1. MODERN INFOGRAPHICS REPORT LAYOUT                     */
          /* ======================================================== */
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-4">
              {printLang === 'ar' ? (
                <>
                  <div className="flex items-center gap-3 text-right font-cairo">
                    <svg width="45" height="45" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 6px rgba(255, 107, 0, 0.25))' }}>
                      <defs>
                        <linearGradient id="grad-top" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ff9a3c" />
                          <stop offset="100%" stopColor="#ff6b00" />
                        </linearGradient>
                        <linearGradient id="grad-left" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#e05300" />
                          <stop offset="100%" stopColor="#b33600" />
                        </linearGradient>
                        <linearGradient id="grad-right" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#4b5563" />
                          <stop offset="100%" stopColor="#1f2937" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      <polygon points="50,15 80,32 50,50 20,32" fill="url(#grad-top)" />
                      <polygon points="20,32 50,50 50,85 20,67" fill="url(#grad-left)" />
                      <polygon points="50,50 80,32 80,67 50,85" fill="url(#grad-right)" />
                      <line x1="50" y1="15" x2="50" y2="50" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
                      <line x1="20" y1="32" x2="50" y2="50" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
                      <line x1="80" y1="32" x2="50" y2="50" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
                      <circle cx="50" cy="50" r="5" fill="#ff6b00" filter="url(#glow)" stroke="#ffffff" strokeWidth="1" />
                    </svg>
                    <div>
                      <h1 className="text-2xl font-black text-orange-primary">مختبر الأداء الرياضي والميكانيكا الحيوية</h1>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">تقرير قياسات الأداء الحركي والارتقاء المتكامل</p>
                    </div>
                  </div>
                  <div className="text-left text-[10px] font-mono text-gray-500">
                    <p>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-EG')}</p>
                    <p>المشرف: رئيس الجهاز الفني</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 text-left">
                    <svg width="45" height="45" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 6px rgba(255, 107, 0, 0.25))' }}>
                      <defs>
                        <linearGradient id="grad-top" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ff9a3c" />
                          <stop offset="100%" stopColor="#ff6b00" />
                        </linearGradient>
                        <linearGradient id="grad-left" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#e05300" />
                          <stop offset="100%" stopColor="#b33600" />
                        </linearGradient>
                        <linearGradient id="grad-right" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#4b5563" />
                          <stop offset="100%" stopColor="#1f2937" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      <polygon points="50,15 80,32 50,50 20,32" fill="url(#grad-top)" />
                      <polygon points="20,32 50,50 50,85 20,67" fill="url(#grad-left)" />
                      <polygon points="50,50 80,32 80,67 50,85" fill="url(#grad-right)" />
                      <line x1="50" y1="15" x2="50" y2="50" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
                      <line x1="20" y1="32" x2="50" y2="50" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
                      <line x1="80" y1="32" x2="50" y2="50" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.4" />
                      <circle cx="50" cy="50" r="5" fill="#ff6b00" filter="url(#glow)" stroke="#ffffff" strokeWidth="1" />
                    </svg>
                    <div>
                      <h1 className="text-2xl font-black text-orange-primary font-cairo">Sports Performance & Biomechanics Lab</h1>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider font-cairo">Integrated Biomechanical & Vertical Jump Performance Report</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-mono text-gray-500">
                    <p>Report Date: {new Date().toLocaleDateString('en-US')}</p>
                    <p>Supervisor: Technical Director</p>
                  </div>
                </>
              )}
            </div>

            {/* Athlete Profile Card */}
            <div className="slate-card">
              <h3 className="text-xs font-black text-orange-primary mb-3 uppercase tracking-wider">
                👤 {printLang === 'ar' ? 'بطاقة اللاعب التعريفية والبدنية' : 'Athlete Identity & Physical Specs'}
              </h3>
              <div className="grid grid-cols-7 gap-4 text-xs">
                <div>
                  <span className="block text-gray-400 font-bold">{printLang === 'ar' ? 'الاسم:' : 'Name:'}</span>
                  <span className="block font-black text-black text-[11px] truncate">{activePlayer.full_name}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold">{printLang === 'ar' ? 'النوع:' : 'Gender:'}</span>
                  <span className="block font-black text-black text-[11px]">
                    {printLang === 'ar' 
                      ? (activePlayer.gender === 'female' ? 'أنثى' : 'ذكر') 
                      : (activePlayer.gender === 'female' ? 'Female' : 'Male')}
                  </span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold">{printLang === 'ar' ? 'العمر:' : 'Age:'}</span>
                  <span className="block font-black text-black text-[11px] font-mono">{age} {printLang === 'ar' ? 'سنوات' : 'Years'}</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold">{printLang === 'ar' ? 'الوزن:' : 'Weight:'}</span>
                  <span className="block font-black text-black text-[11px] font-mono">{activePlayer.weight_kg} kg</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold">{printLang === 'ar' ? 'طول الرجل:' : 'Leg Length:'}</span>
                  <span className="block font-black text-black text-[11px] font-mono">{getLegLengthCm(activePlayer.leg_length_m)} cm</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold">{printLang === 'ar' ? 'القامة:' : 'Height:'}</span>
                  <span className="block font-black text-black text-[11px] font-mono">{playerHeight} cm</span>
                </div>
                <div>
                  <span className="block text-gray-400 font-bold">{printLang === 'ar' ? 'الوصول:' : 'Standing Reach:'}</span>
                  <span className="block font-black text-black text-[11px] font-mono">{playerStandingReach} cm</span>
                </div>
              </div>
            </div>

            {/* Dashboard 2-Column Section */}
            <div className="dashboard-grid-2">
              
              {/* KPIs Section */}
              <div className="slate-card flex flex-col justify-between">
                <h3 className="text-xs font-black text-orange-primary mb-4 uppercase tracking-wider">
                  ⚡ {printLang === 'ar' ? 'المؤشرات الحيوية الميكانيكية الحيوية' : 'Biomechanical KPIs Infographic'}
                </h3>
                
                <div className="space-y-4">
                  {/* KPI 1 */}
                  <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                    <div>
                      <span className="block text-xs font-bold text-gray-800">{printLang === 'ar' ? 'مؤشر الاستغلال المطاطي للأوتار (SSC):' : 'Elastic Utilization Index (SSC):'}</span>
                      <span className="text-[10px] text-gray-500">
                        {printLang === 'ar' 
                          ? 'يقيس مدى مساهمة مطاطية الأوتار ودورة التمدد والتقصير (EUR)' 
                          : 'Measures how well tendons store and release elastic energy (EUR)'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-base font-black text-orange-primary font-mono">{(eur > 0 ? eur : 1.03).toFixed(2)}</span>
                      {(() => {
                        const evalRes = getEurEvaluation(eur > 0 ? eur : 1.03);
                        return (
                          <span 
                            className="block text-[9px] font-black px-1.5 py-0.5 rounded border" 
                            style={{ 
                              color: evalRes.color, 
                              borderColor: evalRes.borderColor, 
                              backgroundColor: evalRes.bgColor 
                            }}
                          >
                            {printLang === 'ar' ? evalRes.textAr : evalRes.textEn}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* KPI 2 */}
                  <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
                    <div>
                      <span className="block text-xs font-bold text-gray-800">{printLang === 'ar' ? 'مساهمة أرجحة الذراعين (Arm Swing):' : 'Arm Swing Contribution:'}</span>
                      <span className="text-[10px] text-gray-500">
                        {printLang === 'ar' 
                          ? 'يقيس التوافق الحركي بين النصفين العلوي والسفلي' 
                          : 'Measures upper-to-lower body motor coordination'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-base font-black text-gray-800 font-mono">{(armSwing > 0 ? armSwing : 19.9).toFixed(1)}%</span>
                      {(() => {
                        const evalRes = getArmSwingEvaluation(armSwing > 0 ? armSwing : 19.9);
                        return (
                          <span 
                            className="block text-[9px] font-black px-1.5 py-0.5 rounded border" 
                            style={{ 
                              color: evalRes.color, 
                              borderColor: evalRes.borderColor, 
                              backgroundColor: evalRes.bgColor 
                            }}
                          >
                            {printLang === 'ar' ? evalRes.textAr : evalRes.textEn}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* KPI 3 */}
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="block text-xs font-bold text-gray-800">{printLang === 'ar' ? 'تحويل السرعة الأفقية (Velocity Conversion):' : 'Horizontal Velocity Conversion:'}</span>
                      <span className="text-[10px] text-gray-500">
                        {printLang === 'ar' 
                          ? 'تحويل طاقة الاقتراب لارتفاع عمودي' 
                          : 'Transfer of horizontal approach speed into vertical lift'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-black text-gray-800 font-mono">
                        {velocityConversion > 0 ? `${velocityConversion.toFixed(1)}%` : '—'}
                      </span>
                      {(() => {
                        const evalRes = getVelocityConversionEvaluation(velocityConversion);
                        return (
                          <span 
                            className="block text-[9px] font-black px-1.5 py-0.5 rounded border" 
                            style={{ 
                              color: evalRes.color, 
                              borderColor: evalRes.borderColor, 
                              backgroundColor: evalRes.bgColor 
                            }}
                          >
                            {printLang === 'ar' ? evalRes.textAr : evalRes.textEn}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Visualization Chart Section */}
              <div className="slate-card">
                <h3 className="text-xs font-black text-orange-primary mb-3 uppercase tracking-wider">
                  📈 {printLang === 'ar' ? 'منحنى تتبع مستويات الارتقاء (Jump Height Trend)' : 'Historical Jump Height Trend (cm)'}
                </h3>
                
                <div className="w-full flex justify-center items-center">
                  <svg viewBox="0 0 320 160" width="100%" height="150" style={{ background: '#ffffff', fontFamily: 'Cairo, sans-serif' }}>
                    {/* Background grid lines */}
                    <line x1="30" y1="20" x2="300" y2="20" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="30" y1="55" x2="300" y2="55" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="30" y1="90" x2="300" y2="90" stroke="#f3f4f6" strokeWidth="1" />
                    <line x1="30" y1="125" x2="300" y2="125" stroke="#e5e7eb" strokeWidth="1.5" />
                    
                    {/* Y-Axis Labels */}
                    <text x="25" y="23" fontSize="8" textAnchor="end" fill="#9ca3af" fontFamily="monospace">{maxChartVal.toFixed(0)}</text>
                    <text x="25" y="73" fontSize="8" textAnchor="end" fill="#9ca3af" fontFamily="monospace">{(maxChartVal*0.5).toFixed(0)}</text>
                    <text x="25" y="128" fontSize="8" textAnchor="end" fill="#9ca3af" fontFamily="monospace">0</text>
                    
                    {/* Bar 1: Current (CMJ with Arms) */}
                    <rect 
                      x="50" 
                      y={125 - (chartCmjArms * chartScale)} 
                      width="45" 
                      height={chartCmjArms * chartScale} 
                      fill="#ff6b00" 
                      rx="4" 
                    />
                    <text 
                      x="72.5" 
                      y={120 - (chartCmjArms * chartScale)} 
                      fontSize="9" 
                      fontWeight="900" 
                      textAnchor="middle" 
                      fill="#ff6b00" 
                      fontFamily="monospace"
                    >
                      {chartCmjArms.toFixed(1)}
                    </text>
                    <text x="72.5" y="140" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#374151">
                      {printLang === 'ar' ? 'CMJ باليدين' : 'CMJ Arms'}
                    </text>
                    <text x="72.5" y="150" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#9ca3af">
                      {printLang === 'ar' ? '(حالي)' : '(Current)'}
                    </text>

                    {/* Bar 2: Previous (CMJ no Arms) */}
                    <rect 
                      x="135" 
                      y={125 - (chartCmjNoArms * chartScale)} 
                      width="45" 
                      height={chartCmjNoArms * chartScale} 
                      fill="#4b5563" 
                      rx="4" 
                    />
                    <text 
                      x="157.5" 
                      y={120 - (chartCmjNoArms * chartScale)} 
                      fontSize="9" 
                      fontWeight="900" 
                      textAnchor="middle" 
                      fill="#4b5563" 
                      fontFamily="monospace"
                    >
                      {chartCmjNoArms.toFixed(1)}
                    </text>
                    <text x="157.5" y="140" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#374151">
                      {printLang === 'ar' ? 'CMJ بدون يدين' : 'CMJ No Arms'}
                    </text>
                    <text x="157.5" y="150" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#9ca3af">
                      {printLang === 'ar' ? '(سابق)' : '(Prev)'}
                    </text>

                    {/* Bar 3: Previous (Squat Jump) */}
                    <rect 
                      x="220" 
                      y={125 - (chartSjNoArms * chartScale)} 
                      width="45" 
                      height={chartSjNoArms * chartScale} 
                      fill="#4b5563" 
                      rx="4" 
                    />
                    <text 
                      x="242.5" 
                      y={120 - (chartSjNoArms * chartScale)} 
                      fontSize="9" 
                      fontWeight="900" 
                      textAnchor="middle" 
                      fill="#4b5563" 
                      fontFamily="monospace"
                    >
                      {chartSjNoArms.toFixed(1)}
                    </text>
                    <text x="242.5" y="140" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#374151">
                      {printLang === 'ar' ? 'وثبة ثبات SJ' : 'Squat Jump'}
                    </text>
                    <text x="242.5" y="150" fontSize="6" fontWeight="bold" textAnchor="middle" fill="#9ca3af">
                      {printLang === 'ar' ? '(سابق)' : '(Prev)'}
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            {/* Diagnostic Callout Box - Shaded warning block in crimson */}
                        {/* Dynamic Diagnostic Callout Box */}
            {(() => {
              const eurVal = eur > 0 ? eur : 1.03;
              const isTendonDeficit = eurVal < 1.05;
              const isBalanced = eurVal >= 1.05 && eurVal <= 1.15;
              const isForceDeficit = eurVal > 1.15;

              let cardStyle = {
                borderRight: '5px solid #dd6b20',
                backgroundColor: '#fffaf0',
                borderColor: '#fbd38d'
              };
              let titleColor = 'text-red-700';
              let titleTextAr = 'التشخيص الحركي وكفاءة الأوتار (EUR Diagnostic Report)';
              let titleTextEn = 'Tendon Efficiency & Elasticity Diagnosis (EUR)';

              if (isBalanced) {
                cardStyle = {
                  borderRight: '5px solid #0d9488',
                  backgroundColor: '#f0fdfa',
                  borderColor: '#ccfbf1'
                };
                titleColor = 'text-teal-600';
              } else if (isForceDeficit) {
                cardStyle = {
                  borderRight: '5px solid #d97706',
                  backgroundColor: '#fef3c7',
                  borderColor: '#fde68a'
                };
                titleColor = 'text-amber-700';
              }

              return (
                <div style={{
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  borderTop: `1.5px solid ${cardStyle.borderColor}`,
                  borderBottom: `1.5px solid ${cardStyle.borderColor}`,
                  borderLeft: `1.5px solid ${cardStyle.borderColor}`,
                  borderRight: cardStyle.borderRight,
                  backgroundColor: cardStyle.backgroundColor
                }}>
                  <h4 className={`text-xs font-black flex items-center gap-1.5 mb-2 uppercase tracking-wider ${titleColor}`}>
                    ⚠️ {printLang === 'ar' ? titleTextAr : titleTextEn}
                  </h4>
                  <p className="text-xs leading-relaxed text-gray-855 whitespace-pre-line font-bold" style={{ fontFamily: 'Cairo, sans-serif', color: '#1a1a1a' }}>
                    {printLang === 'ar' ? (
                      isBalanced ? `• تشخيص كفاءة الأوتار (EUR): النسبة متوازنة ومثالية (${eurVal.toFixed(2)})، مما يعني وجود تناغم ممتاز بين كفاءة مطاطية الأوتار والقوة الانقباضية العضلية للاعب.
• التوصية الرياضية: ينصح بالاستمرار في التناوب المتوازن بين تدريبات القوة القصوى والتمارين الارتدادية (Plyometrics) للحفاظ على هذا التوازن الفسيولوجي المتميز.`
                      : isForceDeficit ? `• تشخيص كفاءة الأوتار (EUR): النسبة مرتفعة جداً وتتخطى (1.15)، مما يعني أن اللاعب يعتمد بشكل مفرط على مطاطية الأوتار ورد الفعل الارتدادي، بينما يعاني من نقص صريح في القوة العضلية الصافية (Force Deficit).
• التوصية الرياضية: ينصح بالتركيز الفوري على تمارين القوة العضلية القصوى (Maximal Strength Training) مثل رفع الأثقال و squat الأحمال الثقيلة، لرفع القدرة الانقباضية لألياف العضلات.`
                      : `• تشخيص كفاءة الأوتار (EUR): النسبة قليلة جداً وأقل من (1.05)، وهذا معناه أن اللاعب يعتمد تماماً على ألياف العضلات ويمتلك قوة انقباضية concentric عالية جداً، ولكن يمتلك ضعفاً صريحاً في كفاءة الأوتار ومطاطيتها واستغلال دورة التمدد والتقصير (SSC).
• التوصية الرياضية: ينصح بالتركيز الفوري والمكثف على تمارين البايومتركس السريع (Fast Plyometrics) مثل القفز الارتدادي والساقط، لرفع صلابة كاحل القدم وتنشيط وتطوير كفاءة مطاطية الأوتار وسرعة تخزين الطاقة الحركية وإطلاقها.`
                    ) : (
                      isBalanced ? `• Tendon Efficiency Diagnosis (EUR): The ratio is optimal and balanced (${eurVal.toFixed(2)}), representing excellent synergy between tendon reactive elasticity and active muscular concentric force.
• Athletic Recommendation: Maintain a balanced combination of maximal strength training and plyometrics to sustain this optimal biomechanical baseline.`
                      : isForceDeficit ? `• Tendon Efficiency Diagnosis (EUR): The ratio is elevated (${eurVal.toFixed(2)}). The athlete is highly reactive/tendon-dominant but exhibits a Force Deficit (lacks raw muscular concentric strength).
• Athletic Recommendation: Prioritize maximal strength development (heavy squats, deadlifts, and loaded power training) to increase concentric muscular force capacity.`
                      : `• Tendon Efficiency Diagnosis (EUR): The ratio is deficient and below 1.05 (${eurVal.toFixed(2)}). This indicates that the athlete relies heavily on muscular concentric power but lacks reactive tendon elasticity and SSC (Stretch-Shortening Cycle) efficiency.
• Athletic Recommendation: Immediate focus on Fast Plyometrics (e.g., reactive depth jumps, ankle bounding) is highly recommended to build ankle stiffness and optimize tendon rebound efficiency.`
                    )}
                  </p>
                </div>
              );
            })()}

            {/* Jumps Comparison Table */}
            <div className="slate-card">
              <h3 className="text-xs font-black text-orange-primary mb-3 uppercase tracking-wider">
                📋 {printLang === 'ar' ? 'مصفوفة مقارنة اختبارات الوثب والقدرة الميكانيكية' : 'Performance Metrics Comparison Table'}
              </h3>
              
              <table className="info-table text-xs">
                <thead>
                  {printLang === 'ar' ? (
                    <tr>
                      <th>نوع الاختبار</th>
                      <th>الارتفاع (سم)</th>
                      <th>الارتفاع (إنش)</th>
                      <th>زمن الطيران (ثانية)</th>
                      <th>كثافة القدرة (W/kg)</th>
                      <th>القدرة القصوى (وات)</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Test Type</th>
                      <th>Height (cm)</th>
                      <th>Height (in)</th>
                      <th>Flight Time (s)</th>
                      <th>Relative Power (W/kg)</th>
                      <th>Peak Power (Watts)</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {getTranslatedConfig(printLang).map((test) => {
                    const rec = test.record;
                    const inHeight = rec ? parseFloat((parseFloat(rec.jump_height_cm) * 0.393701).toFixed(1)) : 0;
                    const recPower = rec ? (rec.peak_power_watts && parseFloat(rec.peak_power_watts) > 0 ? parseFloat(rec.peak_power_watts) : (60.7 * parseFloat(rec.jump_height_cm) + 45.3 * mass - 2055)) : 0;
                    const recRelPower = rec && mass > 0 ? parseFloat((recPower / mass).toFixed(1)) : 0;
                    
                    return (
                      <tr key={test.type}>
                        <td className="font-bold">{printLang === 'ar' ? test.nameAr.split('(')[0] : test.nameEn}</td>
                        <td className="font-mono font-bold">{rec ? parseFloat(rec.jump_height_cm).toFixed(1) : '—'}</td>
                        <td className="font-mono">{rec ? inHeight.toFixed(1) : '—'}</td>
                        <td className="font-mono">{rec ? parseFloat(rec.flight_time_sec).toFixed(3) : '—'}</td>
                        <td className="font-mono">{rec ? recRelPower.toFixed(1) : '—'}</td>
                        <td className="font-mono">{rec ? recPower.toFixed(0) : '—'}</td>
                      </tr>
                    );
                  })}
                  {/* Drop Jump (RSI) Row */}
                  <tr>
                    <td className="font-bold">{printLang === 'ar' ? 'الوثب الساقط (RSI)' : 'Drop Jump (RSI)'}</td>
                    <td className="font-mono font-bold text-orange-primary">
                      {rsiRecord ? `RSI: ${parseFloat(rsiRecord.rsi_score).toFixed(2)}` : '—'}
                    </td>
                    <td className="font-mono">
                      {rsiRecord && rsiRecord.contact_time_sec 
                        ? (printLang === 'ar' ? `Tc: ${parseFloat(rsiRecord.contact_time_sec).toFixed(3)} ث` : `Tc: ${parseFloat(rsiRecord.contact_time_sec).toFixed(3)} s`) 
                        : '—'}
                    </td>
                    <td className="font-mono">
                      {rsiRecord ? (printLang === 'ar' ? `Tf: ${parseFloat(rsiRecord.flight_time_sec).toFixed(3)} ث` : `Tf: ${parseFloat(rsiRecord.flight_time_sec).toFixed(3)} s`) : '—'}
                    </td>
                    <td className="font-mono">—</td>
                    <td className="font-mono">—</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Explanatory notes */}
            <div className="slate-card flex justify-between gap-4 text-xs leading-relaxed text-gray-800 font-medium">
              {printLang === 'ar' ? (
                <>
                  <div>
                    • {(() => {
                      const val = armSwing > 0 ? armSwing : 19.9;
                      if (val > 15) {
                        return `أرجحة الذراعين: يستعين اللاعب بأرجحة الذراعين بنسبة عالية (${val.toFixed(1)}%) للتعويض عن الضعف النسبي في عضلات الأرجل. يُنصح بتركيز التدريب على تقوية الأطراف السفلية بشكل منفصل لزيادة إنتاج القوة من الساقين.`;
                      } else if (val < 10) {
                        return `أرجحة الذراعين: مساهمة أرجحة الذراعين منخفضة (${val.toFixed(1)}%). هذا يشير إلى ضعف التنسيق الحركي بين النصفين العلوي والسفلي أو عدم كفاءة استخدام الذراعين لتوليد الزخم. يُنصح بتدريبات التوافق العصبي العضلي وتكنيك التأرجح.`;
                      } else {
                        return `أرجحة الذراعين: استخدام أرجحة الذراعين مثالي ومتوازن (${val.toFixed(1)}%). يُظهر اللاعب توافقاً حركياً ممتازاً بين الساقين والذراعين لنقل الزخم بشكل فعال دون اعتماد مفرط.`;
                      }
                    })()}
                  </div>
                  <div className="text-left font-mono shrink-0">•Sayers PP: {sayersPeak.toFixed(0)} W | Harman PP: {harmanPeak.toFixed(0)} W</div>
                </>
              ) : (
                <>
                  <div>
                    • {(() => {
                      const val = armSwing > 0 ? armSwing : 19.9;
                      if (val > 15) {
                        return `Arm Swing Contribution: The athlete utilizes arm swing extensively (${val.toFixed(1)}%) to compensate for lower limb muscular deficits. Lower body strength conditioning is advised.`;
                      } else if (val < 10) {
                        return `Arm Swing Contribution: Arm swing contribution is low (${val.toFixed(1)}%). This indicates sub-optimal motor coordination or inefficient momentum transfer. Neuromuscular coordination and swing technique training are recommended.`;
                      } else {
                        return `Arm Swing Contribution: Ideal and balanced arm swing usage (${val.toFixed(1)}%). The athlete shows excellent motor coordination and efficient momentum transfer.`;
                      }
                    })()}
                  </div>
                  <div className="text-right font-mono shrink-0">•Sayers PP: {sayersPeak.toFixed(0)} W | Harman PP: {harmanPeak.toFixed(0)} W</div>
                </>
              )}
            </div>

          </div>
        ) : (
          /* ======================================================== */
          /* 2. TEXT-ONLY SIMPLE PRINTER-FRIENDLY LAYOUT              */
          /* ======================================================== */
          <div className="print-simple">
            
            {/* Simple Header */}
            <div className={`print-header flex justify-between items-center pb-5 mb-5 border-b-2 border-black ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
              {printLang === 'ar' ? (
                <>
                  <div className="text-right">
                    <h1 className="text-2xl font-black text-black">مختبر الأداء الرياضي والميكانيكا الحيوية 🧪</h1>
                    <p className="text-xs text-gray-700">تقرير قياسات الأداء الحركي والارتقاء المتكامل (نسخة مبسطة)</p>
                  </div>
                  <div className="text-left text-xs font-mono text-gray-650">
                    <p>تاريخ استخراج التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
                    <p>المشرف: رئيس الجهاز الفني</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-left">
                    <h1 className="text-2xl font-black text-black">Sports Performance & Biomechanics Lab 🧪</h1>
                    <p className="text-xs text-gray-700">Vertical Jump Biomechanical Performance Report (Simple Layout)</p>
                  </div>
                  <div className="text-right text-xs font-mono text-gray-655">
                    <p>Report Date: {new Date().toLocaleDateString('en-US')}</p>
                    <p>Supervisor: Technical Director</p>
                  </div>
                </>
              )}
            </div>

            {/* Athlete Specs Table */}
            <div className={`bg-gray-50 p-4 rounded-xl border border-gray-300 mb-6 ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className="text-sm font-black text-black mb-3">
                {printLang === 'ar' ? 'بيانات اللاعب الشخصية والبدنية' : 'Athlete Personal & Physical Metrics'}
              </h3>
              <div className="grid grid-cols-3 gap-y-2 gap-x-4 text-xs">
                {printLang === 'ar' ? (
                  <>
                    <div><strong className="text-gray-700">الاسم الكامل:</strong> {activePlayer.full_name}</div>
                    <div><strong className="text-gray-700">النوع:</strong> {activePlayer.gender === 'female' ? 'أنثى' : 'ذكر'}</div>
                    <div><strong className="text-gray-700">العمر:</strong> {age} سنوات</div>
                    <div><strong className="text-gray-700">الوزن:</strong> {activePlayer.weight_kg} كجم</div>
                    <div><strong className="text-gray-700">طول الرجل:</strong> {getLegLengthCm(activePlayer.leg_length_m)} سم</div>
                    <div><strong className="text-gray-700">طول القامة:</strong> {playerHeight} سم</div>
                    <div><strong className="text-gray-700">الوصول من الثبات:</strong> {playerStandingReach} سم</div>
                  </>
                ) : (
                  <>
                    <div><strong className="text-gray-700">Full Name:</strong> {activePlayer.full_name}</div>
                    <div><strong className="text-gray-700">Gender:</strong> {activePlayer.gender === 'female' ? 'Female' : 'Male'}</div>
                    <div><strong className="text-gray-700">Age:</strong> {age} years</div>
                    <div><strong className="text-gray-700">Weight:</strong> {activePlayer.weight_kg} kg</div>
                    <div><strong className="text-gray-700">Leg Length:</strong> {getLegLengthCm(activePlayer.leg_length_m)} cm</div>
                    <div><strong className="text-gray-700">Height:</strong> {playerHeight} cm</div>
                    <div><strong className="text-gray-700">Standing Reach:</strong> {playerStandingReach} cm</div>
                  </>
                )}
              </div>
            </div>

            {/* Jumps Table */}
            <div className={`mb-6 ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className="text-sm font-black text-black mb-3">
                {printLang === 'ar' ? 'بيانات مصفوفة قياسات اختبارات الوثب المتكاملة' : 'Integrated Vertical Jump Tests Matrix'}
              </h3>
              <table className="print-table text-xs">
                <thead>
                  {printLang === 'ar' ? (
                    <tr>
                      <th>نوع الاختبار</th>
                      <th>الارتفاع (سم)</th>
                      <th>الارتفاع (إنش)</th>
                      <th>زمن الطيران (ثانية)</th>
                      <th>كثافة القدرة (W/kg)</th>
                      <th>القدرة القصوى (وات)</th>
                      <th>تاريخ القياس</th>
                    </tr>
                  ) : (
                    <tr>
                      <th>Test Type</th>
                      <th>Height (cm)</th>
                      <th>Height (in)</th>
                      <th>Flight Time (s)</th>
                      <th>Relative Power (W/kg)</th>
                      <th>Peak Power (Watts)</th>
                      <th>Test Date</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {getTranslatedConfig(printLang).map((test) => {
                    const rec = test.record;
                    const inHeight = rec ? parseFloat((parseFloat(rec.jump_height_cm) * 0.393701).toFixed(1)) : 0;
                    const recPower = rec ? (rec.peak_power_watts && parseFloat(rec.peak_power_watts) > 0 ? parseFloat(rec.peak_power_watts) : (60.7 * parseFloat(rec.jump_height_cm) + 45.3 * mass - 2055)) : 0;
                    const recRelPower = rec && mass > 0 ? parseFloat((recPower / mass).toFixed(1)) : 0;
                    
                    return (
                      <tr key={test.type}>
                        <td className="font-bold">{printLang === 'ar' ? test.nameAr.split('(')[0] : test.nameEn}</td>
                        <td className="font-mono font-bold">{rec ? parseFloat(rec.jump_height_cm).toFixed(1) : '—'}</td>
                        <td className="font-mono">{rec ? inHeight.toFixed(1) : '—'}</td>
                        <td className="font-mono">{rec ? parseFloat(rec.flight_time_sec).toFixed(3) : '—'}</td>
                        <td className="font-mono">{rec ? recRelPower.toFixed(1) : '—'}</td>
                        <td className="font-mono">{rec ? recPower.toFixed(0) : '—'}</td>
                        <td className="font-mono text-gray-700 text-[10px]">
                          {rec ? new Date(rec.created_at).toLocaleDateString(printLang === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="font-bold">{printLang === 'ar' ? 'الوثب الساقط (RSI)' : 'Drop Jump (RSI)'}</td>
                    <td className="font-mono font-bold">
                      {rsiRecord ? `RSI: ${parseFloat(rsiRecord.rsi_score).toFixed(2)}` : '—'}
                    </td>
                    <td className="font-mono">
                      {rsiRecord && rsiRecord.contact_time_sec 
                        ? (printLang === 'ar' ? `Tc: ${parseFloat(rsiRecord.contact_time_sec).toFixed(3)} ث` : `Tc: ${parseFloat(rsiRecord.contact_time_sec).toFixed(3)} s`) 
                        : '—'}
                    </td>
                    <td className="font-mono">{rsiRecord ? parseFloat(rsiRecord.flight_time_sec).toFixed(3) : '—'}</td>
                    <td className="font-mono">—</td>
                    <td className="font-mono">—</td>
                    <td className="font-mono text-gray-700 text-[10px]">
                      {rsiRecord ? new Date(rsiRecord.created_at).toLocaleDateString(printLang === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mechanical Power */}
            <div className={`mb-6 ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className="text-sm font-black text-black mb-3">
                {printLang === 'ar' ? 'تقديرات القدرة الانفجارية (Mechanical Power)' : 'Biomechanical Power Outputs (Sayers & Harman Models)'}
              </h3>
              <div className="print-grid text-xs">
                <div className="border border-gray-350 p-3 rounded-lg bg-gray-50">
                  <p className="font-bold mb-1">
                    {printLang === 'ar' ? 'Sayers Peak Power (القدرة القصوى)' : 'Sayers Peak Power'}
                  </p>
                  <p className="text-lg font-mono font-black text-black">
                    {sayersPeak.toFixed(0)} <span className="text-xs font-normal">{printLang === 'ar' ? 'وات' : 'Watts'}</span>
                  </p>
                </div>
                <div className="border border-gray-350 p-3 rounded-lg bg-gray-50">
                  <p className="font-bold mb-1">
                    {printLang === 'ar' ? 'Harman Peak Power (القدرة القصوى)' : 'Harman Peak Power'}
                  </p>
                  <p className="text-lg font-mono font-black text-black">
                    {harmanPeak.toFixed(0)} <span className="text-xs font-normal">{printLang === 'ar' ? 'وات' : 'Watts'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnostics */}
            <div className={`mb-6 ${printLang === 'ar' ? 'text-right' : 'text-left'}`}>
              <h3 className="text-sm font-black text-black mb-3">
                {printLang === 'ar' ? 'التشخيص والتوصيات الميكانيكية الحيوية المتكاملة' : 'Integrated Biomechanical Diagnostics & Critique'}
              </h3>
              
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
                         eur >= 1.05 && eur <= 1.15 ? (printLang === 'ar' ? 'متوازن (عضلات وأوتار) ✨' : 'Balanced (Optimal) ✨') :
                         eur < 1.05 ? (printLang === 'ar' ? 'العضلات (الأوتار ضعيفة) 🔴' : 'Muscles Dominant (Tendon Deficit) 🔴') : 
                         (printLang === 'ar' ? 'الأوتار (العضلات تفتقر للقوة الصافية) ⚠️' : 'Tendon Dominant (Force Deficit) ⚠️')}
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

              <div className="border border-gray-300 p-4 rounded-lg bg-gray-50 text-[11px] leading-relaxed whitespace-pre-line text-gray-800 font-mono">
                {printLang === 'ar' ? unifiedDiagnosticText : generateUnifiedDiagnosticEN()}
              </div>
            </div>

          </div>
        )}

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