import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

export default function RSICalculator({
  activePlayer,
  selectedPlayerId,
  onSaveSuccess,
}) {
  const [cameraFps, setCameraFps] = useState(240);
  const [videoFps, setVideoFps] = useState(30);

  // 3 نقاط زمنية لاختبار الـ RSI
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

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // حساب الـ RSI
  useEffect(() => {
    if (
      touchdownTime > 0 &&
      takeoffTime > touchdownTime &&
      landingTime > takeoffTime
    ) {
      // حساب الأوقات الحقيقية بناءً على الـ Slow Motion
      const realContactTime =
        (takeoffTime - touchdownTime) * (videoFps / cameraFps);
      const realFlightTime =
        (landingTime - takeoffTime) * (videoFps / cameraFps);

      const g = 9.81;
      const heightMeters = (g * Math.pow(realFlightTime, 2)) / 8;
      const heightCm = heightMeters * 100;

      // معادلة RSI = الارتفاع بالمتر / زمن التلامس بالثانية
      const rsiScore = heightMeters / realContactTime;

      setStats({
        contactTime: realContactTime.toFixed(3),
        flightTime: realFlightTime.toFixed(3),
        heightCm: heightCm.toFixed(2),
        rsi: rsiScore.toFixed(2),
      });
    } else {
      setStats(null);
    }
  }, [touchdownTime, takeoffTime, landingTime, cameraFps, videoFps]);

  const handleAnalyze = () => {
    if (touchdownTime === 0 || takeoffTime === 0 || landingTime === 0) {
      return alert(
        'يرجى تحديد الأوقات الثلاثة (ملامسة الأرض، الإقلاع، الهبوط) من الفيديو.'
      );
    }
    if (takeoffTime <= touchdownTime || landingTime <= takeoffTime) {
      return alert(
        'تسلسل الأوقات غير منطقي! يجب أن يكون: ملامسة -> إقلاع -> هبوط.'
      );
    }
    setShowResults(true);
  };

  const saveMeasurement = async () => {
    if (!selectedPlayerId || !stats) return alert('خطأ في البيانات!');
    setIsSaving(true);

    const { data, error } = await supabase
      .from('jump_measurements')
      .insert([
        {
          player_id: selectedPlayerId,
          test_type: 'rsi', // تحديد نوع الاختبار
          jump_height_cm: stats.heightCm,
          flight_time_sec: stats.flightTime,
          contact_time_sec: stats.contactTime,
          rsi_score: stats.rsi,
          takeoff_velocity_ms: 0, // غير مستخدم هنا بقوة
          mean_power_watts: 0,
          leg_used: 'both',
        },
      ])
      .select();

    if (!error && data) {
      alert('تم حفظ اختبار الـ RSI بنجاح!');
      setShowResults(false);
      if (onSaveSuccess) onSaveSuccess(data[0]); // تحديث السجل في الواجهة الرئيسية
    } else {
      alert('حدث خطأ أثناء الحفظ.');
    }
    setIsSaving(false);
  };

  // وظائف التحكم في الفيديو
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) setVideoSrc(URL.createObjectURL(file));
  };
  const clearVideo = () => {
    setVideoSrc(null);
    setTouchdownTime(0);
    setTakeoffTime(0);
    setLandingTime(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowResults(false);
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
      videoRef.current.pause();
      setIsPlaying(false);
      const timeStep = frames / videoFps;
      let newTime = videoRef.current.currentTime + timeStep;
      newTime = Math.max(0, Math.min(newTime, duration));
      videoRef.current.currentTime = newTime;
    }
  };

  // تقييم الـ RSI
  const getRSIEval = (rsi) => {
    if (rsi < 1.5)
      return {
        text: 'ضعيف (يحتاج تدريبات Plyometrics)',
        color: 'text-red-400',
      };
    if (rsi >= 1.5 && rsi < 2.0)
      return { text: 'جيد (متوسط)', color: 'text-yellow-400' };
    if (rsi >= 2.0 && rsi < 2.5)
      return { text: 'جيد جداً (قوة تفاعلية ممتازة)', color: 'text-blue-400' };
    return { text: 'نخبة - Elite (أوتار فولاذية)', color: 'text-emerald-400' };
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl animate-fade-in">
      <div className="mb-6 text-center border-b border-gray-800 pb-4">
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
          اختبار مؤشر القوة التفاعلية (RSI - Drop Jump)
        </h3>
        <p className="text-gray-400 text-sm mt-2">
          يقيس قدرة الأوتار على امتصاص الصدمة وتحويلها لقفزة في أسرع وقت
          (Stiffness).
        </p>
      </div>

      <div className="mb-8 p-4 bg-[#0f1423] rounded-2xl border border-gray-800 relative">
        {!videoSrc && (
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="flex-1 relative">
              <input
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileUpload}
                ref={cameraInputRef}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-orange-600 hover:bg-orange-500 text-white text-center py-5 rounded-xl border border-orange-500 font-bold transition-all flex items-center justify-center gap-3">
                افتح الكاميرا وصوّر
              </div>
            </div>
            <div className="flex-1 relative">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-center py-5 rounded-xl border border-gray-600 font-bold transition-all flex items-center justify-center gap-3">
                اختر فيديو من المعرض
              </div>
            </div>
          </div>
        )}

        {videoSrc && (
          <div className="flex flex-col items-center w-full relative">
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 z-10 bg-red-600 hover:bg-red-500 text-white p-2 rounded-full shadow-lg"
            >
              X
            </button>
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              className="max-h-80 w-auto rounded-xl border-2 border-gray-700 mb-5 shadow-lg"
              onLoadedMetadata={() => setDuration(videoRef.current.duration)}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
            />

            <div className="w-full max-w-lg flex items-center gap-4 mb-5">
              <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">
                {currentTime.toFixed(2)}s
              </span>
              <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.001"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">
                {duration.toFixed(2)}s
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-6 bg-gray-800/50 p-2 rounded-2xl border border-gray-700/50">
              <button
                onClick={() => stepFrames(-1)}
                className="px-4 py-2 bg-[#1f2937] hover:bg-gray-700 rounded-xl text-white text-sm font-bold"
              >
                -1 Frame
              </button>
              <button
                onClick={togglePlay}
                className="px-8 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-white font-bold mx-2"
              >
                {isPlaying ? '⏸ إيقاف' : '▶ تشغيل'}
              </button>
              <button
                onClick={() => stepFrames(1)}
                className="px-4 py-2 bg-[#1f2937] hover:bg-gray-700 rounded-xl text-white text-sm font-bold"
              >
                +1 Frame
              </button>
            </div>

            {/* الأزرار الثلاثة لـ RSI */}
            <div className="flex flex-wrap gap-4 w-full justify-center">
              <button
                onClick={() => setTouchdownTime(videoRef.current.currentTime)}
                className="px-6 py-3 bg-red-900/40 hover:bg-red-600 text-red-300 hover:text-white border border-red-700/50 rounded-xl font-bold"
              >
                1. ملامسة الأرض
              </button>
              <button
                onClick={() => setTakeoffTime(videoRef.current.currentTime)}
                className="px-6 py-3 bg-indigo-900/40 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-700/50 rounded-xl font-bold"
              >
                2. الإقلاع لأعلى
              </button>
              <button
                onClick={() => setLandingTime(videoRef.current.currentTime)}
                className="px-6 py-3 bg-purple-900/40 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-700/50 rounded-xl font-bold"
              >
                3. الهبوط النهائي
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 bg-[#0f1423] p-5 rounded-2xl border border-gray-800">
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            FPS الكاميرا
          </label>
          <input
            type="number"
            value={cameraFps}
            onChange={(e) => setCameraFps(Number(e.target.value))}
            className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-2.5 text-white outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">FPS الملف</label>
          <input
            type="number"
            value={videoFps}
            onChange={(e) => setVideoFps(Number(e.target.value))}
            className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-2.5 text-white outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 text-center">
            الملامسة (ث)
          </label>
          <input
            type="text"
            value={touchdownTime.toFixed(3)}
            readOnly
            className="w-full bg-[#0b0f19] border border-red-900/50 rounded-xl p-2.5 text-red-400 font-mono font-bold text-center"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 text-center">
            الإقلاع (ث)
          </label>
          <input
            type="text"
            value={takeoffTime.toFixed(3)}
            readOnly
            className="w-full bg-[#0b0f19] border border-indigo-900/50 rounded-xl p-2.5 text-indigo-400 font-mono font-bold text-center"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 text-center">
            الهبوط (ث)
          </label>
          <input
            type="text"
            value={landingTime.toFixed(3)}
            readOnly
            className="w-full bg-[#0b0f19] border border-purple-900/50 rounded-xl p-2.5 text-purple-400 font-mono font-bold text-center"
          />
        </div>
      </div>

      <div className="flex justify-center mb-8">
        <button
          onClick={handleAnalyze}
          className="px-14 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-2xl font-bold text-xl shadow-[0_10px_25px_rgba(249,115,22,0.3)] transition-transform hover:scale-105"
        >
          تحليل مؤشر RSI
        </button>
      </div>

      {showResults && stats && (
        <div className="space-y-6 animate-fade-in-down">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-red-500">
              <span className="block text-xs text-gray-400 mb-2">
                زمن التلامس (s)
              </span>
              <span className="text-3xl font-black text-white">
                {stats.contactTime}
              </span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-indigo-500">
              <span className="block text-xs text-gray-400 mb-2">
                زمن الطيران (s)
              </span>
              <span className="text-3xl font-black text-white">
                {stats.flightTime}
              </span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-blue-500">
              <span className="block text-xs text-gray-400 mb-2">
                ارتفاع القفزة (cm)
              </span>
              <span className="text-3xl font-black text-white">
                {stats.heightCm}
              </span>
            </div>
            <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-orange-500 relative overflow-hidden">
              <div className="absolute inset-0 bg-orange-600/10"></div>
              <span className="block text-xs text-gray-400 mb-2 relative z-10">
                مؤشر RSI
              </span>
              <span className="text-3xl font-black text-white relative z-10">
                {stats.rsi}
              </span>
            </div>
          </div>

          <div className="bg-[#0f1423] border border-gray-800 rounded-xl p-5 text-center">
            <p className="text-gray-400 text-sm mb-1">
              التقييم الفسيولوجي للأوتار:
            </p>
            <p className={`text-xl font-bold ${getRSIEval(stats.rsi).color}`}>
              {getRSIEval(stats.rsi).text}
            </p>
          </div>

          <button
            onClick={saveMeasurement}
            disabled={isSaving}
            className="w-full py-4 bg-orange-700/80 hover:bg-orange-600 text-white rounded-xl font-bold text-lg transition-all"
          >
            حفظ اختبار RSI في السجل
          </button>
        </div>
      )}
    </div>
  );
}
