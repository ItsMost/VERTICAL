import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Download, Play, Pause, RotateCcw, X, Film, Check, Sparkles, Award, Image as ImageIcon } from 'lucide-react';
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
  const previewRef = useRef(null);
  const animCanvasRef = useRef(null);

  // Motion phase states for UI preview
  const [motionPhase, setMotionPhase] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);

  // Player Stats
  const playerName = activePlayer?.full_name || 'اللاعب';
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

  // Auto-switch preview phases every 2.5 seconds
  useEffect(() => {
    let interval;
    if (isPlaying && isOpen && !isRecording) {
      interval = setInterval(() => {
        setMotionPhase((prev) => (prev + 1) % 4);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isOpen, isRecording]);

  // Download HD Image Snapshot
  const handleDownloadImage = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2.5,
        backgroundColor: '#03050c',
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `${playerName}_motion_card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error("Image Export Error:", e);
    }
  };

  // 🎬 REAL CANVAS MOTION VIDEO GENERATOR & RECORDING ENGINE
  const handleExportMotionVideo = async () => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordProgress(5);
    setVideoUrl(null);
    setRecordedBlob(null);

    const canvas = animCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 720;
    const height = 900;
    canvas.width = width;
    canvas.height = height;

    // Setup 60 FPS Media Recorder stream from canvas
    const stream = canvas.captureStream(60);
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const chunks = [];
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000 // 5 Mbps High Quality
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setRecordedBlob(blob);
      setIsRecording(false);
      setRecordProgress(100);
    };

    // Start Recording
    mediaRecorder.start(100); // collect 100ms chunks

    const totalDurationSec = 6; // 6 Seconds Video Duration
    const totalFrames = totalDurationSec * 60; // 360 frames total
    let currentFrame = 0;

    const renderAnimationFrame = () => {
      if (currentFrame > totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const progressRatio = currentFrame / totalFrames;
      setRecordProgress(Math.min(99, Math.round(progressRatio * 100)));

      // 1. Draw Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#0a0f24');
      bgGrad.addColorStop(0.5, '#040612');
      bgGrad.addColorStop(1, '#010205');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient Glowing Circles
      const pulse = Math.sin(currentFrame * 0.05) * 20;
      ctx.beginPath();
      ctx.arc(width - 100, 100, 180 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 100, 30, 0.12)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(100, height - 100, 200 - pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(60, 200, 255, 0.12)';
      ctx.fill();

      // Outer Border Frame
      ctx.strokeStyle = 'rgba(255, 120, 45, 0.5)';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Header Bar
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('VERTICAL LAB', 60, 70);

      ctx.fillStyle = '#ff782d';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('MOTION GRAPHIC TELEMETRY REPORT', 60, 95);

      ctx.fillStyle = 'rgba(255, 120, 45, 0.2)';
      ctx.fillRect(width - 230, 50, 170, 36);
      ctx.strokeStyle = 'rgba(255, 120, 45, 0.4)';
      ctx.strokeRect(width - 230, 50, 170, 36);
      ctx.fillStyle = '#ff9e66';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OFFICIAL BIOMEX', width - 145, 73);

      // Divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(50, 120);
      ctx.lineTo(width - 50, 120);
      ctx.stroke();

      // Determine active scene based on frame
      const sceneTime = currentFrame / 60; // time in seconds

      if (sceneTime < 2.0) {
        // SCENE 1: ATHLETE INTRO & BIO BADGE
        const scale = Math.min(1, sceneTime * 2);
        
        ctx.save();
        ctx.translate(width / 2, 280);
        ctx.scale(scale, scale);

        // Avatar Circle
        const avatarGrad = ctx.createLinearGradient(-50, -50, 50, 50);
        avatarGrad.addColorStop(0, '#ff641e');
        avatarGrad.addColorStop(1, '#ff9e3b');
        ctx.fillStyle = avatarGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 55, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(playerName ? playerName[0] : 'P', 0, 15);

        ctx.restore();

        // Player Name & Bio
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(playerName, width / 2, 400);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`${age} yrs • ${mass} kg • ${playerHeight} cm`, width / 2, 440);

        ctx.fillStyle = 'rgba(255, 120, 45, 0.15)';
        ctx.fillRect(width / 2 - 160, 480, 320, 45);
        ctx.strokeStyle = 'rgba(255, 120, 45, 0.4)';
        ctx.strokeRect(width / 2 - 160, 480, 320, 45);
        ctx.fillStyle = '#ff782d';
        ctx.font = 'bold 15px monospace';
        ctx.fillText('⚡ ATHLETE PERFORMANCE DOSSIER', width / 2, 508);

      } else if (sceneTime >= 2.0 && sceneTime < 4.0) {
        // SCENE 2: VERTICAL JUMP CMJ KPI COUNTER
        const animProgress = Math.min(1, (sceneTime - 2.0) * 1.5);
        const countCmj = (maxCmj * animProgress).toFixed(1);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🚀 VERTICAL JUMP POWER (CMJ)', width / 2, 220);

        // Main KPI Box
        ctx.fillStyle = 'rgba(10, 20, 40, 0.9)';
        ctx.fillRect(80, 260, width - 160, 280);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(80, 260, width - 160, 280);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('MAX CMJ JUMP HEIGHT', width / 2, 310);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 64px monospace';
        ctx.fillText(`${countCmj} cm`, width / 2, 400);

        ctx.fillStyle = '#60a5fa';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`Air Time: ${cmjFlightTime > 0 ? cmjFlightTime.toFixed(3) : 0} s`, width / 2, 460);

      } else {
        // SCENE 3: RSI & SQUAT/BENCH STRENGTH MATRIX
        ctx.fillStyle = '#facc15';
        ctx.font = '900 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🎯 ELASTICITY & STRENGTH MATRIX', width / 2, 220);

        // RSI Card Left
        ctx.fillStyle = 'rgba(15, 20, 35, 0.9)';
        ctx.fillRect(80, 260, 260, 240);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(80, 260, 260, 240);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('MAX RSI INDEX', 210, 300);

        ctx.fillStyle = '#facc15';
        ctx.font = '900 48px monospace';
        ctx.fillText(maxRsi > 0 ? maxRsi.toFixed(2) : '—', 210, 380);

        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`📦 ${boxHeight} cm Box`, 210, 440);

        // Squat Card Right
        ctx.fillStyle = 'rgba(15, 20, 35, 0.9)';
        ctx.fillRect(380, 260, 260, 240);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(380, 260, 260, 240);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('FULL SQUAT (1RM)', 510, 300);

        ctx.fillStyle = '#34d399';
        ctx.font = '900 48px monospace';
        ctx.fillText(squatWeight > 0 ? `${squatWeight} kg` : '—', 510, 380);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('🏋️ Max Strength', 510, 440);
      }

      // FOOTER
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(50, height - 100);
      ctx.lineTo(width - 50, height - 100);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('VERIFIED BIOMECHANICAL REPORT', 60, height - 60);

      ctx.fillStyle = '#ff782d';
      ctx.textAlign = 'right';
      ctx.fillText('READY FOR STORY SHARE 📸', width - 60, height - 60);

      currentFrame++;
      requestAnimationFrame(renderAnimationFrame);
    };

    renderAnimationFrame();
  };

  if (!isOpen || !activePlayer) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="glass-panel max-w-xl w-full p-6 space-y-6 hud-card border-orange-500/40 relative max-h-[95vh] overflow-y-auto">
        
        {/* Hidden Canvas for High FPS Render Recording */}
        <canvas ref={animCanvasRef} className="hidden" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl bg-gray-900 border border-gray-800 transition-all cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
          <div className="p-3 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/30">
            <Film size={26} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>{isEn ? '60FPS Motion Graphic Video Engine' : 'محرك فيديو الموشن جرافيك 60FPS الحقيقي'}</span>
            </h3>
            <p className="text-xs text-gray-400">
              {isEn ? 'Generate playable HD story videos & screenshots for athlete stats' : 'استخراج واستبدال فيديو متحرك حقيقي قابل للتشغيل بمدّة كاملة وصور عالية الدقة'}
            </p>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-black/50 p-4 rounded-2xl border border-orange-500/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                isPlaying ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
              }`}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>{isPlaying ? 'إيقاف الحركة' : 'تشغيل الحركة'}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-cyan-500/30 transition-all cursor-pointer"
            >
              <ImageIcon size={15} />
              <span>📸 تحميل صورة HD</span>
            </button>
          </div>

          <button
            onClick={handleExportMotionVideo}
            disabled={isRecording}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRecording ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري تسجيل الفيديو ({recordProgress}%)...</span>
              </>
            ) : (
              <>
                <Video size={16} />
                <span>🎬 بدء تسجيل وتوليد الفيديو 60FPS</span>
              </>
            )}
          </button>
        </div>

        {/* Recording Progress Bar */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold text-orange-400">
              <span>جاري بناء ورسم إطارات الفيديو (6 ثوانٍ كاملة)...</span>
              <span>{recordProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden border border-orange-500/30">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 transition-all duration-300"
                style={{ width: `${recordProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Live Generated Video Download Box */}
        {videoUrl && (
          <div className="space-y-3 bg-emerald-950/40 border-2 border-emerald-500/50 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 font-mono">
                <Check size={18} /> تم استخراج الفيديو المتحرك بنجاح (6 ثوانٍ كاملة WebM HD)!
              </span>
              <a
                href={videoUrl}
                download={`${playerName}_60fps_motion_story.webm`}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/25"
              >
                <Download size={16} />
                <span>⬇️ تحميل ملف الفيديو فوراً</span>
              </a>
            </div>

            {/* Playable Video Element */}
            <div className="rounded-xl overflow-hidden border border-emerald-500/30 bg-black">
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full max-h-[280px] object-contain mx-auto"
              />
            </div>
          </div>
        )}

        {/* UI Animated Card Preview Stage */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-cyan-400 block font-mono">
            📌 معاينة بطاقة الموشن جرافيك الحية:
          </span>

          <div
            ref={previewRef}
            className="relative w-full aspect-[4/5] max-w-md mx-auto bg-gradient-to-b from-[#0a0f1e] via-[#050711] to-[#020306] rounded-3xl border-2 border-orange-500/50 p-6 flex flex-col justify-between overflow-hidden shadow-2xl"
          >
            {/* Ambient Lighting Orbs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/15 blur-3xl rounded-full pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/15 blur-3xl rounded-full pointer-events-none animate-pulse" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

            {/* Header */}
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

            {/* Dynamic Stage */}
            <div className="relative z-10 my-auto py-4 min-h-[240px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                
                {motionPhase === 0 && (
                  <motion.div
                    key="phase0"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    className="w-full text-center space-y-4"
                  >
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-orange-500 via-amber-500 to-orange-600 text-white font-black text-3xl flex items-center justify-center shadow-xl font-mono border-2 border-white/20">
                      {playerName ? playerName[0] : 'P'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">{playerName}</h2>
                      <p className="text-sm font-mono text-cyan-400 font-bold mt-1">
                        {age} سنة • {mass} kg • {playerHeight} cm
                      </p>
                    </div>
                    <div className="inline-block px-4 py-1.5 bg-black/60 border border-orange-500/40 rounded-full text-xs text-orange-300 font-mono font-bold">
                      ⚡ ATHLETE PERFORMANCE DOSSIER
                    </div>
                  </motion.div>
                )}

                {motionPhase === 1 && (
                  <motion.div
                    key="phase1"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
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

                {motionPhase === 2 && (
                  <motion.div
                    key="phase2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
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

                {motionPhase === 3 && (
                  <motion.div
                    key="phase3"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                    className="w-full text-center space-y-4"
                  >
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border-2 border-emerald-500/40 shadow-lg">
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

            {/* Footer */}
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
    </div>
  );
}
