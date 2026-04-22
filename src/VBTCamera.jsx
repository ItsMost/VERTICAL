import React, { useEffect, useRef, useState } from 'react';

export default function VBTCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [isAiReady, setIsAiReady] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  
  const [mode, setMode] = useState('video'); 
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // إعدادات الـ VBT و الـ Slow Motion
  const [cameraFps, setCameraFps] = useState(240); // فريمات الكاميرا الأصلية
  const [videoFps, setVideoFps] = useState(30);    // فريمات تشغيل الملف
  const [liftDistance, setLiftDistance] = useState(0.60); 
  const [isTracking, setIsTracking] = useState(false);
  const [vbtResults, setVbtResults] = useState(null);

  // حالات المعايرة (Calibration)
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0); // 0: off, 1: click top, 2: click bottom

  // استخدام Refs لحل مشكلة (البيانات الثابتة - Stale State)
  const isTrackingRef = useRef(false);
  const wristHistoryRef = useRef([]);
  const calibrationClicksRef = useRef([]);
  const pixelsPerMeterRef = useRef(null);

  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  // 1. تحميل المكتبات
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement('script');
        script.src = src; script.crossOrigin = "anonymous"; script.onload = resolve;
        document.body.appendChild(script);
      });
    };

    const loadMediaPipe = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        const checkInterval = setInterval(() => {
          if (window.Pose && typeof window.Pose === 'function') {
            clearInterval(checkInterval);
            setScriptsLoaded(true);
          }
        }, 100);
      } catch (error) { console.error(error); }
    };
    loadMediaPipe();
  }, []);

  const poseRef = useRef(null);
  const reqRef = useRef(null);

  // 2. تشغيل الذكاء الاصطناعي والرسم على الشاشة
  useEffect(() => {
    if (!scriptsLoaded) return;
    const { Pose, POSE_CONNECTIONS, drawConnectors, drawLandmarks } = window;
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });

    pose.setOptions({
      modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
    });

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

      // رسم الهيكل العظمي
      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

        if (isTrackingRef.current && videoRef.current) {
          const leftWrist = results.poseLandmarks[15];
          const rightWrist = results.poseLandmarks[16];
          if (leftWrist && rightWrist) {
            const avgY = (leftWrist.y + rightWrist.y) / 2;
            const actualPixelY = avgY * canvasRef.current.height; 
            wristHistoryRef.current.push({ time: videoRef.current.currentTime, y: actualPixelY });
          }
        }
      }

      // رسم نقط وخطوط المعايرة بشكل دائم ومستقر
      const clicks = calibrationClicksRef.current;
      if (clicks.length > 0) {
        canvasCtx.fillStyle = '#10b981'; // أخضر مميز
        canvasCtx.strokeStyle = '#ffffff';
        canvasCtx.lineWidth = 2;
        
        clicks.forEach(click => {
          canvasCtx.beginPath();
          canvasCtx.arc(click.x, click.y, 8, 0, 2 * Math.PI);
          canvasCtx.fill();
          canvasCtx.stroke();
        });

        // رسم خط بين النقطتين للتأكيد البصري
        if (clicks.length === 2) {
          canvasCtx.beginPath();
          canvasCtx.moveTo(clicks[0].x, clicks[0].y);
          canvasCtx.lineTo(clicks[1].x, clicks[1].y);
          canvasCtx.strokeStyle = '#10b981';
          canvasCtx.lineWidth = 4;
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

    return () => { cancelAnimationFrame(reqRef.current); pose.close(); };
  }, [scriptsLoaded]); //eslint-disable-line

  // 3. التحكم في الكاميرا
  useEffect(() => {
    if (!scriptsLoaded) return;
    const video = videoRef.current;
    let stream = null;
    const startCamera = async (facingMode) => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        video.srcObject = stream; video.muted = true; video.play(); setIsPlaying(true);
      } catch (err) { console.error(err); }
    };
    if (mode === 'front') startCamera('user');
    else if (mode === 'back') startCamera('environment');
    else if (mode === 'video' && uploadedVideo) {
      video.srcObject = null; video.src = uploadedVideo; video.muted = true; setIsPlaying(false);
    }
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [mode, uploadedVideo, scriptsLoaded]);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedVideo(URL.createObjectURL(file)); setMode('video');
      setVbtResults(null); wristHistoryRef.current = []; pixelsPerMeterRef.current = null;
    }
  };

  const togglePlayVideo = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) { video.play(); setIsPlaying(true); } 
      else { video.pause(); setIsPlaying(false); }
    }
  };

  // 4. وظيفة كليك المعايرة (الرسم الفوري وحساب المسافة)
  const handleCanvasClick = (e) => {
    if (!isCalibrating) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const newClicks = [...calibrationClicksRef.current, { x, y }];
    calibrationClicksRef.current = newClicks;
    setCalibrationStep(newClicks.length + 1); // تحديث واجهة المستخدم

    if (newClicks.length === 2) {
      // 45 سم قطر الطارة القياسي = 0.45 متر
      const distInPixels = Math.hypot(newClicks[0].x - newClicks[1].x, newClicks[0].y - newClicks[1].y);
      const ppm = distInPixels / 0.45; 
      
      pixelsPerMeterRef.current = ppm; // حفظ مقياس الرسم في الذاكرة القوية (Ref)
      setIsCalibrating(false);
      setCalibrationStep(0);
      
      alert("✅ تمت المعايرة بنجاح! تم تحديد قطر الطارة.");
      
      // إخفاء الخط والنقط بعد 3 ثواني عشان ميضايقوش في الرؤية
      setTimeout(() => {
        calibrationClicksRef.current = [];
      }, 3000);
    }
  };

  const handleToggleTracking = () => {
    if (!isTracking) { wristHistoryRef.current = []; setVbtResults(null); setIsTracking(true); } 
    else { setIsTracking(false); }
  };

  // 5. التحليل النهائي والفيزياء (متضمنة الـ Slow Motion)
  const handleAnalyzeVBT = () => {
    setIsTracking(false);
    const history = wristHistoryRef.current;
    if (history.length < 5) return alert("لم يتم التقاط بيانات كافية! قم بتشغيل التسجيل أثناء حركة البار.");

    // تحديد أعمق نقطة (بداية الدفع) وأعلى نقطة
    let lowestPointIndex = 0; let maxY = history[0].y;
    for (let i = 1; i < history.length; i++) {
      if (history[i].y > maxY) { maxY = history[i].y; lowestPointIndex = i; }
    }

    let highestPointIndex = lowestPointIndex; let minY = history[lowestPointIndex].y;
    for (let i = lowestPointIndex + 1; i < history.length; i++) {
      if (history[i].y < minY) { minY = history[i].y; highestPointIndex = i; }
    }

    if (lowestPointIndex === highestPointIndex) return alert("لم يتم اكتشاف حركة رفع واضحة.");

    const concentricPhase = history.slice(lowestPointIndex, highestPointIndex + 1);
    
    // حساب المسافة
    const distanceInPixels = maxY - minY; 
    let finalLiftDistance = parseFloat(liftDistance);
    const ppm = pixelsPerMeterRef.current; // استخدام الـ Ref بدل الـ State لضمان التحديث

    if (ppm && ppm > 0) {
      finalLiftDistance = distanceInPixels / ppm;
      setLiftDistance(finalLiftDistance.toFixed(3)); // تحديث الرقم في الشاشة تلقائياً
    }

    const ratio = finalLiftDistance / distanceInPixels;

    // حساب نسبة الزمن (Slow Motion Scale)
    const camFps = parseFloat(cameraFps) || 30;
    const vidFps = parseFloat(videoFps) || 30;
    const timeScaleRatio = vidFps / camFps; // لو الكاميرا 240 والفيديو 30، النسبة = 0.125

    let velocities = [];
    for (let i = 0; i < concentricPhase.length - 1; i++) {
      const dy = concentricPhase[i].y - concentricPhase[i+1].y;
      
      // الزمن الفعلي = زمن الفيديو * نسبة التبطيء
      const dt_video = concentricPhase[i+1].time - concentricPhase[i].time;
      const dt_real = dt_video * timeScaleRatio; 

      if (dt_real > 0 && dy > 0) {
        velocities.push((dy * ratio) / dt_real);
      }
    }

    if (velocities.length === 0) return alert("خطأ في التتبع.");

    const peakVelocity = Math.max(...velocities);
    const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const timeTaken = (concentricPhase[concentricPhase.length - 1].time - concentricPhase[0].time) * timeScaleRatio;

    setVbtResults({
      peakVelocity: peakVelocity.toFixed(2),
      meanVelocity: meanVelocity.toFixed(2),
      timeTaken: timeTaken.toFixed(2)
    });
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl text-center animate-fade-in">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-500 mb-4">
        نظام التدريب المبني على السرعة (VBT AI)
      </h3>

      {/* أزرار التحكم في الكاميرا */}
      <div className="flex flex-wrap justify-center gap-3 mb-6 bg-[#0f1423] p-4 rounded-2xl border border-gray-800">
        <button onClick={() => setMode('front')} className={`px-4 py-2 rounded-xl font-bold transition-all ${mode === 'front' ? 'bg-blue-600 text-white' : 'bg-[#1f2937] text-gray-400'}`}>كاميرا أمامية</button>
        <button onClick={() => setMode('back')} className={`px-4 py-2 rounded-xl font-bold transition-all ${mode === 'back' ? 'bg-emerald-600 text-white' : 'bg-[#1f2937] text-gray-400'}`}>كاميرا خلفية</button>
        <div className="relative">
          <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <button className={`px-4 py-2 rounded-xl font-bold transition-all ${mode === 'video' ? 'bg-purple-600 text-white' : 'bg-[#1f2937] text-gray-400'}`}>رفع فيديو</button>
        </div>
      </div>

      {/* إعدادات السرعة (Slow Mo) والمسافة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-[#0f1423] p-4 rounded-2xl border border-gray-800 max-w-2xl mx-auto relative">
        <div>
          <label className="block text-xs text-gray-400 mb-1">FPS الكاميرا الأصلي</label>
          <input type="number" value={cameraFps} onChange={e => setCameraFps(e.target.value)} className="w-full bg-[#1f2937] border border-gray-700 p-2 text-white rounded-xl text-center outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">FPS تشغيل الملف</label>
          <input type="number" value={videoFps} onChange={e => setVideoFps(e.target.value)} className="w-full bg-[#1f2937] border border-gray-700 p-2 text-white rounded-xl text-center outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">مسافة الرفعة (بالمتر)</label>
          <input type="number" step="0.01" value={liftDistance} onChange={e => setLiftDistance(e.target.value)} className="w-full bg-[#1f2937] border border-gray-700 p-2 text-white rounded-xl text-center outline-none focus:border-emerald-500" />
        </div>
      </div>

      {/* قسم المعايرة البصرية */}
      <div className="mb-4">
         {!isCalibrating ? (
           <button 
              onClick={() => { setIsCalibrating(true); setCalibrationStep(1); calibrationClicksRef.current = []; pixelsPerMeterRef.current = null; }} 
              className="px-6 py-2 bg-[#1f2937] border border-blue-500/50 text-blue-400 hover:bg-gray-700 rounded-xl font-bold text-sm transition-all"
           >
              📏 معايرة الطارة بالذكاء الاصطناعي (أوتوماتيك)
           </button>
         ) : (
           <div className="bg-blue-900/30 border border-blue-500 p-3 rounded-xl inline-block animate-pulse">
             {calibrationStep === 1 && <p className="text-blue-400 font-bold">1️⃣ اضغط على <span className="text-white">أعلى نقطة</span> في طارة الحديد</p>}
             {calibrationStep === 2 && <p className="text-blue-400 font-bold">2️⃣ اضغط على <span className="text-white">أسفل نقطة</span> في طارة الحديد</p>}
           </div>
         )}
      </div>

      {!scriptsLoaded && <p className="text-gray-400 mb-4 font-bold">جاري تجهيز سيرفرات الذكاء الاصطناعي...</p>}
      {isAiReady && <p className="text-emerald-400 font-bold mb-4">الذكاء الاصطناعي جاهز لتتبع البار! ✅</p>}

      {/* منطقة العرض (تم إضافة cursor-crosshair لتسهيل النقر) */}
      <div className="relative inline-block border-4 border-gray-700 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.2)] w-full max-w-md mx-auto mb-6">
        <video ref={videoRef} className="hidden" playsInline loop={mode === 'video'}></video>
        <canvas ref={canvasRef} onClick={handleCanvasClick} className={`w-full h-auto bg-black ${isCalibrating ? 'cursor-crosshair' : ''}`}></canvas>
      </div>

      {/* أزرار التتبع والتحليل */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {mode === 'video' && uploadedVideo && (
          <button onClick={togglePlayVideo} className="px-6 py-3 bg-[#1f2937] hover:bg-gray-700 border border-gray-600 rounded-xl text-white font-bold transition-all">
            {isPlaying ? '⏸ إيقاف الفيديو' : '▶ تشغيل الفيديو'}
          </button>
        )}
        <button onClick={handleToggleTracking} className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${isTracking ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
          {isTracking ? '⏹ إيقاف التسجيل' : '⏺ بدء تسجيل الرفعة'}
        </button>
        <button onClick={handleAnalyzeVBT} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105">
          📊 تحليل السرعة
        </button>
      </div>

      {/* النتائج */}
      {vbtResults && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center animate-fade-in-down border-t border-gray-800 pt-6">
          <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-emerald-500">
            <span className="block text-xs text-gray-400 mb-2">متوسط السرعة (Mean)</span>
            <span className="text-4xl font-black text-white">{vbtResults.meanVelocity} <span className="text-sm text-gray-500">m/s</span></span>
          </div>
          <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-blue-500">
            <span className="block text-xs text-gray-400 mb-2">أقصى سرعة (Peak)</span>
            <span className="text-4xl font-black text-white">{vbtResults.peakVelocity} <span className="text-sm text-gray-500">m/s</span></span>
          </div>
          <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-purple-500">
            <span className="block text-xs text-gray-400 mb-2">زمن الصعود الفعلي</span>
            <span className="text-4xl font-black text-white">{vbtResults.timeTaken} <span className="text-sm text-gray-500">s</span></span>
          </div>
        </div>
      )}
    </div>
  );
}