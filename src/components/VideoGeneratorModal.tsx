import { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import type { Player, JumpMeasurement } from '../types/athletics';
import { toast } from './Toast';
import { TEST_TYPES, normalizeTestType } from '../lib/testTypes';
import { Video, Download, Check, X, Film } from 'lucide-react';
import html2canvas from 'html2canvas';
import AppLogo from '../AppLogo';

export default function VideoGeneratorModal({
  activePlayer,
  playerHistory = [],
  isOpen,
  onClose,
  language = 'ar'
}: {
  activePlayer: Player | null;
  playerHistory?: JumpMeasurement[];
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}) {
  const { t: tx } = useData();
  const cardRef = useRef<any>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<any>(null);
  const [frameStep, setFrameStep] = useState(0);

  // Measurements
  const mass = parseFloat(String(activePlayer?.weight_kg)) || 72;
  const playerHeight = parseFloat(String(activePlayer?.height_cm)) || 178;
  const age = activePlayer?.age || 24;

  const maxCmjRecord = playerHistory.find(r => normalizeTestType(r.test_type) === TEST_TYPES.CMJ_ARMS || normalizeTestType(r.test_type) === TEST_TYPES.CMJ_ARMS);
  const maxCmj = maxCmjRecord ? parseFloat(String(maxCmjRecord.jump_height_cm)) || 0 : 0;
  const cmjFlightTime = maxCmjRecord ? parseFloat(String(maxCmjRecord.flight_time_sec)) || 0 : 0;

  const maxRsiRecord = playerHistory.find(r => normalizeTestType(r.test_type) === TEST_TYPES.DROP_JUMP);
  const maxRsi = maxRsiRecord ? parseFloat(String(maxRsiRecord.rsi_score)) || 0 : 0;

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
        backgroundColor: '#09090B',
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

      const chunks: Blob[] = [];
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
      toast.error(tx.ui.vgErrorGeneratingVideoClip);
    }
  };

  if (!isOpen || !activePlayer) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="glass-panel max-w-2xl w-full p-6 space-y-6 hud-card border-accent/40 relative max-h-[95vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-white p-2 rounded-xl bg-surface-2 border border-border transition-all cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="p-3 bg-accent/10 text-accent rounded-2xl border border-accent/30">
            <Film size={26} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>{tx.ui.vg3dVideoStoryGenerator}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-accent/20 text-accent rounded-md border border-accent/30">
                PRO HD MP4 / WEBM
              </span>
            </h3>
            <p className="text-xs text-muted font-medium">
              {tx.ui.vgGenerateAndDownloadAn}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-black/50 p-4 rounded-2xl border border-accent/30">
          <div className="flex items-center gap-2">
            <button
              onClick={generateVideo}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-accent via-accent to-accent hover:from-accent hover:to-accent text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-accent/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{tx.media.processingVideo} ({progress}%)...</span>
                </>
              ) : (
                <>
                  <Video size={18} />
                  <span>{tx.media.generateVideo}</span>
                </>
              )}
            </button>
          </div>

          {videoUrl && (
            <a
              href={videoUrl}
              download={`${activePlayer.full_name}_3d_showcase.webm`}
              className="px-5 py-3 bg-success hover:bg-success text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-success/25 transition-all cursor-pointer"
            >
              <Download size={18} />
              <span>{tx.media.downloadWebm}</span>
            </a>
          )}
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold text-accent">
              <span>{frameStep === 1 ? tx.media.capturingFrames : tx.media.encodingWebm}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-surface-2 rounded-full overflow-hidden border border-accent/30">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Video Player Output Preview */}
        {videoUrl ? (
          <div className="space-y-2">
            <span className="text-xs font-bold text-success flex items-center gap-1.5 font-mono">
              <Check size={16} /> {tx.ui.vgVideoGeneratedSuccessfullyPreview}
            </span>
            <div className="rounded-2xl border-2 border-success/40 overflow-hidden bg-black shadow-2xl">
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
          <span className="text-xs font-bold text-accent block font-mono">
            📌 {tx.ui.vgAthleteDossierCardTemplate}
          </span>
          
          <div
            ref={cardRef}
            className="p-6 bg-gradient-to-b from-bg via-bg to-bg rounded-3xl border-2 border-accent/40 text-white font-sans space-y-5 max-w-lg mx-auto shadow-2xl"
          >
            {/* Story Card Header */}
            <div className="flex justify-between items-center border-b border-accent/30 pb-3">
              <div className="flex items-center gap-3">
                <AppLogo size={32} />
                <div>
                  <h4 className="font-black text-accent text-sm">VERTICAL LAB DOSSIER</h4>
                  <p className="text-[10px] text-accent font-mono">Biomechanical Telemetry Report</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted font-bold bg-surface-2 px-3 py-1 rounded-xl border border-border">
                {new Date().toLocaleDateString('ar-EG')}
              </span>
            </div>

            {/* Athlete Bio Card */}
            <div className="bg-surface-2/90 border border-accent/30 p-4 rounded-2xl flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent to-accent text-white font-black text-xl flex items-center justify-center font-mono shadow-md">
                  {activePlayer.full_name ? activePlayer.full_name[0] : 'P'}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{activePlayer.full_name}</h3>
                  <p className="text-xs text-accent font-mono font-bold">
                    {age} {tx.ui.vgYrs} • {mass} kg • {playerHeight} cm
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-muted font-bold uppercase block">{tx.ui.vgAthleteId}</span>
                <span className="text-xs font-black text-accent">ATH-{activePlayer.id?.substring(0, 6).toUpperCase()}</span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-center font-mono">
              <div className="bg-black/70 p-3 rounded-2xl border border-accent/30">
                <span className="text-[9px] text-muted block uppercase font-bold mb-1">Max CMJ Height</span>
                <span className="font-black text-accent text-lg block">{maxCmj > 0 ? `${maxCmj.toFixed(1)} cm` : '—'}</span>
                <span className="text-[9px] text-accent font-bold block">({maxCmj > 0 ? (maxCmj * 0.393701).toFixed(1) : 0}")</span>
              </div>

              <div className="bg-black/70 p-3 rounded-2xl border border-accent/30">
                <span className="text-[9px] text-muted block uppercase font-bold mb-1">Flight Air Time</span>
                <span className="font-black text-accent text-lg block">{cmjFlightTime > 0 ? `${cmjFlightTime.toFixed(3)} s` : '—'}</span>
                <span className="text-[9px] text-accent font-bold block">(Air Time)</span>
              </div>

              <div className="bg-black/70 p-3 rounded-2xl border border-warning/30">
                <span className="text-[9px] text-muted block uppercase font-bold mb-1">Max RSI Index</span>
                <span className="font-black text-warning text-lg block">{maxRsi > 0 ? maxRsi.toFixed(2) : '—'}</span>
                <span className="text-[9px] text-warning font-bold block">Elasticity</span>
              </div>
            </div>

            {/* Recent Telemetry Logs */}
            <div className="space-y-2 pt-2 border-t border-accent/20">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">
                📊 {tx.ui.vgRecentTelemetryLogs}
              </span>
              {playerHistory.slice(0, 3).map((jump, idx) => (
                <div key={idx} className="bg-black/60 border border-border p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
                  <span className="px-2 py-0.5 bg-surface-2/60 text-accent rounded-md text-[10px] font-bold uppercase border border-accent/30">
                    {jump.test_type}
                  </span>
                  <span className="text-white font-bold">
                    {parseFloat(String(jump.jump_height_cm)) > 0 ? `${parseFloat(String(jump.jump_height_cm)).toFixed(1)} cm` : (jump.clean_weight_kg ? `${jump.clean_weight_kg} kg` : '—')}
                  </span>
                  <span className="text-muted text-[10px]">
                    {new Date(jump.created_at).toLocaleDateString('ar-EG')}
                  </span>
                </div>
              ))}
            </div>

            {/* Watermark Footer */}
            <div className="border-t border-accent/20 pt-3 text-center text-[9px] font-mono text-faint flex justify-between items-center">
              <span>VERIFIED BIOMECHANICAL REPORT</span>
              <span className="text-accent font-bold">VERTICAL LAB 🚀</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
