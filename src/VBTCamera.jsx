import React, { useEffect, useRef, useState } from 'react';

export default function VBTCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [isAiReady, setIsAiReady] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  
  const [mode, setMode] = useState('video'); 
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [cameraFps, setCameraFps] = useState(240); 
  const [videoFps, setVideoFps] = useState(30);    
  const [liftDistance, setLiftDistance] = useState(0.60); 
  const [exerciseType, setExerciseType] = useState('olympic');
  
  const [isTracking, setIsTracking] = useState(false);
  const [vbtResults, setVbtResults] = useState(null);

  const [showBarPath, setShowBarPath] = useState(true);

  const [referenceLength, setReferenceLength] = useState(0.45); 
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0); 

  const isTrackingRef = useRef(false);
  const showBarPathRef = useRef(true); 
  const wristHistoryRef = useRef([]);
  const calibrationClicksRef = useRef([]);
  const pixelsPerMeterRef = useRef(null);
  const poseRef = useRef(null);

  // === القفل على المفصل الأقرب للكاميرا ===
  const lockedWristRef = useRef(null); // 'left' or 'right'

  useEffect(() => {
    isTrackingRef.current = isTracking;
    // لما نبدأ تتبع جديد، نصفر القفل عشان يختار الإيد الصح من تاني
    if (isTracking) {
      lockedWristRef.current = null;
    }
  }, [isTracking]);

  useEffect(() => { showBarPathRef.current = showBarPath; }, [showBarPath]);

  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement('script'); script.src = src; script.crossOrigin = "anonymous"; script.onload = resolve;
        document.body.appendChild(script);
      });
    };

    const loadMediaPipe = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        const checkInterval = setInterval(() => {
          if (window.Pose && typeof window.Pose === 'function') {
            clearInterval(checkInterval); setScriptsLoaded(true);
          }
        }, 100);
      } catch (error) { console.error(error); }
    };
    loadMediaPipe();
  }, []);

  const reqRef = useRef(null);

  useEffect(() => {
    if (!scriptsLoaded) return;
    const { Pose, POSE_CONNECTIONS, drawConnectors, drawLandmarks } = window;
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });

    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

    pose.onResults((results) => {
      if (!isAiReady) setIsAiReady(true);
      const canvasCtx = canvasRef.current.getContext('2d');
      
      if (results.image.width && canvasRef.current.width !== results.image.width) {
        canvasRef.current.width = results.image.width;
        canvasRef.current.height = results.image.height;
      }

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.poseLandmarks) {
        // رسم الهيكل
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1 });

        if (isTrackingRef.current && videoRef.current) {
          const leftWrist = results.poseLandmarks[15];
          const rightWrist = results.poseLandmarks[16];
          
          if (leftWrist && rightWrist) {
            // تحديد الإيد الأقرب (الأكثر وضوحاً) مرة واحدة فقط في بداية الرفعة!
            if (!lockedWristRef.current) {
              // بنختار اللي وضوحها أعلى، أو اللي أقرب للكاميرا بناءً على الـ Z
              lockedWristRef.current = (rightWrist.visibility > leftWrist.visibility) ? 'right' : 'left';
            }

            const targetWrist = lockedWristRef.current === 'right' ? rightWrist : leftWrist;
            
            let rawX = targetWrist.x * canvasRef.current.width;
            let rawY = targetWrist.y * canvasRef.current.height;

            // === تنعيم حركة المسار (EMA Smoothing) ===
            const alpha = 0.6; // معامل التنعيم (كل ما قل الخط بقى أنعم)
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

      // رسم مسار البار بعد التنعيم
      if (showBarPathRef.current && wristHistoryRef.current.length > 1) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(wristHistoryRef.current[0].x, wristHistoryRef.current[0].y);
        for (let i = 1; i < wristHistoryRef.current.length; i++) {
          canvasCtx.lineTo(wristHistoryRef.current[i].x, wristHistoryRef.current[i].y);
        }
        canvasCtx.strokeStyle = '#ec4899'; // بينك واضح
        canvasCtx.lineWidth = 4;
        canvasCtx.lineJoin = 'round';
        canvasCtx.stroke();
      }

      const clicks = calibrationClicksRef.current;
      if (clicks.length > 0) {
        canvasCtx.fillStyle = '#fbbf24'; canvasCtx.strokeStyle = '#ffffff'; canvasCtx.lineWidth = 3;
        clicks.forEach(click => {
          canvasCtx.beginPath(); canvasCtx.arc(click.x, click.y, 10, 0, 2 * Math.PI); 
          canvasCtx.fill(); canvasCtx.stroke();
        });
        if (clicks.length === 2) {
          canvasCtx.beginPath(); canvasCtx.moveTo(clicks[0].x, clicks[0].y); canvasCtx.lineTo(clicks[1].x, clicks[1].y);
          canvasCtx.strokeStyle = '#fbbf24'; canvasCtx.lineWidth = 4; canvasCtx.stroke();
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

    return () => { cancelAnimationFrame(reqRef.current); pose.close(); };
  }, [scriptsLoaded]); 

  useEffect(() => {
    if (!scriptsLoaded) return;
    const video = videoRef.current; let stream = null;
    const startCamera = async (facingMode) => {
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } }); video.srcObject = stream; video.muted = true; video.play(); setIsPlaying(true); } catch (err) { console.error(err); }
    };
    if (mode === 'front') startCamera('user');
    else if (mode === 'back') startCamera('environment');
    else if (mode === 'video' && uploadedVideo) { video.srcObject = null; video.src = uploadedVideo; video.muted = true; setIsPlaying(false); }
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [mode, uploadedVideo, scriptsLoaded]);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { setUploadedVideo(URL.createObjectURL(file)); setMode('video'); setVbtResults(null); wristHistoryRef.current = []; pixelsPerMeterRef.current = null; setDuration(0); setCurrentTime(0); lockedWristRef.current = null; }
  };

  const togglePlayVideo = () => { if (videoRef.current) { if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); } else { videoRef.current.pause(); setIsPlaying(false); } } };
  const handleTimeUpdate = () => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (videoRef.current) setDuration(videoRef.current.duration); };
  const handleSeek = async (e) => { const time = Number(e.target.value); if (videoRef.current) { videoRef.current.currentTime = time; setCurrentTime(time); if (videoRef.current.paused && poseRef.current) await poseRef.current.send({ image: videoRef.current }); } };
  const stepFrames = async (frames) => { if (videoRef.current && duration > 0) { videoRef.current.pause(); setIsPlaying(false); const timeStep = frames / (videoFps || 30); let newTime = videoRef.current.currentTime + timeStep; newTime = Math.max(0, Math.min(newTime, duration)); videoRef.current.currentTime = newTime; setCurrentTime(newTime); if (poseRef.current) await poseRef.current.send({ image: videoRef.current }); } };

  const handleCanvasClick = (e) => {
    if (!isCalibrating) return;
    const rect = canvasRef.current.getBoundingClientRect(); const scaleX = canvasRef.current.width / rect.width; const scaleY = canvasRef.current.height / rect.height; const x = (e.clientX - rect.left) * scaleX; const y = (e.clientY - rect.top) * scaleY;
    const newClicks = [...calibrationClicksRef.current, { x, y }]; calibrationClicksRef.current = newClicks; setCalibrationStep(newClicks.length + 1); 
    if (videoRef.current && poseRef.current) poseRef.current.send({ image: videoRef.current });
    if (newClicks.length === 2) {
      const distInPixels = Math.hypot(newClicks[0].x - newClicks[1].x, newClicks[0].y - newClicks[1].y); const refLen = parseFloat(referenceLength) || 0.45; const ppm = distInPixels / refLen; 
      pixelsPerMeterRef.current = ppm; setIsCalibrating(false); setCalibrationStep(0);
      alert(`✅ تمت المعايرة بنجاح بناءً على جسم مرجعي بطول ${refLen} متر!`);
      setTimeout(() => { calibrationClicksRef.current = []; if (videoRef.current && poseRef.current) poseRef.current.send({ image: videoRef.current }); }, 3000);
    }
  };

  const handleToggleTracking = () => { if (!isTracking) { wristHistoryRef.current = []; setVbtResults(null); setIsTracking(true); lockedWristRef.current = null; } else { setIsTracking(false); } };

  // === Benchmarks دقيقة مبنية على أبحاث Bryan Mann ===
  const getCoachInsight = (meanV, type) => {
    const v = parseFloat(meanV);
    if (type === 'olympic') {
      if (v >= 1.70) return { zone: 'السرعة المطلقة (Starting Speed)', desc: 'وزن خفيف جداً للتسخين أو السرعة المطلقة.', color: 'text-cyan-400 border-cyan-500 bg-cyan-900/20' };
      if (v >= 1.45) return { zone: 'سرعة مميزة بالقوة (Speed-Strength)', desc: 'وزن خفيف-متوسط (60-75%). تدريب القوة الانفجارية.', color: 'text-blue-400 border-blue-500 bg-blue-900/20' };
      if (v >= 1.25) return { zone: 'قوة مميزة بالسرعة (Strength-Speed)', desc: 'وزن متوسط-ثقيل (75-85%). المنطقة المثالية للكلين القوي.', color: 'text-emerald-400 border-emerald-500 bg-emerald-900/20' };
      if (v >= 1.10) return { zone: 'القوة القصوى (Heavy / Max Effort)', desc: 'وزن أقصى (90-100%). الرفعة على الحافة، أي سرعة أقل تعني الفشل.', color: 'text-yellow-400 border-yellow-500 bg-yellow-900/20' };
      return { zone: 'فشل الرفعة (Missed Lift Zone)', desc: 'البار لم يصل للارتفاع المطلوب لإتمام حركة الـ Catch.', color: 'text-red-400 border-red-500 bg-red-900/20' };
    } else {
      // Squat, Bench, Deadlift
      if (v >= 1.00) return { zone: 'السرعة المطلقة (Starting Speed)', desc: 'وزن خفيف جداً (<40%). تركيز على السرعة البحتة.', color: 'text-cyan-400 border-cyan-500 bg-cyan-900/20' };
      if (v >= 0.75) return { zone: 'سرعة مميزة بالقوة (Speed-Strength)', desc: 'وزن خفيف (40-60%). قوة انفجارية.', color: 'text-blue-400 border-blue-500 bg-blue-900/20' };
      if (v >= 0.50) return { zone: 'قوة مميزة بالسرعة (Strength-Speed)', desc: 'وزن متوسط (60-80%). تحسين إنتاج القدرة Power.', color: 'text-emerald-400 border-emerald-500 bg-emerald-900/20' };
      if (v >= 0.30) return { zone: 'القوة القصوى (Maximal Strength)', desc: 'وزن ثقيل (80-95%). بناء قوة عضلية صريحة.', color: 'text-yellow-400 border-yellow-500 bg-yellow-900/20' };
      return { zone: 'أقصى جهد (1RM Grind)', desc: 'أقصى وزن (100%). رفعة بطيئة وقاسية.', color: 'text-red-400 border-red-500 bg-red-900/20' };
    }
  };

  const handleAnalyzeVBT = () => {
    setIsTracking(false);
    const history = wristHistoryRef.current;
    if (history.length < 5) return alert("لم يتم التقاط بيانات كافية! قم بتشغيل التسجيل أثناء حركة البار.");

    let lowestPointIndex = 0; let maxY = history[0].y;
    for (let i = 1; i < history.length; i++) { if (history[i].y > maxY) { maxY = history[i].y; lowestPointIndex = i; } }

    let highestPointIndex = lowestPointIndex; let minY = history[lowestPointIndex].y;
    for (let i = lowestPointIndex + 1; i < history.length; i++) { if (history[i].y < minY) { minY = history[i].y; highestPointIndex = i; } }

    if (lowestPointIndex === highestPointIndex) return alert("لم يتم اكتشاف حركة رفع واضحة.");

    const concentricPhase = history.slice(lowestPointIndex, highestPointIndex + 1);
    
    const distanceInPixels = maxY - minY; 
    let finalLiftDistance = parseFloat(liftDistance);
    const ppm = pixelsPerMeterRef.current; 

    if (ppm && ppm > 0) {
      finalLiftDistance = distanceInPixels / ppm;
      setLiftDistance(finalLiftDistance.toFixed(3)); 
    }

    const ratio = finalLiftDistance / distanceInPixels;
    const camFps = parseFloat(cameraFps) || 30;
    const vidFps = parseFloat(videoFps) || 30;
    const timeScaleRatio = vidFps / camFps; 

    // === فلترة السرعات الوهمية للـ Peak Velocity ===
    let velocities = [];
    for (let i = 0; i < concentricPhase.length - 1; i++) {
      const dy = concentricPhase[i].y - concentricPhase[i+1].y;
      const dx = concentricPhase[i].x - concentricPhase[i+1].x;
      const actualDistance = Math.hypot(dx, dy) * ratio;

      const dt_video = concentricPhase[i+1].time - concentricPhase[i].time;
      const dt_real = dt_video * timeScaleRatio; 

      if (dt_real > 0 && dy > 0) {
        const v = actualDistance / dt_real;
        // تجاهل أي سرعة فوق 4 متر في الثانية لأنها مستحيلة في رفع الأثقال (Glitch)
        if (v < 4.0) { velocities.push(v); }
      }
    }

    if (velocities.length === 0) return alert("خطأ في التتبع.");

    // نعومة أكبر في حساب الـ Peak عشان الأرقام الخرافية متطلعش
    let smoothVelocities = [];
    for (let i = 0; i < velocities.length; i++) {
      let windowVals = velocities.slice(Math.max(0, i-1), i+2);
      let avg = windowVals.reduce((a,b)=>a+b,0) / windowVals.length;
      smoothVelocities.push(avg);
    }

    const peakVelocity = Math.max(...smoothVelocities);
    const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const timeTaken = (concentricPhase[concentricPhase.length - 1].time - concentricPhase[0].time) * timeScaleRatio;

    const insight = getCoachInsight(meanVelocity, exerciseType);

    setVbtResults({
      peakVelocity: peakVelocity.toFixed(2),
      meanVelocity: meanVelocity.toFixed(2),
      timeTaken: timeTaken.toFixed(2),
      insight
    });
  };

  return (
    <div className="glass-panel p-6 shadow-2xl text-center transition-all duration-300">
      <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-500 mb-4">
        نظام التدريب المبني على السرعة (VBT AI)
      </h3>

      <div className="flex flex-wrap justify-center gap-3 mb-6 bg-black/20 p-4 rounded-2xl border border-[var(--border-light)]">
        <button onClick={() => setMode('front')} className={`px-5 py-2.5 rounded-xl font-bold transition-all ${mode === 'front' ? 'bg-cyan-600 text-white shadow-md' : 'bg-[var(--bg-input)] text-gray-400 border border-[var(--border-light)]'}`}>كاميرا أمامية 📸</button>
        <button onClick={() => setMode('back')} className={`px-5 py-2.5 rounded-xl font-bold transition-all ${mode === 'back' ? 'bg-cyan-600 text-white shadow-md' : 'bg-[var(--bg-input)] text-gray-400 border border-[var(--border-light)]'}`}>كاميرا خلفية 🎥</button>
        <div className="relative">
          <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <button className={`px-5 py-2.5 rounded-xl font-bold transition-all ${mode === 'video' ? 'bg-cyan-600 text-white shadow-md' : 'bg-[var(--bg-input)] text-gray-400 border border-[var(--border-light)]'}`}>رفع فيديو 📁</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-black/20 p-4 rounded-2xl border border-[var(--border-light)] mx-auto relative">
        <div>
          <label className="block text-xs text-gray-400 mb-1">نوع التمرين (Zone)</label>
          <select value={exerciseType} onChange={e => setExerciseType(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-white rounded-xl text-center outline-none focus:border-[var(--brand-main)] cursor-pointer">
            <option value="olympic">كلين / خطف (Olympic)</option>
            <option value="strength">سكوات / بنش (Power)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">مسافة الرفعة الحالية</label>
          <input type="number" step="0.01" value={liftDistance} readOnly className="w-full bg-black/40 border border-[var(--border-light)] p-2.5 text-cyan-400 font-bold rounded-xl text-center outline-none font-mono" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">FPS الكاميرا</label>
          <input type="number" value={cameraFps} onChange={e => setCameraFps(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-white rounded-xl text-center outline-none font-mono focus:border-[var(--brand-main)]" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">FPS التشغيل</label>
          <input type="number" value={videoFps} onChange={e => setVideoFps(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-white rounded-xl text-center outline-none font-mono focus:border-[var(--brand-main)]" />
        </div>
      </div>

      <div className="mb-6 bg-black/20 p-4 rounded-2xl border border-[var(--border-light)] inline-block w-full max-w-md">
         <label className="block text-xs text-gray-400 mb-2">طول الجسم المرجعي (طارة البار - متر)</label>
         <input type="number" step="0.01" value={referenceLength} onChange={e => setReferenceLength(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-[var(--brand-text)] font-bold rounded-xl text-center outline-none focus:border-[var(--brand-main)] font-mono mb-3" />
         {!isCalibrating ? (
           <button onClick={() => { setIsCalibrating(true); setCalibrationStep(1); calibrationClicksRef.current = []; pixelsPerMeterRef.current = null; if(videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } }} className="w-full px-6 py-2 bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--brand-text)] hover:bg-[var(--border-color)] rounded-xl font-bold text-sm transition-all">
              📏 بدء معايرة الكاميرا على الشاشة
           </button>
         ) : (
           <div className="w-full bg-cyan-950/20 border border-cyan-500 p-3 rounded-xl animate-pulse">
             {calibrationStep === 1 && <p className="text-cyan-400 font-bold">1️⃣ اضغط على <span className="text-white">أول نقطة</span> بالجسم المرجعي</p>}
             {calibrationStep === 2 && <p className="text-cyan-400 font-bold">2️⃣ اضغط على <span className="text-white">ثاني نقطة</span> بالجسم المرجعي</p>}
           </div>
         )}
      </div>

      {!scriptsLoaded && <p className="text-cyan-400 mb-4 font-bold animate-pulse">جاري تجهيز رادار الذكاء الاصطناعي...</p>}
      
      <div className="relative flex flex-col items-center w-full max-w-md mx-auto mb-6">
        <div className="relative inline-block border-4 border-[var(--border-light)] rounded-2xl overflow-hidden shadow-2xl w-full mb-4 bg-black">
          <video ref={videoRef} className="hidden" playsInline webkitPlaysInline={true} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)}></video>
          <canvas ref={canvasRef} onClick={handleCanvasClick} className={`w-full h-auto bg-black ${isCalibrating ? 'cursor-crosshair' : ''}`}></canvas>
        </div>

        {mode === 'video' && uploadedVideo && duration > 0 && (
          <div className="w-full bg-black/20 p-4 rounded-2xl border border-[var(--border-light)]">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs text-gray-400 font-mono bg-[var(--bg-input)] px-2 py-1 rounded">{currentTime.toFixed(2)}s</span>
              <input type="range" min="0" max={duration} step="0.001" value={currentTime} onChange={handleSeek} className="w-full h-2.5 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-main)]" />
              <span className="text-xs text-gray-400 font-mono bg-[var(--bg-input)] px-2 py-1 rounded">{duration.toFixed(2)}s</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => stepFrames(-1)} className="px-4 py-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white text-xs font-bold transition-all">-1 Frame</button>
              <button onClick={togglePlayVideo} className="px-8 py-2 btn-orange-gradient rounded-xl font-bold mx-2 shadow-lg">{isPlaying ? '⏸ إيقاف' : '▶ تشغيل'}</button>
              <button onClick={() => stepFrames(1)} className="px-4 py-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white text-xs font-bold transition-all">+1 Frame</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button 
          onClick={() => {
            setShowBarPath(!showBarPath);
            if (videoRef.current && poseRef.current && videoRef.current.paused) { poseRef.current.send({ image: videoRef.current }); }
          }} 
          className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 border ${showBarPath ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border-light)]'}`}
        >
          {showBarPath ? '🙈 إخفاء مسار البار' : '👁️ إظهار مسار البار'}
        </button>

        <button onClick={handleToggleTracking} className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${isTracking ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
          {isTracking ? '⏹ إيقاف التسجيل' : '⏺ بدء تسجيل الرفعة'}
        </button>

        <button onClick={handleAnalyzeVBT} className="px-14 py-3 btn-orange-gradient rounded-xl font-bold shadow-lg transition-transform hover:scale-105">
          📊 تحليل سرعة الحركة
        </button>
      </div>

      {vbtResults && (
        <div className="space-y-6 animate-fade-in-down border-t border-[var(--border-light)] pt-6">
          <div className={`p-6 rounded-2xl border ${vbtResults.insight.color} shadow-lg text-center`}>
             <p className="text-sm font-bold opacity-80 mb-2">منطقة التدريب الحالية (Training Zone)</p>
             <h4 className="text-3xl font-black mb-3">{vbtResults.insight.zone}</h4>
             <p className="text-sm opacity-90 max-w-lg mx-auto leading-relaxed">
               💡 {vbtResults.insight.desc}
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-light)]">
              <span className="block text-xs text-gray-400 mb-2">متوسط السرعة (Mean)</span>
              <span className="text-4xl font-black text-[var(--text-primary)]">{vbtResults.meanVelocity} <span className="text-sm text-gray-500">m/s</span></span>
            </div>
            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-light)]">
              <span className="block text-xs text-gray-400 mb-2">أقصى سرعة (Peak)</span>
              <span className="text-4xl font-black text-cyan-500">{vbtResults.peakVelocity} <span className="text-sm text-cyan-500/50">m/s</span></span>
            </div>
            <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-light)]">
              <span className="block text-xs text-gray-400 mb-2">زمن الصعود الفعلي</span>
              <span className="text-4xl font-black text-[var(--text-primary)]">{vbtResults.timeTaken} <span className="text-sm text-gray-500">s</span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}