import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, FastForward, Rewind, Activity, Zap, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface SprintResults {
  peakVelocity: string;
  meanVelocity: string;
  totalDistance: string;
  acceleration: string;
  timeTaken: string;
  split10m?: string;
  split20m?: string;
  insight: {
    desc: string;
    color: string;
  };
}

export default function SprintAnalyzer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isAiReady, setIsAiReady] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [cameraFps, setCameraFps] = useState<number | string>(240); 
  const [videoFps, setVideoFps] = useState<number | string>(30);    
  
  const [isTracking, setIsTracking] = useState(false);
  const [sprintResults, setSprintResults] = useState<SprintResults | null>(null);
  const [showTrail, setShowTrail] = useState(true);

  // Calibration settings (e.g. 10.0m between 2 cones)
  const [referenceLength, setReferenceLength] = useState<number | string>(10.0); 
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0); 

  const isTrackingRef = useRef(false);
  const showTrailRef = useRef(true); 
  const hipHistoryRef = useRef<{ time: number; x: number; y: number }[]>([]); 
  const calibrationClicksRef = useRef<{ x: number; y: number }[]>([]);
  const pixelsPerMeterRef = useRef<number | null>(null);
  const poseRef = useRef<any>(null);
  const reqRef = useRef<number | null>(null);

  useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]);
  useEffect(() => { showTrailRef.current = showTrail; }, [showTrail]);

  // Load MediaPipe scripts dynamically if not present
  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise<void>((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    };

    const loadMediaPipe = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        const checkInterval = setInterval(() => {
          if ((window as any).Pose && typeof (window as any).Pose === 'function') {
            clearInterval(checkInterval);
            setScriptsLoaded(true);
          }
        }, 100);
      } catch (error) {
        console.error("MediaPipe load error:", error);
      }
    };
    loadMediaPipe();
  }, []);

  useEffect(() => {
    if (!scriptsLoaded) return;
    const { Pose, POSE_CONNECTIONS, drawConnectors, drawLandmarks } = window as any;
    const pose = new Pose({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });

    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

    pose.onResults((results: any) => {
      if (!isAiReady) setIsAiReady(true);
      if (!canvasRef.current) return;
      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;
      
      if (results.image.width && canvasRef.current.width !== results.image.width) {
        canvasRef.current.width = results.image.width;
        canvasRef.current.height = results.image.height;
      }

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00F0FF', lineWidth: 2 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#10B981', lineWidth: 1 });

        if (isTrackingRef.current && videoRef.current) {
          const leftHip = results.poseLandmarks[23];
          const rightHip = results.poseLandmarks[24];
          
          if (leftHip && rightHip) {
            const avgX = (leftHip.x + rightHip.x) / 2;
            const avgY = (leftHip.y + rightHip.y) / 2;
            
            const actualPixelX = avgX * canvasRef.current.width; 
            const actualPixelY = avgY * canvasRef.current.height; 

            hipHistoryRef.current.push({ 
              time: videoRef.current.currentTime, 
              x: actualPixelX, 
              y: actualPixelY 
            });
          }
        }
      }

      // Horizontal Motion Trail
      if (showTrailRef.current && hipHistoryRef.current.length > 1) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(hipHistoryRef.current[0].x, hipHistoryRef.current[0].y);
        for (let i = 1; i < hipHistoryRef.current.length; i++) {
          canvasCtx.lineTo(hipHistoryRef.current[i].x, hipHistoryRef.current[i].y);
        }
        canvasCtx.strokeStyle = '#00F0FF';
        canvasCtx.lineWidth = 4;
        canvasCtx.lineJoin = 'round';
        canvasCtx.stroke();
      }

      // Calibration markers
      const clicks = calibrationClicksRef.current;
      if (clicks.length > 0) {
        canvasCtx.fillStyle = '#00F0FF';
        canvasCtx.strokeStyle = '#FFFFFF';
        canvasCtx.lineWidth = 3;
        clicks.forEach((click) => {
          canvasCtx.beginPath();
          canvasCtx.arc(click.x, click.y, 8, 0, 2 * Math.PI);
          canvasCtx.fill();
          canvasCtx.stroke();
        });
        if (clicks.length === 2) {
          canvasCtx.beginPath();
          canvasCtx.moveTo(clicks[0].x, clicks[0].y);
          canvasCtx.lineTo(clicks[1].x, clicks[1].y);
          canvasCtx.strokeStyle = '#00F0FF';
          canvasCtx.lineWidth = 3;
          canvasCtx.stroke();
        }
      }
      canvasCtx.restore();
    });

    poseRef.current = pose;
    let isProcessing = false;
    const processFrame = async () => {
      const video = videoRef.current;
      if (video && !video.paused && !video.ended) {
        if (!isProcessing && video.readyState >= 2) {
          isProcessing = true;
          await pose.send({ image: video });
          isProcessing = false;
        }
      }
      reqRef.current = requestAnimationFrame(processFrame);
    };
    processFrame();

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
      pose.close();
    };
  }, [scriptsLoaded]); 

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedVideo(URL.createObjectURL(file));
      setSprintResults(null);
      hipHistoryRef.current = [];
      pixelsPerMeterRef.current = null;
      setDuration(0);
      setCurrentTime(0);
    }
  };

  const togglePlayVideo = () => {
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
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      if (videoRef.current.paused && poseRef.current) {
        await poseRef.current.send({ image: videoRef.current });
      }
    }
  };

  const stepFrames = async (frames: number) => {
    if (videoRef.current && duration > 0) {
      videoRef.current.pause();
      setIsPlaying(false);
      const timeStep = frames / (parseFloat(String(videoFps)) || 30);
      let newTime = videoRef.current.currentTime + timeStep;
      newTime = Math.max(0, Math.min(newTime, duration));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      if (poseRef.current) await poseRef.current.send({ image: videoRef.current });
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCalibrating || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const newClicks = [...calibrationClicksRef.current, { x, y }];
    calibrationClicksRef.current = newClicks;
    setCalibrationStep(newClicks.length + 1);

    if (videoRef.current && poseRef.current) poseRef.current.send({ image: videoRef.current });
    
    if (newClicks.length === 2) {
      const distInPixels = Math.hypot(newClicks[0].x - newClicks[1].x, newClicks[0].y - newClicks[1].y); 
      const refLen = parseFloat(String(referenceLength)) || 10.0; 
      const ppm = distInPixels / refLen; 
      pixelsPerMeterRef.current = ppm;
      setIsCalibrating(false);
      setCalibrationStep(0);
      alert(`✅ تمت المعايرة بنجاح لمسافة ${refLen} متر أفقياً! (${ppm.toFixed(1)} بيكسل لكل متر)`);
      setTimeout(() => {
        calibrationClicksRef.current = [];
        if (videoRef.current && poseRef.current) poseRef.current.send({ image: videoRef.current });
      }, 3000);
    }
  };

  const handleToggleTracking = () => {
    if (!isTracking) {
      hipHistoryRef.current = [];
      setSprintResults(null);
      setIsTracking(true);
    } else {
      setIsTracking(false);
    }
  };

  const handleAnalyzeSprint = () => {
    setIsTracking(false);
    const history = hipHistoryRef.current;
    if (history.length < 5) return alert("لم يتم التقاط بيانات كافية! قم بتسجيل حركة اللاعب أثناء الجري.");

    const ppm = pixelsPerMeterRef.current; 
    if (!ppm || ppm <= 0) return alert("يرجى عمل 'معايرة الكاميرا' أولاً لتحديد المسافة (مثلاً 5 متر أو 10 متر) بين نقطتين.");

    const camFps = parseFloat(String(cameraFps)) || 30;
    const vidFps = parseFloat(String(videoFps)) || 30;
    const timeScaleRatio = vidFps / camFps; 

    const velocities: number[] = [];
    let totalDistanceCovered = 0;

    for (let i = 0; i < history.length - 1; i++) {
      const dxPixels = Math.abs(history[i+1].x - history[i].x);
      const actualDistanceMeters = dxPixels / ppm;
      
      const dt_video = history[i+1].time - history[i].time;
      const dt_real = dt_video * timeScaleRatio; 

      if (dt_real > 0) {
        const v = actualDistanceMeters / dt_real;
        if (v < 14.0 && v > 0.4) { 
          velocities.push(v);
          totalDistanceCovered += actualDistanceMeters;
        }
      }
    }

    if (velocities.length === 0) return alert("اللاعب لم يتحرك أو خطأ في التتبع.");

    // Moving average filter
    const smoothVelocities: number[] = [];
    for (let i = 0; i < velocities.length; i++) {
      const windowVals = velocities.slice(Math.max(0, i - 2), i + 3);
      const avg = windowVals.reduce((a, b) => a + b, 0) / windowVals.length;
      smoothVelocities.push(avg);
    }

    const peakVelocity = Math.max(...smoothVelocities);
    const meanVelocity = smoothVelocities.reduce((a, b) => a + b, 0) / smoothVelocities.length;
    const totalTime = (history[history.length - 1].time - history[0].time) * timeScaleRatio;
    const acceleration = peakVelocity / Math.max(0.5, totalTime / 2);

    let coachAdvice = "";
    let zoneColor = "";
    if (peakVelocity >= 9.0) {
      coachAdvice = "سرعة نادرة أولمبية (Elite Sprinter)! ميكانيكا طيران وتوليد قوة ممتازين.";
      zoneColor = "text-[#00F0FF] border-[#00F0FF]/40 bg-[#00F0FF]/15";
    } else if (peakVelocity >= 7.5) {
      coachAdvice = "سرعة ممتازة جداً (رياضي محترف). جاهز للمنافسات التنافسية العالية.";
      zoneColor = "text-emerald-400 border-emerald-500/40 bg-emerald-500/15";
    } else if (peakVelocity >= 6.0) {
      coachAdvice = "سرعة جيدة، ولكن يحتاج لتطوير طور التسارع الأول (0-10m Acceleration).";
      zoneColor = "text-amber-400 border-amber-500/40 bg-amber-500/15";
    } else {
      coachAdvice = "سرعة تأسيسية؛ ينصح بتمارين القوة القصوى والقفز الأفقي وتحسين تردد الخطوة.";
      zoneColor = "text-rose-400 border-rose-500/40 bg-rose-500/15";
    }

    setSprintResults({
      peakVelocity: peakVelocity.toFixed(2),
      meanVelocity: meanVelocity.toFixed(2),
      totalDistance: totalDistanceCovered.toFixed(2),
      acceleration: acceleration.toFixed(2),
      timeTaken: totalTime.toFixed(2),
      split10m: (10 / Math.max(1, meanVelocity)).toFixed(2),
      split20m: (20 / Math.max(1, meanVelocity * 1.05)).toFixed(2),
      insight: { desc: coachAdvice, color: zoneColor }
    });
  };

  return (
    <div className="glass-panel p-6 shadow-2xl text-center border border-white/10 relative overflow-hidden">
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <Activity size={24} />
        </div>
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#00F0FF] to-cyan-400">
          تحليل سرعة الجري والتسارع (Sprint Telemetry) 🏃‍♂️💨
        </h3>
      </div>

      <div className="mb-6 p-4 bg-[#111827]/80 border border-white/10 rounded-xl text-xs text-gray-300 max-w-2xl mx-auto flex items-center gap-3">
        <Zap className="text-[#00F0FF] shrink-0" size={20} />
        <span>
          💡 <b>ملاحظة التصوير:</b> صوّر اللاعب من <b>الجانب (Profile View)</b> مع تثبيت الكاميرا تماماً. ضع قمعين على الأرض بمسافة معلومة (مثلاً 5 أو 10 متر) لتنفيذ المعايرة بدقة سنتيمترية.
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-6 bg-[#111827]/60 p-4 rounded-2xl border border-white/10 max-w-2xl mx-auto">
        <div className="relative">
          <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <button className="px-8 py-3 rounded-xl font-black transition-all bg-[#00F0FF] hover:bg-[#38bdf8] text-[#07090E] shadow-[0_0_20px_rgba(0,240,255,0.3)] cursor-pointer">
            📹 رفع فيديو الجري (Sprint Video)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 bg-[#111827]/60 p-4 rounded-2xl border border-white/10 max-w-2xl mx-auto">
        <div>
          <label className="block text-xs text-gray-400 mb-1">FPS الكاميرا (تصوير بطيء)</label>
          <input type="number" value={cameraFps} onChange={e => setCameraFps(e.target.value)} className="w-full bg-[#0B0F19] border border-white/10 p-2 text-white font-mono rounded-xl text-center outline-none focus:border-[#00F0FF]" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">FPS تشغيل الملف</label>
          <input type="number" value={videoFps} onChange={e => setVideoFps(e.target.value)} className="w-full bg-[#0B0F19] border border-white/10 p-2 text-white font-mono rounded-xl text-center outline-none focus:border-[#00F0FF]" />
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs text-gray-400 mb-1">مسافة القمعين (متر)</label>
          <input type="number" step="0.5" value={referenceLength} onChange={e => setReferenceLength(e.target.value)} className="w-full bg-[#0B0F19] border border-white/10 p-2 text-[#00F0FF] font-mono font-bold rounded-xl text-center outline-none focus:border-[#00F0FF]" />
        </div>
      </div>

      <div className="mb-6 bg-[#111827]/60 p-4 rounded-2xl border border-white/10 inline-block w-full max-w-md">
        {!isCalibrating ? (
          <button 
            onClick={() => { 
              setIsCalibrating(true); 
              setCalibrationStep(1); 
              calibrationClicksRef.current = []; 
              pixelsPerMeterRef.current = null; 
              if (videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } 
            }} 
            className="w-full px-6 py-2.5 bg-[#0B0F19] border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/15 rounded-xl font-black text-xs transition-all cursor-pointer"
          >
            📏 بدء معايرة الكاميرا (انقر على القمعين في الفيديو)
          </button>
        ) : (
          <div className="w-full bg-[#00F0FF]/15 border border-[#00F0FF]/50 p-3 rounded-xl animate-pulse">
            {calibrationStep === 1 && <p className="text-[#00F0FF] font-bold text-xs">1️⃣ اضغط على <span className="text-white">القمع الأول</span> (نقطة البداية)</p>}
            {calibrationStep === 2 && <p className="text-[#00F0FF] font-bold text-xs">2️⃣ اضغط على <span className="text-white">القمع الثاني</span> (نقطة النهاية)</p>}
          </div>
        )}
      </div>

      {!scriptsLoaded && <p className="text-gray-400 mb-4 font-bold text-xs">جاري تهيئة خوارزميات الذكاء الاصطناعي وتتبع الهيكل...</p>}
      
      <div className="relative flex flex-col items-center w-full max-w-2xl mx-auto mb-6">
        <div className="relative inline-block border-2 border-white/10 rounded-2xl overflow-hidden shadow-2xl w-full mb-4 bg-black">
          <video ref={videoRef} className="hidden" playsInline onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
          <canvas ref={canvasRef} onClick={handleCanvasClick} className={`w-full h-auto bg-black ${isCalibrating ? 'cursor-crosshair' : ''}`} />
        </div>

        {uploadedVideo && duration > 0 && (
          <div className="w-full bg-[#111827]/80 p-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs text-gray-400 font-mono bg-black/60 px-2 py-1 rounded">{currentTime.toFixed(2)}s</span>
              <input type="range" min="0" max={duration} step="0.001" value={currentTime} onChange={handleSeek} className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer timeline-slider" />
              <span className="text-xs text-gray-400 font-mono bg-black/60 px-2 py-1 rounded">{duration.toFixed(2)}s</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => stepFrames(-1)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white text-xs font-bold">-1 فريم</button>
              <button onClick={togglePlayVideo} className="px-8 py-2 bg-[#00F0FF] hover:bg-[#38bdf8] text-[#07090E] rounded-xl font-black mx-2 shadow-[0_0_15px_rgba(0,240,255,0.3)] cursor-pointer">
                {isPlaying ? '⏸ إيقاف' : '▶ تشغيل'}
              </button>
              <button onClick={() => stepFrames(1)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white text-xs font-bold">+1 فريم</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <button 
          onClick={() => { 
            setShowTrail(!showTrail); 
            if (videoRef.current && poseRef.current && videoRef.current.paused) { 
              poseRef.current.send({ image: videoRef.current }); 
            } 
          }} 
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg border cursor-pointer ${showTrail ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/40' : 'bg-[#111827] text-gray-400 border-white/10'}`}
        >
          {showTrail ? '🙈 إخفاء مسار الحوض' : '👁️ إظهار مسار الحوض'}
        </button>

        <button 
          onClick={handleToggleTracking} 
          className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg flex items-center gap-2 cursor-pointer ${isTracking ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
        >
          {isTracking ? '⏹ إيقاف التتبع' : '⏺ بدء تتبع الجري'}
        </button>

        <button 
          onClick={handleAnalyzeSprint} 
          className="px-6 py-2.5 bg-gradient-to-r from-[#00F0FF] to-cyan-500 hover:from-[#38bdf8] hover:to-cyan-400 text-[#07090E] rounded-xl font-black text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer transition-transform hover:scale-105"
        >
          📊 استخراج تقرير السرعة
        </button>
      </div>

      {sprintResults && (
        <div className="space-y-6 border-t border-white/10 pt-6 max-w-3xl mx-auto">
          <div className={`p-6 rounded-2xl border ${sprintResults.insight.color} shadow-lg text-center`}>
            <p className="text-xs font-bold opacity-80 mb-2">تقييم الميكانيكا الحيوية والسرعة (Coach Telemetry)</p>
            <h4 className="text-xl font-black mb-1">{sprintResults.insight.desc}</h4>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="glass-card p-4 border-b-2 border-[#00F0FF]">
              <span className="block text-[11px] text-gray-400 mb-1">السرعة القصوى (Max V)</span>
              <span className="text-2xl font-black text-white font-mono metric-num">{sprintResults.peakVelocity} <span className="text-xs text-gray-500 font-sans">m/s</span></span>
            </div>
            <div className="glass-card p-4 border-b-2 border-cyan-500">
              <span className="block text-[11px] text-gray-400 mb-1">السرعة المتوسطة</span>
              <span className="text-2xl font-black text-white font-mono metric-num">{sprintResults.meanVelocity} <span className="text-xs text-gray-500 font-sans">m/s</span></span>
            </div>
            <div className="glass-card p-4 border-b-2 border-emerald-500">
              <span className="block text-[11px] text-gray-400 mb-1">التسارع (Acceleration)</span>
              <span className="text-2xl font-black text-emerald-400 font-mono metric-num">{sprintResults.acceleration} <span className="text-xs text-gray-500 font-sans">m/s²</span></span>
            </div>
            <div className="glass-card p-4 border-b-2 border-purple-500">
              <span className="block text-[11px] text-gray-400 mb-1">المسافة المرصودة</span>
              <span className="text-2xl font-black text-purple-400 font-mono metric-num">{sprintResults.totalDistance} <span className="text-xs text-gray-500 font-sans">m</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
