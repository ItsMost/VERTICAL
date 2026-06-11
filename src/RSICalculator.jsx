import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import { Zap, Play, Pause, X, Save, Info, ChevronRight, ChevronLeft, Activity, ChevronsRight, ChevronsLeft, Sparkles, Clock, ArrowUpCircle, ShieldAlert, Award } from 'lucide-react';

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

export default function RSICalculator({ activePlayer, selectedPlayerId, onSaveSuccess }) {
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
  const [isSeeking, setIsSeeking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [stats, setStats] = useState(null);

  // Unit and Time calculation custom settings
  const [displayUnit, setDisplayUnit] = useState('cm');
  const [timeCalculationMethod, setTimeCalculationMethod] = useState('fps');
  const [manualFrameDuration, setManualFrameDuration] = useState(0.033);
  const [isFrameDurationManual, setIsFrameDurationManual] = useState(false);
  const [isFpsAutoDetected, setIsFpsAutoDetected] = useState(false);
  const [aiDetectedFrameDuration, setAiDetectedFrameDuration] = useState(null);
  const [fpsAutoDetectEnabled, setFpsAutoDetectEnabled] = useState(false); // Default to false (OFF)

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const timelineTrackRef = useRef(null);
  const lastSeekTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef(null);
  const pendingSeekTimeRef = useRef(null);
  const [activeDragType, setActiveDragType] = useState(null);
  const activeDragTypeRef = useRef(null);

  const currentTimeMobileRef = useRef(null);
  const currentFrameMobileRef = useRef(null);
  const currentTimeDesktopRef = useRef(null);
  const currentFrameDesktopRef = useRef(null);

  // Sync manualFrameDuration with cameraFps when not manually overridden
  useEffect(() => {
    if (!isFrameDurationManual) {
      setManualFrameDuration(parseFloat((1 / cameraFps).toFixed(6)));
    }
  }, [cameraFps, isFrameDurationManual]);

  const updatePositionFromClientX = (clientX, type) => {
    const track = timelineTrackRef.current;
    if (!track || !duration) return;
    
    const rect = track.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl' || window.getComputedStyle(track).direction === 'rtl';
    
    const pct = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
    const clampedPct = Math.max(0, Math.min(1, pct));
    const targetTime = clampedPct * duration;
    
    // Apply safe time boundaries to prevent Safari freeze/0-seek bugs
    const safeTime = Math.max(0.01, Math.min(targetTime, duration - 0.01));
    
    if (type === 'takeoff') {
      setTakeoffTime(safeTime);
      setShowResults(false);
    } else if (type === 'landing') {
      setLandingTime(safeTime);
      setShowResults(false);
    } else if (type === 'touchdown') {
      setTouchdownTime(safeTime);
      setShowResults(false);
    }
    
    setCurrentTime(safeTime);
    performSeek(safeTime);
  };

  const performSeek = (time) => {
    const video = videoRef.current;
    if (!video) return;

    const safeTime = Math.max(0.01, Math.min(time, duration - 0.01));

    if (isSeekingRef.current) {
      pendingSeekTimeRef.current = safeTime;
      return;
    }

    isSeekingRef.current = true;
    setIsSeeking(true);

    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      handleVideoSeeked();
    }, 200);

    try {
      video.currentTime = safeTime;
    } catch (err) {
      console.error("Seeking error:", err);
      isSeekingRef.current = false;
      setIsSeeking(false);
    }
  };

  const processPointerPosition = (e, type) => {
    updatePositionFromClientX(e.clientX, type);
  };

  const handleTimelinePointerDown = (e, type) => {
    if (!duration) return;
    e.preventDefault();
    
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    setIsDragging(true);
    setActiveDragType(type);
    activeDragTypeRef.current = type;
    
    processPointerPosition(e, type);
  };

  const handleTimelinePointerMove = (e) => {
    const type = activeDragTypeRef.current;
    if (!type) return;
    e.preventDefault();
    processPointerPosition(e, type);
  };

  const handleTimelinePointerUp = (e) => {
    const type = activeDragTypeRef.current;
    if (!type) return;
    e.preventDefault();
    
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    setIsDragging(false);
    setActiveDragType(null);
    activeDragTypeRef.current = null;
    
    if (videoRef.current) {
      isSeekingRef.current = false;
      setIsSeeking(false);
      pendingSeekTimeRef.current = null;
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
      
      let snapTime = currentTime;
      if (type === 'takeoff') snapTime = takeoffTime;
      else if (type === 'landing') snapTime = landingTime;
      else if (type === 'touchdown') snapTime = touchdownTime;
      
      const safeTime = Math.max(0.01, Math.min(snapTime, duration - 0.01));
      
      try {
        const video = videoRef.current;
        video.currentTime = safeTime;
        if (video.paused) {
          video.play().then(() => {
            if (videoRef.current) videoRef.current.pause();
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Snap seek error:", err);
      }
    }
  };

  // Touch event dragging listeners for iOS Safari support
  useEffect(() => {
    const track = timelineTrackRef.current;
    if (!track) return;

    const getTouchPosition = (e) => {
      if (!e.touches || e.touches.length === 0) return null;
      return e.touches[0].clientX;
    };

    const handleTouchStart = (e) => {
      if (!duration) return;
      
      const target = e.target.closest('[data-timeline-handle]');
      const type = target ? target.getAttribute('data-timeline-handle') : 'playhead';
      
      e.preventDefault();
      
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      
      setIsDragging(true);
      setActiveDragType(type);
      activeDragTypeRef.current = type;
      
      const clientX = getTouchPosition(e);
      if (clientX !== null) {
        updatePositionFromClientX(clientX, type);
      }
    };

    const handleTouchMove = (e) => {
      const type = activeDragTypeRef.current;
      if (!type) return;
      
      e.preventDefault();
      
      const clientX = getTouchPosition(e);
      if (clientX !== null) {
        updatePositionFromClientX(clientX, type);
      }
    };

    const handleTouchEnd = (e) => {
      const type = activeDragTypeRef.current;
      if (!type) return;
      
      e.preventDefault();
      
      setIsDragging(false);
      setActiveDragType(null);
      activeDragTypeRef.current = null;
      
      if (videoRef.current) {
        isSeekingRef.current = false;
        setIsSeeking(false);
        pendingSeekTimeRef.current = null;
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
          seekTimeoutRef.current = null;
        }
        
        let snapTime = currentTime;
        if (type === 'takeoff') snapTime = takeoffTime;
        else if (type === 'landing') snapTime = landingTime;
        else if (type === 'touchdown') snapTime = touchdownTime;
        
        const safeTime = Math.max(0.01, Math.min(snapTime, duration - 0.01));
        
        try {
          const video = videoRef.current;
          video.currentTime = safeTime;
          if (video.paused) {
            video.play().then(() => {
              if (videoRef.current) videoRef.current.pause();
            }).catch(() => {});
          }
        } catch (err) {}
      }
    };

    track.addEventListener('touchstart', handleTouchStart, { passive: false });
    track.addEventListener('touchmove', handleTouchMove, { passive: false });
    track.addEventListener('touchend', handleTouchEnd, { passive: false });
    track.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      track.removeEventListener('touchstart', handleTouchStart);
      track.removeEventListener('touchmove', handleTouchMove);
      track.removeEventListener('touchend', handleTouchEnd);
      track.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [duration, takeoffTime, landingTime, touchdownTime, currentTime]);

  // RSI Calculations & Leg Stiffness
  useEffect(() => {
    if (
      touchdownTime > 0 &&
      takeoffTime > touchdownTime &&
      landingTime > takeoffTime
    ) {
      let realContactTime;
      let realFlightTime;
      
      if (timeCalculationMethod === 'manual') {
        const touchdownFrame = touchdownTime * videoFps;
        const takeoffFrame = takeoffTime * videoFps;
        const landingFrame = landingTime * videoFps;
        
        realContactTime = Math.abs(takeoffFrame - touchdownFrame) / cameraFps;
        realFlightTime = Math.abs(landingFrame - takeoffFrame) / cameraFps;
      } else {
        const contactTimeDelta = Math.abs(takeoffTime - touchdownTime);
        const flightTimeDelta = Math.abs(landingTime - takeoffTime);
        realContactTime = contactTimeDelta * (videoFps / cameraFps);
        realFlightTime = flightTimeDelta * (videoFps / cameraFps);
      }

      const heightMeters = 1.22625 * Math.pow(realFlightTime, 2);
      const heightCm = heightMeters * 100;
      const heightInches = heightCm * 0.393701;

      const rsiScore = heightMeters / realContactTime;
      const rsiModScore = realFlightTime / realContactTime;

      const mass = activePlayer?.weight_kg || 70;
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
        
        if (frameDiffs.length < 15 && (now - startTime) < 2000) {
          videoEl.requestVideoFrameCallback(callback);
        } else {
          videoEl.pause();
          if (frameDiffs.length >= 5) {
            const sorted = [...frameDiffs].sort((a, b) => a - b);
            const trimCount = Math.floor(sorted.length * 0.2);
            const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
            const avgDiff = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
            
            if (avgDiff > 0) {
              const rawFps = 1 / avgDiff;
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
            setVideoFps(30);
            setCameraFps(30);
            setIsFpsAutoDetected(false);
          }
        }
      };
      
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

  // Automated FPS Detection once video file loads (controls by fpsAutoDetectEnabled switch)
  useEffect(() => {
    if (fpsAutoDetectEnabled && videoSrc && videoRef.current) {
      setIsFpsAutoDetected(false);
      const timer = setTimeout(() => {
        detectVideoFps(videoRef.current);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [videoSrc, fpsAutoDetectEnabled]);

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
        if (videoRef.current.currentTime >= duration - 0.1) {
          const startSafeTime = 0.01;
          videoRef.current.currentTime = startSafeTime;
          setCurrentTime(startSafeTime);
        }
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (isDragging) return;
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    if (isSeekingRef.current) return;
    const time = Number(e.target.value);
    const video = videoRef.current;
    video.pause();
    setIsPlaying(false);

    const safeTime = Math.max(0.01, Math.min(time, duration - 0.01));

    isSeekingRef.current = true;
    setIsSeeking(true);

    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      handleVideoSeeked();
    }, 200);

    try {
      video.currentTime = safeTime;
      setCurrentTime(safeTime);

      if (video.paused) {
        video.play().then(() => {
          if (videoRef.current) videoRef.current.pause();
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Seek error:", err);
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
      isSeekingRef.current = false;
      setIsSeeking(false);
    }
  };

  const handleVideoSeeked = () => {
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
    isSeekingRef.current = false;
    setIsSeeking(false);
    
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      try {
        const video = videoRef.current;
        const originalDisplay = video.style.display;
        video.style.display = 'none';
        video.offsetHeight;
        video.style.display = originalDisplay;
      } catch (e) {}
      
      if (pendingSeekTimeRef.current === null && videoRef.current.paused) {
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              if (videoRef.current) videoRef.current.pause();
            }).catch(() => {});
          }
        } catch (e) {}
      }
    }
    
    if (pendingSeekTimeRef.current !== null) {
      const nextTime = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      const video = videoRef.current;
      if (video) {
        isSeekingRef.current = true;
        setIsSeeking(true);
        if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = setTimeout(() => {
          handleVideoSeeked();
        }, 200);
        try {
          video.currentTime = nextTime;
        } catch (err) {
          console.error("Queue seek error:", err);
          isSeekingRef.current = false;
          setIsSeeking(false);
        }
      }
    }
  };

  const stepFrames = async (frames) => {
    if (!videoRef.current || duration <= 0) return;
    
    const video = videoRef.current;
    video.pause();
    setIsPlaying(false);
    
    const timeStep = frames / videoFps;
    let newTime = video.currentTime + timeStep;
    const safeTime = Math.max(0.01, Math.min(newTime, duration - 0.01));
    
    performSeek(safeTime);
    
    try {
      const originalDisplay = video.style.display;
      video.style.display = 'none';
      video.offsetHeight;
      video.style.display = originalDisplay;

      if (video.paused) {
        video.play().then(() => {
          if (videoRef.current) videoRef.current.pause();
        }).catch(() => {});
      }
    } catch (err) {}
  };

  const getRSIEval = (rsi) => {
    const score = parseFloat(rsi);
    if (score < 1.5)
      return {
        text: 'تحتاج تطوير ⚠️ (أوتار مرنة ضعيفة، تتطلب تدريبات بليومترك سريعة مكثفة)',
        color: 'text-red-400 bg-red-950/20 border-red-900/30',
      };
    if (score >= 1.5 && score < 2.0)
      return { text: 'مقبول ⚡ (صلابة متوسطة، تحتاج لدمج قفزات Pogo قصيرة)', color: 'text-orange-400 bg-orange-950/20 border-orange-900/30' };
    if (score >= 2.0 && score < 2.5)
      return { text: 'جيد ⭐ (صلابة كاحل ممتازة وكفاءة ارتداد قوية)', color: 'text-teal-400 bg-teal-950/20 border-teal-800/30' };
    return { text: 'نخبة أولمبية 👑 (صلابة أوتار استثنائية وسرعة نقل طاقة فائقة)', color: 'text-cyan-400 bg-cyan-950/20 border-cyan-800/30' };
  };

  return (
    <div className="glass-panel p-4 md:p-6 shadow-2xl transition-all duration-300 text-right animate-fade-in" style={{ direction: 'rtl' }}>
      
      {/* Header section */}
      <div className="flex justify-between items-center border-b border-gray-800/80 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
            <Zap size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">RSI (Reactive Strength Index) - Drop Jump</h3>
            <p className="text-xs text-gray-400 mt-1">قياس مرونة الكاحل وسرعة الاستجابة اللامركزية للأوتار والأربطة</p>
          </div>
        </div>
      </div>

      {/* Video Uploader Frame */}
      <div className="mb-6 p-6 bg-[#111827]/25 rounded-2xl border border-gray-800/80 relative">
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
              <div className="btn-orange-gradient text-center py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-lg active:scale-98">
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
              <div className="bg-slate-900/60 hover:bg-slate-800 border border-gray-850 text-white text-center py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-md active:scale-98">
                <Play size={20} className="text-cyan-400" />
                اختر فيديو من الاستوديو 📁
              </div>
            </div>
          </div>
        )}

        {videoSrc && (
          <div className="flex flex-col items-center w-full relative">
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 z-25 bg-red-650 hover:bg-red-500 text-white p-2.5 rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer border border-red-550/20"
            >
              <X size={16} />
            </button>
            
            <div className="relative inline-block border-4 border-gray-800 rounded-3xl overflow-hidden mb-6 shadow-[0_15px_40px_rgba(0,0,0,0.5)] bg-black max-w-full">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline={true}
                webkitPlaysInline={true}
                muted={true}
                controls={false}
                preload="auto"
                className="max-h-80 w-auto object-contain"
                onLoadedMetadata={() => setDuration(videoRef.current.duration)}
                onTimeUpdate={handleTimeUpdate}
                onSeeked={handleVideoSeeked}
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            {/* Premium Filmstrip Scrubber Timeline */}
            <div className="w-full bg-[#0a1224]/50 p-4 rounded-2xl border border-gray-850 mb-5">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2 font-bold px-1">
                <span>خط زمن اختبار الـ RSI</span>
                <span className="text-cyan-400">اسحب خط الزمن لتحديد لحظات الكبح والارتقاء ⏱️</span>
              </div>
              
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 relative mb-4">
                {/* Time Display Badge */}
                <div className="flex justify-between items-center w-full md:w-auto bg-slate-900/60 px-3 py-2 rounded-xl border border-gray-850 text-center shrink-0 gap-3">
                  <div className="text-right">
                    <span className="block text-[8px] text-gray-500 font-bold">الوقت الحالي</span>
                    <span ref={currentTimeDesktopRef} className="text-xs font-black text-cyan-400 font-mono">{currentTime.toFixed(3)}s</span>
                  </div>
                  <div className="border-r border-gray-800 h-6"></div>
                  <div className="text-right">
                    <span className="block text-[8px] text-gray-500 font-bold">رقم الإطار</span>
                    <span ref={currentFrameDesktopRef} className="text-xs font-bold text-gray-300 font-mono">F {Math.round(currentTime * (videoFps || 30))}</span>
                  </div>
                </div>
                
                {/* Timeline Slider Container */}
                <div ref={timelineTrackRef} className="relative w-full md:flex-1 h-12 bg-[#050b16] border border-cyan-950/40 rounded-2xl select-none flex items-center px-4">
                  {/* Ruler marks background */}
                  <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none opacity-20">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`w-0.5 bg-cyan-500/80 rounded-full ${i % 5 === 0 ? 'h-5 opacity-70' : 'h-2.5 opacity-30'}`} />
                    ))}
                  </div>

                  {/* Highlights range between Touchdown and Landing */}
                  {duration > 0 && touchdownTime > 0 && landingTime > touchdownTime && (
                    <div className="absolute top-2.5 bottom-2.5 bg-cyan-500/10 border-l border-r border-cyan-500/20 pointer-events-none" style={{ right: `${(touchdownTime / duration) * 100}%`, left: `${100 - (landingTime / duration) * 100}%` }} />
                  )}

                  {/* Touchdown indicator flag */}
                  {duration > 0 && touchdownTime > 0 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 shadow-[0_0_8px_#3b82f6] z-10 pointer-events-none" style={{ right: `${(touchdownTime / duration) * 100}%` }}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-blue-500 text-white text-[8px] font-black rounded border border-blue-300 whitespace-nowrap">📥 ملامسة</div>
                    </div>
                  )}

                  {/* Takeoff indicator flag */}
                  {duration > 0 && takeoffTime > 0 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-cyan-500 shadow-[0_0_8px_#06b6d4] z-10 pointer-events-none" style={{ right: `${(takeoffTime / duration) * 100}%` }}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-cyan-500 text-[#070a13] text-[8px] font-black rounded border border-cyan-400 whitespace-nowrap">🚀 إقلاع</div>
                    </div>
                  )}

                  {/* Landing indicator flag */}
                  {duration > 0 && landingTime > 0 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] z-10 pointer-events-none" style={{ right: `${(landingTime / duration) * 100}%` }}>
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded border border-red-400 whitespace-nowrap">🛬 هبوط</div>
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
                      const val = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = val;
                      setCurrentTime(val);
                      if (currentTimeDesktopRef.current) currentTimeDesktopRef.current.innerText = val.toFixed(3) + 's';
                      if (currentFrameDesktopRef.current) currentFrameDesktopRef.current.innerText = 'F ' + Math.round(val * (videoFps || 30));
                    }}
                    onMouseUp={() => { setIsDragging(false); if (videoRef.current && videoRef.current.paused) videoRef.current.play().then(() => { if (videoRef.current) videoRef.current.pause(); }).catch(() => {}); }}
                    onTouchEnd={() => { setIsDragging(false); if (videoRef.current && videoRef.current.paused) videoRef.current.play().then(() => { if (videoRef.current) videoRef.current.pause(); }).catch(() => {}); }}
                    className="timeline-slider w-full h-full opacity-100 bg-transparent absolute inset-0 z-30 px-4 cursor-pointer"
                  />
                </div>
              </div>

              {/* Step Navigation Wheel Controls */}
              <div className="flex justify-center items-center gap-1.5 flex-wrap">
                <button onClick={() => stepFrames(-10)} className="w-10 h-10 rounded-xl bg-slate-900 border border-gray-850 text-white font-mono text-xs font-bold hover:bg-slate-800 cursor-pointer active:scale-95 transition-all">-10</button>
                <button onClick={() => stepFrames(-5)} className="w-10 h-10 rounded-xl bg-slate-900 border border-gray-850 text-white font-mono text-xs font-bold hover:bg-slate-800 cursor-pointer active:scale-95 transition-all">-5</button>
                <button onClick={() => stepFrames(-1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-gray-850 text-white font-mono text-xs font-bold hover:bg-slate-800 cursor-pointer active:scale-95 transition-all">-1</button>
                
                <button onClick={togglePlay} className="px-7 py-2.5 btn-orange-gradient rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all w-24">
                  {isPlaying ? <Pause size={14}/> : <Play size={14}/>}
                </button>
                
                <button onClick={() => stepFrames(1)} className="w-10 h-10 rounded-xl bg-slate-900 border border-gray-850 text-white font-mono text-xs font-bold hover:bg-slate-800 cursor-pointer active:scale-95 transition-all">+1</button>
                <button onClick={() => stepFrames(5)} className="w-10 h-10 rounded-xl bg-slate-900 border border-gray-850 text-white font-mono text-xs font-bold hover:bg-slate-800 cursor-pointer active:scale-95 transition-all">+5</button>
                <button onClick={() => stepFrames(10)} className="w-10 h-10 rounded-xl bg-slate-900 border border-gray-850 text-white font-mono text-xs font-bold hover:bg-slate-800 cursor-pointer active:scale-95 transition-all">+10</button>
              </div>
            </div>

            {/* Quick Placement triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
              <button
                onClick={() => { setTouchdownTime(currentTime); setShowResults(false); }}
                className={`px-4 py-3 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                  touchdownTime > 0
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-gray-300 border-gray-850'
                }`}
              >
                1. لحظة ملامسة الأرض 📥
              </button>
              <button
                onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }}
                className={`px-4 py-3 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                  takeoffTime > 0
                    ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-gray-300 border-gray-850'
                }`}
              >
                2. لحظة الإقلاع 🚀
              </button>
              <button
                onClick={() => { setLandingTime(currentTime); setShowResults(false); }}
                className={`px-4 py-3 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                  landingTime > 0
                    ? 'bg-red-600/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-gray-300 border-gray-850'
                }`}
              >
                3. لحظة الهبوط 🛬
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Grid Panel */}
      <div className="glass-card p-5 mb-6 space-y-4 text-xs font-bold">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">FPS الكاميرا</label>
            <input
              type="number"
              value={cameraFps}
              onChange={(e) => setCameraFps(Number(e.target.value))}
              className="glass-input w-full p-2.5 font-mono"
            />
          </div>
          
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">FPS ملف الفيديو</label>
            <input
              type="number"
              value={videoFps}
              onChange={(e) => setVideoFps(Number(e.target.value))}
              className="glass-input w-full p-2.5 font-mono"
            />
          </div>

          {/* FPS Auto-detect toggle switch (Default: OFF) */}
          <div className="flex flex-col justify-end">
            <div className="glass-input flex items-center justify-between h-[41px] px-3">
              <span className="text-[10px] text-gray-450 font-bold">Frame Detection (كشف الـ Frame):</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-gray-500 font-mono">{fpsAutoDetectEnabled ? 'ON' : 'OFF'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFpsAutoDetectEnabled(!fpsAutoDetectEnabled);
                    if (!fpsAutoDetectEnabled && videoRef.current) {
                      detectVideoFps(videoRef.current);
                    }
                  }}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 outline-none cursor-pointer ${
                    fpsAutoDetectEnabled ? 'bg-cyan-500' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-all duration-200 ${
                      fpsAutoDetectEnabled ? 'mr-5' : 'mr-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 mb-1 text-center">الملامسة (s)</label>
            <div className="glass-input w-full p-2.5 text-blue-400 font-mono font-bold text-center border-blue-500/20">{touchdownTime.toFixed(3)}</div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 text-center">الإقلاع (s)</label>
            <div className="glass-input w-full p-2.5 text-teal-400 font-mono font-bold text-center border-teal-500/20">{takeoffTime.toFixed(3)}</div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 text-center">الهبوط (s)</label>
            <div className="glass-input w-full p-2.5 text-red-400 font-mono font-bold text-center border-red-500/20">{landingTime.toFixed(3)}</div>
          </div>
        </div>

        {/* Time Calculation selector & Advisor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-cyan-950/20 pt-4" style={{ direction: 'rtl' }}>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">طريقة حساب الوقت (Time Calculation)</label>
              <div className="flex bg-black/25 rounded-xl border border-cyan-950/20 p-1">
                {[
                  { id: 'fps', name: '⏱️ حساب تلقائي من الـ FPS' },
                  { id: 'manual', name: '✏️ كتابة زمن إطار يدوي' }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => { setTimeCalculationMethod(method.id); if (method.id === 'fps') setIsFrameDurationManual(false); }}
                    className={`flex-1 py-1.5 px-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${timeCalculationMethod === method.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/25' : 'text-gray-400 hover:text-white bg-transparent border border-transparent'}`}
                  >
                    {method.name}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Advisor */}
            {aiDetectedFrameDuration && (
              <div className="bg-emerald-950/15 border border-emerald-500/20 p-3.5 rounded-xl flex flex-col gap-1.5 animate-fade-in">
                <div className="flex items-center gap-1.5 text-emerald-400 justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={14} className="animate-pulse" />
                    <span className="text-[10px] font-black">مستشار الإطارات المساعد (AI Analyzer)</span>
                  </div>
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black">نشط</span>
                </div>
                <div className="text-[9px] text-gray-400 leading-relaxed">
                  تم رصد الفاصل الزمني الفعلي للإطارات بالذكاء الاصطناعي:
                  <span className="text-white font-mono font-black block mt-1.5 text-center bg-black/40 py-1.5 rounded border border-emerald-500/10">
                    {aiDetectedFrameDuration} ثانية ({ (1 / aiDetectedFrameDuration).toFixed(2) } FPS)
                  </span>
                </div>
                {timeCalculationMethod !== 'manual' ? (
                  <button
                    type="button"
                    onClick={() => { setTimeCalculationMethod('manual'); setManualFrameDuration(aiDetectedFrameDuration); setIsFrameDurationManual(true); }}
                    className="w-full mt-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/35 border border-emerald-500/30 py-1.5 px-2 rounded-lg text-[9px] font-black transition-all cursor-pointer"
                  >
                    ⚡ استخدام زمن الإطار المقاس وتعديله يدوياً
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setManualFrameDuration(aiDetectedFrameDuration); setIsFrameDurationManual(true); }}
                    className="w-full mt-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/35 border border-emerald-500/30 py-1.5 px-2 rounded-lg text-[9px] font-black transition-all cursor-pointer"
                  >
                    ↺ تطبيق قيمة الإطار الذكي المقترحة
                  </button>
                )}
              </div>
            )}
          </div>
          
          {timeCalculationMethod === 'manual' && (
            <div className="bg-cyan-950/10 border border-cyan-500/25 p-3 rounded-xl animate-fade-in space-y-1.5 self-start">
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span className="font-bold">زمن إطار الفيديو الفعلي (ثانية):</span>
                <button
                  type="button"
                  onClick={() => { setIsFrameDurationManual(false); setManualFrameDuration(parseFloat((1 / cameraFps).toFixed(6))); }}
                  className="text-[8px] text-cyan-400 font-bold bg-cyan-950/50 border border-cyan-500/20 px-2 py-0.5 rounded hover:bg-cyan-900/30 cursor-pointer"
                >
                  إعادة تعيين للتلقائي ↺
                </button>
              </div>
              <input
                type="number"
                step="0.000001"
                value={manualFrameDuration}
                onChange={(e) => { setManualFrameDuration(e.target.value); setIsFrameDurationManual(true); }}
                className="glass-input w-full p-2 px-3 text-xs font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Trigger button */}
      <div className="flex justify-center mb-6">
        <button
          onClick={handleAnalyze}
          className="px-14 py-4 btn-orange-gradient rounded-2xl font-black text-lg shadow-lg active:scale-98 transition-transform hover:scale-[1.02] cursor-pointer"
        >
          تحليل واستخراج مؤشر RSI ⏱️
        </button>
      </div>

      {/* Results HUD Display */}
      {showResults && stats && (
        <div className="space-y-6 border-t border-gray-800/80 pt-6 animate-fade-in">
          
          <div className="flex justify-between items-center border-b border-cyan-500/20 pb-3">
            <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Sparkles size={14} /> شاشة نتائج التحليل الحركي لمؤشر RSI
            </div>
            
            <div className="flex items-center gap-1.5 bg-black/45 p-1 rounded-xl border border-gray-850">
              <button
                type="button"
                onClick={() => setDisplayUnit('cm')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${displayUnit === 'cm' ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white bg-transparent border border-transparent'}`}
              >
                سم (Cm)
              </button>
              <button
                type="button"
                onClick={() => setDisplayUnit('in')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${displayUnit === 'in' ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white bg-transparent border border-transparent'}`}
              >
                بوصة (Inches)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* Primary Radial RSI score ring */}
            <div className="bg-[#111827]/30 border border-gray-850 p-6 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg lg:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none"></div>
              <span className="text-xs font-bold text-gray-450 mb-6 block uppercase tracking-wider">مؤشر القوة التفاعلية الأخير</span>
              
              <div className="relative w-40 h-40 flex items-center justify-center bg-black/15 rounded-full border border-gray-850 shadow-inner">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="41" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="41" 
                    fill="none" 
                    stroke="url(#rsiTealProgress)" 
                    strokeWidth="6" 
                    strokeLinecap="round"
                    strokeDasharray="257.61"
                    strokeDashoffset={257.61 - (257.61 * Math.min(1.0, parseFloat(stats.rsi)/4.0))} 
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="rsiTealProgress" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00f5d4" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                  <span className="text-4xl font-black text-white font-mono leading-none drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                    <AnimatedCounter value={stats.rsi} decimals={2} />
                  </span>
                  <span className="text-[9px] text-gray-500 font-extrabold uppercase mt-1">RSI Score</span>
                </div>
              </div>
            </div>

            {/* Performance breakdown indicators */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-gray-400 font-bold">زمن التلامس (Tc)</span>
                <span className="text-xl font-black text-white font-mono block mt-2">
                  <AnimatedCounter value={stats.contactTime} decimals={3} /> <span className="text-xs text-gray-500 font-normal">s</span>
                </span>
                <span className="text-[8px] text-gray-500 mt-1 block">زمن ملامسة الصدمة</span>
              </div>
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-gray-400 font-bold">زمن الطيران (Tf)</span>
                <span className="text-xl font-black text-white font-mono block mt-2">
                  <AnimatedCounter value={stats.flightTime} decimals={3} /> <span className="text-xs text-gray-500 font-normal">s</span>
                </span>
                <span className="text-[8px] text-gray-500 mt-1 block">زمن التحليق العمودي</span>
              </div>
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] text-gray-400 font-bold">الارتفاع الميكانيكي</span>
                <span className="text-xl font-black text-white font-mono block mt-2">
                  <AnimatedCounter value={displayUnit === 'in' ? stats.heightInches : stats.heightCm} decimals={1} /> <span className="text-xs text-gray-500 font-normal">{displayUnit === 'in' ? 'in' : 'cm'}</span>
                </span>
                <span className="text-[8px] text-gray-500 mt-1 block">صعود مركز الجاذبية</span>
              </div>
              <div className="bg-slate-900/40 border border-gray-850 p-4 rounded-2xl flex flex-col justify-between border-emerald-500/25 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>
                <span className="text-[10px] text-gray-400 font-bold relative z-10">صلابة الأوتار</span>
                <span className="text-xl font-black text-emerald-400 font-mono block mt-2 relative z-10">
                  <AnimatedCounter value={stats.legStiffness} decimals={1} /> <span className="text-xs text-emerald-500/50 font-normal">kN/m</span>
                </span>
                <span className="text-[8px] text-gray-500 mt-1 block relative z-10">Stiffness (صلابة المفصل)</span>
              </div>
            </div>

          </div>

          {/* Biomechanical Grade Capsule */}
          <div className="bg-black/15 border border-gray-850 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Info size={14} className="text-cyan-400" />
              <span>التقييم البيوميكانيكي الوظيفي للجهاز الحركي والأوتار</span>
            </div>
            <p className={`text-lg font-black px-4 py-2 rounded-xl border ${getRSIEval(stats.rsi).color}`}>
              {getRSIEval(stats.rsi).text}
            </p>
          </div>

          <button
            onClick={saveMeasurement}
            disabled={isSaving}
            className="w-full py-4 btn-orange-gradient rounded-xl font-black text-base shadow-lg transition-transform hover:scale-[1.01] active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save size={16} />
            {isSaving ? 'جاري حفظ الاختبار...' : 'حفظ نتيجة الـ RSI في سجل ملف اللاعب'}
          </button>
        </div>
      )}
    </div>
  );
}
