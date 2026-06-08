import React, { useEffect, useRef, useState } from 'react';

export default function SprintAnalyzer() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [isAiReady, setIsAiReady] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [cameraFps, setCameraFps] = useState(240); 
  const [videoFps, setVideoFps] = useState(30);    
  
  const [isTracking, setIsTracking] = useState(false);
  const [sprintResults, setSprintResults] = useState(null);
  const [showTrail, setShowTrail] = useState(true);

  // إعدادات المعايرة (مثلاً 10 متر بين قمعين)
  const [referenceLength, setReferenceLength] = useState(10.0); 
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0); 

  const isTrackingRef = useRef(false);
  const showTrailRef = useRef(true); 
  const hipHistoryRef = useRef([]); // تتبع الحوض بدل المعصم
  const calibrationClicksRef = useRef([]);
  const pixelsPerMeterRef = useRef(null);
  const poseRef = useRef(null);

  useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]);
  useEffect(() => { showTrailRef.current = showTrail; }, [showTrail]);

  // تحميل سيرفرات الذكاء الاصطناعي
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
        canvasRef.current.width = results.image.width; canvasRef.current.height = results.image.height;
      }

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1 });

        if (isTrackingRef.current && videoRef.current) {
          // نقطة 23 الحوض الأيسر، و 24 الحوض الأيمن
          const leftHip = results.poseLandmarks[23];
          const rightHip = results.poseLandmarks[24];
          
          if (leftHip && rightHip) {
            // تتبع متوسط نقطة الحوض (مركز الثقل)
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

      // رسم مسار الجري (Motion Trail أفقي)
      if (showTrailRef.current && hipHistoryRef.current.length > 1) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(hipHistoryRef.current[0].x, hipHistoryRef.current[0].y);
        for (let i = 1; i < hipHistoryRef.current.length; i++) {
          canvasCtx.lineTo(hipHistoryRef.current[i].x, hipHistoryRef.current[i].y);
        }
        canvasCtx.strokeStyle = '#06b6d4'; // لون سماوي (Cyan) للسرعة
        canvasCtx.lineWidth = 4;
        canvasCtx.lineJoin = 'round';
        canvasCtx.stroke();
      }

      // رسم نقط المعايرة
      const clicks = calibrationClicksRef.current;
      if (clicks.length > 0) {
        canvasCtx.fillStyle = '#fbbf24'; canvasCtx.strokeStyle = '#ffffff'; canvasCtx.lineWidth = 3;
        clicks.forEach(click => {
          canvasCtx.beginPath(); canvasCtx.arc(click.x, click.y, 10, 0, 2 * Math.PI); canvasCtx.fill(); canvasCtx.stroke();
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

  // وظائف الفيديو
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) { setUploadedVideo(URL.createObjectURL(file)); setSprintResults(null); hipHistoryRef.current = []; pixelsPerMeterRef.current = null; setDuration(0); setCurrentTime(0); }
  };
  const togglePlayVideo = () => { if (videoRef.current) { if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); } else { videoRef.current.pause(); setIsPlaying(false); } } };
  const handleTimeUpdate = () => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (videoRef.current) setDuration(videoRef.current.duration); };
  const handleSeek = async (e) => { const time = Number(e.target.value); if (videoRef.current) { videoRef.current.currentTime = time; setCurrentTime(time); if (videoRef.current.paused && poseRef.current) await poseRef.current.send({ image: videoRef.current }); } };
  const stepFrames = async (frames) => { if (videoRef.current && duration > 0) { videoRef.current.pause(); setIsPlaying(false); const timeStep = frames / (videoFps || 30); let newTime = videoRef.current.currentTime + timeStep; newTime = Math.max(0, Math.min(newTime, duration)); videoRef.current.currentTime = newTime; setCurrentTime(newTime); if (poseRef.current) await poseRef.current.send({ image: videoRef.current }); } };

  // المعايرة على الشاشة (مسافة أفقية)
  const handleCanvasClick = (e) => {
    if (!isCalibrating) return;
    const rect = canvasRef.current.getBoundingClientRect(); const scaleX = canvasRef.current.width / rect.width; const scaleY = canvasRef.current.height / rect.height; const x = (e.clientX - rect.left) * scaleX; const y = (e.clientY - rect.top) * scaleY;
    const newClicks = [...calibrationClicksRef.current, { x, y }]; calibrationClicksRef.current = newClicks; setCalibrationStep(newClicks.length + 1); 
    if (videoRef.current && poseRef.current) poseRef.current.send({ image: videoRef.current });
    if (newClicks.length === 2) {
      // حساب المسافة بين القمعين بالبيكسل
      const distInPixels = Math.hypot(newClicks[0].x - newClicks[1].x, newClicks[0].y - newClicks[1].y); 
      const refLen = parseFloat(referenceLength) || 10.0; 
      const ppm = distInPixels / refLen; 
      pixelsPerMeterRef.current = ppm; setIsCalibrating(false); setCalibrationStep(0);
      alert(`✅ تمت المعايرة بنجاح لمسافة ${refLen} متر أفقياً!`);
      setTimeout(() => { calibrationClicksRef.current = []; if (videoRef.current && poseRef.current) poseRef.current.send({ image: videoRef.current }); }, 3000);
    }
  };

  const handleToggleTracking = () => { if (!isTracking) { hipHistoryRef.current = []; setSprintResults(null); setIsTracking(true); } else { setIsTracking(false); } };

  // خوارزمية تحليل السرعة (Sprint Physics)
  const handleAnalyzeSprint = () => {
    setIsTracking(false);
    const history = hipHistoryRef.current;
    if (history.length < 5) return alert("لم يتم التقاط بيانات كافية! قم بتسجيل حركة اللاعب أثناء الجري.");

    const ppm = pixelsPerMeterRef.current; 
    if (!ppm || ppm <= 0) return alert("يرجى عمل 'معايرة الكاميرا' أولاً لحديد المسافة (مثلاً 5 متر أو 10 متر) بين نقطتين.");

    const camFps = parseFloat(cameraFps) || 30;
    const vidFps = parseFloat(videoFps) || 30;
    const timeScaleRatio = vidFps / camFps; 

    let velocities = [];
    let totalDistanceCovered = 0;

    for (let i = 0; i < history.length - 1; i++) {
      // نحسب المسافة الأفقية (X) بين كل فريم والتاني
      const dxPixels = Math.abs(history[i+1].x - history[i].x);
      const actualDistanceMeters = dxPixels / ppm;
      
      const dt_video = history[i+1].time - history[i].time;
      const dt_real = dt_video * timeScaleRatio; 

      if (dt_real > 0) {
        const v = actualDistanceMeters / dt_real;
        
        // فلترة الأخطاء (أسرع إنسان يوسين بولت سرعته 12.4 م/ث، أي رقم فوق 14 هو Glitch)
        if (v < 14.0 && v > 0.5) { 
          velocities.push(v);
          totalDistanceCovered += actualDistanceMeters;
        }
      }
    }

    if (velocities.length === 0) return alert("اللاعب لم يتحرك أو خطأ في التتبع.");

    // تنعيم السرعات (Smoothing) عشان نلغي ذبذبة الحوض أثناء الجري
    let smoothVelocities = [];
    for (let i = 0; i < velocities.length; i++) {
      let windowVals = velocities.slice(Math.max(0, i-2), i+3);
      let avg = windowVals.reduce((a,b)=>a+b,0) / windowVals.length;
      smoothVelocities.push(avg);
    }

    const peakVelocity = Math.max(...smoothVelocities);
    // السرعة المتوسطة
    const meanVelocity = smoothVelocities.reduce((a, b) => a + b, 0) / smoothVelocities.length;
    // الزمن الكلي للجري في المقطع
    const totalTime = (history[history.length - 1].time - history[0].time) * timeScaleRatio;

    // حساب التسارع التقريبي (a = v / t)
    const acceleration = peakVelocity / (totalTime / 2); // بافتراض وصوله لأقصى سرعة في منتصف المقطع

    let coachAdvice = "";
    let zoneColor = "";
    if (peakVelocity >= 9.0) { coachAdvice = "سرعة احترافية خرافية (نخبة)! الميكانيكا ممتازة."; zoneColor = "text-emerald-400 border-emerald-500 bg-emerald-900/20"; }
    else if (peakVelocity >= 7.5) { coachAdvice = "سرعة ممتازة جداً (رياضي محترف)."; zoneColor = "text-blue-400 border-blue-500 bg-blue-900/20"; }
    else if (peakVelocity >= 6.0) { coachAdvice = "سرعة جيدة، لكن يحتاج للتدريب على الانفجارية (Acceleration)."; zoneColor = "text-yellow-400 border-yellow-500 bg-yellow-900/20"; }
    else { coachAdvice = "سرعة مبتدئ، يجب مراجعة زوايا الجري ومعدل الخطوات (Stride Rate)."; zoneColor = "text-red-400 border-red-500 bg-red-900/20"; }

    setSprintResults({
      peakVelocity: peakVelocity.toFixed(2),
      meanVelocity: meanVelocity.toFixed(2),
      totalDistance: totalDistanceCovered.toFixed(2),
      acceleration: acceleration.toFixed(2),
      timeTaken: totalTime.toFixed(2),
      insight: { desc: coachAdvice, color: zoneColor }
    });
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl text-center animate-fade-in">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
        تحليل سرعة الجري (Sprint Analysis) 🏃‍♂️💨
      </h3>

      <div className="mb-6 p-4 bg-blue-900/10 border border-blue-800/50 rounded-xl text-sm text-blue-300">
        💡 <b>ملاحظة التصوير:</b> يجب تصوير اللاعب من <b>الجانب (Profile View)</b>، والكاميرا <b>ثابتة تماماً</b> على الأرض (لا تتحرك مع اللاعب). ضع قمعين على الأرض بمسافة معلومة للمعايرة.
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-6 bg-[#0f1423] p-4 rounded-2xl border border-gray-800">
        <div className="relative">
          <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <button className="px-8 py-3 rounded-xl font-bold transition-all bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg">رفع فيديو الجري</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 bg-[#0f1423] p-4 rounded-2xl border border-gray-800 mx-auto relative">
        <div><label className="block text-xs text-gray-400 mb-1">FPS الكاميرا (للتصوير البطيء)</label><input type="number" value={cameraFps} onChange={e => setCameraFps(e.target.value)} className="w-full bg-[#1f2937] border border-gray-700 p-2 text-white rounded-xl text-center outline-none" /></div>
        <div><label className="block text-xs text-gray-400 mb-1">FPS التشغيل للملف</label><input type="number" value={videoFps} onChange={e => setVideoFps(e.target.value)} className="w-full bg-[#1f2937] border border-gray-700 p-2 text-white rounded-xl text-center outline-none" /></div>
      </div>

      <div className="mb-6 bg-[#0f1423] p-4 rounded-2xl border border-gray-800 inline-block w-full max-w-md">
         <label className="block text-xs text-gray-400 mb-2">المسافة بين القمعين للمعايرة (بالمتر) - مثال: 5 أو 10</label>
         <input type="number" step="0.5" value={referenceLength} onChange={e => setReferenceLength(e.target.value)} className="w-full bg-[#1f2937] border border-cyan-700/50 p-2 text-cyan-400 font-bold rounded-xl text-center outline-none focus:border-cyan-400 mb-3" />
         {!isCalibrating ? (
           <button onClick={() => { setIsCalibrating(true); setCalibrationStep(1); calibrationClicksRef.current = []; pixelsPerMeterRef.current = null; if(videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } }} className="w-full px-6 py-2 bg-[#1f2937] border border-cyan-500/50 text-cyan-400 hover:bg-gray-700 rounded-xl font-bold text-sm transition-all">
              📏 بدء معايرة الكاميرا (تحديد القمعين)
           </button>
         ) : (
           <div className="w-full bg-cyan-900/30 border border-cyan-500 p-3 rounded-xl animate-pulse">
             {calibrationStep === 1 && <p className="text-cyan-400 font-bold">1️⃣ اضغط على <span className="text-white">القمع الأول</span> (البداية)</p>}
             {calibrationStep === 2 && <p className="text-cyan-400 font-bold">2️⃣ اضغط على <span className="text-white">القمع الثاني</span> (النهاية)</p>}
           </div>
         )}
      </div>

      {!scriptsLoaded && <p className="text-gray-400 mb-4 font-bold">جاري تجهيز رادار الذكاء الاصطناعي...</p>}
      
      <div className="relative flex flex-col items-center w-full max-w-lg mx-auto mb-6">
        <div className="relative inline-block border-4 border-gray-700 rounded-xl overflow-hidden shadow-lg w-full mb-4">
          <video ref={videoRef} className="hidden" playsInline webkitPlaysInline={true} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)}></video>
          <canvas ref={canvasRef} onClick={handleCanvasClick} className={`w-full h-auto bg-black ${isCalibrating ? 'cursor-crosshair' : ''}`}></canvas>
        </div>

        {uploadedVideo && duration > 0 && (
          <div className="w-full bg-[#0f1423] p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">{currentTime.toFixed(2)}s</span>
              <input type="range" min="0" max={duration} step="0.001" value={currentTime} onChange={handleSeek} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
              <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">{duration.toFixed(2)}s</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => stepFrames(-1)} className="px-4 py-2 bg-[#1f2937] hover:bg-gray-700 rounded-xl text-white text-sm font-bold">-1 Frame</button>
              <button onClick={togglePlayVideo} className="px-8 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-white font-bold mx-2 shadow-lg">{isPlaying ? '⏸ إيقاف' : '▶ تشغيل'}</button>
              <button onClick={() => stepFrames(1)} className="px-4 py-2 bg-[#1f2937] hover:bg-gray-700 rounded-xl text-white text-sm font-bold">+1 Frame</button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button onClick={() => { setShowTrail(!showTrail); if (videoRef.current && poseRef.current && videoRef.current.paused) { poseRef.current.send({ image: videoRef.current }); } }} className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg border ${showTrail ? 'bg-cyan-900/40 text-cyan-400 border-cyan-700' : 'bg-[#1f2937] text-gray-400 border-gray-600'}`}>
          {showTrail ? '🙈 إخفاء مسار الحوض' : '👁️ إظهار مسار الحوض'}
        </button>

        <button onClick={handleToggleTracking} className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${isTracking ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
          {isTracking ? '⏹ إيقاف التسجيل' : '⏺ بدء تسجيل السبرينت'}
        </button>

        <button onClick={handleAnalyzeSprint} className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105">
          📊 تحليل سرعة الجري
        </button>
      </div>

      {sprintResults && (
        <div className="space-y-6 animate-fade-in-down border-t border-gray-800 pt-6">
          <div className={`p-6 rounded-2xl border ${sprintResults.insight.color} shadow-lg text-center`}>
             <p className="text-sm font-bold opacity-80 mb-2">تقييم المدرب (Coach Insight)</p>
             <h4 className="text-2xl font-black mb-1">{sprintResults.insight.desc}</h4>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-cyan-500">
              <span className="block text-xs text-gray-400 mb-2">السرعة القصوى (Max V)</span>
              <span className="text-3xl font-black text-white">{sprintResults.peakVelocity} <span className="text-sm text-gray-500">m/s</span></span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-blue-500">
              <span className="block text-xs text-gray-400 mb-2">السرعة المتوسطة</span>
              <span className="text-3xl font-black text-white">{sprintResults.meanVelocity} <span className="text-sm text-gray-500">m/s</span></span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-emerald-500">
              <span className="block text-xs text-gray-400 mb-2">التسارع التقريبي (m/s²)</span>
              <span className="text-3xl font-black text-white">{sprintResults.acceleration}</span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-purple-500">
              <span className="block text-xs text-gray-400 mb-2">المسافة المقطوعة (m)</span>
              <span className="text-3xl font-black text-white">{sprintResults.totalDistance}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}