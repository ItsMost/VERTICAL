import React, { useEffect, useRef, useState } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export default function VBTCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isAiReady, setIsAiReady] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');

    // 1. إعداد موديل الذكاء الاصطناعي (Pose)
    const pose = new Pose({
      locateFile: (file) => {
        // بنجيب ملفات التشغيل من سيرفر خارجي عشان ميهنجش التطبيق
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: 1, // 0 سريع جداً وخفيف، 1 دقيق ومتوازن، 2 دقيق جداً بس تقيل
      smoothLandmarks: true, // تنعيم الحركة
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // 2. دالة استقبال النتائج (لما الذكاء الاصطناعي يشوفك)
    pose.onResults((results) => {
      if (!isAiReady) setIsAiReady(true);

      // تنظيف الشاشة للفريم الجديد
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // رسم الفيديو كخلفية
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );

      // رسم الهيكل العظمي والمفاصل
      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 4,
        }); // خطوط خضراء
        drawLandmarks(canvasCtx, results.poseLandmarks, {
          color: '#FF0000',
          lineWidth: 2,
        }); // نقط حمراء
      }
      canvasCtx.restore();
    });

    // 3. تشغيل الكاميرا وربطها بالموديل
    if (videoElement) {
      const camera = new Camera(videoElement, {
        onFrame: async () => {
          await pose.send({ image: videoElement });
        },
        width: 640,
        height: 480,
      });
      camera.start();
    }

    // تنظيف الكاميرا لو قفلنا الشاشة
    return () => {
      pose.close();
    };
  }, []); // يشتغل مرة واحدة عند فتح الشاشة

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl text-center">
      <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-500 mb-4">
        نظام التدريب المبني على السرعة (VBT AI)
      </h3>

      {!isAiReady && (
        <p className="text-yellow-400 animate-pulse mb-4">
          جاري تحميل موديل الذكاء الاصطناعي... قف أمام الكاميرا.
        </p>
      )}
      {isAiReady && (
        <p className="text-emerald-400 font-bold mb-4">
          الذكاء الاصطناعي متصل! ✅
        </p>
      )}

      {/* منطقة عرض الكاميرا */}
      <div className="relative inline-block border-4 border-gray-700 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.2)]">
        {/* الفيديو الحقيقي مخفي، وبنرسم فوقه بالكانفاس */}
        <video ref={videoRef} className="hidden" playsInline></video>

        {/* الشاشة اللي بيترسم عليها الذكاء الاصطناعي */}
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          className="w-full max-w-2xl h-auto bg-black"
        ></canvas>
      </div>
    </div>
  );
}
