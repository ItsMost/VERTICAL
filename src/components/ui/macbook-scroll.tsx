"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import {
  Sun,
  Moon,
  Volume,
  Volume1,
  Volume2,
  Mic,
  Search,
  Globe,
  Command,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Table,
  Play,
  Pause,
  RotateCcw,
  Video,
  Download,
  Check,
  Sparkles
} from "lucide-react";
import html2canvas from "html2canvas";

export const MacbookScroll = ({
  src,
  children,
  showGradient = false,
  title,
  badge,
}: {
  src?: string;
  children?: React.ReactNode;
  showGradient?: boolean;
  title?: string | React.ReactNode;
  badge?: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const screenContentRef = useRef<HTMLDivElement>(null);

  // Video Animation & Player State
  const [isPlaying, setIsPlaying] = useState(true);
  const [animProgress, setAnimProgress] = useState(0); // 0 (closed lid) to 1 (full open & scrolled)
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordSuccess, setRecordSuccess] = useState(false);

  // Auto-play animation timer
  useEffect(() => {
    let animFrame: number;
    let startTime: number | null = null;
    const duration = 4000; // 4 seconds total loop

    if (isPlaying) {
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const p = Math.min(elapsed / duration, 1);
        setAnimProgress(p);

        if (p < 1) {
          animFrame = requestAnimationFrame(step);
        } else {
          // Loop or pause at end
          setTimeout(() => {
            startTime = null;
            if (isPlaying) animFrame = requestAnimationFrame(step);
          }, 1000);
        }
      };
      animFrame = requestAnimationFrame(step);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isPlaying]);

  // Derived 3D transform values from animProgress
  // 0 to 0.4: Lid opens from -70deg to 0deg
  // 0.4 to 1.0: Card scrolls down inside the laptop screen
  const lidRotateX = Math.min(-70 + (animProgress / 0.4) * 70, 0);
  const scrollOffset = animProgress > 0.3 ? (animProgress - 0.3) / 0.7 * 140 : 0;

  // Video Export Recording Function (HTML2Canvas + MediaRecorder WebM stream)
  const handleRecordVideo = async () => {
    if (!containerRef.current || isRecording) return;
    setIsRecording(true);
    setRecordProgress(10);
    setRecordSuccess(false);

    try {
      const canvas = await html2canvas(containerRef.current, {
        scale: 1.5,
        backgroundColor: '#05070e',
        useCORS: true,
        logging: false
      });

      setRecordProgress(50);

      // Create stream from canvas
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
        const a = document.createElement('a');
        a.href = url;
        a.download = `vertical_lab_3d_dossier_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        setIsRecording(false);
        setRecordProgress(100);
        setRecordSuccess(true);
        setTimeout(() => setRecordSuccess(false), 4000);
      };

      mediaRecorder.start();
      setRecordProgress(80);

      // Record 3.5 seconds of video
      setTimeout(() => {
        mediaRecorder.stop();
      }, 3500);

    } catch (err) {
      console.error("Video Generation Error:", err);
      setIsRecording(false);
      alert("تعذر توليد الفيديو تلقائياً على هذا المتصفح. يمكنك حفظ الصورة بدلاً من ذلك.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-4 space-y-6">
      
      {/* 🎬 VIDEO CONTROL TOOLBAR */}
      <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-950/90 border border-cyan-500/40 p-3 rounded-2xl shadow-xl shadow-cyan-500/10">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
            isPlaying ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
          }`}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          <span>{isPlaying ? 'إيقاف مؤقت (Pause 3D)' : 'تشغيل حركة الفيديو (Play 3D Video)'}</span>
        </button>

        <button
          onClick={() => {
            setAnimProgress(0);
            setIsPlaying(true);
          }}
          className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-gray-800 transition-all cursor-pointer"
        >
          <RotateCcw size={14} />
          <span>إعادة تشغيل (Replay)</span>
        </button>

        <button
          onClick={handleRecordVideo}
          disabled={isRecording}
          className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {isRecording ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>جاري تسجيل الفيديو ({recordProgress}%)...</span>
            </>
          ) : recordSuccess ? (
            <>
              <Check size={16} className="text-emerald-400" />
              <span>تم تحميل الفيديو بنجاح! 🎬</span>
            </>
          ) : (
            <>
              <Video size={16} />
              <span>🎬 توليد وتنزيل فيديو WebM</span>
            </>
          )}
        </button>
      </div>

      {/* 💻 3D MACBOOK CONTAINER */}
      <div
        ref={containerRef}
        className="flex flex-col items-center justify-center p-6 bg-[#050711] rounded-3xl border border-cyan-500/30 shadow-2xl relative max-w-full overflow-hidden"
      >
        {/* Title */}
        <div className="mb-6 text-center text-white">
          {title || (
            <span className="text-lg font-bold">
              VERTICAL LAB — 3D Athlete Dossier
            </span>
          )}
        </div>

        {/* Laptop Frame Wrapper */}
        <div className="relative flex flex-col items-center [perspective:1000px] w-[34rem] max-w-full">
          
          {/* Laptop Screen Lid */}
          <div
            style={{
              transform: `rotateX(${lidRotateX}deg)`,
              transformOrigin: "bottom",
              transformStyle: "preserve-3d",
              transition: isPlaying ? "none" : "transform 0.5s ease-out"
            }}
            className="relative h-[20rem] w-[32rem] max-w-full rounded-2xl bg-[#010101] p-2.5 shadow-2xl border-2 border-cyan-500/40 z-20"
          >
            {/* Screen Bezel & Content */}
            <div className="relative h-full w-full rounded-xl bg-[#05070e] overflow-hidden border border-cyan-500/30">
              
              {/* Screen Web Camera */}
              <div className="absolute top-1.5 inset-x-0 mx-auto w-3 h-3 rounded-full bg-[#111] border border-gray-800 flex items-center justify-center z-30">
                <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
              </div>

              {src ? (
                <img
                  src={src}
                  alt="screen content"
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div
                  ref={screenContentRef}
                  style={{
                    transform: `translateY(-${scrollOffset}px)`,
                    transition: isPlaying ? "none" : "transform 0.4s ease-out"
                  }}
                  className="h-full w-full overflow-y-auto bg-[#05070e] p-3 text-white"
                >
                  {children}
                </div>
              )}
            </div>
          </div>

          {/* Laptop Hinge & Base Chassis */}
          <div className="relative h-[11rem] w-[34rem] max-w-full overflow-hidden rounded-b-2xl bg-gradient-to-b from-[#1e1e20] to-[#0a0a0c] border border-gray-800 p-2 shadow-2xl z-10 -mt-1">
            
            {/* Above Keyboard Bar & Hinge */}
            <div className="relative h-4 w-full flex justify-center items-center mb-1">
              <div className="h-2.5 w-[85%] bg-[#050505] rounded-full border border-gray-900 shadow-inner" />
            </div>

            {/* Keyboard & Speakers Row */}
            <div className="relative flex items-center justify-between px-2">
              <div className="w-[8%]">
                <SpeakerGrid />
              </div>
              <div className="w-[82%]">
                <Keypad />
              </div>
              <div className="w-[8%]">
                <SpeakerGrid />
              </div>
            </div>

            {/* Trackpad */}
            <Trackpad />

            {/* Laptop Base Opening Notch */}
            <div className="absolute inset-x-0 bottom-0 mx-auto h-1.5 w-16 rounded-t-xl bg-gradient-to-t from-[#272729] to-[#050505]" />
            {badge && <div className="absolute bottom-2 left-3">{badge}</div>}
          </div>

        </div>
      </div>
    </div>
  );
};

