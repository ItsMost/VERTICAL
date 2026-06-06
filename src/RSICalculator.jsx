import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Zap, Play, Pause, X, Save, Info, ChevronRight, ChevronLeft, Activity } from 'lucide-react';

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

export default function RSICalculator({
  activePlayer,
  selectedPlayerId,
  onSaveSuccess,
}) {
  const [cameraFps, setCameraFps] = useState(240);
  const [videoFps, setVideoFps] = useState(30);

  // 3 key time points for RSI
  const [touchdownTime, setTouchdownTime] = useState(0);
  const [takeoffTime, setTakeoffTime] = useState(0);
  const [landingTime, setLandingTime] = useState(0);

  const [videoSrc, setVideoSrc] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [stats, setStats] = useState(null);

  // Unit and Time calculation custom settings
  const [displayUnit, setDisplayUnit] = useState('cm');
  const [timeCalculationMethod, setTimeCalculationMethod] = useState('fps');
  const [manualFrameDuration, setManualFrameDuration] = useState(0.033);
  const [isFrameDurationManual, setIsFrameDurationManual] = useState(false);
  const [isFpsAutoDetected, setIsFpsAutoDetected] = useState(false);
  const [aiDetectedFrameDuration, setAiDetectedFrameDuration] = useState(null);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const timelineTrackRef = useRef(null);

  // Sync manualFrameDuration with cameraFps when not manually overridden
  useEffect(() => {
    if (!isFrameDurationManual) {
      setManualFrameDuration(parseFloat((1 / cameraFps).toFixed(6)));
    }
  }, [cameraFps, isFrameDurationManual]);

  const handleTimelineDragStart = (e, type) => {
    e.preventDefault();
    const track = timelineTrackRef.current;
    if (!track || !duration) return;

    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const rect = track.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl' || window.getComputedStyle(track).direction === 'rtl';
    let latestTime = currentTime;

    const handlePointerMove = (moveEvent) => {
      let clientX = moveEvent.clientX;
      if (moveEvent.touches && moveEvent.touches.length > 0) {
        clientX = moveEvent.touches[0].clientX;
      } else if (moveEvent.clientX === undefined && moveEvent.nativeEvent) {
        clientX = moveEvent.nativeEvent.clientX;
      }
      
      const pct = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
      const clampedPct = Math.max(0, Math.min(1, pct));
      const targetTime = clampedPct * duration;
      latestTime = targetTime;

      if (type === 'touchdown') {
        setTouchdownTime(targetTime);
        if (videoRef.current && !videoRef.current.seeking) {
          videoRef.current.currentTime = targetTime;
        }
        setCurrentTime(targetTime);
        setShowResults(false);
      } else if (type === 'takeoff') {
        setTakeoffTime(targetTime);
        if (videoRef.current && !videoRef.current.seeking) {
          videoRef.current.currentTime = targetTime;
        }
        setCurrentTime(targetTime);
        setShowResults(false);
      } else if (type === 'landing') {
        setLandingTime(targetTime);
        if (videoRef.current && !videoRef.current.seeking) {
          videoRef.current.currentTime = targetTime;
        }
        setCurrentTime(targetTime);
        setShowResults(false);
      } else if (type === 'playhead') {
        if (videoRef.current && !videoRef.current.seeking) {
          videoRef.current.currentTime = targetTime;
        }
        setCurrentTime(targetTime);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);

      if (videoRef.current) {
        videoRef.current.currentTime = latestTime;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
  };

  // RSI Calculations & Leg Stiffness
  useEffect(() => {
    if (
      touchdownTime > 0 &&
      takeoffTime > touchdownTime &&
      landingTime > takeoffTime
    ) {
      // Real-time calculation based on slow-motion ratio or manual frame duration
      let realContactTime;
      let realFlightTime;
      
      if (timeCalculationMethod === 'manual' && parseFloat(manualFrameDuration) > 0) {
        const contactFrames = (takeoffTime - touchdownTime) * videoFps;
        const flightFrames = (landingTime - takeoffTime) * videoFps;
        realContactTime = contactFrames * parseFloat(manualFrameDuration);
        realFlightTime = flightFrames * parseFloat(manualFrameDuration);
      } else {
        realContactTime = (takeoffTime - touchdownTime) * (videoFps / cameraFps);
        realFlightTime = (landingTime - takeoffTime) * (videoFps / cameraFps);
      }

      const g = 9.81;
      const mass = activePlayer?.weight_kg || 70;

      // Jump height from flight time (Bosco)
      const heightMeters = (g * Math.pow(realFlightTime, 2)) / 8;
      const heightCm = heightMeters * 100;
      const heightInches = heightCm / 2.54;

      // Standard RSI = height (m) / contact time (s)
      const rsiScore = heightMeters / realContactTime;

      // Modified RSI = flight time (s) / contact time (s)
      const rsiModScore = realFlightTime / realContactTime;

      // Dynamic Vertical Leg Stiffness (kN/m)
      // Spring-Mass model vertical stiffness formula (Morin/Brenner):
      // k = (M * pi * (Tf + Tc)) / (Tc^2 * ((Tf + Tc)/pi - Tc/2))
      const tc = realContactTime;
      const tf = realFlightTime;
      const numerator = mass * Math.PI * (tf + tc);
      const denominator = Math.pow(tc, 2) * ((tf + tc) / Math.PI - tc / 2);
      const stiffnessN = numerator / denominator;
      const legStiffnessKnM = stiffnessN / 1000;

      setStats({
        contactTime: realContactTime.toFixed(3),
        flightTime: realFlightTime.toFixed(3),
        heightCm: heightCm.toFixed(2),
        heightInches: heightInches.toFixed(2),
        rsi: rsiScore.toFixed(2),
        rsiMod: rsiModScore.toFixed(2),
        legStiffness: legStiffnessKnM.toFixed(2),
      });
    } else {
      setStats(null);
    }
  }, [touchdownTime, takeoffTime, landingTime, cameraFps, videoFps, activePlayer, timeCalculationMethod, manualFrameDuration]);

  const handleAnalyze = () => {
    if (touchdownTime === 0 || takeoffTime === 0 || landingTime === 0) {
      return alert(
        'يرجى تحديد الأوقات الثلاثة (ملامسة الأرض، الإقلاع، الهبوط) من الفيديو.'
      );
    }
    if (takeoffTime <= touchdownTime || landingTime <= takeoffTime) {
      return alert(
        'تسلسل الأوقات غير منطقي! يجب أن يكون: ملامسة ⬅️ إقلاع ⬅️ هبوط.'
      );
    }
    setShowResults(true);
  };

  const saveMeasurement = async () => {
    if (!selectedPlayerId || !stats) return alert('خطأ في البيانات!');
    setIsSaving(true);

    // Save to the unified lab_jump_measurements table
    const { data, error } = await supabase
      .from('lab_jump_measurements')
      .insert([
        {
          player_id: selectedPlayerId,
          test_type: 'rsi',
          jump_height_cm: stats.heightCm,
          flight_time_sec: stats.flightTime,
          contact_time_sec: stats.contactTime,
          rsi_score: stats.rsi,
          takeoff_velocity_ms: 0,
          mean_power_watts: 0,
          leg_used: 'both',
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
    setIsSaving(false);
  };

  const detectVideoFps = (videoEl) => {
    if (!videoEl || !videoEl.duration) return;
    
    // Use requestVideoFrameCallback with longer sampling and outlier removal
    if (videoEl.requestVideoFrameCallback) {
      let frameCount = 0;
      let startTime = null;
      let lastMediaTime = null;
      const frameDiffs = [];
      
      const callback = (now, metadata) => {
        if (startTime === null) {
          startTime = now;
          lastMediaTime = metadata.mediaTime;
          frameCount++;
          videoEl.requestVideoFrameCallback(callback);
          return;
        }
        
        if (lastMediaTime !== null && metadata.mediaTime > lastMediaTime) {
          frameDiffs.push(metadata.mediaTime - lastMediaTime);
        }
        lastMediaTime = metadata.mediaTime;
        frameCount++;
        
        // Collect at least 15 frame diffs over at least 300ms, timeout at 2s
        if (frameDiffs.length < 15 && (now - startTime) < 2000) {
          videoEl.requestVideoFrameCallback(callback);
        } else {
          videoEl.pause();
          if (frameDiffs.length >= 5) {
            // Remove outliers (top/bottom 20%)
            const sorted = [...frameDiffs].sort((a, b) => a - b);
            const trimCount = Math.floor(sorted.length * 0.2);
            const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
            const avgDiff = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
            
            if (avgDiff > 0) {
              const rawFps = 1 / avgDiff;
              // Snap to common rates with 15% tolerance
              const commonRates = [24, 25, 30, 50, 60, 120, 240];
              let bestMatch = commonRates.reduce((prev, curr) => 
                Math.abs(curr - rawFps) < Math.abs(prev - rawFps) ? curr : prev
              );
              const tolerance = bestMatch * 0.15;
              if (Math.abs(bestMatch - rawFps) <= tolerance) {
                setVideoFps(bestMatch);
                setCameraFps(bestMatch);
              } else {
                setVideoFps(Math.round(rawFps));
                setCameraFps(Math.round(rawFps));
              }
              setIsFpsAutoDetected(true);
              setAiDetectedFrameDuration(parseFloat(avgDiff.toFixed(6)));
            }
          } else {
            // Fallback: assume 30fps
            setVideoFps(30);
            setCameraFps(30);
            setIsFpsAutoDetected(false);
          }
        }
      };
      
      // Seek past potential black frames before sampling
      videoEl.currentTime = 0.5;
      setTimeout(() => {
        videoEl.requestVideoFrameCallback(callback);
        videoEl.play().catch(() => {
          setVideoFps(30); setCameraFps(30); setIsFpsAutoDetected(false);
        });
      }, 200);
    } else {
      setVideoFps(30); setCameraFps(30); setIsFpsAutoDetected(false);
    }
  };

  // Automated FPS Detection once video file loads
  useEffect(() => {
    if (videoSrc && videoRef.current) {
      setIsFpsAutoDetected(false);
      const timer = setTimeout(() => {
        detectVideoFps(videoRef.current);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [videoSrc]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoSrc(URL.createObjectURL(file));
      setAiDetectedFrameDuration(null);
    }
  };

  const clearVideo = () => {
    setVideoSrc(null);
    setTouchdownTime(0);
    setTakeoffTime(0);
    setLandingTime(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowResults(false);
    setAiDetectedFrameDuration(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        if (videoRef.current.currentTime >= duration)
          videoRef.current.currentTime = 0;
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const stepFrames = (frames) => {
    if (videoRef.current && duration > 0) {
      const video = videoRef.current;
      video.pause();
      setIsPlaying(false);
      const timeStep = frames / videoFps;
      let newTime = video.currentTime + timeStep;
      newTime = Math.max(0, Math.min(newTime, duration));
      setTimeout(() => {
        video.currentTime = newTime;
        setCurrentTime(newTime);
      }, 0);
    }
  };

  const getRSIEval = (rsi) => {
    const score = parseFloat(rsi);
    if (score < 1.5)
      return {
        text: 'ضعيفة (تحتاج تدريبات Plyometrics مكثفة لحقن الطاقة)',
        color: 'text-red-500 dark:text-red-400',
      };
    if (score >= 1.5 && score < 2.0)
      return { text: 'متوسطة المقاومة (تحتاج استمرارية التطوير العضلي)', color: 'text-cyan-500 dark:text-cyan-400' };
    if (score >= 2.0 && score < 2.5)
      return { text: 'قوية وتفاعلية (مرونة تفاعل ممتازة للأوتار)', color: 'text-teal-500 dark:text-teal-400' };
    return { text: 'نخبة استثنائية (أوتار فولاذية صلبة وسريعة الاستجابة)', color: 'text-emerald-500 dark:text-emerald-400' };
  };

  return (
    <div className="glass-panel p-6 shadow-2xl transition-all duration-300">
      <div className="mb-6 text-center border-b border-[var(--border-light)] pb-4">
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-500">
          مؤشر القوة التفاعلية (RSI - Drop Jump)
        </h3>
        <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
          يقيس قدرة الأوتار على امتصاص الصدمات وتحويلها لقفزة رأسية بأقل زمن تلامس أرضي (Stiffness).
        </p>
      </div>

      <div className="mb-8 p-6 bg-black/20 rounded-2xl border border-[var(--border-light)] relative">
        {!videoSrc && (
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="flex-1 relative cursor-pointer">
              <input
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileUpload}
                ref={cameraInputRef}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="btn-orange-gradient text-center py-5 rounded-xl font-bold transition-all flex items-center justify-center gap-3">
                <Zap size={20} />
                افتح الكاميرا وصوّر
              </div>
            </div>
            <div className="flex-1 relative cursor-pointer">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-[var(--text-primary)] text-center py-5 rounded-xl font-bold transition-all flex items-center justify-center gap-3">
                <Play size={20} />
                اختر فيديو من المعرض
              </div>
            </div>
          </div>
        )}

        {videoSrc && (
          <div className="flex flex-col items-center w-full relative">
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 z-20 bg-red-600 hover:bg-red-500 text-white p-2.5 rounded-full shadow-lg transition-transform hover:scale-110"
            >
              <X size={16} />
            </button>
            
            <div className="relative inline-block border-4 border-[var(--border-light)] rounded-2xl overflow-hidden mb-5 shadow-2xl bg-black max-w-full">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                muted
                preload="auto"
                className="max-h-80 w-auto object-contain"
                onLoadedMetadata={() => setDuration(videoRef.current.duration)}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            {/* Filmstrip Draggable Timeline */}
            <div className="w-full bg-black/35 p-4 rounded-2xl border border-[var(--border-light)] mb-5 text-right" style={{ direction: 'rtl' }}>
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-bold px-1">
                <span>خط الزمن السينمائي (Filmstrip Timeline)</span>
                <span className="text-cyan-400">اسحب المؤشرات لتحديد اللحظات بدقة 🚀</span>
              </div>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 relative mb-4">
                {/* Badges row for mobile (hidden on desktop) */}
                <div className="flex justify-between items-center w-full md:hidden mb-1">
                  {/* Current Time Badge */}
                  <div className="flex items-center gap-1.5 bg-[var(--bg-input)] px-2.5 py-1 rounded-xl border border-[var(--border-light)]">
                    <span className="text-[10px] text-gray-400">الوقت الحالي:</span>
                    <span className="text-xs text-[var(--brand-text)] font-mono font-bold">{currentTime.toFixed(3)}s</span>
                    <span className="text-[9px] text-gray-500 font-mono">F {Math.round(currentTime * (videoFps || 30))}</span>
                  </div>
                  
                  {/* Duration Time Badge */}
                  <div className="flex items-center gap-1.5 bg-[var(--bg-input)] px-2.5 py-1 rounded-xl border border-[var(--border-light)]">
                    <span className="text-[10px] text-gray-400">الإجمالي:</span>
                    <span className="text-xs text-gray-300 font-mono font-bold">{duration.toFixed(3)}s</span>
                    <span className="text-[9px] text-gray-500 font-mono">F {Math.round(duration * (videoFps || 30))}</span>
                  </div>
                </div>

                {/* Current Time Badge for Desktop (hidden on mobile) */}
                <div className="hidden md:flex flex-col text-xs text-[var(--brand-text)] font-mono bg-[var(--bg-input)] px-2.5 py-1.5 rounded-xl border border-[var(--border-light)] text-center shrink-0">
                  <span>{currentTime.toFixed(3)}s</span>
                  <span className="text-[9px] text-gray-500">F {Math.round(currentTime * (videoFps || 30))}</span>
                </div>
                
                {/* Timeline Track */}
                <div 
                  ref={timelineTrackRef}
                  className="relative w-full md:flex-1 h-12 bg-[#070b13] border border-cyan-950/80 rounded-2xl select-none touch-none cursor-pointer"
                  onPointerDown={(e) => {
                    if (e.target.closest('[data-timeline-handle]')) return;
                    handleTimelineDragStart(e, 'playhead');
                  }}
                  style={{ touchAction: 'none' }}
                >
                  {/* Ruler-style ticks */}
                  <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none opacity-20">
                    {Array.from({ length: 25 }).map((_, i) => {
                      const isMajor = i % 5 === 0;
                      return (
                        <div 
                          key={i} 
                          className={`w-0.5 bg-cyan-500/80 rounded-full transition-all ${
                            isMajor ? 'h-5 opacity-80' : 'h-2.5 opacity-40'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Range Highlight overlay */}
                  {duration > 0 && touchdownTime > 0 && landingTime > touchdownTime && (
                    <div 
                      className="absolute top-2 bottom-2 bg-cyan-500/10 border-l border-r border-cyan-400/30 pointer-events-none"
                      style={{
                        right: `${(touchdownTime / duration) * 100}%`,
                        left: `${100 - (landingTime / duration) * 100}%`
                      }}
                    />
                  )}

                  {/* Draggable Playhead */}
                  {duration > 0 && (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-[0_0_8px_#facc15] z-10 pointer-events-none"
                      style={{ right: `${(currentTime / duration) * 100}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rotate-45 border border-black animate-pulse"></div>
                    </div>
                  )}

                  {/* Draggable Touchdown Handle */}
                  {duration > 0 && touchdownTime > 0 && (
                    <div 
                      data-timeline-handle="touchdown"
                      onPointerDown={(e) => handleTimelineDragStart(e, 'touchdown')}
                      className="absolute top-0 bottom-0 w-8 -mr-4 z-20 cursor-ew-resize touch-none flex justify-center"
                      style={{ right: `${(touchdownTime / duration) * 100}%`, touchAction: 'none' }}
                    >
                      {/* Visual handle line */}
                      <div className="w-1 h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded border border-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.6)] flex items-center gap-0.5 select-none whitespace-nowrap">
                          📥 ملامسة
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Draggable Takeoff Handle */}
                  {duration > 0 && takeoffTime > 0 && (
                    <div 
                      data-timeline-handle="takeoff"
                      onPointerDown={(e) => handleTimelineDragStart(e, 'takeoff')}
                      className="absolute top-0 bottom-0 w-8 -mr-4 z-20 cursor-ew-resize touch-none flex justify-center"
                      style={{ right: `${(takeoffTime / duration) * 100}%`, touchAction: 'none' }}
                    >
                      {/* Visual handle line */}
                      <div className="w-1 h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)] relative">
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-500 text-[#070a13] text-[9px] font-black rounded border border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.6)] flex items-center gap-0.5 select-none whitespace-nowrap">
                          🚀 إقلاع
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Draggable Landing Handle */}
                  {duration > 0 && landingTime > 0 && (
                    <div 
                      data-timeline-handle="landing"
                      onPointerDown={(e) => handleTimelineDragStart(e, 'landing')}
                      className="absolute top-0 bottom-0 w-8 -mr-4 z-20 cursor-ew-resize touch-none flex justify-center"
                      style={{ right: `${(landingTime / duration) * 100}%`, touchAction: 'none' }}
                    >
                      {/* Visual handle line */}
                      <div className="w-1 h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-[9px] font-black rounded border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)] flex items-center gap-0.5 select-none whitespace-nowrap">
                          🛬 هبوط
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Duration Time Badge for Desktop (hidden on mobile) */}
                <div className="hidden md:flex flex-col text-xs text-gray-400 font-mono bg-[var(--bg-input)] px-2.5 py-1.5 rounded-xl border border-[var(--border-light)] text-center shrink-0">
                  <span>{duration.toFixed(3)}s</span>
                  <span className="text-[9px] text-gray-500">F {Math.round(duration * (videoFps || 30))}</span>
                </div>
              </div>
              
              {/* Controller Buttons */}
              <div className="flex justify-center items-center gap-3">
                <button onClick={() => stepFrames(-10)} title="العودة 10 إطارات" className="p-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white transition-colors"><ChevronsRight size={18} /></button>
                <button onClick={() => stepFrames(-1)} title="العودة إطار واحد" className="p-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white transition-colors"><ChevronRight size={18} /></button>
                
                <button onClick={togglePlay} className="px-10 py-3 btn-orange-gradient rounded-xl font-bold flex items-center justify-center gap-2">
                  {isPlaying ? <Pause size={18}/> : <Play size={18}/>}
                </button>
                
                <button onClick={() => stepFrames(1)} title="التقدم إطار واحد" className="p-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white transition-colors"><ChevronLeft size={18} /></button>
                <button onClick={() => stepFrames(10)} title="التقدم 10 إطارات" className="p-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white transition-colors"><ChevronsLeft size={18} /></button>
              </div>
            </div>

            {/* Quick Placement triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
              <button
                onClick={() => { setTouchdownTime(currentTime); setShowResults(false); }}
                className={`px-4 py-3 rounded-2xl font-bold transition-all border ${
                  touchdownTime > 0
                    ? 'bg-blue-600/30 text-blue-400 border-blue-500'
                    : 'bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border-[var(--border-light)]'
                }`}
              >
                1. ملامسة الأرض 🦶
              </button>
              <button
                onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }}
                className={`px-4 py-3 rounded-2xl font-bold transition-all border ${
                  takeoffTime > 0
                    ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500'
                    : 'bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border-[var(--border-light)]'
                }`}
              >
                2. لحظة الإقلاع 🚀
              </button>
              <button
                onClick={() => { setLandingTime(currentTime); setShowResults(false); }}
                className={`px-4 py-3 rounded-2xl font-bold transition-all border ${
                  landingTime > 0
                    ? 'bg-red-600/30 text-red-400 border-red-500'
                    : 'bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-primary)] border-[var(--border-light)]'
                }`}
              >
                3. الهبوط النهائي 🛬
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-black/20 p-5 rounded-2xl border border-[var(--border-light)] mb-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">FPS الكاميرا</label>
            <input
              type="number"
              value={cameraFps}
              onChange={(e) => setCameraFps(Number(e.target.value))}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-2.5 text-white outline-none font-mono focus:border-[var(--brand-main)]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">FPS ملف الفيديو</label>
            <input
              type="number"
              value={videoFps}
              onChange={(e) => setVideoFps(Number(e.target.value))}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-2.5 text-white outline-none font-mono focus:border-[var(--brand-main)]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 text-center">الملامسة (s)</label>
            <div className="w-full bg-black/40 border border-cyan-500/30 rounded-xl p-2.5 text-cyan-400 font-mono font-bold text-center">
              {touchdownTime.toFixed(3)}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 text-center">الإقلاع (s)</label>
            <div className="w-full bg-black/40 border border-teal-500/30 rounded-xl p-2.5 text-teal-400 font-mono font-bold text-center">
              {takeoffTime.toFixed(3)}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 text-center">الهبوط (s)</label>
            <div className="w-full bg-black/40 border border-red-500/30 rounded-xl p-2.5 text-red-400 font-mono font-bold text-center">
              {landingTime.toFixed(3)}
            </div>
          </div>
        </div>

        {/* Time Calculation Method & Custom Frame Duration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[var(--border-light)] pt-4 text-right" style={{ direction: 'rtl' }}>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-gray-400 mb-1">طريقة حساب الوقت (Time Calculation)</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/30 rounded-xl border border-[var(--border-light)]">
                {[
                  { id: 'fps', name: '⏱️ تلقائي من FPS' },
                  { id: 'manual', name: '✏️ زمن إطار مخصص' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setTimeCalculationMethod(method.id);
                      if (method.id === 'fps') {
                        setIsFrameDurationManual(false);
                      }
                    }}
                    className={`py-1.5 px-1 text-[10px] font-bold rounded-lg transition-all ${timeCalculationMethod === method.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white bg-transparent border border-transparent'}`}
                  >
                    {method.name}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Frame Duration Advisor in RSI */}
            {aiDetectedFrameDuration && (
              <div className="bg-emerald-950/15 border border-emerald-500/25 p-3 rounded-xl flex flex-col gap-1.5 text-right animate-fade-in">
                <div className="flex items-center gap-1.5 text-emerald-400 justify-between">
                  <div className="flex items-center gap-1.5 flex-row-reverse">
                    <Sparkles size={14} className="animate-pulse" />
                    <span className="text-[10px] font-extrabold">مستشار الإطارات الذكي (AI Analyzer)</span>
                  </div>
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">نشط</span>
                </div>
                <div className="text-[9px] text-gray-400 leading-normal">
                  تم قياس الفارق الفعلي بين الإطارات للفيديو تلقائياً بالذكاء الاصطناعي:
                  <span className="text-white font-mono font-bold block mt-1 text-center bg-black/40 py-1 rounded border border-emerald-500/10">
                    {aiDetectedFrameDuration} ثانية ({ (1 / aiDetectedFrameDuration).toFixed(2) } إطار/ثانية)
                  </span>
                </div>
                {timeCalculationMethod !== 'manual' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTimeCalculationMethod('manual');
                      setManualFrameDuration(aiDetectedFrameDuration);
                      setIsFrameDurationManual(true);
                    }}
                    className="w-full mt-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/35 py-1 px-2 rounded-xl text-[9px] font-bold transition-all"
                  >
                    ⚡ استخدام زمن الإطار الذكي وتعديله يدوياً
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setManualFrameDuration(aiDetectedFrameDuration);
                      setIsFrameDurationManual(true);
                    }}
                    className="w-full mt-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/35 py-1 px-2 rounded-xl text-[9px] font-bold transition-all"
                  >
                    ↺ تعيين قيمة الإطار الذكي المقترحة
                  </button>
                )}
              </div>
            )}
          </div>
          
          {timeCalculationMethod === 'manual' && (
            <div className="bg-cyan-950/10 border border-cyan-500/20 p-3 rounded-xl animate-fade-in space-y-1 self-start">
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span className="font-bold">زمن الإطار الفعلي (ثانية):</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsFrameDurationManual(false);
                    setManualFrameDuration(parseFloat((1 / cameraFps).toFixed(6)));
                  }}
                  className="text-[8px] text-cyan-400 font-bold bg-cyan-950/50 border border-cyan-500/20 px-1.5 py-0.5 rounded hover:bg-cyan-900/30"
                >
                  إعادة ضبط للتلقائي ↺
                </button>
              </div>
              <input
                type="number"
                step="0.000001"
                value={manualFrameDuration}
                onChange={(e) => {
                  setManualFrameDuration(e.target.value);
                  setIsFrameDurationManual(true);
                }}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-1.5 px-3 text-xs text-white outline-none font-mono focus:border-[var(--brand-main)]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <button
          onClick={handleAnalyze}
          className="px-14 py-4 btn-orange-gradient rounded-2xl font-black text-xl shadow-lg transition-transform hover:scale-105"
        >
          تحليل مؤشر القوة RSI
        </button>
      </div>

      {showResults && stats && (
        <div className="space-y-6 border-t border-[var(--border-light)] pt-6 text-right">
          
          <div className="flex justify-between items-center border-b border-cyan-500/25 pb-2">
            <div className="text-xs font-bold text-cyan-400">
              🚀 شاشة نتائج الـ Cockpit HUD لمؤشر RSI
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-cyan-500/20">
              <button
                type="button"
                onClick={() => setDisplayUnit('cm')}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all duration-200 ${displayUnit === 'cm' ? 'bg-cyan-500 text-[#070a13] shadow shadow-cyan-500/30' : 'text-gray-400 hover:text-white bg-transparent'}`}
              >
                سم (Cm)
              </button>
              <button
                type="button"
                onClick={() => setDisplayUnit('in')}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all duration-200 ${displayUnit === 'in' ? 'bg-cyan-500 text-[#070a13] shadow shadow-cyan-500/30' : 'text-gray-400 hover:text-white bg-transparent'}`}
              >
                بوصة (Inches)
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-black/40 rounded-3xl border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none animate-pulse"></div>
            
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="88" cy="88" r="72" fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth="12" />
                <circle 
                  cx="88" 
                  cy="88" 
                  r="72" 
                  fill="none" 
                  stroke="url(#rsiTealGradient)" 
                  strokeWidth="12" 
                  strokeLinecap="round"
                  strokeDasharray={452}
                  strokeDashoffset={452 - (452 * Math.min(1.0, parseFloat(stats.rsi)/4.0))} 
                  style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                />
                <defs>
                  <linearGradient id="rsiTealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f5d4" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  مؤشر القوة التفاعلية (RSI)
                </span>
                <span className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(0,245,212,0.6)] font-mono my-1">
                  <AnimatedCounter value={stats.rsi} decimals={2} />
                </span>
                <span className="text-[10px] text-cyan-400 font-bold">
                  Score
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-center">
            <div className="bg-[var(--bg-surface)] p-3.5 rounded-2xl border border-[var(--border-light)]">
              <span className="block text-[10px] text-gray-400 mb-1 font-bold">زمن التلامس (Tc)</span>
              <span className="text-lg font-black text-white font-mono">
                <AnimatedCounter value={stats.contactTime} decimals={3} />
                <span className="text-[9px] text-gray-400 mr-0.5">s</span>
              </span>
            </div>
            <div className="bg-[var(--bg-surface)] p-3.5 rounded-2xl border border-[var(--border-light)]">
              <span className="block text-[10px] text-gray-400 mb-1 font-bold">زمن الطيران (Tf)</span>
              <span className="text-lg font-black text-white font-mono">
                <AnimatedCounter value={stats.flightTime} decimals={3} />
                <span className="text-[9px] text-gray-400 mr-0.5">s</span>
              </span>
            </div>
            <div className="bg-[var(--bg-surface)] p-3.5 rounded-2xl border border-[var(--border-light)]">
              <span className="block text-[10px] text-gray-400 mb-1 font-bold">الارتفاع (Height)</span>
              <span className="text-lg font-black text-white font-mono">
                <AnimatedCounter value={displayUnit === 'in' ? stats.heightInches : stats.heightCm} decimals={1} />
                <span className="text-[9px] text-gray-400 mr-0.5">{displayUnit === 'in' ? 'in' : 'cm'}</span>
              </span>
            </div>
            <div className="bg-[var(--bg-surface)] p-3.5 rounded-2xl border border-teal-500/40 relative overflow-hidden">
              <div className="absolute inset-0 bg-teal-600/5"></div>
              <span className="block text-[10px] text-gray-400 mb-1 relative z-10 font-bold">المؤشر المعدل</span>
              <span className="text-lg font-black text-teal-400 relative z-10 font-mono">
                <AnimatedCounter value={stats.rsiMod} decimals={2} />
              </span>
            </div>
            <div className="bg-[var(--bg-surface)] p-3.5 rounded-2xl border-emerald-500/40 relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-600/5"></div>
              <span className="block text-[10px] text-gray-400 mb-1 relative z-10 font-bold">صلابة الأوتار</span>
              <span className="text-lg font-black text-emerald-400 relative z-10 font-mono">
                <AnimatedCounter value={stats.legStiffness} decimals={1} />
                <span className="text-[9px] text-gray-400 mr-0.5">kN/m</span>
              </span>
            </div>
          </div>

          <div className="bg-black/20 border border-[var(--border-light)] rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Info size={16} />
              <span>التقييم الفسيولوجي لمرونة الأوتار (Dynamic Tendon Behavior)</span>
            </div>
            <p className={`text-xl font-black ${getRSIEval(stats.rsi).color}`}>
              {getRSIEval(stats.rsi).text}
            </p>
          </div>

          <button
            onClick={saveMeasurement}
            disabled={isSaving}
            className="w-full py-4 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-[var(--text-primary)] rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {isSaving ? 'جاري حفظ النتيجة...' : 'حفظ النتيجة في ملف اللاعب'}
          </button>
        </div>
      )}
    </div>
  );
}
