import React, { useEffect, useRef, useState } from 'react';

export default function VBTCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isAiReady, setIsAiReady] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // 1. تحميل مكتبات جوجل + الانتظار الذكي (Smart Wait)
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
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
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');

        // المراقب الذكي: نتأكد 100% إن أداة Pose بقت موجودة وشغالة قبل ما نكمل
        const checkInterval = setInterval(() => {
          if (window.Pose && typeof window.Pose === 'function') {
            clearInterval(checkInterval); // نوقف المراقب
            setScriptsLoaded(true); // ندي الإشارة الخضراء لتشغيل الكاميرا
          }
        }, 100);

      } catch (error) {
        console.error("حدث خطأ في تحميل ملفات الذكاء الاصطناعي", error);
      }
    };

    loadMediaPipe();
  }, []);

  // 2. تشغيل الكاميرا والذكاء الاصطناعي بعد التأكد التام
  useEffect(() => {
    if (!scriptsLoaded) return;

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    
    // تأمين إضافي: لو العناصر مش موجودة في الشاشة ميعملش حاجة
    if (!videoElement || !canvasElement) return;

    const canvasCtx = canvasElement.getContext('2d');

    // استدعاء الأدوات بأمان تام من المتصفح
    const { Pose, POSE_CONNECTIONS, Camera, drawConnectors, drawLandmarks } = window;

    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
      modelComplexity: 1, // توازن بين الدقة والسرعة
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults((results) => {
      if (!isAiReady) setIsAiReady(true);

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      
      // رسم الفيديو كخلفية
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

      // رسم الهيكل العظمي
      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });
      }
      canvasCtx.restore();
    });

    let camera;
    if (videoElement) {
      camera = new Camera(videoElement, {
        onFrame: async () => {
          if (videoElement.readyState >= 2) { // تأمين إضافي للتأكد إن الفيديو شغال
            await pose.send({ image: videoElement });
          }
        },
        width: 640,
        height: 480
      });
      camera.start();
    }

    // تنظيف الذاكرة لو قفلنا التاب
    return () => {
      if (camera) camera.stop();
      pose.close();
    };
  }, [scriptsLoaded]);

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl text-center animate-fade-in">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-500 mb-4">
        نظام التدريب المبني على السرعة (VBT AI)
      </h3>
      
      {!scriptsLoaded && (
        <p className="text-gray-400 mb-4 font-bold">جاري تجهيز سيرفرات الذكاء الاصطناعي... (لحظات)</p>
      )}
      
      {scriptsLoaded && !isAiReady && (
        <p className="text-yellow-400 animate-pulse mb-4 font-bold">جاري تشغيل الكاميرا والموديل... قف أمام الكاميرا.</p>
      )}
      
      {isAiReady && (
        <p className="text-emerald-400 font-bold mb-4">الذكاء الاصطناعي متصل وجاهز لتتبع البار! ✅</p>
      )}

      <div className="relative inline-block border-4 border-gray-700 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.2)]">
        <video ref={videoRef} className="hidden" playsInline></video>
        <canvas ref={canvasRef} width="640" height="480" className="w-full max-w-2xl h-auto bg-black"></canvas>
      </div>
    </div>
  );
}