export const Trackpad = () => {
  return (
    <div
      className="mx-auto my-1 h-12 w-[35%] rounded-lg border border-gray-800 bg-[#0d0d0f]"
      style={{
        boxShadow: "0px 0px 2px 1px #00000040 inset",
      }}
    ></div>
  );
};

export const Keypad = () => {
  return (
    <div className="mx-1 h-full rounded-md bg-[#050505] p-1 border border-gray-900">
      {/* First Row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn className="w-7 text-[4px]">esc</KBtn>
        <KBtn><Sun className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Sun className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Table className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Search className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Mic className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Moon className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Volume className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Volume1 className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Volume2 className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Volume2 className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Volume1 className="h-[5px] w-[5px]" /></KBtn>
        <KBtn><Volume className="h-[5px] w-[5px]" /></KBtn>
        <KBtn className="w-6">
          <div className="h-2 w-2 rounded-full bg-cyan-500/40" />
        </KBtn>
      </div>

      {/* Second row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn>`</KBtn><KBtn>1</KBtn><KBtn>2</KBtn><KBtn>3</KBtn><KBtn>4</KBtn><KBtn>5</KBtn><KBtn>6</KBtn><KBtn>7</KBtn><KBtn>8</KBtn><KBtn>9</KBtn><KBtn>0</KBtn><KBtn>-</KBtn><KBtn>=</KBtn>
        <KBtn className="w-8">del</KBtn>
      </div>

      {/* Third row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn className="w-8">tab</KBtn>
        <KBtn>Q</KBtn><KBtn>W</KBtn><KBtn>E</KBtn><KBtn>R</KBtn><KBtn>T</KBtn><KBtn>Y</KBtn><KBtn>U</KBtn><KBtn>I</KBtn><KBtn>O</KBtn><KBtn>P</KBtn>
        <KBtn>[</KBtn><KBtn>]</KBtn><KBtn>\</KBtn>
      </div>

      {/* Fourth Row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn className="w-9">caps</KBtn>
        <KBtn>A</KBtn><KBtn>S</KBtn><KBtn>D</KBtn><KBtn>F</KBtn><KBtn>G</KBtn><KBtn>H</KBtn><KBtn>J</KBtn><KBtn>K</KBtn><KBtn>L</KBtn>
        <KBtn>;</KBtn><KBtn>&apos;</KBtn>
        <KBtn className="w-9">return</KBtn>
      </div>

      {/* Fifth Row */}
      <div className="mb-[2px] flex w-full shrink-0 gap-[2px]">
        <KBtn className="w-10">shift</KBtn>
        <KBtn>Z</KBtn><KBtn>X</KBtn><KBtn>C</KBtn><KBtn>V</KBtn><KBtn>B</KBtn><KBtn>N</KBtn><KBtn>M</KBtn>
        <KBtn>,</KBtn><KBtn>.</KBtn><KBtn>/</KBtn>
        <KBtn className="w-10">shift</KBtn>
      </div>

      {/* Sixth Row */}
      <div className="flex w-full shrink-0 gap-[2px]">
        <KBtn className="w-6"><Globe className="h-[5px] w-[5px]" /></KBtn>
        <KBtn className="w-6"><ChevronUp className="h-[5px] w-[5px]" /></KBtn>
        <KBtn className="w-6">opt</KBtn>
        <KBtn className="w-7"><Command className="h-[5px] w-[5px]" /></KBtn>
        <KBtn className="w-[6.5rem] bg-gray-900/60"></KBtn>
        <KBtn className="w-7"><Command className="h-[5px] w-[5px]" /></KBtn>
        <KBtn className="w-6">opt</KBtn>
        <div className="flex gap-[1px]">
          <KBtn className="w-4"><ChevronLeft className="h-[5px] w-[5px]" /></KBtn>
          <div className="flex flex-col gap-[1px]">
            <KBtn className="h-2 w-4"><ChevronUp className="h-[4px] w-[4px]" /></KBtn>
            <KBtn className="h-2 w-4"><ChevronDown className="h-[4px] w-[4px]" /></KBtn>
          </div>
          <KBtn className="w-4"><ChevronRight className="h-[5px] w-[5px]" /></KBtn>
        </div>
      </div>
    </div>
  );
};

export const KBtn = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded-[3px] bg-[#0c0c0f] border border-gray-900 text-[5px] text-gray-300 font-mono font-bold",
        className
      )}
    >
      {children}
    </div>
  );
};

export const SpeakerGrid = () => {
  return (
    <div
      className="mt-1 flex h-16 gap-[1px] px-[0.5px]"
      style={{
        backgroundImage:
          "radial-gradient(circle, #222 0.5px, transparent 0.5px)",
        backgroundSize: "2px 2px",
      }}
    ></div>
  );
};
