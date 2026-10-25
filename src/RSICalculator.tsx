import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, Play, Pause, X, Save, Info, Sparkles, Clock, ArrowUpCircle,
  Award, Video, Sliders, Check
} from 'lucide-react';
import { useData } from './context/DataContext';
import { classifyGCT, calculateRSI } from './useJumpMechanics';
import type { JumpMeasurement, GCTAnalysis } from './types/athletics';

// Animated counter helper
const AnimatedCounter = ({ value, duration = 1000, decimals = 1 }: { value: string | number; duration?: number; decimals?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(String(value)) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const startTime = performance.now();
    const updateCount = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      setCount(start + easeProgress * (end - start));
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };
    requestAnimationFrame(updateCount);
  }, [value, duration]);
  return <span className="font-mono metric-num">{count.toFixed(decimals)}</span>;
};

interface RSIStats {
  contactTime: string;
  flightTime: string;
  heightCm: string;
  heightInches: string;
  rsi: string;
  rsiMod: string;
  legStiffness: string;
  gctAnalysis: GCTAnalysis;
}

export default function RSICalculator({
  activePlayer: propActivePlayer,
  selectedPlayerId: propSelectedPlayerId,
  language: propLanguage,
}: {
  activePlayer?: any;
  selectedPlayerId?: string;
  language?: string;
  playerHistory?: any[];
  onSaveSuccess?: (measurement: any) => void;
}) {
  const {
    activePlayer: contextActivePlayer,
    selectedPlayerId: contextSelectedPlayerId,
    addMeasurement,
    t,
    language: contextLanguage,
  } = useData();

  const activePlayer = propActivePlayer || contextActivePlayer;
  const selectedPlayerId = propSelectedPlayerId || contextSelectedPlayerId;
  const language = propLanguage || contextLanguage;
  const isEn = language === 'en';

  const [cameraFps, setCameraFps] = useState<number | string>(240);
  const [videoFps, setVideoFps] = useState<number | string>(30);

  // 3 key time points for RSI
  const [touchdownTime, setTouchdownTime] = useState(0);
  const [takeoffTime, setTakeoffTime] = useState(0);
  const [landingTime, setLandingTime] = useState(0);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // RSI Method: 'height_gct' or 'flight_gct'
  const [rsiMethod, setRsiMethod] = useState<'height_gct' | 'flight_gct'>('height_gct');

  // Stats
  const [stats, setStats] = useState<RSIStats>({
    contactTime: '0.000',
    flightTime: '0.000',
    heightCm: '0.0',
    heightInches: '0.0',
    rsi: '0.00',
    rsiMod: '0.00',
    legStiffness: '0.0',
    gctAnalysis: classifyGCT(0),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);
  const currentTimeDesktopRef = useRef<HTMLSpanElement | null>(null);
  const currentFrameDesktopRef = useRef<HTMLSpanElement | null>(null);

  // Calculate stats whenever 3 timepoints or FPS change
  useEffect(() => {
    if (touchdownTime > 0 && takeoffTime > touchdownTime && landingTime > takeoffTime) {
      const cFps = parseFloat(String(cameraFps)) || 240;
      const vFps = parseFloat(String(videoFps)) || 30;
      const fpsRatio = vFps / cFps;

      const rawCT = takeoffTime - touchdownTime;
      const rawFT = landingTime - takeoffTime;

      const ct = rawCT * fpsRatio;
      const ft = rawFT * fpsRatio;

      const g = 9.81;
      const hM = (g * Math.pow(ft, 2)) / 8;
      const hCm = hM * 100;
      const hIn = hCm * 0.393701;

      // Standard RSI calculation
      const computedRsi = calculateRSI(hM, ct, ft, rsiMethod);
      const rsiMod = ct > 0 ? (hCm / (ct * 1000)).toFixed(2) : '0.00';

      const mass = parseFloat(String(activePlayer?.weight_kg)) || 72;
      const stiffness = ct > 0 ? ((mass * Math.PI * (ft + ct)) / (2 * Math.pow(ct, 2) * (ft / Math.PI + ct / 4)) / 1000).toFixed(1) : '0.0';

      const gctAnalysis = classifyGCT(ct);

      setStats({
        contactTime: ct.toFixed(3),
        flightTime: ft.toFixed(3),
        heightCm: hCm.toFixed(1),
        heightInches: hIn.toFixed(1),
        rsi: computedRsi.toFixed(2),
        rsiMod: rsiMod,
        legStiffness: stiffness,
        gctAnalysis,
      });

      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [touchdownTime, takeoffTime, landingTime, cameraFps, videoFps, rsiMethod, activePlayer]);

  const saveMeasurement = async () => {
    if (!selectedPlayerId) {
      alert(t.hud.selectAthlete);
      return;
    }
    setIsSaving(true);

    try {
      const payload: any = {
        player_id: selectedPlayerId,
        test_type: 'rsi',
        jump_height_cm: parseFloat(stats.heightCm),
        flight_time_sec: parseFloat(stats.flightTime),
        contact_time_sec: parseFloat(stats.contactTime),
        rsi_score: parseFloat(stats.rsi),
        takeoff_velocity_ms: 0,
        mean_power_watts: 0,
        notes: `GCT: ${stats.contactTime}s (${stats.gctAnalysis.classification})`,
      };

      // CENTRAL DATA CALL (Instant in-memory sync across the app!)
      const res = await addMeasurement(payload);
      if (res) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setTouchdownTime(0);
      setTakeoffTime(0);
      setLandingTime(0);
      setShowResults(false);
      setCurrentTime(0);
    }
  };

  const clearVideo = () => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(null);
    setTouchdownTime(0);
    setTakeoffTime(0);
    setLandingTime(0);
    setShowResults(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const togglePlay = () => {
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
    if (videoRef.current) {
      const curT = videoRef.current.currentTime;
      setCurrentTime(curT);
      const vFps = parseFloat(String(videoFps)) || 30;
      if (currentTimeDesktopRef.current) currentTimeDesktopRef.current.innerText = curT.toFixed(3) + 's';
      if (currentFrameDesktopRef.current) currentFrameDesktopRef.current.innerText = 'F ' + Math.round(curT * vFps);
    }
  };

  return (
    <div className="bento-card p-6 shadow-2xl transition-all duration-300 font-sans space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#D4FF00] text-[#09090B] flex items-center justify-center font-bold shadow-[0_0_15px_rgba(212,255,0,0.3)]">
            <Zap size={22} />
          </div>
          <div>
            <h3 className="text-xl font-heading font-black text-white">{t.rsiConsole.title}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">{t.rsiConsole.subtitle}</p>
          </div>
        </div>

        {/* RSI Calculation Formula Toggle */}
        <div className="bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 flex items-center gap-1 font-mono text-xs">
          <button
            onClick={() => setRsiMethod('height_gct')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              rsiMethod === 'height_gct'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.rsiConsole.heightGctMethod}
          </button>
          <button
            onClick={() => setRsiMethod('flight_gct')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              rsiMethod === 'flight_gct'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.rsiConsole.flightGctMethod}
          </button>
        </div>
      </div>

      {/* Video Uploader Frame */}
      <div className="p-6 bg-zinc-900/60 rounded-3xl border border-zinc-800 relative">
        {!videoSrc && (
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <div className="flex-1 relative cursor-pointer group">
              <input
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileUpload}
                ref={cameraInputRef}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="btn-volt w-full text-center py-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg">
                <Zap size={18} />
                <span>{t.jumpConsole.openCamera}</span>
              </div>
            </div>
            <div className="flex-1 relative cursor-pointer group">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-center py-6 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all">
                <Play size={18} className="text-[#D4FF00]" />
                <span>{t.jumpConsole.selectVideo}</span>
              </div>
            </div>
          </div>
        )}

        {videoSrc && (
          <div className="flex flex-col items-center w-full relative">
            <button
              onClick={clearVideo}
              className="absolute top-2 right-2 rtl:right-auto rtl:left-2 z-20 bg-rose-600 hover:bg-rose-500 text-white p-2.5 rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer"
            >
              <X size={16} />
            </button>
            
            <div className="relative inline-block border-2 border-zinc-800 rounded-3xl overflow-hidden mb-5 shadow-2xl bg-black max-w-full">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                muted
                preload="auto"
                className="max-h-80 w-auto object-contain"
                onLoadedMetadata={() => {
                  if (videoRef.current) setDuration(videoRef.current.duration);
                }}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            {/* Video Controls & Time Points Setter */}
            <div className="w-full bg-[#121215] p-4 rounded-2xl border border-zinc-800 mb-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-xl bg-zinc-800 text-white hover:text-[#D4FF00]"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <span ref={currentTimeDesktopRef} className="font-bold text-[#D4FF00]">
                    {currentTime.toFixed(3)}s
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span>Slow-Mo FPS:</span>
                  <select
                    value={cameraFps}
                    onChange={e => setCameraFps(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="240">240 FPS (8x Slow)</option>
                    <option value="120">120 FPS (4x Slow)</option>
                    <option value="60">60 FPS (2x Slow)</option>
                    <option value="30">30 FPS (Realtime)</option>
                  </select>
                </div>
              </div>

              {/* Set Phase Buttons */}
              <div className="grid grid-cols-3 gap-2.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setTouchdownTime(currentTime)}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    touchdownTime > 0 ? 'bg-[#D4FF00]/15 border-[#D4FF00] text-[#D4FF00]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="block text-[10px] text-zinc-500">1. TOUCHDOWN</span>
                  <span>{touchdownTime > 0 ? `${touchdownTime.toFixed(3)}s` : 'Set Time'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTakeoffTime(currentTime)}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    takeoffTime > 0 ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="block text-[10px] text-zinc-500">2. TAKEOFF</span>
                  <span>{takeoffTime > 0 ? `${takeoffTime.toFixed(3)}s` : 'Set Time'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLandingTime(currentTime)}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    landingTime > 0 ? 'bg-[#FF5500]/15 border-[#FF5500] text-[#FF5500]' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="block text-[10px] text-zinc-500">3. LANDING</span>
                  <span>{landingTime > 0 ? `${landingTime.toFixed(3)}s` : 'Set Time'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results HUD in Acid Volt */}
      {showResults && (
        <div className="bento-card p-6 border-[#D4FF00]/40 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h4 className="text-base font-heading font-black text-white">
                Biomechanical RSI Telemetry Output
              </h4>
              <p className="text-xs text-zinc-400 font-mono">
                Formula: {rsiMethod === 'height_gct' ? 'Height(m) / GCT(s)' : 'Flight(s) / GCT(s)'}
              </p>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
              stats.gctAnalysis.classification === 'Fast SSC' ? 'badge-volt' : stats.gctAnalysis.classification === 'Moderate SSC' ? 'badge-amber' : 'badge-rose'
            }`}>
              {stats.gctAnalysis.classification}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">{t.rsiConsole.rsiScore}</span>
              <span className="text-4xl font-black text-[#D4FF00] block my-1">
                {stats.rsi}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">{t.rsiConsole.contactTime}</span>
              <span className="text-3xl font-black text-white block my-1">
                {(parseFloat(stats.contactTime) * 1000).toFixed(0)} ms
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">{t.rsiConsole.jumpHeight}</span>
              <span className="text-3xl font-black text-white block my-1">
                {stats.heightCm} cm
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-[10px] text-zinc-500 block uppercase">Leg Stiffness</span>
              <span className="text-3xl font-black text-[#FF5500] block my-1">
                {stats.legStiffness} kN/m
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={saveMeasurement}
              disabled={isSaving}
              className="btn-volt flex-1 py-3.5 rounded-xl text-sm font-black shadow-lg flex items-center justify-center gap-2"
            >
              {isSaving ? '⏳' : <Save size={16} />}
              <span>{isSaving ? t.common.saving : t.rsiConsole.saveRsiTest}</span>
            </button>
          </div>

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] font-bold text-center text-xs flex items-center justify-center gap-2 font-sans">
              <Check size={16} />
              <span>{t.common.success} — Saved to Athlete Dossier!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
