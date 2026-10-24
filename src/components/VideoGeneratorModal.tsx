import React, { useState, useRef } from 'react';
import { Video, Download, Check, X, Film } from 'lucide-react';
import html2canvas from 'html2canvas';
import AppLogo from '../AppLogo';

export default function VideoGeneratorModal({
  activePlayer,
  playerHistory = [],
  isOpen,
  onClose,
  language = 'ar'
}) {
  const isEn = language === 'en';
  const cardRef = useRef(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState(null);
  const [frameStep, setFrameStep] = useState(0);

  // Measurements
  const mass = parseFloat(activePlayer?.weight_kg) || 72;
  const playerHeight = parseFloat(activePlayer?.height_cm) || 178;
  const age = activePlayer?.age || 24;

  const maxCmjRecord = playerHistory.find(r => r.test_type === 'cmj' || r.test_type === 'cmj_arms');
  const maxCmj = maxCmjRecord ? parseFloat(maxCmjRecord.jump_height_cm) || 0 : 0;
  const cmjFlightTime = maxCmjRecord ? parseFloat(maxCmjRecord.flight_time_sec) || 0 : 0;

  const maxRsiRecord = playerHistory.find(r => r.test_type === 'rsi');
  const maxRsi = maxRsiRecord ? parseFloat(maxRsiRecord.rsi_score) || 0 : 0;

  // Handle Video Generation using MediaRecorder over HTML Canvas
  const generateVideo = async () => {
    if (!cardRef.current || isGenerating) return;
    setIsGenerating(true);
    setProgress(10);
    setVideoUrl(null);

    try {
      // Step 1: Render 2D Canvas Frame
      setFrameStep(1);
      setProgress(30);

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#050711',
        useCORS: true,
        logging: false
      });

      setProgress(60);
      setFrameStep(2);

      // Step 2: Create Stream and Record Video Frames
      const stream = canvas.captureStream(30); // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm'
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsGenerating(false);
        setProgress(100);
        setFrameStep(3);
      };

      mediaRecorder.start();
      setProgress(80);

      // Record for 3.5 seconds
      setTimeout(() => {
        mediaRecorder.stop();
      }, 3500);

    } catch (err) {
      console.error("Video Generation Error:", err);
      setIsGenerating(false);
      alert(isEn ? 'Error generating video clip.' : 'حدث خطأ أثناء استخراج الفيديو، يمكنك تحميل الصورة عالية الدقة بدلاً من ذلك.');
    }
  };

  if (!isOpen || !activePlayer) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="glass-panel max-w-2xl w-full p-6 space-y-6 hud-card border-purple-500/40 relative max-h-[95vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-xl bg-gray-900 border border-gray-800 transition-all cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/30">
            <Film size={26} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>{isEn ? '3D Video Story Generator' : 'مولد ومستخرج فيديو البطاقة الـ 3D'}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-md border border-purple-500/30">
                PRO HD MP4 / WEBM
              </span>
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              {isEn ? 'Generate and download an animated 3D video clip for Instagram & TikTok stories' : 'استخراج وتحميل مقطع فيديو متحرك لبطاقة اللاعب لمشاركته على إنستجرام وتيك توك'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-black/50 p-4 rounded-2xl border border-purple-500/30">
          <div className="flex items-center gap-2">
            <button
              onClick={generateVideo}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري معالجة وتوليد الفيديو ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Video size={18} />
                  <span>🎬 بدء توليد مقطع الفيديو الان (Generate Video)</span>
                </>
              )}
            </button>
          </div>

          {videoUrl && (
            <a
              href={videoUrl}
              download={`${activePlayer.full_name}_3d_showcase.webm`}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Download size={18} />
              <span>⬇️ تحميل فيديو WebM للحفظ</span>
            </a>
          )}
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold text-purple-300">
              <span>{frameStep === 1 ? 'جاري التقاط إطارات الحركة...' : 'جاري تجميع الفيديو بصيغة WebM...'}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden border border-purple-500/30">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Video Player Output Preview */}
        {videoUrl ? (
          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
              <Check size={16} /> {isEn ? 'Video Generated Successfully! Preview below:' : 'تم استخراج وتوليد مقطع الفيديو بنجاح! معاينة التشغيل:'}
            </span>
            <div className="rounded-2xl border-2 border-emerald-500/40 overflow-hidden bg-black shadow-2xl">
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full max-h-[350px] object-contain mx-auto"
              />
            </div>
          </div>
        ) : null}

        {/* Live Canvas Capture Template (Card View) */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-cyan-400 block font-mono">
            📌 {isEn ? 'Athlete Dossier Card Template (To be animated):' : 'بطاقة اللاعب الرسمية (محتوى الفيديو المستخرج):'}
          </span>
          
          <div
            ref={cardRef}
            className="p-6 bg-gradient-to-b from-[#0c1020] via-[#050711] to-[#020306] rounded-3xl border-2 border-cyan-500/40 text-white font-sans space-y-5 max-w-lg mx-auto shadow-2xl"
          >
            {/* Story Card Header */}
            <div className="flex justify-between items-center border-b border-cyan-500/30 pb-3">
              <div className="flex items-center gap-3">
                <AppLogo size={32} />
                <div>
                  <h4 className="font-black text-cyan-300 text-sm">VERTICAL LAB DOSSIER</h4>
                  <p className="text-[10px] text-cyan-400 font-mono">Biomechanical Telemetry Report</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-gray-400 font-bold bg-slate-900 px-3 py-1 rounded-xl border border-gray-800">
                {new Date().toLocaleDateString('ar-EG')}
              </span>
            </div>

            {/* Athlete Bio Card */}
            <div className="bg-slate-900/90 border border-cyan-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-xl flex items-center justify-center font-mono shadow-md">
                  {activePlayer.full_name ? activePlayer.full_name[0] : 'P'}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{activePlayer.full_name}</h3>
                  <p className="text-xs text-cyan-400 font-mono font-bold">
                    {age} {isEn ? 'yrs' : 'سنة'} • {mass} kg • {playerHeight} cm
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">{isEn ? 'Athlete ID' : 'معرف اللاعب'}</span>
                <span className="text-xs font-black text-cyan-400">ATH-{activePlayer.id?.substring(0, 6).toUpperCase()}</span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-center font-mono">
              <div className="bg-black/70 p-3 rounded-2xl border border-cyan-500/30">
                <span className="text-[9px] text-gray-400 block uppercase font-bold mb-1">Max CMJ Height</span>
                <span className="font-black text-cyan-300 text-lg block">{maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}</span>
                <span className="text-[9px] text-cyan-400 font-bold block">({maxCmj > 0 ? (maxCmj * 0.393701).toFixed(1) : 0}")</span>
              </div>

              <div className="bg-black/70 p-3 rounded-2xl border border-blue-500/30">
                <span className="text-[9px] text-gray-400 block uppercase font-bold mb-1">Flight Air Time</span>
                <span className="font-black text-blue-400 text-lg block">{cmjFlightTime > 0 ? `${cmjFlightTime.toFixed(3)} s` : '—'}</span>
                <span className="text-[9px] text-blue-300 font-bold block">(Air Time)</span>
              </div>

              <div className="bg-black/70 p-3 rounded-2xl border border-yellow-500/30">
                <span className="text-[9px] text-gray-400 block uppercase font-bold mb-1">Max RSI Index</span>
                <span className="font-black text-yellow-400 text-lg block">{maxRsi > 0 ? maxRsi.toFixed(2) : '—'}</span>
                <span className="text-[9px] text-yellow-300 font-bold block">Elasticity</span>
              </div>
            </div>

            {/* Recent Telemetry Logs */}
            <div className="space-y-2 pt-2 border-t border-cyan-500/20">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                📊 {isEn ? 'Recent Telemetry Logs:' : 'آخر القياسات المسجلة:'}
              </span>
              {playerHistory.slice(0, 3).map((jump, idx) => (
                <div key={idx} className="bg-black/60 border border-gray-800 p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
                  <span className="px-2 py-0.5 bg-cyan-950/60 text-cyan-400 rounded-md text-[10px] font-bold uppercase border border-cyan-500/30">
                    {jump.test_type}
                  </span>
                  <span className="text-white font-bold">
                    {parseFloat(jump.jump_height_cm) > 0 ? `${parseFloat(jump.jump_height_cm).toFixed(1)} cm` : (jump.clean_weight_kg ? `${jump.clean_weight_kg} kg` : '—')}
                  </span>
                  <span className="text-gray-400 text-[10px]">
                    {new Date(jump.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              ))}
            </div>

            {/* Watermark Footer */}
            <div className="border-t border-cyan-500/20 pt-3 text-center text-[9px] font-mono text-gray-500 flex justify-between items-center">
              <span>VERIFIED BIOMECHANICAL REPORT</span>
              <span className="text-cyan-400 font-bold">VERTICAL LAB 🚀</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
