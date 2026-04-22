import React, { useEffect, useRef, useState } from 'react';

export default function VBTCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [isAiReady, setIsAiReady] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  
  const [mode, setMode] = useState('video'); 
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // إعدادات الـ VBT
  const [videoFps, setVideoFps] = useState(30);
  const [liftDistance, setLiftDistance] = useState(0.6); // مسافة الرفعة بالمتر
  const [isTracking, setIsTracking] = useState(false);
  const [vbtResults, setVbtResults] = useState(null);

  // استخدام Refs عشان القيم تتحدث جوه دالة الذكاء الاصطناعي بدون مشاكل
  const isTrackingRef = useRef(false);
  const wristHistoryRef = useRef([]);

  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(); return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = "anonymous";
        script.onload = resolve;
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
      } catch (error) {
        console.error("حدث خطأ في تحميل ملفات الذكاء الاصطناعي", error);
      }
    };

    loadMediaPipe();
  }, []);

  const poseRef = useRef(null);
  const reqRef = useRef(null);

  useEffect(() => {
    if (!scriptsLoaded) return;

    const { Pose, POSE_CONNECTIONS, drawConnectors, drawLandmarks } = window;

    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
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

      if (results.poseLandmarks) {
        // رسم الهيكل العظمي
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

        // === منطق التتبع (Tracking Logic) ===
        if (isTrackingRef.current && videoRef.current) {
          // نقطة 15 هي المعصم الأيسر، و 16 المعصم الأيمن. نأخذ متوسطهما أو أحدهما لتتبع البار
          const leftWrist = results.poseLandmarks[15];
          const rightWrist = results.poseLandmarks[16];
          
          if (leftWrist && rightWrist) {
            const avgY = (leftWrist.y + rightWrist.y) / 2; // مكان البار على محور الصادات
            const currentTime = videoRef.current.currentTime;
            
            wristHistoryRef.current.push({ time: currentTime, y: avgY });
          }
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
      cancelAnimationFrame(reqRef.current);
      pose.close();
    };
  }, [scriptsLoaded]); //eslint-disable-line

  useEffect(() => {
    if (!scriptsLoaded) return;
    
    const video = videoRef.current;
    let stream = null;

    const startCamera = async (facingMode) => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        video.srcObject = stream;
        video.muted = true;
        video.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("لم نتمكن من الوصول للكاميرا:", err);
      }
    };

    if (mode === 'front') {
      startCamera('user');
    } else if (mode === 'back') {
      startCamera('environment');
    } else if (mode === 'video' && uploadedVideo) {
      video.srcObject = null;
      video.src = uploadedVideo;
      video.muted = true;
      setIsPlaying(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode, uploadedVideo, scriptsLoaded]);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedVideo(URL.createObjectURL(file));
      setMode('video');
      setVbtResults(null);
      wristHistoryRef.current = [];
    }
  };

  const togglePlayVideo = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleToggleTracking = () => {
    if (!isTracking) {
      // نبدأ تتبع جديد ونمسح القديم
      wristHistoryRef.current = [];
      setVbtResults(null);
      setIsTracking(true);
    } else {
      // نوقف التتبع
      setIsTracking(false);
    }
  };

  const handleAnalyzeVBT = () => {
    setIsTracking(false); // نوقف التتبع إجبارياً
    const history = wristHistoryRef.current;

    if (history.length < 5) {
      return alert("لم يتم التقاط بيانات كافية! تأكد من تشغيل زر التتبع أثناء حركة البار.");
    }

    // 1. تحديد أعمق نقطة (بداية الدفع لأعلى - Concentric phase)
    // في MediaPipe، الـ y بتزيد كل ما ننزل لتحت. فأعمق نقطة في السكوات هي الـ Max Y
    let lowestPointIndex = 0;
    let maxY = history[0].y;
    
    for (let i = 1; i < history.length; i++) {
      if (history[i].y > maxY) {
        maxY = history[i].y;
        lowestPointIndex = i;
      }
    }

    // 2. تحديد أعلى نقطة (نهاية الرفعة) بعد النزول
    let highestPointIndex = lowestPointIndex;
    let minY = history[lowestPointIndex].y;

    for (let i = lowestPointIndex + 1; i < history.length; i++) {
      if (history[i].y < minY) {
        minY = history[i].y;
        highestPointIndex = i;
      }
    }

    if (lowestPointIndex === highestPointIndex) {
      return alert("لم يتم اكتشاف حركة رفع (صعود البار) بشكل واضح.");
    }

    // 3. استخراج البيانات خلال مرحلة الصعود فقط
    const concentricPhase = history.slice(lowestPointIndex, highestPointIndex + 1);
    
    // 4. تحويل البيكسلات (النسبة) لأمتار
    const normDistance = maxY - minY; // المسافة اللي البار مشيها بالبيكسلات الوهمية
    const realDistance = parseFloat(liftDistance); // المسافة الحقيقية بالمتر
    
    if (normDistance <= 0) return alert("خطأ في قراءة المسافة.");
    const ratio = realDistance / normDistance; // معامل التحويل

    // 5. حساب السرعات بين كل فريم والتاني
    let velocities = [];
    for (let i = 0; i < concentricPhase.length - 1; i++) {
      const dy = concentricPhase[i].y - concentricPhase[i+1].y; // المسافة
      const dt = concentricPhase[i+1].time - concentricPhase[i].time; // الزمن
      
      if (dt > 0 && dy > 0) { // لو طالع لفوق والزمن بيتحرك
        const v = (dy * ratio) / dt;
        velocities.push(v);
      }
    }

    if (velocities.length === 0) return alert("لا يمكن حساب السرعة، تأكد من جودة التتبع.");

    // 6. استخراج النواتج النهائية
    const peakVelocity = Math.max(...velocities);
    const meanVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;

    setVbtResults({
      peakVelocity: peakVelocity.toFixed(2),
      meanVelocity: meanVelocity.toFixed(2),
      timeTaken: (concentricPhase[concentricPhase.length - 1].time - concentricPhase[0].time).toFixed(2)
    });
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl text-center animate-fade-in">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-500 mb-4">
        نظام التدريب المبني على السرعة (VBT AI)
      </h3>

      <div className="flex flex-wrap justify-center gap-3 mb-6 bg-[#0f1423] p-4 rounded-2xl border border-gray-800">
        <button onClick={() => setMode('front')} className={`px-4 py-2 rounded-xl font-bold transition-all ${mode === 'front' ? 'bg-blue-600 text-white' : 'bg-[#1f2937] text-gray-400'}`}>كاميرا أمامية</button>
        <button onClick={() => setMode('back')} className={`px-4 py-2 rounded-xl font-bold transition-all ${mode === 'back' ? 'bg-emerald-600 text-white' : 'bg-[#1f2937] text-gray-400'}`}>كاميرا خلفية</button>
        <div className="relative">
          <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <button className={`px-4 py-2 rounded-xl font-bold transition-all ${mode === 'video' ? 'bg-purple-600 text-white' : 'bg-[#1f2937] text-gray-400'}`}>رفع فيديو</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-[#0f1423] p-4 rounded-2xl border border-gray-800 max-w-lg mx-auto">
        <div>
          <label className="block text-xs text-gray-400 mb-1">مسافة الرفعة - ROM (بالمتر)</label>
          <input type="number" step="0.01" value={liftDistance} onChange={e => setLiftDistance(e.target.value)} className="w-full bg-[#1f2937] border border-gray-700 p-2 text-white rounded-xl text-center outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">سرعة الملف (FPS)</label>
          <input type="number" value={videoFps} onChange={e => setVideoFps(e.target.value)} className="w-full bg-[#1f2937] border border-gray-700 p-2 text-white rounded-xl text-center outline-none focus:border-emerald-500" />
        </div>
      </div>

      {!scriptsLoaded && <p className="text-gray-400 mb-4 font-bold">جاري تجهيز سيرفرات الذكاء الاصطناعي...</p>}
      {isAiReady && <p className="text-emerald-400 font-bold mb-4">الذكاء الاصطناعي جاهز لتتبع البار! ✅</p>}

      {/* منطقة العرض */}
      <div className="relative inline-block border-4 border-gray-700 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.2)] w-full max-w-md mx-auto mb-6">
        <video ref={videoRef} className="hidden" playsInline loop={mode === 'video'}></video>
        <canvas ref={canvasRef} className="w-full h-auto bg-black"></canvas>
      </div>

      {/* أزرار التحكم في التتبع والتشغيل */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {mode === 'video' && uploadedVideo && (
          <button onClick={togglePlayVideo} className="px-6 py-3 bg-[#1f2937] hover:bg-gray-700 border border-gray-600 rounded-xl text-white font-bold transition-all">
            {isPlaying ? '⏸ إيقاف الفيديو' : '▶ تشغيل الفيديو'}
          </button>
        )}
        
        <button 
          onClick={handleToggleTracking} 
          className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${isTracking ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
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
            <span className="block text-xs text-gray-400 mb-2">متوسط السرعة (Mean Velocity)</span>
            <span className="text-4xl font-black text-white">{vbtResults.meanVelocity} <span className="text-sm text-gray-500">m/s</span></span>
          </div>
          <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-blue-500">
            <span className="block text-xs text-gray-400 mb-2">أقصى سرعة (Peak Velocity)</span>
            <span className="text-4xl font-black text-white">{vbtResults.peakVelocity} <span className="text-sm text-gray-500">m/s</span></span>
          </div>
          <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-purple-500">
            <span className="block text-xs text-gray-400 mb-2">زمن الرفعة الصاعدة</span>
            <span className="text-4xl font-black text-white">{vbtResults.timeTaken} <span className="text-sm text-gray-500">s</span></span>
          </div>
        </div>
      )}
    </div>
  );
}