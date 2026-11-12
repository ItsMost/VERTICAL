import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { TEST_TYPES, normalizeTestType } from '../lib/testTypes';
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
  const { t: tx } = useData();
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
  const playerName = activePlayer?.full_name || tx.media.athlete;
  const mass = parseFloat(activePlayer?.weight_kg) || 72;
  const playerHeight = parseFloat(activePlayer?.height_cm) || 178;
  const age = activePlayer?.age || 24;

  // Calculate All-time Personal Bests (PBs) from full history
  const cmjJumps = playerHistory.filter(r => normalizeTestType(r.test_type) === TEST_TYPES.CMJ_ARMS || normalizeTestType(r.test_type) === TEST_TYPES.CMJ_ARMS);
  const maxCmj = cmjJumps.length > 0 ? Math.max(...cmjJumps.map(j => parseFloat(j.jump_height_cm) || 0)) : 0;
  const bestCmjRecord = cmjJumps.find(j => parseFloat(j.jump_height_cm) === maxCmj);
  const cmjFlightTime = bestCmjRecord ? parseFloat(bestCmjRecord.flight_time_sec) || 0 : (maxCmj > 0 ? Math.sqrt((8 * (maxCmj / 100)) / 9.81) : 0);

  const rsiJumps = playerHistory.filter(r => normalizeTestType(r.test_type) === TEST_TYPES.DROP_JUMP);
  const maxRsi = rsiJumps.length > 0 ? Math.max(...rsiJumps.map(j => parseFloat(j.rsi_score) || 0)) : 0;
  const bestRsiRecord = rsiJumps.find(j => parseFloat(j.rsi_score) === maxRsi);
  const boxHeight = bestRsiRecord?.box_height_cm || 30;

  const squatRecords = playerHistory.filter(r => normalizeTestType(r.test_type) === TEST_TYPES.FULL_SQUAT);
  const squatWeight = squatRecords.length > 0 ? Math.max(...squatRecords.map(j => parseFloat(j.clean_weight_kg) || 0)) : 0;

  const benchRecords = playerHistory.filter(r => normalizeTestType(r.test_type) === TEST_TYPES.BENCH_PRESS);
  const benchWeight = benchRecords.length > 0 ? Math.max(...benchRecords.map(j => parseFloat(j.clean_weight_kg) || 0)) : 0;

  const cleanRecords = playerHistory.filter(r => normalizeTestType(r.test_type) === TEST_TYPES.POWER_CLEAN || (parseFloat(r.clean_weight_kg) > 0 && normalizeTestType(r.test_type) !== TEST_TYPES.FULL_SQUAT && normalizeTestType(r.test_type) !== TEST_TYPES.BENCH_PRESS));
  const cleanWeight = cleanRecords.length > 0 ? Math.max(...cleanRecords.map(j => parseFloat(j.clean_weight_kg) || 0)) : 0;

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
        backgroundColor: '#09090B',
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
      bgGrad.addColorStop(0, '#09090B');
      bgGrad.addColorStop(0.5, '#09090B');
      bgGrad.addColorStop(1, '#09090B');
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

      ctx.fillStyle = '#D97757';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('MOTION GRAPHIC TELEMETRY REPORT', 60, 95);

      ctx.fillStyle = 'rgba(255, 120, 45, 0.2)';
      ctx.fillRect(width - 230, 50, 170, 36);
      ctx.strokeStyle = 'rgba(255, 120, 45, 0.4)';
      ctx.strokeRect(width - 230, 50, 170, 36);
      ctx.fillStyle = '#D97757';
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
        avatarGrad.addColorStop(0, '#D97757');
        avatarGrad.addColorStop(1, '#D97757');
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

        ctx.fillStyle = '#D97757';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`${age} yrs • ${mass} kg • ${playerHeight} cm`, width / 2, 440);

        ctx.fillStyle = 'rgba(255, 120, 45, 0.15)';
        ctx.fillRect(width / 2 - 160, 480, 320, 45);
        ctx.strokeStyle = 'rgba(255, 120, 45, 0.4)';
        ctx.strokeRect(width / 2 - 160, 480, 320, 45);
        ctx.fillStyle = '#D97757';
        ctx.font = 'bold 15px monospace';
        ctx.fillText('⚡ ATHLETE PERFORMANCE DOSSIER', width / 2, 508);

      } else if (sceneTime >= 2.0 && sceneTime < 4.0) {
        // SCENE 2: VERTICAL JUMP CMJ KPI COUNTER
        const animProgress = Math.min(1, (sceneTime - 2.0) * 1.5);
        const countCmj = (maxCmj * animProgress).toFixed(1);

        ctx.fillStyle = '#D97757';
        ctx.font = '900 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🚀 VERTICAL JUMP POWER (CMJ)', width / 2, 220);

        // Main KPI Box
        ctx.fillStyle = 'rgba(10, 20, 40, 0.9)';
        ctx.fillRect(80, 260, width - 160, 280);
        ctx.strokeStyle = 'rgba(217,119,87, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(80, 260, width - 160, 280);

        ctx.fillStyle = '#A1A1AA';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('MAX CMJ JUMP HEIGHT', width / 2, 310);

        ctx.fillStyle = '#D97757';
        ctx.font = '900 64px monospace';
        ctx.fillText(`${countCmj} cm`, width / 2, 400);

        ctx.fillStyle = '#D97757';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`Air Time: ${cmjFlightTime > 0 ? cmjFlightTime.toFixed(3) : 0} s`, width / 2, 460);

      } else {
        // SCENE 3: RSI & SQUAT/BENCH STRENGTH MATRIX
        ctx.fillStyle = '#F5B544';
        ctx.font = '900 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🎯 ELASTICITY & STRENGTH MATRIX', width / 2, 220);

        // RSI Card Left
        ctx.fillStyle = 'rgba(15, 20, 35, 0.9)';
        ctx.fillRect(80, 260, 260, 240);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(80, 260, 260, 240);

        ctx.fillStyle = '#A1A1AA';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('MAX RSI INDEX', 210, 300);

        ctx.fillStyle = '#F5B544';
        ctx.font = '900 48px monospace';
        ctx.fillText(maxRsi > 0 ? maxRsi.toFixed(2) : '—', 210, 380);

        ctx.fillStyle = '#F5B544';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`📦 ${boxHeight} cm Box`, 210, 440);

        // Squat Card Right
        ctx.fillStyle = 'rgba(15, 20, 35, 0.9)';
        ctx.fillRect(380, 260, 260, 240);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(380, 260, 260, 240);

        ctx.fillStyle = '#A1A1AA';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('FULL SQUAT (1RM)', 510, 300);

        ctx.fillStyle = '#22C55E';
        ctx.font = '900 44px monospace';
        ctx.fillText(squatWeight > 0 ? `${squatWeight} kg` : '—', 510, 375);

        ctx.fillStyle = '#22C55E';
        ctx.font = 'bold 14px monospace';
        const squatBwRatio = (squatWeight > 0 && mass > 0) ? (squatWeight / mass).toFixed(2) : 0;
        ctx.fillText(squatBwRatio > 0 ? `🏋️ ${squatBwRatio}x Bodyweight` : '🏋️ Max Strength', 510, 440);
      }

      // FOOTER
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(50, height - 100);
      ctx.lineTo(width - 50, height - 100);
      ctx.stroke();

      ctx.fillStyle = '#A1A1AA';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('VERIFIED BIOMECHANICAL REPORT', 60, height - 60);

      ctx.fillStyle = '#D97757';
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
      <div className="glass-panel max-w-xl w-full p-6 space-y-6 hud-card border-accent/40 relative max-h-[95vh] overflow-y-auto">
        
        {/* Hidden Canvas for High FPS Render Recording */}
        <canvas ref={animCanvasRef} className="hidden" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-white p-2 rounded-xl bg-surface-2 border border-border transition-all cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="p-3 bg-accent/10 text-accent rounded-2xl border border-accent/30">
            <Film size={26} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>{tx.ui.mg60fpsMotionGraphicVideo}</span>
            </h3>
            <p className="text-xs text-muted">
              {tx.ui.mgGeneratePlayableHdStory}
            </p>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-black/50 p-4 rounded-2xl border border-accent/30">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                isPlaying ? 'bg-accent text-accent-ink shadow-lg shadow-accent/20' : 'bg-accent text-accent-ink shadow-lg shadow-accent/20'
              }`}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>{isPlaying ? tx.media.stopAnimation : tx.media.playAnimation}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              className="px-4 py-2.5 bg-surface-2 hover:bg-zinc-800 text-accent rounded-xl text-xs font-bold flex items-center gap-1.5 border border-accent/30 transition-all cursor-pointer"
            >
              <ImageIcon size={15} />
              <span>{tx.media.downloadImage}</span>
            </button>
          </div>

          <button
            onClick={handleExportMotionVideo}
            disabled={isRecording}
            className="px-5 py-2.5 bg-gradient-to-r from-accent via-warning to-accent hover:from-accent hover:to-warning text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-accent/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRecording ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{tx.media.recordingVideo} ({recordProgress}%)...</span>
              </>
            ) : (
              <>
                <Video size={16} />
                <span>{tx.media.startRecording}</span>
              </>
            )}
          </button>
        </div>

        {/* Recording Progress Bar */}
        {isRecording && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold text-accent">
              <span>{tx.media.buildingFrames}</span>
              <span>{recordProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden border border-accent/30">
              <div
                className="h-full bg-gradient-to-r from-accent via-warning to-accent transition-all duration-300"
                style={{ width: `${recordProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Live Generated Video Download Box */}
        {videoUrl && (
          <div className="space-y-3 bg-surface-2/40 border-2 border-success/50 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-success flex items-center gap-1.5 font-mono">
                <Check size={18} /> {tx.media.videoReady}
              </span>
              <a
                href={videoUrl}
                download={`${playerName}_60fps_motion_story.webm`}
                className="px-5 py-2.5 bg-success hover:bg-success text-white font-black text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-success/25"
              >
                <Download size={16} />
                <span>{tx.media.downloadVideo}</span>
              </a>
            </div>

            {/* Playable Video Element */}
            <div className="rounded-xl overflow-hidden border border-success/30 bg-black">
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
          <span className="text-xs font-bold text-accent block font-mono">
            {tx.media.livePreview}
          </span>

          <div
            ref={previewRef}
            className="relative w-full aspect-[4/5] max-w-md mx-auto bg-gradient-to-b from-bg via-bg to-bg rounded-3xl border-2 border-accent/50 p-6 flex flex-col justify-between overflow-hidden shadow-2xl"
          >
            {/* Ambient Lighting Orbs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/15 blur-3xl rounded-full pointer-events-none animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/15 blur-3xl rounded-full pointer-events-none animate-pulse" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center border-b border-accent/30 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <AppLogo size={36} />
                <div>
                  <span className="text-sm font-black tracking-widest text-white block">VERTICAL LAB</span>
                  <span className="text-[10px] text-accent font-mono font-bold block">MOTION GRAPHIC TELEMETRY</span>
                </div>
              </div>
              <div className="px-3 py-1 bg-accent/20 text-accent border border-accent/40 rounded-xl text-[10px] font-mono font-bold">
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
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-accent via-warning to-accent text-white font-black text-3xl flex items-center justify-center shadow-xl font-mono border-2 border-white/20">
                      {playerName ? playerName[0] : 'P'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white">{playerName}</h2>
                      <p className="text-sm font-mono text-accent font-bold mt-1">
                        {age} {tx.media.years} • {mass} kg • {playerHeight} cm
                      </p>
                    </div>
                    <div className="inline-block px-4 py-1.5 bg-black/60 border border-accent/40 rounded-full text-xs text-accent font-mono font-bold">
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
                    <span className="text-xs font-black text-accent font-mono uppercase tracking-widest block">
                      🚀 VERTICAL JUMP POWER (CMJ)
                    </span>

                    <div className="bg-gradient-to-b from-zinc-900/90 to-black p-5 rounded-3xl border-2 border-accent/40 shadow-xl space-y-2">
                      <span className="text-xs text-muted font-bold block uppercase">Max CMJ Jump Height</span>
                      <span className="text-4xl font-black text-accent font-mono block">
                        {maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}
                      </span>
                      <div className="flex justify-center items-center gap-4 text-xs font-mono font-bold text-zinc-300 pt-2 border-t border-border">
                        <span>({maxCmj > 0 ? (maxCmj * 0.393701).toFixed(1) : 0}")</span>
                        <span>•</span>
                        <span className="text-accent">Air Time: {cmjFlightTime > 0 ? `${cmjFlightTime.toFixed(3)} s` : '—'}</span>
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
                    <span className="text-xs font-black text-warning font-mono uppercase tracking-widest block text-center">
                      🎯 ELASTICITY & STRENGTH MATRIX
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-2/90 p-4 rounded-2xl border border-warning/40 text-center">
                        <span className="text-[10px] text-muted font-bold block uppercase mb-1">Max RSI Index</span>
                        <span className="text-2xl font-black text-warning font-mono block">
                          {maxRsi > 0 ? maxRsi.toFixed(2) : '—'}
                        </span>
                        <span className="text-[9px] text-warning/80 font-mono block mt-1">📦 {boxHeight}cm Box</span>
                      </div>

                      <div className="bg-surface-2/90 p-4 rounded-2xl border border-success/40 text-center">
                        <span className="text-[10px] text-muted font-bold block uppercase mb-1">Full Squat (1RM)</span>
                        <span className="text-2xl font-black text-success font-mono block">
                          {squatWeight > 0 ? `${squatWeight} kg` : '—'}
                        </span>
                        <span className="text-[9px] text-success font-mono font-bold block mt-1">
                          {squatWeight > 0 && mass > 0 ? `🏋️ ${(squatWeight / mass).toFixed(2)}${tx.media.xBodyWeight}` : '🏋️ Max Strength'}
                        </span>
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
                    <div className="w-16 h-16 mx-auto rounded-full bg-success/20 text-success flex items-center justify-center border-2 border-success/40 shadow-lg">
                      <Award size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">VERIFIED BIOMECHANICAL REPORT</h3>
                      <p className="text-xs text-accent font-mono font-bold mt-1">VERTICAL LAB PERFORMANCE METRICS</p>
                    </div>
                    <div className="text-[10px] text-muted font-mono bg-black/60 p-2.5 rounded-xl border border-border">
                      {new Date().toLocaleDateString('ar-EG')} • HIGH PERFORMANCE SPORTS SCIENCE
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="relative z-10 border-t border-accent/20 pt-3 flex justify-between items-center text-[10px] font-mono">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    onClick={() => setMotionPhase(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      motionPhase === idx ? 'w-6 bg-accent' : 'w-2 bg-zinc-800'
                    }`}
                  />
                ))}
              </div>
              <span className="text-muted font-bold">READY FOR STORY SHARE 📸</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
