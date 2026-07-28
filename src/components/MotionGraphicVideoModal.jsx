import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Download, Play, Pause, RotateCcw, X, Film, Check, Sparkles, Award, Zap, Activity } from 'lucide-react';
import html2canvas from 'html2canvas';
import AppLogo from '../AppLogo';

export default function MotionGraphicVideoModal({
  activePlayer,
  playerHistory = [],
  isOpen,
  onClose,
  language = 'ar'
}) {
  const isEn = language === 'en';
  const cardRef = useRef(null);

  // Animation Sequence Phase: 0 = Intro, 1 = Bio & CMJ, 2 = RSI & Power, 3 = Summary Seal
  const [motionPhase, setMotionPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);

  // Player Metrics
  const mass = parseFloat(activePlayer?.weight_kg) || 72;
  const playerHeight = parseFloat(activePlayer?.height_cm) || 178;
  const age = activePlayer?.age || 24;

  const maxCmjRecord = playerHistory.find(r => r.test_type === 'cmj' || r.test_type === 'cmj_arms');
  const maxCmj = maxCmjRecord ? parseFloat(maxCmjRecord.jump_height_cm) || 0 : 0;
  const cmjFlightTime = maxCmjRecord ? parseFloat(maxCmjRecord.flight_time_sec) || 0 : 0;

  const maxRsiRecord = playerHistory.find(r => r.test_type === 'rsi');
  const maxRsi = maxRsiRecord ? parseFloat(maxRsiRecord.rsi_score) || 0 : 0;
  const boxHeight = maxRsiRecord?.box_height_cm || 30;

  const squatRecord = playerHistory.find(r => r.test_type === 'full_squat');
  const squatWeight = squatRecord ? parseFloat(squatRecord.clean_weight_kg) || 0 : 0;

  const benchRecord = playerHistory.find(r => r.test_type === 'bench_press');
  const benchWeight = benchRecord ? parseFloat(benchRecord.clean_weight_kg) || 0 : 0;

  // Auto-play phase sequence timer (Loops through phases 0 -> 1 -> 2 -> 3)
  useEffect(() => {
    let interval;
    if (isPlaying && isOpen) {
      interval = setInterval(() => {
        setMotionPhase((prev) => (prev + 1) % 4);
      }, 2500); // 2.5 seconds per phase
    }
    return () => clearInterval(interval);
  }, [isPlaying, isOpen]);

  // Video Export Recording Function
  const handleExportMotionVideo = async () => {
    if (!cardRef.current || isRecording) return;
    setIsRecording(true);
    setRecordProgress(15);
    setVideoUrl(null);

    try {
      setRecordProgress(40);
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#03050c',
        useCORS: true,
        logging: false
      });

      setRecordProgress(70);
      const stream = canvas.captureStream(30); // 30 FPS Stream
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm'
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecording(false);
        setRecordProgress(100);
      };

      mediaRecorder.start();
      setRecordProgress(85);

      // Record 4 seconds of motion clip
      setTimeout(() => {
        mediaRecorder.stop();
      }, 4000);

    } catch (err) {
      console.error("Motion Video Generation Error:", err);
      setIsRecording(false);
      alert(isEn ? 'Could not generate video file.' : 'تعذر توليد الفيديو تلقائياً.');
    }
  };

  if (!isOpen || !activePlayer) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="glass-panel max-w-xl w-full p-6 space-y-6 hud-card border-orange-500/40 relative max-h-[95vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl bg-gray-900 border border-gray-800 transition-all cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <div className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/30">
            <Film size={26} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>{isEn ? 'Motion Graphic Video Showcase' : 'فيديو الموشن جرافيك للّاعب (Motion Graphic Showcase)'}</span>
            </h3>
            <p className="text-xs text-gray-400">
              {isEn ? 'Sleek animated sports card presentation for athlete metrics' : 'عرض متحرك رياضي فخم وعالي التباين لأرقام ونتائج اللاعب'}
            </p>
          </div>
        </div>

        {/* Video & Playback Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-black/50 p-3.5 rounded-2xl border border-orange-500/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                isPlaying ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
              }`}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>{isPlaying ? 'إيقاف التمرير (Pause)' : 'تشغيل الحركة (Play Motion)'}</span>
            </button>

            <button
              onClick={() => setMotionPhase(0)}
              className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-gray-800 transition-all cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>إعادة من البداية</span>
            </button>
          </div>

          <button
            onClick={handleExportMotionVideo}
            disabled={isRecording}
            className="px-5 py-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRecording ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري استخراج الفيديو ({recordProgress}%)...</span>
              </>
            ) : (
              <>
                <Video size={16} />
                <span>🎬 تصدير فيديو الموشن جرافيك</span>
              </>
            )}
          </button>
        </div>

        {/* Video Player Preview Download */}
        {videoUrl && (
          <div className="space-y-2 bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 font-mono">
                <Check size={16} /> تم توليد فيديو الموشن جرافيك بنجاح!
              </span>
              <a
                href={videoUrl}
                download={`${activePlayer.full_name}_motion_showcase.webm`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download size={15} />
                <span>تحميل الفيديو WebM ⬇️</span>
              </a>
            </div>
            <video src={videoUrl} controls autoPlay loop className="w-full max-h-[250px] object-contain rounded-xl mt-2 bg-black" />
          </div>
        )}

        {/* 🎨 MOTION GRAPHIC ANIMATED CANVAS CARD */}
        <div
          ref={cardRef}
          className="relative w-full aspect-[4/5] max-w-md mx-auto bg-gradient-to-b from-[#0a0f1e] via-[#050711] to-[#020306] rounded-3xl border-2 border-orange-500/50 p-6 flex flex-col justify-between overflow-hidden shadow-2xl"
        >
          {/* Animated Glow Orbs & Sci-Fi Background Lines */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/15 blur-3xl rounded-full pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/15 blur-3xl rounded-full pointer-events-none animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* TOP HEADER BRANDING */}
          <div className="flex justify-between items-center border-b border-orange-500/30 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <AppLogo size={36} />
              <div>
                <span className="text-sm font-black tracking-widest text-white block">VERTICAL LAB</span>
                <span className="text-[10px] text-orange-400 font-mono font-bold block">MOTION GRAPHIC TELEMETRY</span>
              </div>
            </div>
            <div className="px-3 py-1 bg-orange-500/20 text-orange-300 border border-orange-500/40 rounded-xl text-[10px] font-mono font-bold">
              OFFICIAL BIOMEX
            </div>
          </div>

          {/* DYNAMIC MOTION GRAPHIC CONTENT STAGE */}
          <div className="relative z-10 my-auto py-4 min-h-[240px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              
              {/* PHASE 0: ATHLETE INTRO BADGE */}
              {motionPhase === 0 && (
                <motion.div
                  key="phase0"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full text-center space-y-4"
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 text-white font-black text-3xl flex items-center justify-center shadow-xl shadow-orange-500/30 font-mono border-2 border-white/20">
                    {activePlayer.full_name ? activePlayer.full_name[0] : 'P'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-wide">{activePlayer.full_name}</h2>
                    <p className="text-sm font-mono text-cyan-400 font-bold mt-1">
                      {age} {isEn ? 'years' : 'سنة'} • {mass} kg • {playerHeight} cm
                    </p>
                  </div>
                  <div className="inline-block px-4 py-1.5 bg-black/60 border border-orange-500/40 rounded-full text-xs text-orange-300 font-mono font-bold shadow-md">
                    ⚡ ATHLETE BIOMECHANICAL DOSSIER
                  </div>
                </motion.div>
              )}

              {/* PHASE 1: JUMP PERFORMANCE (CMJ & FLIGHT TIME) */}
              {motionPhase === 1 && (
                <motion.div
                  key="phase1"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full space-y-4 text-center"
                >
                  <span className="text-xs font-black text-cyan-400 font-mono uppercase tracking-widest block">
                    🚀 VERTICAL JUMP POWER (CMJ)
                  </span>

                  <div className="bg-gradient-to-b from-slate-900/90 to-black p-5 rounded-3xl border-2 border-cyan-500/40 shadow-xl space-y-2">
                    <span className="text-xs text-gray-400 font-bold block uppercase">Max CMJ Jump Height</span>
                    <span className="text-4xl font-black text-cyan-300 font-mono block">
                      {maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}
                    </span>
                    <div className="flex justify-center items-center gap-4 text-xs font-mono font-bold text-gray-300 pt-2 border-t border-gray-800">
                      <span>({maxCmj > 0 ? (maxCmj * 0.393701).toFixed(1) : 0}")</span>
                      <span>•</span>
                      <span className="text-blue-400">Air Time: {cmjFlightTime > 0 ? `${cmjFlightTime.toFixed(3)} s` : '—'}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PHASE 2: ELASTICITY & STRENGTH (RSI & SQUAT/BENCH 1RM) */}
              {motionPhase === 2 && (
                <motion.div
                  key="phase2"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full space-y-3"
                >
                  <span className="text-xs font-black text-yellow-400 font-mono uppercase tracking-widest block text-center">
                    🎯 ELASTICITY & STRENGTH MATRIX
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/90 p-4 rounded-2xl border border-yellow-500/40 text-center">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">Max RSI Index</span>
                      <span className="text-2xl font-black text-yellow-400 font-mono block">
                        {maxRsi > 0 ? maxRsi.toFixed(2) : '—'}
                      </span>
                      <span className="text-[9px] text-yellow-300/80 font-mono block mt-1">📦 {boxHeight}cm Box</span>
                    </div>

                    <div className="bg-slate-900/90 p-4 rounded-2xl border border-emerald-500/40 text-center">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase mb-1">Full Squat (1RM)</span>
                      <span className="text-2xl font-black text-emerald-400 font-mono block">
                        {squatWeight > 0 ? `${squatWeight} kg` : '—'}
                      </span>
                      <span className="text-[9px] text-emerald-300/80 font-mono block mt-1">🏋️ Max Strength</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PHASE 3: SUMMARY VERIFIED SEAL */}
              {motionPhase === 3 && (
                <motion.div
                  key="phase3"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full text-center space-y-4"
                >
                  <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20">
                    <Award size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">VERIFIED BIOMECHANICAL REPORT</h3>
                    <p className="text-xs text-orange-400 font-mono font-bold mt-1">VERTICAL LAB PERFORMANCE METRICS</p>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono bg-black/60 p-2.5 rounded-xl border border-gray-800">
                    {new Date().toLocaleDateString('ar-EG')} • HIGH PERFORMANCE SPORTS SCIENCE
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* BOTTOM FOOTER PROGRESS PIPES */}
          <div className="relative z-10 border-t border-orange-500/20 pt-3 flex justify-between items-center text-[10px] font-mono">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  onClick={() => setMotionPhase(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    motionPhase === idx ? 'w-6 bg-orange-500' : 'w-2 bg-gray-800'
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-400 font-bold">READY FOR STORY SHARE 📸</span>
          </div>

        </div>

      </div>
    </div>
  );
}
