import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Zap, Play, Pause, X, Save, Info, Sparkles, Clock, ArrowUpCircle, ShieldAlert, Award, Video, Sliders } from 'lucide-react';
import { classifyGCT, calculateRSI } from './useJumpMechanics';
import type { Player, JumpMeasurement, GCTAnalysis } from './types/athletics';

// Animated counter helper
const AnimatedCounter = ({ value, duration = 1000, decimals = 1 }: { value: string | number; duration?: number; decimals?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(String(value)) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const startTime = performance.now();
    const updateCount = (now: number) => {
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
  return <span className="font-mono metric-num">{count.toFixed(decimals)}</span>;
};

interface RSICalculatorProps {
  activePlayer?: Player | null;
  selectedPlayerId?: string;
  onSaveSuccess?: (measurement: JumpMeasurement) => void;
  language?: string;
  playerHistory?: JumpMeasurement[];
}

interface RSIStats {
  contactTime: string;
  flightTime: string;
  heightCm: string;
  heightInches: string;
  rsi: string;
  rsiMod: string;
  legStiffness: string;
  gctAnalysis: GCTAnalysis;
}

export default function RSICalculator({
  activePlayer,
  selectedPlayerId,
  onSaveSuccess,
  language = 'ar',
  playerHistory = []
}: RSICalculatorProps) {
  const [cameraFps, setCameraFps] = useState<number | string>(240);
  const [videoFps, setVideoFps] = useState<number | string>(30);

  // 3 key time points for RSI
  const [touchdownTime, setTouchdownTime] = useState(0);
  const [takeoffTime, setTakeoffTime] = useState(0);
  const [landingTime, setLandingTime] = useState(0);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const [stats, setStats] = useState<RSIStats | null>(null);

  // RSI calculation method toggle: 'height_gct' (Standard Jump Height / GCT) vs 'flight_gct' (Flight Time / GCT)
  const [rsiMethod, setRsiMethod] = useState<'height_gct' | 'flight_gct'>('height_gct');

  // Unit and Time calculation custom settings
  const [displayUnit, setDisplayUnit] = useState<'cm' | 'in'>('cm');
  const [timeCalculationMethod, setTimeCalculationMethod] = useState<'fps' | 'manual'>('fps');
  const [manualFrameDuration, setManualFrameDuration] = useState(0.033);
  const [isFrameDurationManual, setIsFrameDurationManual] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);

  const currentTimeDesktopRef = useRef<HTMLSpanElement | null>(null);
  const currentFrameDesktopRef = useRef<HTMLSpanElement | null>(null);

  // Sync manualFrameDuration with cameraFps
  useEffect(() => {
    if (!isFrameDurationManual) {
      const cFps = parseFloat(String(cameraFps)) || 240;
      setManualFrameDuration(parseFloat((1 / cFps).toFixed(6)));
    }
  }, [cameraFps, isFrameDurationManual]);

  const performSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.currentTime = time;
      if (video.paused) {
        video.play().then(() => {
          if (videoRef.current) videoRef.current.pause();
        }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  const stepFrames = (frames: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const vFps = parseFloat(String(videoFps)) || 30;
    const delta = frames / vFps;
    const newTime = Math.max(0.01, Math.min(duration - 0.01, video.currentTime + delta));
    video.currentTime = newTime;
    setCurrentTime(newTime);
    if (currentTimeDesktopRef.current) currentTimeDesktopRef.current.innerText = newTime.toFixed(3) + 's';
    if (currentFrameDesktopRef.current) currentFrameDesktopRef.current.innerText = 'F ' + Math.round(newTime * vFps);
  };

  // RSI Calculations & Leg Stiffness
  useEffect(() => {
    if (
      touchdownTime > 0 &&
      takeoffTime > touchdownTime &&
      landingTime > takeoffTime
    ) {
      const cFps = parseFloat(String(cameraFps)) || 240;
      const vFps = parseFloat(String(videoFps)) || 30;
      
      let realContactTime: number;
      let realFlightTime: number;
      
      if (timeCalculationMethod === 'manual') {
        const touchdownFrame = touchdownTime * vFps;
        const takeoffFrame = takeoffTime * vFps;
        const landingFrame = landingTime * vFps;
        
        realContactTime = Math.abs(takeoffFrame - touchdownFrame) / cFps;
        realFlightTime = Math.abs(landingFrame - takeoffFrame) / cFps;
      } else {
        const contactTimeDelta = Math.abs(takeoffTime - touchdownTime);
        const flightTimeDelta = Math.abs(landingTime - takeoffTime);
        realContactTime = contactTimeDelta * (vFps / cFps);
        realFlightTime = flightTimeDelta * (vFps / cFps);
      }

      const heightMeters = 1.2258 * Math.pow(realFlightTime, 2);
      const heightCm = heightMeters * 100;
      const heightInches = heightCm * 0.393701;

      const rsiScore = calculateRSI(heightCm, realFlightTime, realContactTime, 'height_gct');
      const rsiModScore = calculateRSI(heightCm, realFlightTime, realContactTime, 'flight_gct');
      const gctAnalysis = classifyGCT(realContactTime);

      const mass = activePlayer?.weight_kg || 70;
      const tc = realContactTime;
      const tf = realFlightTime;
      const numerator = mass * Math.PI * (tf + tc);
      const denominator = Math.pow(tc, 2) * ((tf + tc) / Math.PI - tc / 2);
      const stiffnessN = denominator > 0 ? numerator / denominator : 0;
      const legStiffnessKnM = stiffnessN / 1000;

      setStats({
        contactTime: realContactTime.toFixed(3),
        flightTime: realFlightTime.toFixed(3),
        heightCm: heightCm.toFixed(2),
        heightInches: heightInches.toFixed(2),
        rsi: (rsiMethod === 'height_gct' ? rsiScore : rsiModScore).toFixed(2),
        rsiMod: rsiModScore.toFixed(2),
        legStiffness: legStiffnessKnM.toFixed(2),
        gctAnalysis,
      });
    } else {
      setStats(null);
    }
  }, [touchdownTime, takeoffTime, landingTime, cameraFps, videoFps, activePlayer, timeCalculationMethod, manualFrameDuration, rsiMethod]);

  const handleAnalyze = () => {
    if (touchdownTime === 0 || takeoffTime === 0 || landingTime === 0) {
      return alert('يرجى تحديد الأوقات الثلاثة (ملامسة الأرض، الإقلاع، الهبوط) من الفيديو.');
    }
    if (takeoffTime <= touchdownTime || landingTime <= takeoffTime) {
      return alert('تسلسل الأوقات غير منطقي! يجب أن يكون: ملامسة ⬅️ إقلاع ⬅️ هبوط.');
    }
    setShowResults(true);
  };

  const saveMeasurement = async () => {
    if (!selectedPlayerId || !stats) return alert('خطأ في البيانات!');
    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from('lab_jump_measurements')
        .insert([
          {
            player_id: selectedPlayerId,
            test_type: 'rsi',
            jump_height_cm: parseFloat(stats.heightCm),
            flight_time_sec: parseFloat(stats.flightTime),
            contact_time_sec: parseFloat(stats.contactTime),
            rsi_score: parseFloat(stats.rsi),
            takeoff_velocity_ms: 0,
            mean_power_watts: 0,
            clean_weight_kg: null,
            notes: `GCT: ${stats.contactTime}s (${stats.gctAnalysis.labelEn})`,
          },
        ])
        .select();

      if (!error && data) {
        alert('✅ تم حفظ اختبار الـ RSI في سجل اللاعب بنجاح!');
        setShowResults(false);
        if (onSaveSuccess) onSaveSuccess(data[0]);
      } else {
        console.error(error);
        alert('حدث خطأ أثناء حفظ النتيجة.');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ غير متوقع أثناء الحفظ.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setTouchdownTime(0);
      setTakeoffTime(0);
      setLandingTime(0);
      setShowResults(false);
      setCurrentTime(0);
    }
  };

  const clearVideo = () => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(null);
    setTouchdownTime(0);
    setTakeoffTime(0);
    setLandingTime(0);
    setShowResults(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const t = videoRef.current.currentTime;
      setCurrentTime(t);
      const vFps = parseFloat(String(videoFps)) || 30;
      if (currentTimeDesktopRef.current) currentTimeDesktopRef.current.innerText = t.toFixed(3) + 's';
      if (currentFrameDesktopRef.current) currentFrameDesktopRef.current.innerText = 'F ' + Math.round(t * vFps);
    }
  };

  const getRSIEval = (rsi: string | number) => {
    const score = parseFloat(String(rsi));
    if (score < 1.5) {
      return {
        text: 'تحتاج تطوير ⚠️ (أوتار مرنة ضعيفة؛ تتطلب تدريبات بليومترك سريعة مكثفة)',
        color: 'text-amber-400 bg-amber-950/20 border-amber-500/30',
      };
    }
    if (score >= 1.5 && score < 2.0) {
      return {
        text: 'مقبول ⚡ (صلابة متوسطة؛ تحتاج لدمج قفزات Pogo قصيرة)',
        color: 'text-cyan-400 bg-cyan-950/20 border-cyan-500/30',
      };
    }
    if (score >= 2.0 && score < 2.5) {
      return {
        text: 'جيد جداً ⭐ (صلابة كاحل ممتازة وكفاءة ارتداد قوية)',
        color: 'text-emerald-400 bg-emerald-950/20 border-emerald-500/30',
      };
    }
    return {
      text: 'نخبة أولمبية 👑 (صلابة أوتار استثنائية وسرعة نقل طاقة فائقة)',
      color: 'text-[#00F0FF] bg-[#00F0FF]/15 border-[#00F0FF]/40',
    };
  };

  return (
    <div className="glass-panel p-4 md:p-6 shadow-2xl transition-all duration-300 text-right animate-fade-in border border-white/10" style={{ direction: 'rtl' }}>
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-5 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#00F0FF]/10 rounded-2xl border border-[#00F0FF]/30 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Zap size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">RSI (Reactive Strength Index) - Drop Jump</h3>
            <p className="text-xs text-gray-400 mt-1">قياس مرونة الكاحل والأوتار وزمن التلامس بالأرض (Ground Contact Time)</p>
          </div>
        </div>

        {/* RSI Calculation Formula Toggle */}
        <div className="bg-[#111827]/80 p-1.5 rounded-xl border border-white/10 flex items-center gap-1">
          <button
            onClick={() => setRsiMethod('height_gct')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${rsiMethod === 'height_gct' ? 'bg-[#00F0FF] text-[#07090E] shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'text-gray-400 hover:text-white'}`}
          >
            ارتفاع / تلامس (Height/GCT)
          </button>
          <button
            onClick={() => setRsiMethod('flight_gct')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${rsiMethod === 'flight_gct' ? 'bg-[#00F0FF] text-[#07090E] shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'text-gray-400 hover:text-white'}`}
          >
            طيران / تلامس (Flight/GCT)
          </button>
        </div>
      </div>

      {/* Video Uploader Frame */}
      <div className="mb-6 p-6 bg-[#111827]/40 rounded-2xl border border-white/10 relative">
        {!videoSrc && (
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="flex-1 relative cursor-pointer group">
              <input
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileUpload}
                ref={cameraInputRef}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="btn-electric text-center py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-lg active:scale-98 cursor-pointer">
                <Zap size={20} />
                افتح الكاميرا وصوّر 📸
              </div>
            </div>
            <div className="flex-1 relative cursor-pointer group">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-[#111827] hover:bg-[#1f2937] border border-white/10 text-white text-center py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-md active:scale-98 cursor-pointer">
                <Play size={20} className="text-[#00F0FF]" />
                اختر فيديو من الاستوديو 📁
              </div>
            </div>
          </div>
        )}

        {videoSrc && (
          <div className="flex flex-col items-center w-full relative">
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 z-25 bg-rose-600 hover:bg-rose-500 text-white p-2.5 rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer border border-rose-400/20"
            >
              <X size={16} />
            </button>
            
            <div className="relative inline-block border-2 border-white/10 rounded-3xl overflow-hidden mb-6 shadow-2xl bg-black max-w-full">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                muted
                preload="auto"
                className="max-h-80 w-auto object-contain"
                onLoadedMetadata={() => {
                  if (videoRef.current) setDuration(videoRef.current.duration);
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            {/* Filmstrip Scrubber Timeline */}
            <div className="w-full bg-[#0B0F19] p-4 rounded-2xl border border-white/10 mb-5">
              <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2 font-bold px-1">
                <span>خط زمن اختبار الـ RSI</span>
                <span className="text-[#00F0FF]">اسحب خط الزمن لتحديد لحظات الكبح والارتقاء ⏱️</span>
              </div>
              
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 relative mb-4">
                <div className="flex justify-between items-center w-full md:w-auto bg-[#111827] px-3 py-2 rounded-xl border border-white/10 text-center shrink-0 gap-3">
                  <div className="text-right">
                    <span className="block text-[9px] text-gray-400 font-bold">الوقت الحالي</span>
                    <span ref={currentTimeDesktopRef} className="text-xs font-black text-[#00F0FF] font-mono metric-num">{currentTime.toFixed(3)}s</span>
                  </div>
                  <div className="border-r border-white/10 h-6" />
                  <div className="text-right">
                    <span className="block text-[9px] text-gray-400 font-bold">رقم الإطار</span>
                    <span ref={currentFrameDesktopRef} className="text-xs font-bold text-gray-300 font-mono metric-num">F {Math.round(currentTime * (parseFloat(String(videoFps)) || 30))}</span>
                  </div>
                </div>
                
                <div ref={timelineTrackRef} className="relative w-full md:flex-1 h-12 bg-black/60 border border-[#00F0FF]/30 rounded-2xl select-none flex items-center px-4">
                  <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none opacity-20">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`w-0.5 bg-[#00F0FF] rounded-full ${i % 5 === 0 ? 'h-5 opacity-70' : 'h-2.5 opacity-30'}`} />
                    ))}
                  </div>

                  {duration > 0 && touchdownTime > 0 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] z-10 pointer-events-none" style={{ right: `${(touchdownTime / duration) * 100}%` }}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#00F0FF] text-[#07090E] text-[8px] font-black rounded whitespace-nowrap">📥 ملامسة</div>
                    </div>
                  )}

                  {duration > 0 && takeoffTime > 0 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-[#10B981] shadow-[0_0_12px_#10B981] z-10 pointer-events-none" style={{ right: `${(takeoffTime / duration) * 100}%` }}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#10B981] text-[#07090E] text-[8px] font-black rounded whitespace-nowrap">🚀 إقلاع</div>
                    </div>
                  )}

                  {duration > 0 && landingTime > 0 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-rose-500 shadow-[0_0_8px_#ef4444] z-10 pointer-events-none" style={{ right: `${(landingTime / duration) * 100}%` }}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded whitespace-nowrap">🛬 هبوط</div>
                    </div>
                  )}

                  <input 
                    type="range"
                    min="0.01"
                    max={duration || 100}
                    step="0.001"
                    value={currentTime}
                    dir="rtl"
                    onMouseDown={() => { setIsDragging(true); if (videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } }}
                    onTouchStart={() => { setIsDragging(true); if (videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } }}
                    onInput={(e) => {
                      const val = parseFloat((e.target as HTMLInputElement).value);
                      if (videoRef.current) videoRef.current.currentTime = val;
                      setCurrentTime(val);
                    }}
                    onMouseUp={() => { setIsDragging(false); }}
                    onTouchEnd={() => { setIsDragging(false); }}
                    className="timeline-slider w-full h-full opacity-100 bg-transparent absolute inset-0 z-30 px-4 cursor-pointer"
                  />
                </div>
              </div>

              {/* Step Navigation Wheel Controls */}
              <div className="flex justify-center items-center gap-1.5 flex-wrap">
                <button onClick={() => stepFrames(-10)} className="w-10 h-10 rounded-xl bg-[#111827] border border-white/10 text-white font-mono text-xs font-bold hover:bg-white/10 cursor-pointer active:scale-95 transition-all">-10</button>
                <button onClick={() => stepFrames(-5)} className="w-10 h-10 rounded-xl bg-[#111827] border border-white/10 text-white font-mono text-xs font-bold hover:bg-white/10 cursor-pointer active:scale-95 transition-all">-5</button>
                <button onClick={() => stepFrames(-1)} className="w-10 h-10 rounded-xl bg-[#111827] border border-white/10 text-white font-mono text-xs font-bold hover:bg-white/10 cursor-pointer active:scale-95 transition-all">-1</button>
                
                <button onClick={togglePlay} className="px-7 py-2.5 btn-electric rounded-xl font-black flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all w-24">
                  {isPlaying ? <Pause size={14}/> : <Play size={14}/>}
                </button>
                
                <button onClick={() => stepFrames(1)} className="w-10 h-10 rounded-xl bg-[#111827] border border-white/10 text-white font-mono text-xs font-bold hover:bg-white/10 cursor-pointer active:scale-95 transition-all">+1</button>
                <button onClick={() => stepFrames(5)} className="w-10 h-10 rounded-xl bg-[#111827] border border-white/10 text-white font-mono text-xs font-bold hover:bg-white/10 cursor-pointer active:scale-95 transition-all">+5</button>
                <button onClick={() => stepFrames(10)} className="w-10 h-10 rounded-xl bg-[#111827] border border-white/10 text-white font-mono text-xs font-bold hover:bg-white/10 cursor-pointer active:scale-95 transition-all">+10</button>
              </div>
            </div>

            {/* Set Points Trigger Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-6">
              <button
                onClick={() => { setTouchdownTime(currentTime); setShowResults(false); }}
                className={`px-4 py-3 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                  touchdownTime > 0
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'bg-[#111827] hover:bg-[#1f2937] text-gray-300 border-white/10'
                }`}
              >
                1. لحظة ملامسة الأرض 📥
              </button>
              <button
                onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }}
                className={`px-4 py-3 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                  takeoffTime > 0
                    ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-[#111827] hover:bg-[#1f2937] text-gray-300 border-white/10'
                }`}
              >
                2. لحظة الإقلاع 🚀
              </button>
              <button
                onClick={() => { setLandingTime(currentTime); setShowResults(false); }}
                className={`px-4 py-3 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                  landingTime > 0
                    ? 'bg-rose-600/20 text-rose-400 border-rose-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                    : 'bg-[#111827] hover:bg-[#1f2937] text-gray-300 border-white/10'
                }`}
              >
                3. لحظة الهبوط 🛬
              </button>
            </div>

            <button
              onClick={handleAnalyze}
              className="w-full py-4 btn-electric rounded-xl font-black text-sm shadow-[0_0_20px_rgba(0,240,255,0.35)] transition-transform hover:scale-[1.01] active:scale-98 cursor-pointer"
            >
              استخراج نتائج وتحليل الـ RSI ⚡
            </button>
          </div>
        )}
      </div>

      {showResults && stats && (
        <div className="space-y-6 border-t border-white/10 pt-6 animate-fade-in">
          
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div className="text-xs font-bold text-[#00F0FF] flex items-center gap-1.5">
              <Sparkles size={14} /> لوحة قياس الأداء والميكانيكا الحيوية للـ RSI
            </div>
            
            <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setDisplayUnit('cm')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${displayUnit === 'cm' ? 'bg-[#00F0FF] text-[#07090E]' : 'text-gray-400 hover:text-white'}`}
              >
                سم (Cm)
              </button>
              <button
                type="button"
                onClick={() => setDisplayUnit('in')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${displayUnit === 'in' ? 'bg-[#00F0FF] text-[#07090E]' : 'text-gray-400 hover:text-white'}`}
              >
                بوصة (Inches)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Primary Radial RSI score ring */}
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg lg:col-span-1 border border-white/10">
              <span className="text-xs font-bold text-gray-400 mb-6 block uppercase tracking-wider">مؤشر القوة الارتدادية الأخير</span>
              
              <div className="relative w-40 h-40 flex items-center justify-center bg-black/40 rounded-full border border-white/10 shadow-inner">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="41" 
                    fill="none" 
                    stroke="url(#rsiElectricProgress)" 
                    strokeWidth="6" 
                    strokeLinecap="round"
                    strokeDasharray="257.61"
                    strokeDashoffset={257.61 - (257.61 * Math.min(1.0, parseFloat(stats.rsi)/4.0))} 
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="rsiElectricProgress" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00F0FF" />
                      <stop offset="100%" stopColor="#0EA5E9" />
                    </linearGradient>
                  </defs>
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                  <span className="text-4xl font-black text-white font-mono leading-none drop-shadow-[0_0_15px_rgba(0,240,255,0.6)]">
                    <AnimatedCounter value={stats.rsi} decimals={2} />
                  </span>
                  <span className="text-[9px] text-[#00F0FF] font-extrabold uppercase mt-1">RSI Score</span>
                </div>
              </div>
            </div>

            {/* Performance breakdown indicators */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card p-4 flex flex-col justify-between border-b-2 border-[#00F0FF]">
                <span className="text-[10px] text-gray-400 font-bold">زمن التلامس (Tc)</span>
                <span className="text-xl font-black text-white font-mono block mt-2">
                  <AnimatedCounter value={stats.contactTime} decimals={3} /> <span className="text-xs text-gray-500 font-normal">s</span>
                </span>
                <span className="text-[8px] text-gray-500 mt-1 block">Ground Contact Time</span>
              </div>
              <div className="glass-card p-4 flex flex-col justify-between border-b-2 border-cyan-400">
                <span className="text-[10px] text-gray-400 font-bold">زمن الطيران (Tf)</span>
                <span className="text-xl font-black text-white font-mono block mt-2">
                  <AnimatedCounter value={stats.flightTime} decimals={3} /> <span className="text-xs text-gray-500 font-normal">s</span>
                </span>
                <span className="text-[8px] text-gray-500 mt-1 block">Flight Duration</span>
              </div>
              <div className="glass-card p-4 flex flex-col justify-between border-b-2 border-emerald-400">
                <span className="text-[10px] text-gray-400 font-bold">الارتفاع الميكانيكي</span>
                <span className="text-xl font-black text-white font-mono block mt-2">
                  <AnimatedCounter value={displayUnit === 'in' ? stats.heightInches : stats.heightCm} decimals={1} /> <span className="text-xs text-gray-500 font-normal">{displayUnit === 'in' ? 'in' : 'cm'}</span>
                </span>
                <span className="text-[8px] text-gray-500 mt-1 block">Jump Height</span>
              </div>
              <div className="glass-card p-4 flex flex-col justify-between border-b-2 border-purple-400">
                <span className="text-[10px] text-gray-400 font-bold">صلابة الأوتار</span>
                <span className="text-xl font-black text-purple-400 font-mono block mt-2">
                  <AnimatedCounter value={stats.legStiffness} decimals={1} /> <span className="text-xs text-purple-500/50 font-normal">kN/m</span>
                </span>
                <span className="text-[8px] text-gray-500 mt-1 block">Leg Stiffness</span>
              </div>
            </div>

          </div>

          {/* Automatic Ground Contact Time (GCT) Classification Badge */}
          <div className="glass-card p-5 border border-white/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderLeftWidth: 4, borderLeftColor: stats.gctAnalysis.zoneColor }}>
            <div className="text-right flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black uppercase tracking-wider text-gray-400">تصنيف سرعة دورة الاستطالة والتقصير (GCT Phase):</span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full border" style={{ color: stats.gctAnalysis.zoneColor, borderColor: stats.gctAnalysis.zoneColor, backgroundColor: `${stats.gctAnalysis.zoneColor}15` }}>
                  {stats.gctAnalysis.labelAr}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">{stats.gctAnalysis.descriptionAr}</p>
            </div>
            <div className="text-center font-mono text-sm font-black px-4 py-2 rounded-xl bg-black/40 border border-white/10 shrink-0">
              <span className="text-gray-400 block text-[9px] font-sans">زمن التلامس بالميللي ثانية</span>
              <span style={{ color: stats.gctAnalysis.zoneColor }}>{(parseFloat(stats.contactTime) * 1000).toFixed(0)} ms</span>
            </div>
          </div>

          {/* Biomechanical Grade Capsule */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Info size={14} className="text-[#00F0FF]" />
              <span>التقييم البيوميكانيكي الوظيفي للجهاز الحركي والأوتار</span>
            </div>
            <p className={`text-base font-black px-4 py-2 rounded-xl border ${getRSIEval(stats.rsi).color}`}>
              {getRSIEval(stats.rsi).text}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button
              onClick={saveMeasurement}
              disabled={isSaving}
              className="flex-1 py-4 btn-electric rounded-xl font-black text-sm shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-transform hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save size={16} />
              {isSaving ? 'جاري حفظ الاختبار...' : 'حفظ نتيجة الـ RSI في سجل ملف اللاعب'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
