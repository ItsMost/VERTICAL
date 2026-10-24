import React, { useEffect, useRef, useState } from 'react';
import { Camera, Video, Activity, Zap, ShieldAlert, Award, Play, Pause, ChevronRight, ChevronLeft } from 'lucide-react';
import { getVBTZone } from './useJumpMechanics';
import type { VBTZoneInfo, VBTRep } from './types/athletics';

interface VBTResults {
  peakVelocity: string;
  meanVelocity: string;
  timeTaken: string;
  zoneInfo: VBTZoneInfo;
  velocityLossPercent: number;
}

export default function VBTCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [isAiReady, setIsAiReady] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  
  const [mode, setMode] = useState<'video' | 'front' | 'back'>('video'); 
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [cameraFps, setCameraFps] = useState<number | string>(240); 
  const [videoFps, setVideoFps] = useState<number | string>(30);    
  const [liftDistance, setLiftDistance] = useState<string | number>(0.60); 
  const [exerciseType, setExerciseType] = useState('strength'); // strength or olympic
  
  const [isTracking, setIsTracking] = useState(false);
  const [vbtResults, setVbtResults] = useState<VBTResults | null>(null);
  const [showBarPath, setShowBarPath] = useState(true);

  const [referenceLength, setReferenceLength] = useState<number | string>(0.45); 
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0); 

  // Velocity-loss set history tracking
  const [repsHistory, setRepsHistory] = useState<VBTRep[]>([]);
  const [velocityLossThreshold, setVelocityLossThreshold] = useState<10 | 20>(10);

  const isTrackingRef = useRef(false);
  const showBarPathRef = useRef(true); 
  const wristHistoryRef = useRef<{ time: number; x: number; y: number }[]>([]);
  const calibrationClicksRef = useRef<{ x: number; y: number }[]>([]);
  const pixelsPerMeterRef = useRef<number | null>(null);
  const poseRef = useRef<any>(null);
  const lockedWristRef = useRef<'left' | 'right' | null>(null);
  const reqRef = useRef<number | null>(null);

  useEffect(() => {
    isTrackingRef.current = isTracking;
    if (isTracking) {
      lockedWristRef.current = null;
    }
  }, [isTracking]);

  useEffect(() => { showBarPathRef.current = showBarPath; }, [showBarPath]);

  // Load MediaPipe scripts
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
        console.error("VBT MediaPipe load error:", error);
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
          const leftWrist = results.poseLandmarks[15];
          const rightWrist = results.poseLandmarks[16];
          
          if (leftWrist && rightWrist) {
            if (!lockedWristRef.current) {
              lockedWristRef.current = (rightWrist.visibility > leftWrist.visibility) ? 'right' : 'left';
            }

            const targetWrist = lockedWristRef.current === 'right' ? rightWrist : leftWrist;
            const rawX = targetWrist.x * canvasRef.current.width;
            const rawY = targetWrist.y * canvasRef.current.height;

            const alpha = 0.6;
            let smoothedX = rawX;
            let smoothedY = rawY;

            if (wristHistoryRef.current.length > 0) {
              const lastPoint = wristHistoryRef.current[wristHistoryRef.current.length - 1];
              smoothedX = alpha * rawX + (1 - alpha) * lastPoint.x;
              smoothedY = alpha * rawY + (1 - alpha) * lastPoint.y;
            }

            wristHistoryRef.current.push({ 
              time: videoRef.current.currentTime, 
              x: smoothedX, 
              y: smoothedY 
            });
          }
        }
      }

      // Render Bar Path
      if (showBarPathRef.current && wristHistoryRef.current.length > 1) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(wristHistoryRef.current[0].x, wristHistoryRef.current[0].y);
        for (let i = 1; i < wristHistoryRef.current.length; i++) {
          canvasCtx.lineTo(wristHistoryRef.current[i].x, wristHistoryRef.current[i].y);
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
        canvasCtx.strokeStyle = '#ffffff';
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

  useEffect(() => {
    if (!scriptsLoaded) return;
    const video = videoRef.current;
    if (!video) return;
    let stream: MediaStream | null = null;
    
    const startCamera = async (facingMode: 'user' | 'environment') => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        video.srcObject = stream;
        video.muted = true;
        video.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Camera access error:", err);
      }
    };

    if (mode === 'front') startCamera('user');
    else if (mode === 'back') startCamera('environment');
    else if (mode === 'video' && uploadedVideo) {
      video.srcObject = null;
      video.src = uploadedVideo;
      video.muted = true;
      setIsPlaying(false);
    }
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [mode, uploadedVideo, scriptsLoaded]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedVideo(URL.createObjectURL(file));
      setMode('video');
      setVbtResults(null);
      wristHistoryRef.current = [];
      pixelsPerMeterRef.current = null;
      setDuration(0);
      setCurrentTime(0);
      lockedWristRef.current = null;
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
      const refLen = parseFloat(String(referenceLength)) || 0.45;
      const ppm = distInPixels / refLen;
      pixelsPerMeterRef.current = ppm;
      setIsCalibrating(false);
      setCalibrationStep(0);
      alert(`✅ تمت المعايرة بنجاح للجسم المرجعي بطول ${refLen} متر!`);
      setTimeout(() => {
        calibrationClicksRef.current = [];
        if (videoRef.current && poseRef.current) poseRef.current.send({ image: videoRef.current });
      }, 3000);
    }
  };

  const handleToggleTracking = () => {
    if (!isTracking) {
      wristHistoryRef.current = [];
      setVbtResults(null);
      setIsTracking(true);
      lockedWristRef.current = null;
    } else {
      setIsTracking(false);
    }
  };

  const handleAnalyzeVBT = () => {
    setIsTracking(false);
    const history = wristHistoryRef.current;
    if (history.length < 5) return alert("لم يتم التقاط بيانات كافية! قم بتشغيل التسجيل أثناء حركة البار.");

    let lowestPointIndex = 0;
    let maxY = history[0].y;
    for (let i = 1; i < history.length; i++) {
      if (history[i].y > maxY) {
        maxY = history[i].y;
        lowestPointIndex = i;
      }
    }

    let highestPointIndex = lowestPointIndex;
    let minY = history[lowestPointIndex].y;
    for (let i = lowestPointIndex + 1; i < history.length; i++) {
      if (history[i].y < minY) {
        minY = history[i].y;
        highestPointIndex = i;
      }
    }

    if (lowestPointIndex === highestPointIndex) return alert("لم يتم اكتشاف طور صعود متراكز (Concentric Phase) واضح.");

    const concentricPhase = history.slice(lowestPointIndex, highestPointIndex + 1);
    const distanceInPixels = maxY - minY;
    let finalLiftDistance = parseFloat(String(liftDistance));
    const ppm = pixelsPerMeterRef.current;

    if (ppm && ppm > 0) {
      finalLiftDistance = distanceInPixels / ppm;
      setLiftDistance(finalLiftDistance.toFixed(3));
    }

    const ratio = distanceInPixels > 0 ? finalLiftDistance / distanceInPixels : 1;
    const camFps = parseFloat(String(cameraFps)) || 30;
    const vidFps = parseFloat(String(videoFps)) || 30;
    const timeScaleRatio = vidFps / camFps;

    const velocities: number[] = [];
    for (let i = 0; i < concentricPhase.length - 1; i++) {
      const dy = concentricPhase[i].y - concentricPhase[i + 1].y;
      const dx = concentricPhase[i].x - concentricPhase[i + 1].x;
      const actualDistance = Math.hypot(dx, dy) * ratio;

      const dt_video = concentricPhase[i + 1].time - concentricPhase[i].time;
      const dt_real = dt_video * timeScaleRatio;

      if (dt_real > 0 && dy > 0) {
        const v = actualDistance / dt_real;
        if (v < 4.0) velocities.push(v);
      }
    }

    if (velocities.length === 0) return alert("خطأ في قراءة حركة البار؛ تأكد من وضوح المعصم.");

    const smoothVelocities: number[] = [];
    for (let i = 0; i < velocities.length; i++) {
      const windowVals = velocities.slice(Math.max(0, i - 1), i + 2);
      const avg = windowVals.reduce((a, b) => a + b, 0) / windowVals.length;
      smoothVelocities.push(avg);
    }

    const peakVelocity = Math.max(...smoothVelocities);
    const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const timeTaken = (concentricPhase[concentricPhase.length - 1].time - concentricPhase[0].time) * timeScaleRatio;

    // Use standardized Bryan Mann & Gonzalez-Badillo MCV Zone Mapping
    const zoneInfo = getVBTZone(meanVelocity);

    // Calculate velocity loss from first rep in set
    const firstRepVel = repsHistory.length > 0 ? repsHistory[0].meanVelocity : meanVelocity;
    const velocityLossPercent = firstRepVel > 0 ? Math.max(0, Number((((firstRepVel - meanVelocity) / firstRepVel) * 100).toFixed(1))) : 0;
    const isFatigueThresholdExceeded = velocityLossPercent >= velocityLossThreshold;

    const newRep: VBTRep = {
      repNumber: repsHistory.length + 1,
      meanVelocity: Number(meanVelocity.toFixed(2)),
      peakVelocity: Number(peakVelocity.toFixed(2)),
      zone: zoneInfo,
      velocityLossPercent,
      isFatigueThresholdExceeded,
      timestamp: Date.now(),
    };

    setRepsHistory((prev) => [...prev, newRep]);

    setVbtResults({
      peakVelocity: peakVelocity.toFixed(2),
      meanVelocity: meanVelocity.toFixed(2),
      timeTaken: timeTaken.toFixed(2),
      zoneInfo,
      velocityLossPercent,
    });
  };

  const handleResetSet = () => {
    setRepsHistory([]);
    setVbtResults(null);
  };

  return (
    <div className="glass-panel p-6 shadow-2xl text-center border border-white/10 relative overflow-hidden">
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <Activity size={24} />
        </div>
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#00F0FF] to-cyan-400">
          نظام التدريب المعتمد على السرعة (Velocity-Based Training VBT) 🏋️‍♂️⚡
        </h3>
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-6 bg-[#111827]/80 p-3 rounded-2xl border border-white/10 max-w-2xl mx-auto">
        <button onClick={() => setMode('front')} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${mode === 'front' ? 'bg-[#00F0FF] text-[#07090E] shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-[#0B0F19] text-gray-400 border border-white/10'}`}>كاميرا أمامية 📸</button>
        <button onClick={() => setMode('back')} className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${mode === 'back' ? 'bg-[#00F0FF] text-[#07090E] shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-[#0B0F19] text-gray-400 border border-white/10'}`}>كاميرا خلفية 🎥</button>
        <div className="relative">
          <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <button className={`px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${mode === 'video' ? 'bg-[#00F0FF] text-[#07090E] shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'bg-[#0B0F19] text-gray-400 border border-white/10'}`}>رفع فيديو 📁</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-[#111827]/60 p-4 rounded-2xl border border-white/10 max-w-3xl mx-auto">
        <div>
          <label className="block text-xs text-gray-400 mb-1">نوع التمرين</label>
          <select value={exerciseType} onChange={(e) => setExerciseType(e.target.value)} className="w-full bg-[#0B0F19] border border-white/10 p-2 text-white rounded-xl text-center outline-none focus:border-[#00F0FF] cursor-pointer text-xs font-bold">
            <option value="strength">سكوات / بنش (Power Lifts)</option>
            <option value="olympic">كلين / سناتش (Olympic)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">إيقاف الجلسة عند انخفاض</label>
          <select value={velocityLossThreshold} onChange={(e) => setVelocityLossThreshold(Number(e.target.value) as 10 | 20)} className="w-full bg-[#0B0F19] border border-white/10 p-2 text-[#00F0FF] rounded-xl text-center outline-none focus:border-[#00F0FF] cursor-pointer text-xs font-bold font-mono">
            <option value={10}>10% Velocity Loss (تطوير القدرة)</option>
            <option value={20}>20% Velocity Loss (بناء القوة)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">FPS الكاميرا</label>
          <input type="number" value={cameraFps} onChange={(e) => setCameraFps(e.target.value)} className="w-full bg-[#0B0F19] border border-white/10 p-2 text-white font-mono rounded-xl text-center outline-none focus:border-[#00F0FF] text-xs" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">طول الجسم المرجعي (m)</label>
          <input type="number" step="0.01" value={referenceLength} onChange={(e) => setReferenceLength(e.target.value)} className="w-full bg-[#0B0F19] border border-white/10 p-2 text-[#00F0FF] font-mono font-bold rounded-xl text-center outline-none focus:border-[#00F0FF] text-xs" />
        </div>
      </div>

      <div className="mb-4 bg-[#111827]/60 p-3 rounded-2xl border border-white/10 inline-block w-full max-w-md">
        {!isCalibrating ? (
          <button 
            onClick={() => { 
              setIsCalibrating(true); 
              setCalibrationStep(1); 
              calibrationClicksRef.current = []; 
              pixelsPerMeterRef.current = null; 
              if (videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } 
            }} 
            className="w-full px-5 py-2 bg-[#0B0F19] border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/15 rounded-xl font-bold text-xs transition-all cursor-pointer"
          >
            📏 معايرة قطر طارة البار (45cm) على الشاشة
          </button>
        ) : (
          <div className="w-full bg-[#00F0FF]/15 border border-[#00F0FF]/50 p-2.5 rounded-xl animate-pulse text-xs">
            {calibrationStep === 1 && <p className="text-[#00F0FF] font-bold">1️⃣ اضغط على <span className="text-white">أعلى نقطة</span> بالطارة</p>}
            {calibrationStep === 2 && <p className="text-[#00F0FF] font-bold">2️⃣ اضغط على <span className="text-white">أسفل نقطة</span> بالطارة</p>}
          </div>
        )}
      </div>

      {!scriptsLoaded && <p className="text-[#00F0FF] mb-4 font-bold text-xs animate-pulse">جاري تجهيز رادار الذكاء الاصطناعي وتتبع مسار البار...</p>}

      <div className="relative flex flex-col items-center w-full max-w-xl mx-auto mb-6">
        <div className="relative inline-block border-2 border-white/10 rounded-2xl overflow-hidden shadow-2xl w-full mb-4 bg-black">
          <video ref={videoRef} className="hidden" playsInline onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
          <canvas ref={canvasRef} onClick={handleCanvasClick} className={`w-full h-auto bg-black ${isCalibrating ? 'cursor-crosshair' : ''}`} />
        </div>

        {mode === 'video' && uploadedVideo && duration > 0 && (
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

      <div className="flex flex-wrap justify-center gap-3 mb-6">
        <button 
          onClick={() => {
            setShowBarPath(!showBarPath);
            if (videoRef.current && poseRef.current && videoRef.current.paused) { poseRef.current.send({ image: videoRef.current }); }
          }} 
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg border cursor-pointer ${showBarPath ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/40' : 'bg-[#111827] text-gray-400 border-white/10'}`}
        >
          {showBarPath ? '🙈 إخفاء مسار البار' : '👁️ إظهار مسار البار'}
        </button>

        <button 
          onClick={handleToggleTracking} 
          className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer ${isTracking ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
        >
          {isTracking ? '⏹ إنهاء الرفعة' : '⏺ بدء تتبع الرفعة (Live Bar)'}
        </button>

        <button 
          onClick={handleAnalyzeVBT} 
          className="px-8 py-2.5 bg-gradient-to-r from-[#00F0FF] to-cyan-500 hover:from-[#38bdf8] hover:to-cyan-400 text-[#07090E] rounded-xl font-black text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer transition-transform hover:scale-105"
        >
          📊 تحليل سرعة البار (MCV)
        </button>

        {repsHistory.length > 0 && (
          <button 
            onClick={handleResetSet}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold border border-white/10 cursor-pointer"
          >
            تصفير الجلسة (New Set)
          </button>
        )}
      </div>

      {vbtResults && (
        <div className="space-y-6 border-t border-white/10 pt-6 max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl border shadow-lg text-center" style={{ backgroundColor: `${vbtResults.zoneInfo.color}15`, borderColor: `${vbtResults.zoneInfo.color}50` }}>
            <span className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: vbtResults.zoneInfo.color }}>
              منطقة التأقلم العصبي العضلي (Target Adaptation)
            </span>
            <h4 className="text-2xl font-black text-white mb-2">{vbtResults.zoneInfo.labelAr}</h4>
            <p className="text-xs text-gray-300 max-w-lg mx-auto leading-relaxed">{vbtResults.zoneInfo.targetAdaptationAr}</p>
            
            {vbtResults.velocityLossPercent > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border" style={{
                backgroundColor: vbtResults.velocityLossPercent >= velocityLossThreshold ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                borderColor: vbtResults.velocityLossPercent >= velocityLossThreshold ? '#ef4444' : '#10b981'
              }}>
                {vbtResults.velocityLossPercent >= velocityLossThreshold ? <ShieldAlert className="text-rose-400" size={16} /> : <Zap className="text-emerald-400" size={16} />}
                <span className="text-xs font-mono font-bold text-white">
                  فقدان السرعة: {vbtResults.velocityLossPercent}% {vbtResults.velocityLossPercent >= velocityLossThreshold ? '🛑 (تجاوز حد الإجهاد - أوقف المجموعة!)' : '✅ (ضمن النطاق المستهدف)'}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="glass-card p-4 border-b-2 border-[#00F0FF]">
              <span className="block text-[11px] text-gray-400 mb-1">متوسط السرعة المتراكزة (MCV)</span>
              <span className="text-3xl font-black text-white font-mono metric-num">{vbtResults.meanVelocity} <span className="text-xs text-gray-400 font-sans">m/s</span></span>
            </div>
            <div className="glass-card p-4 border-b-2 border-cyan-400">
              <span className="block text-[11px] text-gray-400 mb-1">السرعة القصوى (Peak V)</span>
              <span className="text-3xl font-black text-[#00F0FF] font-mono metric-num">{vbtResults.peakVelocity} <span className="text-xs text-cyan-400/60 font-sans">m/s</span></span>
            </div>
            <div className="glass-card p-4 border-b-2 border-emerald-400">
              <span className="block text-[11px] text-gray-400 mb-1">زمن الصعود (Concentric Time)</span>
              <span className="text-3xl font-black text-emerald-400 font-mono metric-num">{vbtResults.timeTaken} <span className="text-xs text-gray-400 font-sans">s</span></span>
            </div>
          </div>

          {/* Reps Set History Table */}
          {repsHistory.length > 0 && (
            <div className="glass-panel p-4 border border-white/10 text-right">
              <h5 className="text-xs font-black text-white mb-3 flex items-center justify-between">
                <span>سجل تكرارات المجموعة (Set Rep Velocity Log)</span>
                <span className="text-[#00F0FF] font-mono font-bold">{repsHistory.length} تكرارات</span>
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400">
                      <th className="p-2 text-center">العدة</th>
                      <th className="p-2 text-center">MCV (m/s)</th>
                      <th className="p-2 text-center">Peak (m/s)</th>
                      <th className="p-2 text-center">منطقة القوة</th>
                      <th className="p-2 text-center">هبوط السرعة %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repsHistory.map((rep) => (
                      <tr key={rep.repNumber} className="border-b border-white/5 hover:bg-white/5 font-mono">
                        <td className="p-2 text-center text-gray-300 font-bold">#{rep.repNumber}</td>
                        <td className="p-2 text-center text-[#00F0FF] font-black">{rep.meanVelocity}</td>
                        <td className="p-2 text-center text-cyan-300">{rep.peakVelocity}</td>
                        <td className="p-2 text-center font-sans text-[11px] font-bold" style={{ color: rep.zone.color }}>{rep.zone.labelAr}</td>
                        <td className={`p-2 text-center font-bold ${rep.isFatigueThresholdExceeded ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {rep.velocityLossPercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
