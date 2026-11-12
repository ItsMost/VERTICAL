import { useState, useEffect, useRef } from 'react';
import { toast } from './components/Toast';
import useJumpMechanics from './useJumpMechanics';
import AnimatedCounter from './components/AnimatedCounter';
import { ExportProgressOverlay, ExportSuccessModal } from './components/jump-console/ExportOverlays';
import { supportsStandingJumpModels } from './lib/testTypes';
import { useData } from './context/DataContext';
import type { Player, JumpMeasurement } from './types/athletics';
import { Activity, ScanEye, X, Play, Pause, Focus, Save, Video } from 'lucide-react';

export default function JumpTestingConsole({ 
  activePlayer, 
  selectedPlayerId, 
  onSaveSuccess, 
  displayUnit, 
  setDisplayUnit,
  language = 'ar',
  playerHistory
}: {
  activePlayer: Player | null;
  selectedPlayerId: string;
  onSaveSuccess?: (m: JumpMeasurement) => void;
  displayUnit?: string;
  setDisplayUnit?: (u: string) => void;
  language?: string;
  playerHistory?: JumpMeasurement[];
}) {
  const { addMeasurement, updatePlayerFields, t: tr } = useData();
  // Video & Playback States
  const [videoPreset, setVideoPreset] = useState('slow240');
  const [cameraFps, setCameraFps] = useState(240);
  const [videoFps, setVideoFps] = useState(30);
  const [isFpsAutoDetected, setIsFpsAutoDetected] = useState(false);
  const [aiDetectedFrameDuration, setAiDetectedFrameDuration] = useState<any>(null);
  
  const [takeoffTime, setTakeoffTime] = useState(0);
  const [landingTime, setLandingTime] = useState(0);
  const [bodyMass, setBodyMass] = useState(72);
  const [legLength, setLegLength] = useState(1.0);
  const [videoSrc, setVideoSrc] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [legUsed, setLegUsed] = useState('both');
  const [jumpType, setJumpType] = useState('cmj');
  const [boxHeight, setBoxHeight] = useState(30);
  const [boxTouchdownTime, setBoxTouchdownTime] = useState(0);

  const [activeSettingsTab, setActiveSettingsTab] = useState('analysis');
  const [timeCalculationMethod, setTimeCalculationMethod] = useState('fps');
  const [manualFrameDuration, setManualFrameDuration] = useState(0.033);
  const [isFrameDurationManual, setIsFrameDurationManual] = useState(false);

  const [playerHeight, setPlayerHeight] = useState(0);
  const [standingReach, setStandingReach] = useState(0);
  const [maxTouchHeight, setMaxTouchHeight] = useState('');

  const [saveJumpTag, setSaveJumpTag] = useState('sj_no_arms');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportedVideoUrl, setExportedVideoUrl] = useState<any>(null);
  const [exportedVideoBlob, setExportedVideoBlob] = useState<any>(null);
  const [exportedVideoName, setExportedVideoName] = useState('');

  const [landingCorrectionMode, setLandingCorrectionMode] = useState('none');
  const [jumpPhases, setJumpPhases] = useState<any>(null);
  
  // MediaPipe AI tracking states
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const poseRef = useRef<any>(null);
  const flightDataRef = useRef<any[]>([]);
  
  // FPS auto-detection state
  const [isFpsDetectionActive, setIsFpsDetectionActive] = useState(false);

  // Mobile Viewport detection
  const [isMobile, setIsMobile] = useState(false);

  // Calibration States
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [referenceLength, setReferenceLength] = useState(0.90);
  const [pixelsPerMeter, setPixelsPerMeter] = useState<any>(null);
  const [trackedJumpHeight, setTrackedJumpHeight] = useState<any>(null);
  const calibrationClicksRef = useRef<any[]>([]);

  // Jog Wheel States & Refs
  const jogWheelRef = useRef<any>(null);
  const [jogAngle, setJogAngle] = useState(0);
  const isDraggingJog = useRef(false);
  const lastAngle = useRef(0);

  const canvasRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const fileInputRef = useRef<any>(null);
  const cameraInputRef = useRef<any>(null);
  const reqRef = useRef<any>(null);
  const lastSeekTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef<any>(null);
  const pendingSeekTimeRef = useRef<any>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentTimeMobileRef = useRef<any>(null);
  const currentFrameMobileRef = useRef<any>(null);
  const currentTimeDesktopRef = useRef<any>(null);
  const currentFrameDesktopRef = useRef<any>(null);

  // Sync with activePlayer when changed
  useEffect(() => {
    if (activePlayer) {
      setBodyMass(activePlayer.weight_kg || 72);
      setLegLength(activePlayer.leg_length_m || 1.0);
      // Height / reach come from lab_players (localStorage values are migrated on load)
      setPlayerHeight(Number(activePlayer.height_cm) || 0);
      setStandingReach(Number(activePlayer.standing_reach_cm) || 0);
    }
  }, [activePlayer]);

  // Sync manualFrameDuration with cameraFps
  useEffect(() => {
    if (!isFrameDurationManual) {
      setManualFrameDuration(parseFloat((1 / cameraFps).toFixed(6)));
    }
  }, [cameraFps, isFrameDurationManual]);

  // Load MediaPipe scripts on mount
  useEffect(() => {
    const loadScript = (src: any) => {
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
            clearInterval(checkInterval);
            setScriptsLoaded(true);
          }
        }, 100);
      } catch (error: any) { console.error(error); }
    };
    loadMediaPipe();
  }, []);

  // AI MediaPipe pose results tracker
  useEffect(() => {
    if (!scriptsLoaded) return;
    const { Pose, POSE_CONNECTIONS, drawConnectors, drawLandmarks } = window;
    const pose = new Pose({ locateFile: (file: any) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    
    pose.onResults((results: any) => {
      const canvasCtx = canvasRef.current?.getContext('2d');
      if (!canvasCtx || !canvasRef.current) return;
      
      // Auto sync canvas dimensions
      if (results.image.width && canvasRef.current.width !== results.image.width) {
        canvasRef.current.width = results.image.width;
        canvasRef.current.height = results.image.height;
      }
      
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw standard calibration points overlay
      const clicks = calibrationClicksRef.current;
      if (clicks.length > 0) {
        canvasCtx.fillStyle = '#F5B544'; 
        canvasCtx.strokeStyle = '#ffffff'; 
        canvasCtx.lineWidth = 3;
        clicks.forEach(click => {
          canvasCtx.beginPath(); 
          canvasCtx.arc(click.x, click.y, 8, 0, 2 * Math.PI); 
          canvasCtx.fill(); 
          canvasCtx.stroke();
        });
        if (clicks.length === 2) {
          canvasCtx.beginPath(); 
          canvasCtx.moveTo(clicks[0].x, clicks[0].y); 
          canvasCtx.lineTo(clicks[1].x, clicks[1].y);
          canvasCtx.strokeStyle = '#F5B544'; 
          canvasCtx.lineWidth = 3; 
          canvasCtx.stroke();
        }
      }
      
      if (results.poseLandmarks) {
        const lm = results.poseLandmarks;
        const leftHip = lm[23];
        const leftKnee = lm[25];
        const leftAnkle = lm[27];
        const leftShoulder = lm[11];
        
        const rightHip = lm[24];
        const rightKnee = lm[26];
        const rightAnkle = lm[28];
        const rightShoulder = lm[12];

        // Biomechanical Angle Tracking
        let leftKneeAngle = 180;
        let rightKneeAngle = 180;
        let leftHipAngle = 180;
        let rightHipAngle = 180;

        const calculateAngle = (a: any, b: any, c: any) => {
          const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
          let angle = Math.abs((radians * 180.0) / Math.PI);
          if (angle > 180.0) angle = 360.0 - angle;
          return angle;
        };

        if (leftHip && leftKnee && leftAnkle && leftHip.visibility > 0.5 && leftKnee.visibility > 0.5 && leftAnkle.visibility > 0.5) {
          leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        }
        if (rightHip && rightKnee && rightAnkle && rightHip.visibility > 0.5 && rightKnee.visibility > 0.5 && rightAnkle.visibility > 0.5) {
          rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        }
        if (leftShoulder && leftHip && leftKnee && leftShoulder.visibility > 0.5 && leftHip.visibility > 0.5 && leftKnee.visibility > 0.5) {
          leftHipAngle = calculateAngle(leftShoulder, leftHip, leftKnee);
        }
        if (rightShoulder && rightHip && rightKnee && rightShoulder.visibility > 0.5 && rightHip.visibility > 0.5 && rightKnee.visibility > 0.5) {
          rightHipAngle = calculateAngle(rightShoulder, rightHip, rightKnee);
        }

        // Draw skeleton overlay only if AI is enabled
        if (aiEnabled) {
          drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#D97757', lineWidth: 3 }); 
          drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ffffff', lineWidth: 1 });

          if (leftKnee && leftKnee.visibility > 0.5) {
            const kx = leftKnee.x * canvasRef.current.width;
            const ky = leftKnee.y * canvasRef.current.height;
            canvasCtx.fillStyle = '#D97757';
            canvasCtx.font = 'bold 13px Cairo';
            canvasCtx.fillText(`ركبة L: ${leftKneeAngle.toFixed(0)}°`, kx - 75, ky);
          }
          if (rightKnee && rightKnee.visibility > 0.5) {
            const kx = rightKnee.x * canvasRef.current.width;
            const ky = rightKnee.y * canvasRef.current.height;
            canvasCtx.fillStyle = '#22C55E';
            canvasCtx.font = 'bold 13px Cairo';
            canvasCtx.fillText(`ركبة R: ${rightKneeAngle.toFixed(0)}°`, kx + 15, ky);
          }
        }

        // Keep coordinates continuously if AI is enabled and video is playing
        if (aiEnabled && videoRef.current && !videoRef.current.paused) {
          const feetYPoints = [
            lm[27]?.y || 0, lm[28]?.y || 0, 
            lm[29]?.y || 0, lm[30]?.y || 0, 
            lm[31]?.y || 0, lm[32]?.y || 0  
          ].filter(y => y > 0);

          if (feetYPoints.length > 0) {
            const lowestY = Math.max(...feetYPoints); 
            const avgHipY = ((leftHip?.y + rightHip?.y) / 2) * canvasRef.current.height;
            
            flightDataRef.current.push({ 
              time: videoRef.current.currentTime, 
              y: lowestY,
              hipY: avgHipY,
              leftKnee: leftKneeAngle,
              rightKnee: rightKneeAngle,
              leftHip: leftHipAngle,
              rightHip: rightHipAngle,
              landmarks: lm
            });
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
        if (aiEnabled && !isProcessing && video.readyState >= 2) { 
          isProcessing = true; 
          await pose.send({ image: video }); 
          isProcessing = false; 
        } 
      } 
      reqRef.current = requestAnimationFrame(processFrame); 
    };
    processFrame();
    return () => { cancelAnimationFrame(reqRef.current); pose.close(); };
  }, [scriptsLoaded, aiEnabled]);

  // Mobile viewport detection listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint is 1024px
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Trigger FPS detection when active
  useEffect(() => {
    if (isFpsDetectionActive && videoSrc && videoRef.current) {
      setIsFpsAutoDetected(false);
      const timer = setTimeout(() => {
        detectVideoFps(videoRef.current);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!isFpsDetectionActive) {
      setIsFpsAutoDetected(false);
      setAiDetectedFrameDuration(null);
    }
  }, [isFpsDetectionActive, videoSrc]);

  // Sync canvas size
  useEffect(() => {
    if (videoSrc && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const resize = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      };
      video.addEventListener('loadedmetadata', resize);
      // Run once initially to capture if metadata already loaded
      if (video.videoWidth) resize();
      return () => video.removeEventListener('loadedmetadata', resize);
    }
  }, [videoSrc]);

  // Seek and update tracking frame
  const performSeek = (time: any) => {
    const video = videoRef.current;
    if (!video) return;

    const safeTime = Math.max(0.01, Math.min(time, duration - 0.01));

    if (isSeekingRef.current) {
      pendingSeekTimeRef.current = safeTime;
      return;
    }

    isSeekingRef.current = true;
    setIsSeeking(true);

    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      handleVideoSeeked();
    }, 200);

    try {
      video.currentTime = safeTime;
    } catch (err: any) {
      console.error("Seeking error:", err);
      isSeekingRef.current = false;
      setIsSeeking(false);
    }
  };

  const handleVideoSeeked = () => {
    isSeekingRef.current = false;
    setIsSeeking(false);

    if (pendingSeekTimeRef.current !== null) {
      const nextTime = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      performSeek(nextTime);
    }
  };

  const handleTimeUpdate = () => {
    if (isDragging) return;
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const detectVideoFps = (videoEl: any) => {
    if (!videoEl || !videoEl.duration) return;
    
    if (videoEl.requestVideoFrameCallback) {
      let frameCount = 0;
      let startTime = null;
      let lastMediaTime = null;
      const frameDiffs = [];
      
      const callback = (now: any, metadata: any) => {
        if (startTime === null) {
          startTime = now;
          lastMediaTime = metadata.mediaTime;
          frameCount++;
          videoEl.requestVideoFrameCallback(callback);
          return;
        }
        
        if (lastMediaTime !== null && metadata.mediaTime > lastMediaTime) {
          frameDiffs.push(metadata.mediaTime - lastMediaTime);
        }
        lastMediaTime = metadata.mediaTime;
        frameCount++;
        
        if (frameDiffs.length < 15 && (now - startTime) < 2000) {
          videoEl.requestVideoFrameCallback(callback);
        } else {
          videoEl.pause();
          if (frameDiffs.length >= 5) {
            const sorted = [...frameDiffs].sort((a, b) => a - b);
            const trimCount = Math.floor(sorted.length * 0.2);
            const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
            const avgDiff = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
            
            if (avgDiff > 0) {
              const rawFps = 1 / avgDiff;
              const commonRates = [24, 25, 30, 50, 60, 120, 240];
              let bestMatch = commonRates.reduce((prev, curr) => 
                Math.abs(curr - rawFps) < Math.abs(prev - rawFps) ? curr : prev
              );
              const tolerance = bestMatch * 0.15;
              if (Math.abs(bestMatch - rawFps) <= tolerance) {
                setVideoFps(bestMatch);
                setCameraFps(bestMatch);
              } else {
                setVideoFps(Math.round(rawFps));
                setCameraFps(Math.round(rawFps));
              }
              setIsFpsAutoDetected(true);
              setAiDetectedFrameDuration(parseFloat(avgDiff.toFixed(6)));
            }
          } else {
            setVideoFps(30);
            setCameraFps(30);
            setIsFpsAutoDetected(false);
          }
        }
      };
      
      videoEl.currentTime = 0.5;
      setTimeout(() => {
        videoEl.requestVideoFrameCallback(callback);
        videoEl.play().catch(() => {
          setVideoFps(30); setCameraFps(30); setIsFpsAutoDetected(false);
        });
      }, 200);
    } else {
      setVideoFps(30); setCameraFps(30); setIsFpsAutoDetected(false);
    }
  };

  const handleFileUpload = (e: any) => { 
    const file = e.target.files[0]; 
    if (file) { 
      setVideoSrc(URL.createObjectURL(file)); 
      setAiDetectedFrameDuration(null); 
      setIsFpsDetectionActive(false);
      flightDataRef.current = [];
      setJumpPhases(null);
    } 
  };

  const clearVideo = () => { 
    setVideoSrc(null); 
    setTakeoffTime(0); 
    setLandingTime(0); 
    setCurrentTime(0); 
    setIsPlaying(false); 
    setShowResults(false); 
    setAiDetectedFrameDuration(null); 
    setIsFpsDetectionActive(false);
    flightDataRef.current = [];
    setJumpPhases(null);
  };

  const autoDetectJump = () => {
    const data = flightDataRef.current;
    if (data.length < 15) return toast.info("يرجى تشغيل الفيديو بالكامل مع تفعيل الذكاء الاصطناعي لجمع إحداثيات القفزة.");
    
    const getAvgKneeAngleAt = (frameData: any) => {
      if (!frameData) return 180;
      const leftValid = frameData.leftKnee > 0 && frameData.leftKnee < 180;
      const rightValid = frameData.rightKnee > 0 && frameData.rightKnee < 180;
      if (leftValid && rightValid) return (frameData.leftKnee + frameData.rightKnee) / 2;
      if (leftValid) return frameData.leftKnee;
      if (rightValid) return frameData.rightKnee;
      return 180;
    };

    // --- Step 1: Apply moving average smoothing to foot Y and hip Y data ---
    const smoothed = data.map((d, i) => {
      const start = Math.max(0, i - 2);
      const end = Math.min(data.length - 1, i + 2);
      let sumY = 0, sumHipY = 0, count = 0;
      for (let k = start; k <= end; k++) {
        sumY += data[k].y;
        sumHipY += data[k].hipY;
        count++;
      }
      return { 
        ...d, 
        y: sumY / count, 
        hipY: sumHipY / count 
      };
    });
    
    // --- Step 2: Establish ground baseline and groundY ---
    const sortedByY = [...smoothed].sort((a, b) => b.y - a.y);
    const groundSampleCount = Math.max(3, Math.floor(smoothed.length * 0.1));
    const groundY = sortedByY.slice(0, groundSampleCount).reduce((sum, d) => sum + d.y, 0) / groundSampleCount;
    
    const minY = Math.min(...smoothed.map(d => d.y));
    const yRange = groundY - minY;
    
    let takeoffIndex = -1;
    let landingIndex = -1;
    let boxTouchdownIndex = -1;
    
    // --- Step 3: Event detection based on jump type ---
    if (jumpType === 'dj') {
      const tdThreshold = groundY - (yRange * 0.05);
      for (let i = 0; i < smoothed.length; i++) {
        if (smoothed[i].y >= tdThreshold) {
          boxTouchdownIndex = i;
          break;
        }
      }
      if (boxTouchdownIndex === -1) boxTouchdownIndex = 0;
      setBoxTouchdownTime(smoothed[boxTouchdownIndex].time);
      
      for (let i = boxTouchdownIndex + 3; i < smoothed.length; i++) {
        if (smoothed[i].y < tdThreshold) {
          takeoffIndex = i;
          break;
        }
      }
    } else {
      const takeoffThreshold = groundY - Math.max(yRange * 0.15, 0.008);
      for (let i = 2; i < smoothed.length; i++) {
        const avgKnee = getAvgKneeAngleAt(smoothed[i]);
        if (smoothed[i].y < takeoffThreshold && avgKnee > 150) {
          takeoffIndex = i;
          break;
        }
      }
    }
    
    if (takeoffIndex === -1) {
      takeoffIndex = Math.floor(smoothed.length * 0.4);
    }
    
    const landingThreshold = groundY - Math.max(yRange * 0.08, 0.005);
    for (let i = takeoffIndex + 5; i < smoothed.length; i++) {
      if (smoothed[i].y >= landingThreshold) {
        landingIndex = i;
        break;
      }
    }
    if (landingIndex === -1) {
      landingIndex = Math.floor(smoothed.length * 0.7);
    }
    
    const tStart = smoothed[takeoffIndex].time;
    const tEnd = smoothed[landingIndex].time;
    
    setTakeoffTime(tStart);
    setLandingTime(tEnd);
    if (videoRef.current) {
      videoRef.current.currentTime = tStart;
    }
    setCurrentTime(tStart);
    
    // --- Step 4: Trace other biomechanical events ---
    let deepestSquatIndex = 0;
    let maxHipY = -1;
    const searchRangeEnd = takeoffIndex;
    const searchRangeStart = jumpType === 'dj' ? boxTouchdownIndex : 0;
    
    for (let i = searchRangeStart; i <= searchRangeEnd; i++) {
      if (smoothed[i] && smoothed[i].hipY > maxHipY) {
        maxHipY = smoothed[i].hipY;
        deepestSquatIndex = i;
      }
    }
    
    const standingFrames = smoothed.slice(0, Math.max(3, Math.floor(takeoffIndex * 0.15)));
    const standingHipY = standingFrames.reduce((sum, d) => sum + d.hipY, 0) / Math.max(1, standingFrames.length);
    
    let movementStartIndex = 0;
    for (let i = deepestSquatIndex; i >= 0; i--) {
      if (smoothed[i] && smoothed[i].hipY <= standingHipY + 1.5) {
        movementStartIndex = i;
        break;
      }
    }
    
    let apexIndex = takeoffIndex;
    let minHipY = 99999;
    for (let i = takeoffIndex; i <= landingIndex; i++) {
      if (smoothed[i] && smoothed[i].hipY < minHipY) {
        minHipY = smoothed[i].hipY;
        apexIndex = i;
      }
    }
    
    const landingFrameData = smoothed[landingIndex];
    const avgLandingKnee = getAvgKneeAngleAt(landingFrameData);
    
    let correctionMs = 0;
    if (avgLandingKnee < 165) {
      const diff = 175 - avgLandingKnee;
      correctionMs = Math.min(60, Math.max(0, Math.round(diff * 1.5)));
    }
    
    let displacementCm = 0;
    if (pixelsPerMeter && smoothed[deepestSquatIndex] && smoothed[apexIndex]) {
      const dispPixels = Math.max(0, smoothed[deepestSquatIndex].hipY - smoothed[apexIndex].hipY);
      displacementCm = (dispPixels / pixelsPerMeter) * 100;
    }
    
    const points = smoothed.map((d, i) => {
      const pixelDisp = standingHipY - d.hipY;
      const cmDisp = pixelsPerMeter ? (pixelDisp / pixelsPerMeter) * 100 : pixelDisp * 0.15;
      return {
        frame: i,
        time: d.time,
        displacement: cmDisp
      };
    });
    
    setJumpPhases({
      movementStart: smoothed[movementStartIndex] ? {
        frame: movementStartIndex,
        time: smoothed[movementStartIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[movementStartIndex]),
        hipDisplacement: 0
      } : null,
      deepestSquat: smoothed[deepestSquatIndex] ? {
        frame: deepestSquatIndex,
        time: smoothed[deepestSquatIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[deepestSquatIndex]),
        hipDisplacement: pixelsPerMeter ? ((smoothed[movementStartIndex].hipY - smoothed[deepestSquatIndex].hipY) / pixelsPerMeter) * 100 : -10
      } : null,
      takeoff: smoothed[takeoffIndex] ? {
        frame: takeoffIndex,
        time: smoothed[takeoffIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[takeoffIndex]),
        hipDisplacement: pixelsPerMeter ? ((smoothed[movementStartIndex].hipY - smoothed[takeoffIndex].hipY) / pixelsPerMeter) * 100 : 0
      } : null,
      apex: smoothed[apexIndex] ? {
        frame: apexIndex,
        time: smoothed[apexIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[apexIndex]),
        displacementCm: displacementCm,
        hipDisplacement: displacementCm
      } : null,
      landing: smoothed[landingIndex] ? {
        frame: landingIndex,
        time: smoothed[landingIndex].time,
        kneeAngle: avgLandingKnee,
        hipDisplacement: 0
      } : null,
      boxTouchdown: jumpType === 'dj' && boxTouchdownTime > 0 ? {
        frame: smoothed.findIndex(d => d.time >= boxTouchdownTime),
        time: boxTouchdownTime
      } : null,
      kneeAngleAtLanding: avgLandingKnee,
      correctionMs: correctionMs,
      points: points
    });
    
    if (pixelsPerMeter) {
      setTrackedJumpHeight(displacementCm.toFixed(1));
    }
    
    toast.success(`✅ تم تحديد مراحل الحركة بالذكاء الاصطناعي بنجاح! زاوية الركبة عند الهبوط: ${avgLandingKnee.toFixed(0)}° (تصحيح الهبوط: ${correctionMs}ms).`);
  };

  const calculateJumpPhasesFromData = () => {
    const data = flightDataRef.current;
    if (data.length < 5) return;
    
    const getAvgKneeAngleAt = (frameData: any) => {
      if (!frameData) return 180;
      const leftValid = frameData.leftKnee > 0 && frameData.leftKnee < 180;
      const rightValid = frameData.rightKnee > 0 && frameData.rightKnee < 180;
      if (leftValid && rightValid) return (frameData.leftKnee + frameData.rightKnee) / 2;
      if (leftValid) return frameData.leftKnee;
      if (rightValid) return frameData.rightKnee;
      return 180;
    };

    const smoothed = data.map((d, i) => {
      const start = Math.max(0, i - 2);
      const end = Math.min(data.length - 1, i + 2);
      let sumY = 0, sumHipY = 0, count = 0;
      for (let k = start; k <= end; k++) {
        sumY += data[k].y;
        sumHipY += data[k].hipY;
        count++;
      }
      return { 
        ...d, 
        y: sumY / count, 
        hipY: sumHipY / count 
      };
    });

    let takeoffIndex = smoothed.findIndex(d => d.time >= takeoffTime);
    let landingIndex = smoothed.findIndex(d => d.time >= landingTime);
    if (takeoffIndex === -1) takeoffIndex = Math.floor(smoothed.length * 0.4);
    if (landingIndex === -1) landingIndex = Math.floor(smoothed.length * 0.7);

    let deepestSquatIndex = 0;
    let maxHipY = -1;
    const searchRangeEnd = takeoffIndex;
    const searchRangeStart = jumpType === 'dj' && boxTouchdownTime > 0 
      ? smoothed.findIndex(d => d.time >= boxTouchdownTime) 
      : 0;
    
    for (let i = Math.max(0, searchRangeStart); i <= searchRangeEnd; i++) {
      if (smoothed[i] && smoothed[i].hipY > maxHipY) {
        maxHipY = smoothed[i].hipY;
        deepestSquatIndex = i;
      }
    }
    
    const standingFrames = smoothed.slice(0, Math.max(3, Math.floor(takeoffIndex * 0.15)));
    const standingHipY = standingFrames.reduce((sum, d) => sum + d.hipY, 0) / Math.max(1, standingFrames.length);
    
    let movementStartIndex = 0;
    for (let i = deepestSquatIndex; i >= 0; i--) {
      if (smoothed[i] && smoothed[i].hipY <= standingHipY + 1.5) {
        movementStartIndex = i;
        break;
      }
    }
    
    let apexIndex = takeoffIndex;
    let minHipY = 99999;
    for (let i = takeoffIndex; i <= landingIndex; i++) {
      if (smoothed[i] && smoothed[i].hipY < minHipY) {
        minHipY = smoothed[i].hipY;
        apexIndex = i;
      }
    }
    
    const landingFrameData = smoothed[landingIndex] || smoothed[smoothed.length - 1];
    const avgLandingKnee = landingFrameData ? getAvgKneeAngleAt(landingFrameData) : 180;
    
    let correctionMs = 0;
    if (avgLandingKnee < 165) {
      const diff = 175 - avgLandingKnee;
      correctionMs = Math.min(60, Math.max(0, Math.round(diff * 1.5)));
    }
    
    let displacementCm = 0;
    if (pixelsPerMeter && smoothed[deepestSquatIndex] && smoothed[apexIndex]) {
      const dispPixels = Math.max(0, smoothed[deepestSquatIndex].hipY - smoothed[apexIndex].hipY);
      displacementCm = (dispPixels / pixelsPerMeter) * 100;
    }
    
    const points = smoothed.map((d, i) => {
      const pixelDisp = standingHipY - d.hipY;
      const cmDisp = pixelsPerMeter ? (pixelDisp / pixelsPerMeter) * 100 : pixelDisp * 0.15;
      return {
        frame: i,
        time: d.time,
        displacement: cmDisp
      };
    });
    
    setJumpPhases({
      movementStart: smoothed[movementStartIndex] ? {
        frame: movementStartIndex,
        time: smoothed[movementStartIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[movementStartIndex]),
        hipDisplacement: 0
      } : null,
      deepestSquat: smoothed[deepestSquatIndex] ? {
        frame: deepestSquatIndex,
        time: smoothed[deepestSquatIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[deepestSquatIndex]),
        hipDisplacement: pixelsPerMeter ? ((smoothed[movementStartIndex].hipY - smoothed[deepestSquatIndex].hipY) / pixelsPerMeter) * 100 : -10
      } : null,
      takeoff: smoothed[takeoffIndex] ? {
        frame: takeoffIndex,
        time: smoothed[takeoffIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[takeoffIndex]),
        hipDisplacement: pixelsPerMeter ? ((smoothed[movementStartIndex].hipY - smoothed[takeoffIndex].hipY) / pixelsPerMeter) * 100 : 0
      } : null,
      apex: smoothed[apexIndex] ? {
        frame: apexIndex,
        time: smoothed[apexIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[apexIndex]),
        displacementCm: displacementCm,
        hipDisplacement: displacementCm
      } : null,
      landing: smoothed[landingIndex] ? {
        frame: landingIndex,
        time: smoothed[landingIndex].time,
        kneeAngle: avgLandingKnee,
        hipDisplacement: 0
      } : null,
      boxTouchdown: jumpType === 'dj' && boxTouchdownTime > 0 ? {
        frame: smoothed.findIndex(d => d.time >= boxTouchdownTime),
        time: boxTouchdownTime
      } : null,
      kneeAngleAtLanding: avgLandingKnee,
      correctionMs: correctionMs,
      points: points
    });
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        if (videoRef.current.currentTime >= duration - 0.1) {
          videoRef.current.currentTime = 0.01;
          setCurrentTime(0.01);
        }
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const stepFrames = async (frames: any) => {
    if (!videoRef.current || duration <= 0) return;
    
    const video = videoRef.current;
    video.pause();
    setIsPlaying(false);
    
    const timeStep = frames / (videoFps || 30);
    let newTime = video.currentTime + timeStep;
    const safeTime = Math.max(0.01, Math.min(newTime, duration - 0.01));
    
    performSeek(safeTime);
    setJogAngle(prev => prev + (frames * 10)); // Rotate wheel visually
    
    try {
      const originalDisplay = video.style.display;
      video.style.display = 'none';
      video.offsetHeight; // Force reflow
      video.style.display = originalDisplay;

      if (video.paused) {
        video.play().then(() => {
          if (videoRef.current) videoRef.current.pause();
        }).catch(() => {});
      }
    } catch (err: any) {}
  };

  const drawCalibrationPoints = (clicksList = null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const list = clicksList || calibrationClicksRef.current;
    
    // Draw clicks
    list.forEach((click, idx) => {
      ctx.beginPath();
      ctx.arc(click.x, click.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = idx === 0 ? '#D97757' : '#D97757';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw line between them if there are 2 clicks
    if (list.length === 2) {
      ctx.beginPath();
      ctx.moveTo(list[0].x, list[0].y);
      ctx.lineTo(list[1].x, list[1].y);
      ctx.strokeStyle = '#D97757';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const handleCanvasClick = (e: any) => {
    if (!isCalibrating) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const newClicks = [...calibrationClicksRef.current, { x, y }];
    calibrationClicksRef.current = newClicks;
    setCalibrationStep(newClicks.length + 1);
    
    drawCalibrationPoints(newClicks);
    
    if (newClicks.length === 2) {
      const distInPixels = Math.hypot(newClicks[0].x - newClicks[1].x, newClicks[0].y - newClicks[1].y);
      const refLen = parseFloat(referenceLength) || 0.90;
      const ppm = distInPixels / refLen;
      setPixelsPerMeter(ppm);
      setLegLength(refLen); 
      setIsCalibrating(false);
      setCalibrationStep(0);
      toast.success(`✅ تمت معايرة طول الرجل بنجاح! مقياس الفيديو: ${ppm.toFixed(1)} بكسل لكل متر. تم ضبط طول الرجل على ${refLen} متر.`);
      
      setTimeout(() => {
        calibrationClicksRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 2000);
    }
  };

  // Jog Wheel Handlers
  const handleJogStart = (e: any) => {
    if (!videoRef.current || duration <= 0) return;
    e.preventDefault();
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    isDraggingJog.current = true;
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const rect = jogWheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    lastAngle.current = Math.atan2(clientY - centerY, clientX - centerX);
    
    document.addEventListener('mousemove', handleJogMove);
    document.addEventListener('mouseup', handleJogEnd);
    document.addEventListener('touchmove', handleJogMove, { passive: false });
    document.addEventListener('touchend', handleJogEnd);
  };

  const handleJogMove = (e: any) => {
    if (!isDraggingJog.current || !videoRef.current) return;
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    const rect = jogWheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const currentAngle = Math.atan2(clientY - centerY, clientX - centerX);
    let angleDiff = currentAngle - lastAngle.current;
    
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    const frameRate = videoFps || 30;
    const frameDuration = 1 / frameRate;
    const radiansPerFrame = 0.15; 
    const framesToSeek = angleDiff / radiansPerFrame;
    
    if (Math.abs(framesToSeek) >= 1) {
      const direction = Math.sign(framesToSeek);
      const frames = Math.round(Math.abs(framesToSeek)) * direction;
      
      const seekTime = videoRef.current.currentTime + (frames * frameDuration);
      const safeTime = Math.max(0.01, Math.min(seekTime, duration - 0.01));
      
      performSeek(safeTime);
      setCurrentTime(safeTime);
      
      const tStr = safeTime.toFixed(3) + 's';
      const fStr = 'F ' + Math.round(safeTime * frameRate);
      if (currentTimeMobileRef.current) currentTimeMobileRef.current.innerText = tStr;
      if (currentFrameMobileRef.current) currentFrameMobileRef.current.innerText = fStr;
      if (currentTimeDesktopRef.current) currentTimeDesktopRef.current.innerText = tStr;
      if (currentFrameDesktopRef.current) currentFrameDesktopRef.current.innerText = fStr;
      
      setJogAngle(prev => prev + (frames * 10));
      lastAngle.current = currentAngle;
    }
  };

  const handleJogEnd = () => {
    isDraggingJog.current = false;
    document.removeEventListener('mousemove', handleJogMove);
    document.removeEventListener('mouseup', handleJogEnd);
    document.removeEventListener('touchmove', handleJogMove);
    document.removeEventListener('touchend', handleJogEnd);
    
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().then(() => {
        if (videoRef.current) videoRef.current.pause();
      }).catch(() => {});
    }
  };



  const handleAnalyze = () => { 
    if (takeoffTime === 0 || landingTime === 0) {
      if (flightDataRef.current.length > 10) {
        autoDetectJump();
      } else {
        return toast.info("حدد الإقلاع والهبوط يدوياً أولاً، أو قم بتشغيل الفيديو بالكامل مع تفعيل الذكاء الاصطناعي لتتبع الحركة تلقائياً."); 
      }
    } else {
      if (flightDataRef.current.length > 5) {
        calculateJumpPhasesFromData();
      }
    }
    setShowResults(true); 
  };

  const getActiveCorrectionMs = () => {
    if (landingCorrectionMode === 'none') return 0;
    if (landingCorrectionMode === 'light') return 10;
    if (landingCorrectionMode === 'medium') return 25;
    if (landingCorrectionMode === 'heavy') return 50;
    return jumpPhases?.correctionMs || 0; 
  };
  const activeCorrectionMs = getActiveCorrectionMs();

  const manualFramePanel = (
    <div className="bg-black/15 border border-border p-3 rounded-2xl my-3 space-y-2" dir="rtl">
      <button
        type="button"
        onClick={() => {
          const next = timeCalculationMethod === 'manual' ? 'fps' : 'manual';
          setTimeCalculationMethod(next);
          if (next === 'manual' && !isFrameDurationManual) {
            setManualFrameDuration(parseFloat((1 / (cameraFps || 240)).toFixed(6)));
          }
        }}
        className={`w-full py-2 px-3 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
          timeCalculationMethod === 'manual'
            ? 'bg-warning/10 text-warning border-warning/30'
            : 'bg-black/30 text-muted border-border hover:text-white'
        }`}
      >
        {timeCalculationMethod === 'manual' ? 'الحساب بزمن الفريم اليدوي (مفعّل)' : 'الحساب بزمن الفريم اليدوي (معطّل)'}
      </button>
      {timeCalculationMethod === 'manual' && (
        <div>
          <label className="text-[9px] text-muted mb-1 block">
            زمن الفريم الحقيقي بالثانية (مثلاً 240fps = 0.004167)
          </label>
          <input
            type="number"
            step="0.000001"
            min="0.0001"
            value={manualFrameDuration}
            onChange={(e) => { setIsFrameDurationManual(true); setManualFrameDuration(e.target.value as any); }}
            className="w-full bg-surface/60 border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-warning"
          />
          <p className="text-[9px] text-faint mt-1 font-mono">
            = {(1 / (parseFloat(String(manualFrameDuration)) || 1)).toFixed(1)} FPS حقيقي · الفريمات تُعد من الفيديو بـ {videoFps} FPS
          </p>
        </div>
      )}
    </div>
  );

  const stats = useJumpMechanics(
    cameraFps,
    videoFps,
    takeoffTime,
    landingTime,
    bodyMass,
    legLength,
    boxTouchdownTime,
    activeCorrectionMs,
    jumpType,
    boxHeight,
    timeCalculationMethod === 'manual',
    parseFloat(manualFrameDuration) || 0.033,
    'height_gct',
    activePlayer?.hpo_m ?? null
  );

  const saveMeasurement = async () => {
    if (!selectedPlayerId) return; 
    setIsSaving(true);
    const powerVal = parseFloat(stats.sayersPeakPower);

    let finalTestType = saveJumpTag;
    if (jumpType === 'dj') {
      finalTestType = 'rsi';
    }

    const savedRecord = await addMeasurement({ 
      player_id: selectedPlayerId, 
      test_type: finalTestType, 
      jump_height_cm: stats.heightCm, 
      flight_time_sec: stats.flightTime, 
      contact_time_sec: stats.contactTime ? parseFloat(stats.contactTime) : null,
      rsi_score: stats.rsi ? parseFloat(stats.rsi) : null,
      box_height_cm: jumpType === 'dj' && boxHeight ? parseFloat(boxHeight) : null,
      takeoff_velocity_ms: stats.takeoffVelocity || null, 
      // Sayers / Samozino only describe standing SJ/CMJ, not approach or drop jumps
      mean_power_watts: supportsStandingJumpModels(finalTestType) ? stats.meanPower || null : null, 
      peak_power_watts: supportsStandingJumpModels(finalTestType) && powerVal > 0 ? powerVal.toFixed(2) : null, 
      mean_force_newtons: supportsStandingJumpModels(finalTestType) ? stats.meanForce || null : null, 
      leg_used: legUsed 
    });
    
    if (savedRecord) { 
      if (onSaveSuccess) {
        onSaveSuccess(savedRecord);
      }
      setShowResults(false); 
      toast.success(tr.ui.jcJumpTestResultSaved);
    } else {
      toast.error(tr.ui.jcErrorSavingMeasurement);
    }
    setIsSaving(false);
  };

  // Saved to lab_players, debounced so sliders don't write on every step
  const saveTimers = useRef<Record<string, any>>({});
  const persistPlayerField = (field: any, val: any) => {
    if (!selectedPlayerId) return;
    clearTimeout(saveTimers.current[field]);
    saveTimers.current[field] = setTimeout(() => {
      updatePlayerFields(selectedPlayerId, { [field]: val > 0 ? val : null });
    }, 800);
  };

  const handleHeightChange = (val: any) => {
    setPlayerHeight(val);
    persistPlayerField('height_cm', val);
  };

  const handleStandingReachChange = (val: any) => {
    setStandingReach(val);
    persistPlayerField('standing_reach_cm', val);
  };

  const handleShareVideo = async () => {
    if (!exportedVideoBlob || !exportedVideoUrl) return;

    const jumpHeight = stats?.heightCm ? parseFloat(stats.heightCm) : 0;
    const athleteName = activePlayer?.full_name || (tr.ui.jcAthlete);
    const shareText = language === 'en'
      ? `PeakForce Lab: ${athleteName} jumped ${jumpHeight.toFixed(1)}cm! Check out the biomechanical analysis.`
      : `PeakForce Lab: اللاعب ${athleteName} سجل قفزة بارتفاع ${jumpHeight.toFixed(1)} سم! شاهد تحليل الأداء الحركي.`;

    const file = new File([exportedVideoBlob], exportedVideoName, { type: exportedVideoBlob.type || 'video/mp4' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: tr.ui.jcPeakforceLabJumpAnalysis,
          text: shareText,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error(language === 'en' ? 'Sharing failed: ' + err.message : 'فشلت المشاركة: ' + err.message);
        }
      }
    } else {
      toast.info(tr.ui.jcYourBrowserDoesNot);
    }
  };

  const handleExportVideoWithOverlay = async () => {
    if (!videoSrc || !videoRef.current) return toast.info("الرجاء تحميل فيديو أولاً.");
    if (!stats || !stats.heightCm || takeoffTime <= 0 || landingTime <= 0) {
      return toast.info("الرجاء تحديد زمن الإقلاع والهبوط واستخراج التحليل أولاً.");
    }

    const exportVideo = videoRef.current;
    
    // Save original playback states
    window.tempOriginalUserTime = exportVideo.currentTime;
    window.tempOriginalMuted = exportVideo.muted;
    window.tempOriginalLoop = exportVideo.loop;

    let canvasElement = null;
    let isRecordingActive = true;

    try {
      setIsExporting(true);
      setExportProgress(0);
      setExportStatus(tr.ui.jcPreparingVideoPlayer);

      // Mute audio and disable loop during export
      exportVideo.muted = true;
      exportVideo.loop = false;

      // Upscaling feature: 1.5x or 2x upscale based on original video resolution
      const originalWidth = exportVideo.videoWidth || 1280;
      const originalHeight = exportVideo.videoHeight || 720;
      let upscaleFactor = 1.5;
      if (originalWidth < 1280 || originalHeight < 1280) {
        upscaleFactor = 2.0;
      }
      
      canvasElement = document.createElement('canvas');
      canvasElement.width = originalWidth * upscaleFactor;
      canvasElement.height = originalHeight * upscaleFactor;
      
      // iOS Safari Visibility Fix: Append to DOM off-screen
      canvasElement.style.position = 'fixed';
      canvasElement.style.top = '0';
      canvasElement.style.left = '0';
      canvasElement.style.width = '1px';
      canvasElement.style.height = '1px';
      canvasElement.style.opacity = '0.01';
      canvasElement.style.pointerEvents = 'none';
      canvasElement.style.zIndex = '-1000';
      document.body.appendChild(canvasElement);

      const ctx = canvasElement.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      const jumpHeight = parseFloat(stats.heightCm) || 0;
      const flightTime = parseFloat(stats.flightTime) || 0.5;

      // Capture full video duration
      const startTime = 0;
      const endTime = Math.max(0, exportVideo.duration - 0.05);

      setExportStatus(tr.ui.jcSeekingToStartPosition);

      exportVideo.currentTime = startTime;
      await new Promise((resolve) => {
        let resolved = false;
        const onSeeked = () => {
          if (resolved) return;
          resolved = true;
          exportVideo.removeEventListener('seeked', onSeeked);
          resolve();
        };
        exportVideo.addEventListener('seeked', onSeeked);
        setTimeout(onSeeked, 1500); // 1.5s safety timeout
      });

      // Draw the first frame immediately before captureStream to initialize tracks on iOS Safari
      ctx.save();
      ctx.scale(upscaleFactor, upscaleFactor);
      ctx.drawImage(exportVideo, 0, 0, originalWidth, originalHeight);
      ctx.restore();

      setExportStatus(tr.ui.jcInitializingRecorder);

      const stream = (canvasElement.captureStream ? canvasElement.captureStream(30) : (canvasElement.webkitCaptureStream ? canvasElement.webkitCaptureStream(30) : null));
      if (!stream) throw new Error(tr.ui.jcCanvasCapturestreamIsNot);

      const mimeTypes = [
        'video/mp4;codecs="avc1.42E01E"',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/quicktime;codecs="avc1.42E01E"',
        'video/quicktime',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm'
      ];
      let selectedMimeType = 'video/webm';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }
      
      let extension = 'webm';
      if (selectedMimeType.includes('mp4')) {
        extension = 'mp4';
      } else if (selectedMimeType.includes('quicktime')) {
        extension = 'mov';
      } else {
        extension = 'webm';
      }
      
      let options = { mimeType: selectedMimeType };
      let recorder;
      try {
        // Use 8 Mbps for high quality video output
        recorder = new MediaRecorder(stream, { 
          ...options,
          videoBitsPerSecond: 8000000 
        });
      } catch (e: any) {
        console.warn("MediaRecorder creation with bitrate failed, falling back to default:", e);
        recorder = new MediaRecorder(stream, options);
      }

      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        let cleanMimeType = 'video/mp4';
        if (selectedMimeType.includes('quicktime')) {
          cleanMimeType = 'video/quicktime';
        } else if (selectedMimeType.includes('webm')) {
          cleanMimeType = 'video/webm';
        }
        const blob = new Blob(chunks, { type: cleanMimeType });
        const url = URL.createObjectURL(blob);
        const filename = `TheLab_Jump_${activePlayer?.full_name || 'Athlete'}_${jumpHeight.toFixed(1)}cm.${extension}`;
        
        // Remove canvas from DOM
        if (canvasElement && canvasElement.parentNode) {
          canvasElement.parentNode.removeChild(canvasElement);
        }

        // Restore main video player state
        exportVideo.muted = window.tempOriginalMuted;
        exportVideo.loop = window.tempOriginalLoop;
        exportVideo.pause();
        exportVideo.currentTime = window.tempOriginalUserTime;

        // Trigger immediate download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Update states to trigger the share success modal
        setExportedVideoBlob(blob);
        setExportedVideoUrl(url);
        setExportedVideoName(filename);

        setIsExporting(false);
        setExportStatus('');
      };

      setExportStatus(tr.ui.jcStartingVideoPlayback);
      
      // Wait for playback to start to ensure decoding has initialized
      await exportVideo.play();
      
      setExportStatus('');
      recorder.start(1000);

      const w = originalWidth;
      const h = originalHeight;
      const groundY = h * 0.78;
      const topY = h * 0.15;
      const barHeight = groundY - topY;
      const maxScaleCm = Math.max(50, Math.ceil((jumpHeight + 20) / 10) * 10);

      const getYForHeight = (heightVal: any) => {
        return groundY - (heightVal / maxScaleCm) * barHeight;
      };

      const drawOverlay = () => {
        if (!isRecordingActive) return;

        if (exportVideo.ended || exportVideo.currentTime >= endTime) {
          isRecordingActive = false;
          recorder.stop();
          exportVideo.pause();
          return;
        }

        // Draw video frame upscaled
        ctx.save();
        ctx.scale(upscaleFactor, upscaleFactor);
        ctx.drawImage(exportVideo, 0, 0, w, h);

        const t = exportVideo.currentTime;
        let currentHeight = 0;
        const t_takeoff = takeoffTime;
        const t_flight = landingTime - takeoffTime;
        const t_peak_display = t_takeoff + 0.45 * t_flight;

        if (t < t_takeoff) {
          currentHeight = 0;
        } else if (t >= t_takeoff && t < t_peak_display) {
          const tau = t - t_takeoff;
          const t_half = 0.5 * t_flight;
          const progressRatio = Math.min(1.0, tau / t_half);
          currentHeight = jumpHeight * (2 * progressRatio - progressRatio * progressRatio);
        } else {
          currentHeight = jumpHeight;
        }

        // Draw pose skeleton connection lines if AI is enabled
        if (aiEnabled) {
          const { POSE_CONNECTIONS, drawConnectors, drawLandmarks } = window;
          // pose frames recorded during AI tracking (was an undefined ref -> crash on export)
          const history = flightDataRef.current;
          const closest = history.find(hl => Math.abs(hl.time - t) < 0.04);
          if (closest && closest.landmarks) {
            if (drawConnectors && POSE_CONNECTIONS) {
              drawConnectors(ctx, closest.landmarks, POSE_CONNECTIONS, { color: '#D97757', lineWidth: 3 });
            }
            if (drawLandmarks) {
              drawLandmarks(ctx, closest.landmarks, { color: '#ffffff', lineWidth: 1 });
            }

            const lm = closest.landmarks;
            const leftHip = lm[23];
            const leftKnee = lm[25];
            const leftAnkle = lm[27];
            const rightHip = lm[24];
            const rightKnee = lm[26];
            const rightAnkle = lm[28];

            const calculateAngle = (p1: any, p2: any, p3: any) => {
              const rad = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
              let angle = Math.abs((rad * 180) / Math.PI);
              if (angle > 180) angle = 360 - angle;
              return angle;
            };

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4;
            ctx.font = 'bold 12px Cairo';

            if (leftHip && leftKnee && leftAnkle && leftHip.visibility > 0.5 && leftKnee.visibility > 0.5 && leftAnkle.visibility > 0.5) {
              const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
              const kx = leftKnee.x * w;
              const ky = leftKnee.y * h;
              ctx.fillStyle = '#D97757';
              ctx.fillText(`${tr.ui.jcKneeL} ${leftKneeAngle.toFixed(0)}°`, kx - 70, ky);
            }
            if (rightHip && rightKnee && rightAnkle && rightHip.visibility > 0.5 && rightKnee.visibility > 0.5 && rightAnkle.visibility > 0.5) {
              const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
              const kx = rightKnee.x * w;
              const ky = rightKnee.y * h;
              ctx.fillStyle = '#D97757';
              ctx.fillText(`${tr.ui.jcKneeR} ${rightKneeAngle.toFixed(0)}°`, kx + 15, ky);
            }
            ctx.restore();
          }
        }

        // Draw horizontal grid lines in orange
        ctx.strokeStyle = 'rgba(217,119,87, 0.05)';
        ctx.lineWidth = 1;
        for (let hc = 10; hc <= maxScaleCm; hc += 10) {
          const y = getYForHeight(hc);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Draw vertical scale line on the right margin
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(w - 60, topY);
        ctx.lineTo(w - 60, groundY);
        ctx.stroke();

        // Draw tick marks & values
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 15px Cairo';
        ctx.textAlign = 'right';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.5;

        // Draw "cm" header unit above the ruler
        ctx.fillStyle = '#D97757';
        ctx.font = '900 13px Cairo';
        ctx.fillText('cm', w - 70, topY - 8);

        ctx.fillStyle = '#ffffff';

        for (let hc = 0; hc <= maxScaleCm; hc += 2) {
          const y = getYForHeight(hc);
          if (y < topY || y > groundY) continue;

          ctx.beginPath();
          if (hc % 10 === 0) {
            // Major Tick
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.moveTo(w - 75, y);
            ctx.lineTo(w - 60, y);
            ctx.stroke();
            
            // Draw number with black outline/shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 1)';
            ctx.shadowBlur = 4;
            ctx.fillText(`${hc}`, w - 82, y + 5);
            ctx.restore();
          } else if (hc % 5 === 0) {
            // Minor Tick
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.moveTo(w - 68, y);
            ctx.lineTo(w - 60, y);
            ctx.stroke();
          } else {
            // Sub-minor Tick
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.moveTo(w - 64, y);
            ctx.lineTo(w - 60, y);
            ctx.stroke();
          }
        }
        ctx.restore();

        // Draw dynamic height filling bar (Neon Orange gradient) - WIDER (width = 20px)
        const yVal = getYForHeight(currentHeight);
        const activeHeight = groundY - yVal;
        if (activeHeight > 0) {
          ctx.save();
          ctx.shadowColor = '#D97757';
          ctx.shadowBlur = 12;
          const grad = ctx.createLinearGradient(0, groundY, 0, yVal);
          grad.addColorStop(0, '#D97757');
          grad.addColorStop(1, '#D97757');
          ctx.fillStyle = grad;
          // Draw wider bar
          ctx.fillRect(w - 55, yVal, 20, activeHeight);

          // Glowing white cap (wider to fit the bar, 26px)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(w - 58, yVal - 1.5, 26, 4);
          ctx.restore();
        }

        // Circular height progress gauge on left margin
        const circleX = 85;
        const circleY = h * 0.45;
        const circleRadius = 42;
        const progressPct = jumpHeight > 0 ? Math.min(1.0, currentHeight / jumpHeight) : 0;
        
        ctx.save();
        // Track circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Glowing progress arc
        ctx.shadowColor = '#D97757';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#D97757';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleRadius, -Math.PI / 2, -Math.PI / 2 + progressPct * 2 * Math.PI);
        ctx.stroke();
        ctx.restore();

        // Text inside circle
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Cairo';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`${(progressPct * 100).toFixed(0)}%`, circleX, circleY - 4);
        
        ctx.fillStyle = '#D97757';
        ctx.font = '900 8px Cairo';
        ctx.fillText(tr.ui.jcHeight, circleX, circleY + 14);
        ctx.restore();

        // Draw top-right stats box - REDESIGNED, LARGER, MORE CHIC
        const labelY = topY - 30;
        ctx.save();
        ctx.shadowColor = '#D97757';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(10, 18, 36, 0.9)';
        ctx.strokeStyle = '#D97757';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(w - 170, labelY - 15, 140, 48, 12);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Label
        ctx.fillStyle = '#D97757';
        ctx.font = '900 9px Cairo';
        ctx.fillText(tr.ui.jcLiveHeight, w - 100, labelY - 3);

        // Value - LARGER FONT (20px)
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px Cairo';
        ctx.fillText(`${currentHeight.toFixed(1)} cm`, w - 100, labelY + 16);

        if (t >= t_peak_display) {
          ctx.save();
          ctx.shadowColor = '#D97757';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#D97757';
          ctx.font = '900 10px Cairo';
          ctx.fillText(tr.ui.jcPeakJump, w - 100, labelY - 22);
          ctx.restore();
        }
        ctx.restore();

        // Centered Big Jump Height counting text (lower middle)
        if (t >= t_takeoff) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const textX = w / 2;
          const textY = h * 0.58;
          
          ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          if (t >= t_peak_display) {
            ctx.shadowColor = '#D97757';
            ctx.shadowBlur = 15;
            
            ctx.fillStyle = '#D97757';
            ctx.font = '900 11px Cairo';
            ctx.fillText(tr.ui.jcMaxHeight, textX, textY - 32);
            
            ctx.font = '900 48px Cairo';
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.fillStyle = '#D97757';
            ctx.font = '900 42px Cairo';
          }
          
          ctx.strokeStyle = '#09090B';
          ctx.lineWidth = 8;
          const displayText = `${currentHeight.toFixed(1)} cm`;
          ctx.strokeText(displayText, textX, textY);
          ctx.fillText(displayText, textX, textY);
          ctx.restore();
        }

        // Glassmorphic HUD Bar
        const hudW = w * 0.85;
        const hudH = 58;
        const hudX = (w - hudW) / 2;
        const hudY = h - hudH - 25;

        ctx.save();
        ctx.shadowColor = 'rgba(217,119,87, 0.35)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(10, 18, 36, 0.88)';
        ctx.strokeStyle = 'rgba(217,119,87, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(hudX, hudY, hudW, hudH, 14);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Draw HUD details
        ctx.save();
        ctx.textBaseline = 'middle';
        const cols = 4;
        const colW = hudW / cols;

        const testNamesArabic = { 
          sj_no_arms: 'وثبة ثبات (بدون يدين)', 
          cmj_no_arms: 'CMJ (بدون يدين)', 
          sj_arms: 'وثبة ثبات (باليدين)', 
          cmj_arms: 'CMJ (باليدين)', 
          approach: 'الاقتراب (Approach)' 
        };
        const testNamesEnglish = { 
          sj_no_arms: 'Squat Jump (No Arms)', 
          cmj_no_arms: 'CMJ (No Arms)', 
          sj_arms: 'Squat Jump (Arms)', 
          cmj_arms: 'CMJ (Arms)', 
          approach: 'Approach Jump' 
        };
        const activeTestName = language === 'en' 
          ? (testNamesEnglish[saveJumpTag] || 'Vertical Jump') 
          : (testNamesArabic[saveJumpTag] || 'وثب رأسي');

        for (let i = 0; i < cols; i++) {
          const startX = hudX + i * colW;
          const centerX = startX + colW / 2;
          const centerY = hudY + hudH / 2;

          // Draw vertical separator
          if (i > 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(startX, hudY + 12);
            ctx.lineTo(startX, hudY + hudH - 12);
            ctx.stroke();
          }

          let label = "";
          let val = "";

          if (i === 0) {
            label = tr.ui.jcAthlete2;
            val = activePlayer?.full_name || 'Athlete';
          } else if (i === 1) {
            label = tr.ui.jcWeight;
            val = `${bodyMass} kg`;
          } else if (i === 2) {
            label = tr.ui.jcDate;
            val = new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG');
          } else if (i === 3) {
            label = tr.ui.jcTestType;
            val = activeTestName;
          }

          // Draw Label
          ctx.textAlign = 'center';
          ctx.fillStyle = '#D97757';
          ctx.font = '900 9px Cairo';
          ctx.fillText(label, centerX, centerY - 10);

          // Draw Value
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px Cairo';
          ctx.fillText(val, centerX, centerY + 10);
        }
        ctx.restore();

        // Pulsing Jump Number (Triggered at peak height)
        if (t >= t_peak_display) {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const jumpNumberX = w / 2;
          const jumpNumberY = hudY - 32;
          
          const timeSincePeak = t - t_peak_display;
          let pulseScale = 1.0;
          if (timeSincePeak > 0 && timeSincePeak < 1.5) {
            pulseScale = 1.0 + 0.25 * Math.sin(timeSincePeak * 10) * Math.exp(-timeSincePeak * 2);
          }
          
          ctx.shadowColor = '#D97757';
          ctx.shadowBlur = 20;
          
          const fontSize = Math.round(36 * pulseScale);
          ctx.font = `900 ${fontSize}px Cairo`;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#09090B';
          ctx.lineWidth = 6;
          
          // Calculate next jump number based on playerHistory and saveJumpTag
          const currentTestJumps = playerHistory 
            ? playerHistory.filter(j => j.test_type === saveJumpTag) 
            : [];
          const jumpNum = currentTestJumps.length + 1;
          
          const jumpText = language === 'en' ? `Jump #${jumpNum}` : `الوثبة رقم ${jumpNum}`;
          ctx.strokeText(jumpText, jumpNumberX, jumpNumberY);
          ctx.fillText(jumpText, jumpNumberX, jumpNumberY);
          ctx.restore();
        }

        // Watermark logo
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = 'rgba(217,119,87, 0.4)';
        ctx.font = 'bold 11px Cairo';
        ctx.textAlign = 'left';
        ctx.fillText('PeakForce Lab', hudX + 8, hudY - 8);
        ctx.restore();

        ctx.restore(); // Restore upscale context scale

        const elapsed = exportVideo.currentTime - startTime;
        const total = endTime - startTime;
        const progress = Math.min(99, Math.round((elapsed / total) * 100));
        setExportProgress(progress);

        // Schedule next frame with setTimeout to prevent mobile background/overlay throttling
        setTimeout(drawOverlay, 1000 / 30);
      };

      setTimeout(drawOverlay, 1000 / 30);

    } catch (err: any) {
      toast.error("حدث خطأ أثناء تصدير الفيديو: " + err.message);
      
      isRecordingActive = false;
      
      // No audio context cleanup needed

      // Clean up canvas
      if (canvasElement && canvasElement.parentNode) {
        canvasElement.parentNode.removeChild(canvasElement);
      }

      // Restore main video player state on error
      if (videoRef.current) {
        videoRef.current.muted = window.tempOriginalMuted;
        videoRef.current.loop = window.tempOriginalLoop;
        videoRef.current.pause();
        videoRef.current.currentTime = window.tempOriginalUserTime;
      }
      
      setIsExporting(false);
      setExportStatus('');
    }
  };

  const renderDesktopView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Widescreen Video Viewport & Biomechanical Jog-Wheel Console */}
        <div className="lg:col-span-8 bg-black/20 p-5 rounded-3xl border border-border flex flex-col items-center justify-start gap-5">
          
          {/* Viewport Header */}
          <div className="w-full flex justify-between items-center bg-surface/40 p-3 rounded-xl border border-border">
             <span className="text-sm font-bold text-white flex items-center gap-2"><ScanEye size={18} className="text-accent"/> شاشة عرض وتحليل الفيديو (Video Viewport)</span>
          </div>

          {/* File Upload Area */}
          {!videoSrc ? (
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center py-20 bg-black/10 rounded-2xl border border-dashed border-border">
              <label className="flex-1 w-full max-w-xs cursor-pointer btn-orange-gradient text-center py-10 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-transform hover:scale-103 shadow-lg">
                <input type="file" accept="video/*" capture="environment" onChange={handleFileUpload} ref={cameraInputRef} className="hidden" />
                <Focus size={36} /> فتح الكاميرا للتصوير 🎥
              </label>
              <label className="flex-1 w-full max-w-xs cursor-pointer bg-surface/40 hover:bg-zinc-800/60 border border-border text-white text-center py-10 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-all">
                <input type="file" accept="video/*" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                <Play size={36} className="text-accent" /> اختيار فيديو من المعرض 📁
              </label>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full relative">
              {/* Close button */}
              <button onClick={clearVideo} className="absolute top-3 right-3 bg-danger/90 hover:bg-danger p-2.5 rounded-full text-white z-20 shadow-lg transition-transform hover:scale-110 cursor-pointer"><X size={16}/></button>
              
              {/* Widescreen Video Viewport with HUD Telemetry overlay */}
              <div className="relative inline-block border border-border rounded-3xl overflow-hidden mb-5 shadow-2xl w-full bg-black">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  playsInline={true}
                  webkitPlaysInline={true}
                  muted={true}
                  controls={false}
                  preload="auto"
                  className="w-full h-auto max-h-[46vh] object-contain mx-auto"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onSeeked={handleVideoSeeked}
                  onEnded={() => setIsPlaying(false)}
                />
                <canvas 
                  ref={canvasRef} 
                  onClick={handleCanvasClick} 
                  className={`absolute top-0 left-0 w-full h-full ${isCalibrating ? 'cursor-crosshair z-10' : 'pointer-events-none'}`} 
                />

                {/* Telemetry overlay badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 select-none">
                  <span className="px-2 py-0.5 rounded-md bg-black/60 border border-danger/30 text-[9px] font-bold text-danger flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse"></span> REC
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-black/60 border border-accent/30 text-[9px] font-mono text-accent">
                    {cameraFps} FPS
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 z-10 bg-black/60 border border-border px-3 py-1 rounded-xl text-[9px] font-bold text-zinc-300">
                  الوزن الإضافي: <span className="text-accent font-mono">{bodyMass - (activePlayer?.weight_kg || 70)} kg</span>
                </div>
              </div>

              {/* Widescreen Cockpit Scrubber Console */}
              <div className="w-full bg-surface/40 p-5 rounded-3xl border border-border mb-5">
                
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  {/* Analog rotatable jog wheel */}
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div 
                      ref={jogWheelRef}
                      onMouseDown={handleJogStart}
                      onTouchStart={handleJogStart}
                      className="relative w-32 h-32 rounded-full bg-gradient-to-br from-zinc-800 to-black border-4 border-zinc-900 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none group"
                    >
                      <div className="absolute inset-0 rounded-full border-2 border-accent/20 group-hover:border-accent/50 group-active:border-accent group-active: transition-all duration-300 pointer-events-none"></div>
                      
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                        {Array.from({ length: 12 }).map((_, i) => {
                          const angle = (i * 30 * Math.PI) / 180;
                          const x1 = 50 + 38 * Math.cos(angle);
                          const y1 = 50 + 38 * Math.sin(angle);
                          const x2 = 50 + 44 * Math.cos(angle);
                          const y2 = 50 + 44 * Math.sin(angle);
                          return (
                            <line 
                              key={i} 
                              x1={x1} 
                              y1={y1} 
                              x2={x2} 
                              y2={y2} 
                              stroke="rgba(255,255,255,0.15)" 
                              strokeWidth="1.5" 
                            />
                          );
                        })}
                      </svg>

                      {/* Dial Indicator Needle */}
                      <div 
                        className="absolute w-1 h-12 origin-bottom"
                        style={{ 
                          transform: `rotate(${jogAngle}deg)`, 
                          bottom: '50%',
                          transition: isDraggingJog.current ? 'none' : 'transform 0.15s ease-out'
                        }}
                      >
                        <div className="w-1 h-4 bg-accent rounded-full"></div>
                      </div>

                      {/* Center Display */}
                      <div className="absolute w-22 h-22 rounded-full bg-bg border border-border shadow-inner flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[7px] text-faint font-extrabold tracking-wider leading-none">FRAME</span>
                        <span className="text-xs font-black text-white font-mono leading-none mt-1.5">
                          F {Math.round(currentTime * (videoFps || 30))}
                        </span>
                        <span className="text-[8px] text-accent font-bold mt-1 font-mono">
                          {currentTime.toFixed(2)}s
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] text-faint font-bold">قرص التوجيه الدقيق (Jog Wheel)</span>
                  </div>

                  {/* Frame Controllers and markings stepper */}
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex justify-between items-center text-xs text-muted font-bold px-1">
                      <span>جهاز تحكم الإطارات والتوقيت (Console Jog Controller)</span>
                      <span className="text-accent">اسحب القرص أو اضغط الإطارات بدقة ⏱️</span>
                    </div>

                    <div className="grid grid-cols-6 gap-1.5 justify-center">
                      <button onClick={() => stepFrames(-10)} title="العودة 10 إطارات" className="py-2.5 bg-black/45 hover:bg-zinc-800 border border-border rounded-xl text-zinc-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">-10</button>
                      <button onClick={() => stepFrames(-5)} title="العودة 5 إطارات" className="py-2.5 bg-black/45 hover:bg-zinc-800 border border-border rounded-xl text-zinc-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">-5</button>
                      <button onClick={() => stepFrames(-1)} title="العودة إطار واحد" className="py-2.5 bg-black/45 hover:bg-zinc-800 border border-border rounded-xl text-zinc-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">-1</button>
                      
                      <button onClick={() => stepFrames(1)} title="التقدم إطار واحد" className="py-2.5 bg-black/45 hover:bg-zinc-800 border border-border rounded-xl text-zinc-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">+1</button>
                      <button onClick={() => stepFrames(5)} title="التقدم 5 إطارات" className="py-2.5 bg-black/45 hover:bg-zinc-800 border border-border rounded-xl text-zinc-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">+5</button>
                      <button onClick={() => stepFrames(10)} title="التقدم 10 إطارات" className="py-2.5 bg-black/45 hover:bg-zinc-800 border border-border rounded-xl text-zinc-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">+10</button>
                    </div>

                    <div className="flex justify-center">
                      <button onClick={togglePlay} className="px-8 py-3 bg-gradient-to-r from-accent to-accent text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-lg hover:shadow-accent/20 cursor-pointer w-full max-w-[200px]">
                        {isPlaying ? <><Pause size={14}/> إيقاف مؤقت</> : <><Play size={14}/> تشغيل الفيديو</>}
                      </button>
                    </div>

                    <div className="flex gap-2 w-full pt-1">
                      <button onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }} className={`flex-1 py-2.5 border rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${takeoffTime > 0 ? 'bg-accent/30 text-accent border-accent/50 shadow' : 'bg-black/30 border-border text-white hover:bg-zinc-800'}`}>
                        <span>{takeoffTime > 0 ? '🚀 تعديل الإقلاع' : '🚀 تحديد إقلاع'}</span>
                        {takeoffTime > 0 && <span className="text-[9px] font-mono font-bold bg-surface-2/40 px-1.5 py-0.5 rounded">F {Math.round(takeoffTime * (videoFps || 30))}</span>}
                      </button>
                      <button onClick={() => { setLandingTime(currentTime); setShowResults(false); }} className={`flex-1 py-2.5 border rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${landingTime > 0 ? 'bg-danger/30 text-danger border-danger/50 shadow' : 'bg-black/30 border-border text-white hover:bg-zinc-800'}`}>
                        <span>{landingTime > 0 ? '🛬 تعديل الهبوط' : '🛬 تحديد هبوط'}</span>
                        {landingTime > 0 && <span className="text-[9px] font-mono font-bold bg-surface-2/40 px-1.5 py-0.5 rounded">F {Math.round(landingTime * (videoFps || 30))}</span>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Filmstrip Timeline Progress Bar */}
                <div className="mt-5 relative w-full h-8 bg-black/60 border border-border rounded-2xl overflow-hidden flex items-center px-4">
                  {/* Ruler-style ticks */}
                  <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none opacity-20">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className={`w-0.5 bg-accent rounded-full ${i % 5 === 0 ? 'h-4' : 'h-2'}`} />
                    ))}
                  </div>

                  {/* Shadow overlays for takeoff and landing ranges */}
                  {duration > 0 && takeoffTime > 0 && landingTime > takeoffTime && (
                    <div 
                      className="absolute top-0 bottom-0 bg-accent/10 border-l border-r border-accent/35 pointer-events-none"
                      style={{
                        right: `${(takeoffTime / duration) * 100}%`,
                        left: `${100 - (landingTime / duration) * 100}%`
                      }}
                    />
                  )}

                  {/* Slider Input */}
                  <input 
                    type="range"
                    min="0.01"
                    max={duration || 100}
                    step="0.001"
                    value={currentTime}
                    dir="rtl"
                    onMouseDown={() => {
                      setIsDragging(true);
                      if (videoRef.current) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      }
                    }}
                    onTouchStart={() => {
                      setIsDragging(true);
                      if (videoRef.current) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      }
                    }}
                    onMouseMove={(e) => {
                      const val = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = val;
                      setCurrentTime(val);
                    }}
                    onTouchMove={(e) => {
                      const val = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = val;
                      setCurrentTime(val);
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onTouchEnd={() => setIsDragging(false)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCurrentTime(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="timeline-slider w-full h-full opacity-100 bg-transparent absolute inset-0 z-30 px-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Biomechanical Settings & Calibration */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5 h-full">
          
          <div className="bg-black/20 p-5 rounded-3xl border border-border space-y-4">
            <h4 className="font-extrabold text-sm text-accent border-b border-border pb-2 flex items-center gap-1.5">
              <Activity size={18} /> إعدادات التحليل والمدخلات
            </h4>

            {/* Settings Tabs */}
            <div className="flex border border-accent/20 bg-black/40 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('analysis')}
                className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeSettingsTab === 'analysis' ? 'bg-accent/20 text-accent border border-accent/30' : 'text-faint hover:text-white bg-transparent border border-transparent'}`}
              >
                🎥 تحليل الفيديو
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('anthropometrics')}
                className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeSettingsTab === 'anthropometrics' ? 'bg-accent/20 text-accent border border-accent/30' : 'text-faint hover:text-white bg-transparent border border-transparent'}`}
              >
                ⚖️ قياسات اللاعب
              </button>
            </div>

            {activeSettingsTab === 'analysis' && (
              <div className="space-y-4 animate-fade-in text-right">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-muted mb-1">Jump Type (نوع القفزة)</label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-black/35 rounded-2xl border border-border">
                      {[
                        { id: 'cmj', name: 'CMJ (Countermovement)' },
                        { id: 'sj', name: 'SJ (Squat Jump)' },
                        { id: 'dj', name: 'DJ (Drop Jump)' }
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => { setJumpType(type.id); setShowResults(false); }}
                          className={`py-2 px-1 text-[9px] font-bold rounded-xl transition-all cursor-pointer ${jumpType === type.id ? 'bg-accent text-accent-ink font-black' : 'text-muted bg-transparent'}`}
                        >
                          {type.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] text-muted mb-1 font-bold text-accent">Landing Knee Correction (معامل تصحيح الركبة)</label>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-black/35 rounded-2xl border border-border">
                      {[
                        { id: 'none', name: '❌ None' },
                        { id: 'light', name: '⏱️ Light' },
                        { id: 'medium', name: '⏱️ Medium' },
                        { id: 'heavy', name: '⏱️ Heavy' }
                      ].map(mode => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setLandingCorrectionMode(mode.id)}
                          className={`py-1.5 px-0.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${landingCorrectionMode === mode.id ? 'bg-accent/20 text-accent border border-accent/50' : 'text-faint bg-transparent'}`}
                        >
                          {mode.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {jumpType === 'dj' && (
                  <div className="grid grid-cols-2 gap-3 bg-surface-2/15 border border-accent/25 p-3 rounded-2xl animate-fade-in text-[10px]">
                    <div>
                      <label className="block text-[9px] text-muted mb-1">Box Height (ارتفاع الصندوق cm)</label>
                      <input type="number" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))} className="w-full bg-surface/60 border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-muted mb-1">Ground Contact Time (وقت ملامسة الأرض)</label>
                      <div className="flex gap-2">
                        <input type="number" step="0.001" value={boxTouchdownTime} onChange={e => setBoxTouchdownTime(Number(e.target.value))} className="w-full bg-surface/60 border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                        <button type="button" onClick={() => setBoxTouchdownTime(currentTime)} className="px-2 bg-accent text-accent-ink rounded-xl text-[10px] font-bold shrink-0 cursor-pointer">هنا 📍</button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* Smart FPS Auto-Detect Switch */}
                  <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-2xl border border-border">
                    <span className="text-[10px] text-zinc-300 font-bold flex items-center gap-1">🔍 Smart FPS Auto-Detect (كشف FPS تلقائي)</span>
                    <button
                      type="button"
                      onClick={() => setIsFpsDetectionActive(!isFpsDetectionActive)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${isFpsDetectionActive ? 'bg-accent' : 'bg-zinc-800'}`}
                    >
                      <span className={`absolute top-1 bottom-1 w-4 h-4 rounded-full bg-white transition-all ${isFpsDetectionActive ? 'right-7' : 'right-1'}`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] text-muted mb-1">Video Recording Type (نوع تصوير الفيديو)</label>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-black/35 rounded-2xl border border-border">
                      {[
                        { id: 'slow240', name: '240 FPS' },
                        { id: 'slow120', name: '120 FPS' },
                        { id: 'normal60', name: '60 FPS' },
                        { id: 'normal30', name: '30 FPS' }
                      ].map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setVideoPreset(preset.id);
                            if (preset.id === 'slow240') { setCameraFps(240); setVideoFps(30); }
                            else if (preset.id === 'slow120') { setCameraFps(120); setVideoFps(30); }
                            else if (preset.id === 'normal30') { setCameraFps(30); setVideoFps(30); }
                            else if (preset.id === 'normal60') { setCameraFps(60); setVideoFps(60); }
                          }}
                          className={`py-2 px-1 text-[9px] font-bold rounded-xl transition-all cursor-pointer ${videoPreset === preset.id ? 'bg-accent/20 text-accent border border-accent/35' : 'text-muted bg-transparent'}`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-muted mb-1 block">Video File FPS (FPS ملف الفيديو)</label>
                    <input type="number" value={videoFps} onChange={(e) => setVideoFps(Number(e.target.value))} className="w-full bg-surface/60 border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted mb-1 block">Camera FPS (FPS الكاميرا)</label>
                    <input type="number" value={cameraFps} onChange={(e) => setCameraFps(Number(e.target.value))} className="w-full bg-surface/60 border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-accent" />
                  </div>
                </div>
                {manualFramePanel}

                {/* AI tracking toggle */}
                <div className="bg-black/15 border border-border p-3 rounded-2xl mb-3">
                  <button
                    type="button"
                    onClick={() => setAiEnabled(!aiEnabled)}
                    className={`w-full py-2 px-3 text-[10px] font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      aiEnabled
                        ? 'bg-accent/10 text-accent border-accent/30'
                        : 'bg-black/30 text-muted border-border hover:text-white'
                    }`}
                  >
                    <ScanEye size={14} className={aiEnabled ? 'animate-pulse' : ''} />
                    {aiEnabled ? 'تتبع تلقائي بالذكاء الاصطناعي (مفعّل)' : 'تتبع تلقائي بالذكاء الاصطناعي (معطّل)'}
                  </button>
                </div>

                {/* Limb & Scale Calibration Helper */}
                <div className="bg-black/15 border border-border p-3.5 rounded-2xl space-y-3">
                  <span className="block text-xs text-accent font-bold border-b border-border pb-1.5 flex items-center gap-1.5 flex-row-reverse">
                    📐 Video Scale & Leg Calibration (معايرة مقياس الفيديو وطول الرجل)
                  </span>
                  
                  <div className="flex items-center gap-2 justify-between">
                    <label className="text-[10px] text-muted shrink-0">Reference Leg Length (m):</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={referenceLength} 
                      onChange={(e) => setReferenceLength(Number(e.target.value))} 
                      className="w-20 bg-surface/60 border border-border p-1 text-xs text-center text-white rounded font-mono" 
                    />
                  </div>

                  {!isCalibrating ? (
                    <button 
                      type="button"
                      onClick={() => {
                        setIsCalibrating(true);
                        setCalibrationStep(1);
                        calibrationClicksRef.current = [];
                        setPixelsPerMeter(null);
                        setTrackedJumpHeight(null);
                      }}
                      className="w-full py-2 bg-black/35 hover:bg-zinc-800 border border-accent/20 text-zinc-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      📏 ابدأ معايرة طول الرجل من الفيديو
                    </button>
                  ) : (
                    <div className="bg-surface-2/20 border border-accent/40 p-2 rounded-xl text-center animate-pulse">
                      {calibrationStep === 1 && <p className="text-accent text-[10px] font-bold">1️⃣ اضغط على <span className="text-white font-extrabold">مفصل الفخذ (Hip Joint)</span> بالفيديو</p>}
                      {calibrationStep === 2 && <p className="text-accent text-[10px] font-bold">2️⃣ اضغط على <span className="text-white font-extrabold">مفصل الكاحل (Ankle Joint)</span> بالفيديو</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === 'anthropometrics' && (
              <div className="space-y-4 bg-black/10 border border-border p-4 rounded-2xl animate-fade-in text-right">
                <span className="block text-xs text-accent font-bold border-b border-border pb-1.5 text-right">
                  ⚖️ القياسات الأنثروبومترية الحية (Interactive Telemetry)
                </span>
                
                {/* Body Weight Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-bold">وزن اللاعب (Body Mass):</span>
                    <span className="font-mono font-black text-white bg-surface-2/40 px-2 py-0.5 rounded border border-accent/30">{bodyMass} kg</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setBodyMass(prev => Math.max(40, prev - 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-surface/60 hover:bg-zinc-800 border border-border text-white font-black flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="40" 
                      max="150" 
                      step="1" 
                      value={bodyMass} 
                      onChange={(e) => { setBodyMass(Number(e.target.value)); setShowResults(false); }} 
                      className="flex-1 h-1.5 bg-surface/60 rounded-lg appearance-none cursor-pointer accent-accent" 
                    />
                    <button type="button" onClick={() => { setBodyMass(prev => Math.min(150, prev + 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-surface/60 hover:bg-zinc-800 border border-border text-white font-black flex items-center justify-center">+</button>
                  </div>
                </div>

                {/* Leg Length Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-bold">طول الرجل (Leg Length):</span>
                    <span className="font-mono font-black text-white bg-surface-2/40 px-2 py-0.5 rounded border border-accent/30">{legLength.toFixed(2)} m</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setLegLength(prev => Math.max(0.5, prev - 0.02)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-surface/60 hover:bg-zinc-800 border border-border text-white font-black flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="0.50" 
                      max="1.30" 
                      step="0.01" 
                      value={legLength} 
                      onChange={(e) => { setLegLength(Number(e.target.value)); setShowResults(false); }} 
                      className="flex-1 h-1.5 bg-surface/60 rounded-lg appearance-none cursor-pointer accent-accent" 
                    />
                    <button type="button" onClick={() => { setLegLength(prev => Math.min(1.30, prev + 0.02)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-surface/60 hover:bg-surface-2 border border-border text-white font-black flex items-center justify-center">+</button>
                  </div>
                </div>

                {/* Player Height Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-bold">طول اللاعب (Player Height):</span>
                    <span className="font-mono font-black text-white bg-surface-2/40 px-2 py-0.5 rounded border border-accent/30">{playerHeight > 0 ? `${playerHeight} cm` : '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { handleHeightChange(Math.max(130, playerHeight - 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-surface/60 hover:bg-surface-2 border border-border text-white font-black flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="130" 
                      max="220" 
                      step="1" 
                      value={playerHeight} 
                      onChange={(e) => { handleHeightChange(Number(e.target.value)); setShowResults(false); }} 
                      className="flex-1 h-1.5 bg-surface/60 rounded-lg appearance-none cursor-pointer accent-accent" 
                    />
                    <button type="button" onClick={() => { handleHeightChange(Math.min(220, playerHeight + 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-surface/60 hover:bg-surface-2 border border-border text-white font-black flex items-center justify-center">+</button>
                  </div>
                </div>

                {/* Standing Reach Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted font-bold">الوصول من الثبات (Standing Reach):</span>
                    <span className="font-mono font-black text-white bg-surface-2/40 px-2 py-0.5 rounded border border-accent/30">{standingReach > 0 ? `${standingReach} cm` : '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { handleStandingReachChange(Math.max(150, standingReach - 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-surface/60 hover:bg-surface-2 border border-border text-white font-black flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="150" 
                      max="300" 
                      step="1" 
                      value={standingReach} 
                      onChange={(e) => { handleStandingReachChange(Number(e.target.value)); setShowResults(false); }} 
                      className="flex-1 h-1.5 bg-surface/60 rounded-lg appearance-none cursor-pointer accent-accent" 
                    />
                    <button type="button" onClick={() => { handleStandingReachChange(Math.min(300, standingReach + 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-surface/60 hover:bg-surface-2 border border-border text-white font-black flex items-center justify-center">+</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Execute Calculations Button */}
          <div className="mt-auto">
            <button onClick={handleAnalyze} className="w-full btn-orange-gradient py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer hover:scale-102 transition-transform">
               <Activity size={18} /> استخراج وتحليل النتائج ميكانيكياً ⏱️
            </button>
          </div>
        </div>

        {/* Display calculations outputs in full width bottom row */}
        {showResults && (
          <div className="col-span-12 bg-surface/40 backdrop-blur-xl border border-border rounded-3xl p-6 mt-4 space-y-6 animate-fade-in text-right">
            <div className="flex justify-between items-center border-b border-accent/20 pb-3">
              <div className="text-sm font-extrabold text-accent flex items-center gap-1.5">
                🚀 لوحة القيادة والتحليل الميكانيكي الحيوي (Cockpit Analysis HUD)
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-accent/20">
                <button
                  type="button"
                  onClick={() => setDisplayUnit('cm')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer ${displayUnit === 'cm' ? 'bg-accent text-accent-ink shadow' : 'text-muted hover:text-accent-ink bg-transparent'}`}
                >
                  سم (Cm)
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayUnit('in')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer ${displayUnit === 'in' ? 'bg-accent text-accent-ink shadow' : 'text-muted hover:text-accent-ink bg-transparent'}`}
                >
                  بوصة (Inches)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Column 1: Altimeter scale */}
              <div className="bg-black/35 p-5 rounded-3xl border border-accent/20 flex flex-col items-center justify-between text-center relative overflow-hidden min-h-[300px]">
                <div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-transparent pointer-events-none animate-pulse"></div>
                <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider mb-4 block">
                  📊 Biomechanical Altimeter (الارتفاع الرأسي)
                </span>
                
                <div className="flex gap-4 items-stretch h-48 w-full px-4 justify-center">
                  <div className="flex flex-col justify-between text-[8px] text-faint font-mono font-bold py-1 select-none text-left w-10">
                    <span>100 cm</span>
                    <span>80 cm</span>
                    <span>60 cm</span>
                    <span>40 cm</span>
                    <span>20 cm</span>
                    <span>0 cm</span>
                  </div>
                  
                  <div className="w-8 bg-bg border border-border rounded-full relative overflow-hidden flex items-end">
                    <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-20 z-10">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-0.5 w-full bg-accent" />
                      ))}
                    </div>
                    
                    {(() => {
                      const heightCm = parseFloat(stats.heightCm) || 0;
                      const pct = Math.min(100, (heightCm / 100) * 100);
                      return (
                        <div 
                          className="w-full bg-gradient-to-t from-accent to-accent rounded-full transition-all duration-1000"
                          style={{ height: `${pct}%` }}
                        />
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <div className="text-2xl font-black text-white font-mono leading-none">
                    {jumpType === 'dj' ? (
                      <AnimatedCounter value={stats.rsi || 0} decimals={2} />
                    ) : (
                      <AnimatedCounter value={displayUnit === 'in' ? stats.heightInches : stats.heightCm} decimals={1} />
                    )}
                    <span className="text-xs text-accent font-bold mr-1">
                      {jumpType === 'dj' ? 'Index' : (displayUnit === 'in' ? 'in' : 'cm')}
                    </span>
                  </div>
                  <span className="text-[9px] text-faint block mt-1">الوثب الفعلي لمركز الثقل</span>
                </div>
              </div>

              {/* Column 2: Speedometer power */}
              <div className="bg-surface-2/15 p-5 rounded-3xl border border-border flex flex-col items-center justify-between text-center relative overflow-hidden min-h-[300px]">
                <span className="text-[10px] text-muted font-extrabold uppercase tracking-wider mb-4 block">
                  ⚡ Cockpit Power Telemetry (القدرة الانفجارية)
                </span>
                
                <div className="relative w-44 h-24 flex items-center justify-center overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 100 55">
                    <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
                    {(() => {
                      const powerVal = (parseFloat(stats.sayersPeakPower) || 0);
                      const maxPower = 8000;
                      const pct = Math.min(1.0, powerVal / maxPower);
                      const strokeDasharray = 110;
                      const strokeDashoffset = strokeDasharray - (strokeDasharray * pct);
                      
                      const angle = -180 + (pct * 180);
                      const fillRadian = (angle * Math.PI) / 180;
                      const x2 = 50 + 30 * Math.cos(fillRadian);
                      const y2 = 50 + 30 * Math.sin(fillRadian);

                      return (
                        <>
                          <path 
                            d="M 15 50 A 35 35 0 0 1 85 50" 
                            fill="none" 
                            stroke="url(#powerGaugeGradientHUD)" 
                            strokeWidth="6" 
                            strokeLinecap="round"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                          />
                          <line x1="50" y1="50" x2={x2} y2={y2} stroke="#D97757" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx="50" cy="50" r="3" fill="#D97757" />
                        </>
                      );
                    })()}
                    <defs>
                      <linearGradient id="powerGaugeGradientHUD" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F5B544" />
                        <stop offset="100%" stopColor="#D97757" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                <div className="text-center mt-2 space-y-1">
                  <div className="text-xl font-black text-accent font-mono">
                    <AnimatedCounter value={stats.sayersPeakPower || 0} decimals={0} />
                    <span className="text-[10px] text-accent/80 font-bold mr-1">Watts</span>
                  </div>
                  <span className="text-[9px] text-faint block">ذروة القدرة (Sayers 1999)</span>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full mt-4 pt-3 border-t border-border/40 text-[9px]">
                  <div className="bg-black/20 p-2 rounded-xl text-center">
                    <span className="text-faint block text-[8px] font-bold">Harman 1991</span>
                    <span className="font-bold text-white font-mono">{stats.harmanPeakPower ? `${parseFloat(stats.harmanPeakPower).toFixed(0)} W` : '—'}</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-xl text-center">
                    <span className="text-faint block text-[8px] font-bold">سرعة الإقلاع V0</span>
                    <span className="font-bold text-accent font-mono">{stats.takeoffVelocity} m/s</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Stepper phase */}
              <div className="bg-black/35 p-5 rounded-3xl border border-border flex flex-col justify-start min-h-[300px]">
                <span className="text-[10px] text-accent font-extrabold uppercase tracking-wider mb-4 block">
                  📊 Biomechanical Phase Stepper (مراحل الحركة بالزوايا)
                </span>
                
                <div className="space-y-3 relative pr-3 border-r border-border max-h-[200px] overflow-y-auto custom-scrollbar">
                  {jumpType === 'dj' && jumpPhases?.boxTouchdown && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-black"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-accent/15">
                        <span className="font-extrabold text-[10px] text-accent block leading-tight">هبوط الصندوق (Drop Impact)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-faint font-mono">
                          <span>إطار: {jumpPhases.boxTouchdown.frame}</span>
                          <span>زمن: {jumpPhases.boxTouchdown.time.toFixed(3)}s</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {jumpType !== 'sj' && jumpPhases?.movementStart && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-black"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-accent/15">
                        <span className="font-extrabold text-[10px] text-accent block leading-tight">بدء النزول الحركي (Eccentric Phase)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-faint font-mono">
                          <span>إطار: {jumpPhases.movementStart.frame}</span>
                          <span>زمن: {jumpPhases.movementStart.time.toFixed(3)}s</span>
                          <span>ركبة: {jumpPhases.movementStart.kneeAngle.toFixed(0)}°</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {jumpType !== 'sj' && jumpPhases?.deepestSquat && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-black"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-accent/15">
                        <span className="font-extrabold text-[10px] text-accent block leading-tight">أقصى قرفصاء (Amortization Peak)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-faint font-mono">
                          <span>إطار: {jumpPhases.deepestSquat.frame}</span>
                          <span>زمن: {jumpPhases.deepestSquat.time.toFixed(3)}s</span>
                          <span>ركبة: {jumpPhases.deepestSquat.kneeAngle.toFixed(0)}°</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {jumpPhases?.takeoff && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-success border-2 border-black"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-success/15">
                        <span className="font-extrabold text-[10px] text-success block leading-tight">الدفع والإقلاع (Takeoff Drive)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-faint font-mono">
                          <span>إطار: {jumpPhases.takeoff.frame}</span>
                          <span>زمن: {jumpPhases.takeoff.time.toFixed(3)}s</span>
                          <span>ركبة: {jumpPhases.takeoff.kneeAngle.toFixed(0)}°</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {jumpPhases?.landing && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-danger border-2 border-black"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-danger/15">
                        <span className="font-extrabold text-[10px] text-danger block leading-tight">لمس الأرض (Landing Touchdown)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-faint font-mono">
                          <span>إطار: {jumpPhases.landing.frame}</span>
                          <span>زمن: {jumpPhases.landing.time.toFixed(3)}s</span>
                          <span>ركبة: {jumpPhases.landing.kneeAngle.toFixed(0)}°</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SVG displacement chart */}
            {jumpPhases?.points && jumpPhases.points.length > 5 && (
              <div className="bg-black/35 border border-border p-4 rounded-3xl space-y-3 mt-4">
                <span className="block text-xs text-accent font-bold border-b border-border pb-1.5 flex justify-between items-center">
                  <span>منحنى إزاحة الفخذ العمودية (Hip displacement)</span>
                  <span className="text-[10px] text-faint font-mono">الارتفاع الميكانيكي الفعلي: {jumpPhases.apex?.displacementCm?.toFixed(1)} cm</span>
                </span>
                <div className="w-full h-36 relative">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="80" x2="100" y2="80" stroke="#27272A" strokeWidth="0.5" strokeDasharray="3,3" />
                    {(() => {
                      const pts = jumpPhases.points;
                      const displacements = pts.map((p: any) => Math.abs(p.displacement));
                      const maxCm = Math.max(...displacements) || 1;
                      const d = pts.map((p: any, idx: any) => {
                        const x = (idx / (pts.length - 1)) * 100;
                        const y = 80 - (p.displacement / maxCm) * 60;
                        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ');
                      return (
                        <path d={d} fill="none" stroke="#D97757" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 4px rgba(0, 245, 212, 0.4))' }} />
                      );
                    })()}
                    {(() => {
                      const pts = jumpPhases.points;
                      const maxCm = Math.max(...pts.map((p: any) => Math.abs(p.displacement))) || 1;
                      const drawCircle = (index: any, color: any, label: any) => {
                        if (index === undefined || index === -1 || index >= pts.length) return null;
                        const x = (index / (pts.length - 1)) * 100;
                        const y = 80 - (pts[index].displacement / maxCm) * 60;
                        return (
                          <circle key={label} cx={x} cy={y} r="4" fill={color} stroke="#ffffff" strokeWidth="1" />
                        );
                      };
                      return [
                        drawCircle(jumpPhases.movementStart?.frame, '#D97757', 'Start'),
                        drawCircle(jumpPhases.deepestSquat?.frame, '#D97757', 'Squat'),
                        drawCircle(jumpPhases.takeoff?.frame, '#D97757', 'Takeoff'),
                        drawCircle(jumpPhases.apex?.frame, '#22C55E', 'Apex'),
                        drawCircle(jumpPhases.landing?.frame, '#F05252', 'Landing')
                      ];
                    })()}
                  </svg>
                </div>
                <div className="flex justify-between text-[9px] text-faint font-bold bg-black/20 p-2 rounded-xl">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent"></span> البداية</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent"></span> القرفصاء</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent"></span> الإقلاع</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success"></span> القمة</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-danger"></span> الهبوط</span>
                </div>
              </div>
            )}

            {/* Reach jump comparison */}
            <div className="bg-black/35 border border-border p-4 rounded-3xl space-y-3 mt-4">
              <span className="block text-xs text-accent font-bold border-b border-border pb-1.5">
                📐 أداة مقارنة ارتفاع اللمس (Reach Jump vs. Flight Time)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] text-faint mb-1">طول اللاعب (cm)</label>
                  <input
                    type="number"
                    value={playerHeight || ''}
                    onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-input)] border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-faint mb-1">الوصول من الثبات (cm)</label>
                  <input
                    type="number"
                    value={standingReach || ''}
                    onChange={(e) => handleStandingReachChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-input)] border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-faint mb-1">أقصى لمس بالقفز (cm)</label>
                  <input
                    type="number"
                    value={maxTouchHeight}
                    onChange={(e) => setMaxTouchHeight(parseFloat(e.target.value) || '')}
                    placeholder="مثال: 314"
                    className="w-full bg-[var(--bg-input)] border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-accent"
                  />
                </div>
              </div>

              {standingReach > 0 && maxTouchHeight > standingReach && (
                <div className="bg-surface-2/20 border border-accent/30 p-3 rounded-2xl animate-fade-in space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-semibold">قفزة اللمس الفعلية (Reach Jump):</span>
                    <span className="font-extrabold text-accent font-mono">
                      {(maxTouchHeight - standingReach).toFixed(1)} سم
                      <span className="text-[10px] text-faint mr-1">({((maxTouchHeight - standingReach) / 2.54).toFixed(1)} بوصة)</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-semibold">ارتفاع طيران مركز الثقل:</span>
                    <span className="font-extrabold text-white font-mono">
                      {parseFloat(stats.heightCm).toFixed(1)} سم
                      <span className="text-[10px] text-faint mr-1">({parseFloat(stats.heightInches).toFixed(1)} بوصة)</span>
                    </span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between items-center">
                    <span className="text-zinc-300 font-bold">الفارق البيوميكانيكي بين القياسين:</span>
                    <span className="font-bold text-accent font-mono">
                      {Math.abs((maxTouchHeight - standingReach) - parseFloat(stats.heightCm)).toFixed(1)} سم
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Jump Tag Selector for Logging */}
            {jumpType !== 'dj' && (
              <div className="space-y-2 bg-black/20 border border-border p-3.5 rounded-2xl mt-4">
                <label className="block text-[10px] text-muted font-bold mb-1">
                  تصنيف القفزة لحفظها (Jump Classification)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('sj_no_arms')}
                    className={`py-2 px-2.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'sj_no_arms'
                        ? 'bg-accent/20 text-accent border-accent/50 shadow'
                        : 'bg-[var(--bg-input)] text-muted border-border hover:text-white'
                    }`}
                  >
                    🏋️‍♂️ SJ (بدون يدين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('cmj_no_arms')}
                    className={`py-2 px-2.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'cmj_no_arms'
                        ? 'bg-accent/20 text-accent border-accent/50 shadow'
                        : 'bg-[var(--bg-input)] text-muted border-border hover:text-white'
                    }`}
                  >
                    🚀 CMJ (بدون يدين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('sj_arms')}
                    className={`py-2 px-2.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'sj_arms'
                        ? 'bg-accent/20 text-accent border-accent/50 shadow'
                        : 'bg-[var(--bg-input)] text-muted border-border hover:text-white'
                    }`}
                  >
                    🏋️‍♂️ SJ (بمساعدة اليدين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('cmj_arms')}
                    className={`py-2 px-2.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'cmj_arms'
                        ? 'bg-accent/20 text-accent border-accent/50 shadow'
                        : 'bg-[var(--bg-input)] text-muted border-border hover:text-white'
                    }`}
                  >
                    🚀 CMJ (بمساعدة اليدين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('approach')}
                    className={`col-span-2 py-2 px-3 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'approach'
                        ? 'bg-accent/20 text-accent border-accent/50 shadow'
                        : 'bg-[var(--bg-input)] text-muted border-border hover:text-white'
                    }`}
                  >
                    🏃‍♂️ قفزة الاقتراب الحركي (Approach Jump)
                  </button>
                </div>
              </div>
            )}

            {/* Save results controls */}
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <button onClick={saveMeasurement} disabled={isSaving} className="flex-1 py-4 btn-orange-gradient flex items-center justify-center gap-2 font-black text-sm rounded-2xl cursor-pointer">
                <Save size={18} />
                {isSaving ? 'جاري الحفظ...' : 'حفظ النتيجة في سجل اللاعب'}
              </button>
              <button 
                onClick={handleExportVideoWithOverlay} 
                disabled={isExporting} 
                className="flex-1 py-4 bg-accent/30 border border-accent/50 hover:bg-accent/50 text-accent flex items-center justify-center gap-2 font-black text-sm rounded-2xl cursor-pointer transition-all disabled:opacity-50"
              >
                <Video size={18} />
                {isExporting ? `جاري التصدير (${exportProgress}%)...` : 'تصدير فيديو التحليل 🎥'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMobileView = () => {
    return (
      <div className="flex flex-col gap-5 text-right w-full">
        {/* Header */}
        <div className="w-full flex justify-between items-center bg-surface/40 p-3.5 rounded-2xl border border-border">
          <span className="text-xs font-bold text-white flex items-center gap-1.5"><ScanEye size={16} className="text-accent"/> شاشة تحليل الفيديو (Mobile HUD)</span>
        </div>

        {/* Video Viewport & Scrubber Container */}
        <div className="bg-black/20 p-4 rounded-3xl border border-border flex flex-col gap-4">
          {!videoSrc ? (
            /* File Upload Area */
            <div className="flex flex-col gap-3.5 w-full justify-center items-center py-12 bg-black/10 rounded-2xl border border-dashed border-border">
              <label className="w-full max-w-xs cursor-pointer btn-orange-gradient text-center py-6 rounded-2xl font-black flex flex-col items-center justify-center gap-1.5 transition-transform shadow-lg text-xs">
                <input type="file" accept="video/*" capture="environment" onChange={handleFileUpload} ref={cameraInputRef} className="hidden" />
                <Focus size={24} /> فتح الكاميرا للتصوير 🎥
              </label>
              <label className="w-full max-w-xs cursor-pointer bg-surface/40 border border-border text-white text-center py-6 rounded-2xl font-black flex flex-col items-center justify-center gap-1.5 transition-all text-xs">
                <input type="file" accept="video/*" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                <Play size={24} className="text-accent" /> اختيار فيديو من المعرض 📁
              </label>
            </div>
          ) : (
            /* Video Scrubber View */
            <div className="flex flex-col items-center w-full relative">
              {/* Close button */}
              <button onClick={clearVideo} className="absolute top-2.5 right-2.5 bg-danger/90 hover:bg-danger p-2 rounded-full text-white z-20 shadow-lg transition-transform hover:scale-105 cursor-pointer">
                <X size={14}/>
              </button>
              
              {/* Video Viewport */}
              <div className="relative inline-block border border-border rounded-2xl overflow-hidden mb-3 shadow-2xl w-full bg-black">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  playsInline={true}
                  webkitPlaysInline={true}
                  muted={true}
                  controls={false}
                  preload="auto"
                  className="w-full h-auto max-h-[35vh] object-contain mx-auto"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onSeeked={handleVideoSeeked}
                  onEnded={() => setIsPlaying(false)}
                />
                <canvas 
                  ref={canvasRef} 
                  onClick={handleCanvasClick} 
                  className={`absolute top-0 left-0 w-full h-full ${isCalibrating ? 'cursor-crosshair z-10' : 'pointer-events-none'}`} 
                />

                {/* Telemetry overlay badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 select-none">
                  <span className="px-1.5 py-0.5 rounded bg-black/60 border border-danger/30 text-[8px] font-bold text-danger flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-danger animate-pulse"></span> REC
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/60 border border-accent/30 text-[8px] font-mono text-accent">
                    {cameraFps} FPS
                  </span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 z-10 bg-black/60 border border-border px-2 py-0.5 rounded-lg text-[8px] font-bold text-zinc-300">
                  الوزن الإضافي: <span className="text-accent font-mono">{bodyMass - (activePlayer?.weight_kg || 70)} kg</span>
                </div>
              </div>

              {/* Scrubber Console Controls */}
              <div className="w-full bg-surface/40 p-4 rounded-2xl border border-border space-y-4">
                <div className="flex flex-col items-center gap-4">
                  {/* Compact Jog Wheel */}
                  <div 
                    ref={jogWheelRef}
                    onMouseDown={handleJogStart}
                    onTouchStart={handleJogStart}
                    className="relative w-28 h-28 rounded-full bg-gradient-to-br from-zinc-800 to-black border-4 border-zinc-900 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none group"
                  >
                    <div className="absolute inset-0 rounded-full border border-accent/20 group-active:border-accent transition-all duration-300 pointer-events-none"></div>
                    
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4" />
                      {Array.from({ length: 12 }).map((_, i) => {
                        const angle = (i * 30 * Math.PI) / 180;
                        const x1 = 50 + 38 * Math.cos(angle);
                        const y1 = 50 + 38 * Math.sin(angle);
                        const x2 = 50 + 44 * Math.cos(angle);
                        const y2 = 50 + 44 * Math.sin(angle);
                        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />;
                      })}
                    </svg>

                    {/* Dial Indicator Needle */}
                    <div 
                      className="absolute w-0.5 h-10 origin-bottom"
                      style={{ 
                        transform: `rotate(${jogAngle}deg)`, 
                        bottom: '50%',
                        transition: isDraggingJog.current ? 'none' : 'transform 0.15s ease-out'
                      }}
                    >
                      <div className="w-0.5 h-3 bg-accent rounded-full"></div>
                    </div>

                    {/* Center Display */}
                    <div className="absolute w-20 h-20 rounded-full bg-bg border border-border shadow-inner flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[6px] text-faint font-extrabold tracking-wider leading-none">FRAME</span>
                      <span className="text-[10px] font-black text-white font-mono leading-none mt-1">
                        F {Math.round(currentTime * (videoFps || 30))}
                      </span>
                      <span className="text-[8px] text-accent font-bold mt-0.5 font-mono">
                        {currentTime.toFixed(2)}s
                      </span>
                    </div>
                  </div>

                  {/* Frame Buttons and timing selectors */}
                  <div className="w-full space-y-3">
                    <div className="grid grid-cols-6 gap-1 justify-center">
                      <button onClick={() => stepFrames(-10)} className="py-2 bg-black/45 border border-border rounded-lg text-zinc-300 font-mono text-[9px] font-bold cursor-pointer">-10</button>
                      <button onClick={() => stepFrames(-5)} className="py-2 bg-black/45 border border-border rounded-lg text-zinc-300 font-mono text-[9px] font-bold cursor-pointer">-5</button>
                      <button onClick={() => stepFrames(-1)} className="py-2 bg-black/45 border border-border rounded-lg text-zinc-300 font-mono text-[9px] font-bold cursor-pointer">-1</button>
                      <button onClick={() => stepFrames(1)} className="py-2 bg-black/45 border border-border rounded-lg text-zinc-300 font-mono text-[9px] font-bold cursor-pointer">+1</button>
                      <button onClick={() => stepFrames(5)} className="py-2 bg-black/45 border border-border rounded-lg text-zinc-300 font-mono text-[9px] font-bold cursor-pointer">+5</button>
                      <button onClick={() => stepFrames(10)} className="py-2 bg-black/45 border border-border rounded-lg text-zinc-300 font-mono text-[9px] font-bold cursor-pointer">+10</button>
                    </div>

                    <div className="flex justify-center">
                      <button onClick={togglePlay} className="px-6 py-2 bg-gradient-to-r from-accent to-accent text-white rounded-xl font-bold flex items-center justify-center gap-1.5 text-[10px] shadow-lg cursor-pointer w-full max-w-[160px]">
                        {isPlaying ? <><Pause size={12}/> إيقاف مؤقت</> : <><Play size={12}/> تشغيل الفيديو</>}
                      </button>
                    </div>

                    <div className="flex gap-2 w-full">
                      <button onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }} className={`flex-1 py-2 border rounded-xl font-bold transition-all text-[10px] flex items-center justify-center gap-1 cursor-pointer ${takeoffTime > 0 ? 'bg-accent/30 text-accent border-accent/50 shadow' : 'bg-black/30 border-border text-white hover:bg-zinc-800'}`}>
                        <span>🚀 إقلاع</span>
                        {takeoffTime > 0 && <span className="text-[8px] font-mono font-bold bg-surface-2/40 px-1 py-0.5 rounded">F {Math.round(takeoffTime * (videoFps || 30))}</span>}
                      </button>
                      <button onClick={() => { setLandingTime(currentTime); setShowResults(false); }} className={`flex-1 py-2 border rounded-xl font-bold transition-all text-[10px] flex items-center justify-center gap-1 cursor-pointer ${landingTime > 0 ? 'bg-danger/30 text-danger border-danger/50 shadow' : 'bg-black/30 border-border text-white hover:bg-zinc-800'}`}>
                        <span>🛬 هبوط</span>
                        {landingTime > 0 && <span className="text-[8px] font-mono font-bold bg-surface-2/40 px-1 py-0.5 rounded">F {Math.round(landingTime * (videoFps || 30))}</span>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Filmstrip Timeline Progress Bar */}
                <div className="relative w-full h-6 bg-black/60 border border-border rounded-xl overflow-hidden flex items-center px-3 mt-2">
                  <div className="absolute inset-0 flex justify-between items-center px-3 pointer-events-none opacity-20">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={i} className={`w-0.5 bg-accent rounded-full ${i % 5 === 0 ? 'h-3' : 'h-1.5'}`} />
                    ))}
                  </div>

                  {duration > 0 && takeoffTime > 0 && landingTime > takeoffTime && (
                    <div 
                      className="absolute top-0 bottom-0 bg-accent/10 border-l border-r border-accent/35 pointer-events-none"
                      style={{
                        right: `${(takeoffTime / duration) * 100}%`,
                        left: `${100 - (landingTime / duration) * 100}%`
                      }}
                    />
                  )}

                  <input 
                    type="range"
                    min="0.01"
                    max={duration || 100}
                    step="0.001"
                    value={currentTime}
                    dir="rtl"
                    onMouseDown={() => {
                      setIsDragging(true);
                      if (videoRef.current) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      }
                    }}
                    onTouchStart={() => {
                      setIsDragging(true);
                      if (videoRef.current) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      }
                    }}
                    onMouseMove={(e) => {
                      const val = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = val;
                      setCurrentTime(val);
                    }}
                    onTouchMove={(e) => {
                      const val = parseFloat(e.target.value);
                      if (videoRef.current) videoRef.current.currentTime = val;
                      setCurrentTime(val);
                    }}
                    onMouseUp={() => setIsDragging(false)}
                    onTouchEnd={() => setIsDragging(false)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCurrentTime(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="timeline-slider w-full h-full opacity-100 bg-transparent absolute inset-0 z-30 px-3 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="bg-black/20 p-4 rounded-3xl border border-border flex flex-col gap-4">
          <div className="flex border border-accent/20 bg-black/40 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveSettingsTab('analysis')}
              className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${activeSettingsTab === 'analysis' ? 'bg-accent/20 text-accent border border-accent/30' : 'text-faint hover:text-white bg-transparent border border-transparent'}`}
            >
              🎥 تحليل الفيديو
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab('anthropometrics')}
              className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${activeSettingsTab === 'anthropometrics' ? 'bg-accent/20 text-accent border border-accent/30' : 'text-faint hover:text-white bg-transparent border border-transparent'}`}
            >
              ⚖️ قياسات اللاعب
            </button>
          </div>

          {activeSettingsTab === 'analysis' && (
            <div className="space-y-4 text-right">
              <div>
                <label className="block text-[10px] text-muted mb-1">Jump Type (نوع القفزة)</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-black/35 rounded-2xl border border-border">
                  {[
                    { id: 'cmj', name: 'CMJ' },
                    { id: 'sj', name: 'SJ' },
                    { id: 'dj', name: 'DJ' }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => { setJumpType(type.id); setShowResults(false); }}
                      className={`py-2 px-1 text-[9px] font-bold rounded-xl transition-all cursor-pointer ${jumpType === type.id ? 'bg-accent text-accent-ink font-black' : 'text-muted bg-transparent'}`}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] text-muted mb-1 font-bold text-accent">Landing Knee Correction (معامل تصحيح الركبة)</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-black/35 rounded-2xl border border-border">
                  {[
                    { id: 'none', name: '❌ None' },
                    { id: 'light', name: '⏱️ Light' },
                    { id: 'medium', name: '⏱️ Medium' },
                    { id: 'heavy', name: '⏱️ Heavy' }
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setLandingCorrectionMode(mode.id)}
                      className={`py-1.5 px-0.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${landingCorrectionMode === mode.id ? 'bg-accent/20 text-accent border border-accent/50' : 'text-faint bg-transparent'}`}
                    >
                      {mode.name}
                    </button>
                  ))}
                </div>
              </div>

              {jumpType === 'dj' && (
                <div className="grid grid-cols-2 gap-3 bg-surface-2/15 border border-accent/25 p-3 rounded-2xl text-[10px]">
                  <div>
                    <label className="block text-[9px] text-muted mb-1">Box Height (ارتفاع الصندوق cm)</label>
                    <input type="number" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))} className="w-full bg-surface/60 border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted mb-1">Ground Contact Time (وقت ملامسة الأرض)</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.001" value={boxTouchdownTime} onChange={e => setBoxTouchdownTime(Number(e.target.value))} className="w-full bg-surface/60 border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                      <button type="button" onClick={() => setBoxTouchdownTime(currentTime)} className="px-2 bg-accent text-accent-ink rounded-xl text-[10px] font-bold shrink-0 cursor-pointer">هنا 📍</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-2xl border border-border">
                  <span className="text-[10px] text-zinc-300 font-bold">🔍 Smart FPS Auto-Detect (كشف FPS تلقائي)</span>
                  <button
                    type="button"
                    onClick={() => setIsFpsDetectionActive(!isFpsDetectionActive)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${isFpsDetectionActive ? 'bg-accent' : 'bg-zinc-800'}`}
                  >
                    <span className={`absolute top-1 bottom-1 w-4 h-4 rounded-full bg-white transition-all ${isFpsDetectionActive ? 'right-7' : 'right-1'}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] text-muted mb-1">Video Recording Type (نوع تصوير الفيديو)</label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-black/35 rounded-2xl border border-border">
                    {[
                      { id: 'slow240', name: '240 FPS' },
                      { id: 'slow120', name: '120 FPS' },
                      { id: 'normal60', name: '60 FPS' },
                      { id: 'normal30', name: '30' }
                    ].map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setVideoPreset(preset.id);
                          if (preset.id === 'slow240') { setCameraFps(240); setVideoFps(30); }
                          else if (preset.id === 'slow120') { setCameraFps(120); setVideoFps(30); }
                          else if (preset.id === 'normal30') { setCameraFps(30); setVideoFps(30); }
                          else if (preset.id === 'normal60') { setCameraFps(60); setVideoFps(60); }
                        }}
                        className={`py-2 px-1 text-[9px] font-bold rounded-xl transition-all cursor-pointer ${videoPreset === preset.id ? 'bg-accent/20 text-accent border border-accent/35' : 'text-muted bg-transparent'}`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-muted mb-1 block">Video File FPS (FPS ملف الفيديو)</label>
                  <input type="number" value={videoFps} onChange={(e) => setVideoFps(Number(e.target.value))} className="w-full bg-surface/60 border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[9px] text-muted mb-1 block">Camera FPS (FPS الكاميرا)</label>
                  <input type="number" value={cameraFps} onChange={(e) => setCameraFps(Number(e.target.value))} className="w-full bg-surface/60 border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                </div>
              </div>
              {manualFramePanel}

              {/* AI Auto-Tracking Toggle (Mobile) */}
              <div className="bg-black/15 border border-border p-2.5 rounded-2xl mb-1.5">
                <button
                  type="button"
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`w-full py-2 px-3 text-[9px] font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    aiEnabled
                      ? 'bg-accent/10 text-accent border-accent/30'
                      : 'bg-black/30 text-muted border-border hover:text-white'
                  }`}
                >
                  <ScanEye size={12} className={aiEnabled ? 'animate-pulse' : ''} />
                  {aiEnabled ? 'تتبع تلقائي بالذكاء الاصطناعي (مفعّل)' : 'تتبع تلقائي بالذكاء الاصطناعي (معطّل)'}
                </button>
              </div>

              {/* Calibration */}
              <div className="bg-black/15 border border-border p-3 rounded-2xl space-y-3">
                <span className="block text-[10px] text-accent font-bold border-b border-border pb-1">
                  <span>📐 Video Scale & Leg Calibration (معايرة الفيديو وطول الرجل)</span>
                </span>
                
                <div className="flex items-center gap-2 justify-between">
                  <label className="text-[9px] text-muted">Reference Leg Length (m):</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={referenceLength} 
                    onChange={(e) => setReferenceLength(Number(e.target.value))} 
                    className="w-16 bg-surface/60 border border-border p-1 text-xs text-center text-white rounded font-mono" 
                  />
                </div>

                {!isCalibrating ? (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCalibrating(true);
                      setCalibrationStep(1);
                      calibrationClicksRef.current = [];
                      setPixelsPerMeter(null);
                      setTrackedJumpHeight(null);
                    }}
                    className="w-full py-2 bg-black/35 border border-accent/20 text-zinc-300 rounded-xl text-[9px] font-bold transition-all cursor-pointer"
                  >
                    📏 ابدأ المعايرة باللمس
                  </button>
                ) : (
                  <div className="bg-surface-2/20 border border-accent/40 p-2 rounded-xl text-center text-[9px]">
                    {calibrationStep === 1 && <p className="text-accent font-bold">1️⃣ اضغط على <span className="text-white font-extrabold">مفصل الفخذ</span> بالفيديو</p>}
                    {calibrationStep === 2 && <p className="text-accent font-bold">2️⃣ اضغط على <span className="text-white font-extrabold">مفصل الكاحل</span> بالفيديو</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSettingsTab === 'anthropometrics' && (
            <div className="space-y-4 text-right">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-bold">وزن اللاعب:</span>
                  <span className="font-mono font-black text-white bg-surface-2/40 px-2 py-0.5 rounded">{bodyMass} kg</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min="40" max="150" step="1" value={bodyMass} onChange={(e) => { setBodyMass(Number(e.target.value)); setShowResults(false); }} className="flex-1 h-1.5 bg-surface/60 rounded-lg appearance-none cursor-pointer accent-accent" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-bold">طول القامة:</span>
                  <span className="font-mono font-black text-white bg-surface-2/40 px-2 py-0.5 rounded">{playerHeight > 0 ? `${playerHeight} cm` : '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min="120" max="230" step="1" value={playerHeight} onChange={(e) => { handleHeightChange(Number(e.target.value)); setShowResults(false); }} className="flex-1 h-1.5 bg-surface/60 rounded-lg appearance-none cursor-pointer accent-accent" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted font-bold">الوصول من الثبات:</span>
                  <span className="font-mono font-black text-white bg-surface-2/40 px-2 py-0.5 rounded">{standingReach > 0 ? `${standingReach} cm` : '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min="150" max="300" step="1" value={standingReach} onChange={(e) => { handleStandingReachChange(Number(e.target.value)); setShowResults(false); }} className="flex-1 h-1.5 bg-surface/60 rounded-lg appearance-none cursor-pointer accent-accent" />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <label className="block text-[9px] text-faint mb-1">أقصى لمس بالقفز (cm)</label>
                <input
                  type="number"
                  value={maxTouchHeight}
                  onChange={(e) => setMaxTouchHeight(parseFloat(e.target.value) || '')}
                  placeholder="مثال: 314"
                  className="w-full bg-[var(--bg-input)] border border-border rounded-xl p-2 px-3 text-xs text-white outline-none font-mono"
                />
              </div>

              {standingReach > 0 && maxTouchHeight > standingReach && (
                <div className="bg-surface-2/20 border border-accent/30 p-2.5 rounded-2xl space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-semibold">قفزة اللمس الفعلية:</span>
                    <span className="font-extrabold text-accent font-mono">{(maxTouchHeight - standingReach).toFixed(1)} سم</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted font-semibold">ارتفاع طيران مركز الثقل:</span>
                    <span className="font-extrabold text-white font-mono">{parseFloat(stats.heightCm).toFixed(1)} سم</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <button onClick={handleAnalyze} className="w-full btn-orange-gradient py-3.5 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 text-xs cursor-pointer">
              <Activity size={16} /> استخراج وتحليل النتائج ⏱️
            </button>
          </div>
        </div>

        {/* Mobile Results Dashboard */}
        {showResults && (
          <div className="bg-surface/40 backdrop-blur-xl border border-border rounded-3xl p-4 space-y-5 text-right">
            <div className="flex justify-between items-center border-b border-accent/20 pb-2">
              <span className="text-[11px] font-extrabold text-accent">🚀 لوحة القيادة الميكانيكية الحيوية (Mobile Cockpit)</span>
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-accent/10">
                <button type="button" onClick={() => setDisplayUnit('cm')} className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${displayUnit === 'cm' ? 'bg-accent text-accent-ink' : 'text-muted'}`}>Cm</button>
                <button type="button" onClick={() => setDisplayUnit('inches')} className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${displayUnit === 'inches' ? 'bg-accent text-accent-ink' : 'text-muted'}`}>In</button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex flex-col gap-5 items-center">
              {/* Altimeter height scale */}
              <div className="w-full bg-black/30 p-4 rounded-2xl border border-border/80 flex flex-col items-center gap-3">
                <span className="text-[10px] text-accent font-bold">📏 الارتفاع الرأسي (BIOMECHANICAL ALTIMETER)</span>
                
                <div className="flex items-end gap-4 h-48 w-full justify-center">
                  <div className="w-12 h-full bg-surface-2 border border-border rounded-2xl overflow-hidden relative flex flex-col justify-end p-1">
                    <div 
                      className="w-full bg-gradient-to-t from-accent to-accent rounded-xl transition-all duration-1000"
                      style={{ 
                        height: `${Math.min(100, (parseFloat(stats.heightCm) / (displayUnit === 'cm' ? 100 : 40)) * 100)}%` 
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-between h-full text-[8px] font-mono text-faint text-left">
                    <span>100</span>
                    <span>80</span>
                    <span>60</span>
                    <span>40</span>
                    <span>20</span>
                    <span>0</span>
                  </div>
                </div>

                <div className="text-center mt-1">
                  <span className="text-2xl font-black text-white font-mono leading-none">
                    {displayUnit === 'cm' ? <AnimatedCounter value={stats.heightCm} /> : <AnimatedCounter value={stats.heightInches} />}
                  </span>
                  <span className="text-[10px] text-accent font-black mr-1">{displayUnit === 'cm' ? 'cm' : 'inches'}</span>
                </div>
              </div>

              {/* Power Speedometer */}
              <div className="w-full bg-black/30 p-4 rounded-2xl border border-border/80 flex flex-col items-center gap-2">
                <span className="text-[10px] text-accent font-bold font-Cairo">⚡ القدرة الانفجارية (POWER TELEMETRY)</span>
                
                <div className="relative w-40 h-24 flex items-center justify-center overflow-hidden">
                  <svg className="w-full h-full transform -rotate-180" viewBox="0 0 100 50">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
                    <path 
                      d="M 10 50 A 40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke="url(#powerGrad)" 
                      strokeWidth="8" 
                      strokeLinecap="round"
                      strokeDasharray="125.6"
                      strokeDashoffset={125.6 - (125.6 * Math.min(100, ((parseFloat(stats.sayersPeakPower) || 0)) / 7500)) * 1}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="powerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#D97757" />
                        <stop offset="100%" stopColor="#D97757" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <div className="absolute bottom-1 text-center">
                    <span className="text-lg font-black text-white font-mono">
                      <AnimatedCounter value={stats.sayersPeakPower || 0} decimals={0} />
                    </span>
                    <span className="text-[8px] text-faint block">Peak Watts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Timeline & Diagnostics */}
            <div className="bg-black/15 p-3 rounded-2xl border border-zinc-900 space-y-4">
              <span className="block text-[10px] text-accent font-bold border-b border-border pb-1.5">📊 المراحل الميكانيكية للقفزة</span>
              
              <div className="space-y-4 pr-1">
                {[
                  { title: "المرحلة اللامركزية (Eccentric)", color: "bg-accent", desc: "يبدأ الهبوط والتخزين المرن للطاقة العضلية في العضلات القابضة للورك والركبة." },
                  { title: "مرحلة التحول (Amortization)", color: "bg-accent", desc: "النقطة الحرجة للتحول من الانقباض اللامركزي للمركزي. سرعة التحول تحدد كفاءة الـ SSC." },
                  { title: "المرحلة المركزية (Concentric)", color: "bg-accent", desc: "التفريغ الانفجاري للطاقة المخزنة ودفع الأرض بقوة أقصى للوصول لسرعة الانطلاق." },
                  { title: "مرحلة الطيران (Flight Phase)", color: "bg-success", desc: "يبدأ مركز ثقل اللاعب في الصعود لقمة المسار الحركي محكوماً بـ flight time." },
                  { title: "مرحلة الهبوط (Landing Correction)", color: "bg-danger", desc: "امتصاص الصدمات وقوى رد فعل الأرض بتفعيل معامل تصحيح الركبة المختار." }
                ].map((phase, idx) => (
                  <div key={idx} className="relative pl-1">
                    <div className={`absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full ${phase.color} border-2 border-black`}></div>
                    <span className="block text-[10px] font-black text-white">{phase.title}</span>
                    <p className="text-[9px] text-muted leading-relaxed mt-0.5">{phase.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Biomechanical Calculations & Force Estimation Card */}
            <div className="bg-black/35 border border-border p-4 rounded-3xl space-y-4 text-right">
              <span className="block text-xs text-accent font-extrabold border-b border-border pb-1.5 flex justify-between items-center">
                <span>🔬 Biomechanical Physics & Force Estimation</span>
                <span className="text-[9px] text-faint font-bold font-mono">Physics Engine v2.0</span>
              </span>

              <div className="grid grid-cols-1 gap-4 text-xs text-zinc-300">
                {/* Height Formula Column */}
                <div className="bg-black/20 p-4.5 rounded-2xl border border-accent/10 space-y-2">
                  <span className="block font-black text-accent">📏 Jump Height (حساب الارتفاع)</span>
                  <div className="bg-black/30 p-2 rounded-xl font-mono text-center text-[10px] text-white">
                    Height = (g * Tf²) / 8
                  </div>
                  <p className="text-[10px] text-muted leading-relaxed">
                    g = 9.81 m/s² | Tf = {stats.flightTime}s <br />
                    Height = <span className="text-accent font-bold">{(parseFloat(stats.heightCm)).toFixed(1)} cm</span>
                  </p>
                  <p className="text-[9px] text-faint leading-normal">
                    يعتمد الارتفاع على زمن الطيران الكلي. بما أن الجاذبية الأرضية هي المؤثر الوحيد أثناء التحليق، يمثل زمن التحليق قياساً بالغ الدقة لارتفاع مركز ثقل الجسم.
                  </p>
                </div>

                {/* Force Estimation Column */}
                <div className="bg-black/20 p-4.5 rounded-2xl border border-accent/20 space-y-2">
                  <span className="block font-black text-accent">🏋️ Mean push-off force (Samozino)</span>
                  <div className="bg-black/30 p-2 rounded-xl font-mono text-center text-[10px] text-white flex justify-between px-3">
                    <span>{stats.meanForce ? `${parseFloat(stats.meanForce).toFixed(0)} N` : '—'}</span>
                    <span>{stats.meanForce && bodyMass > 0 ? `${(parseFloat(stats.meanForce) / (bodyMass * 9.81)).toFixed(2)} BW` : '—'}</span>
                  </div>
                  {stats.hpoEstimated && (
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded-full border border-warning/40 text-warning">{tr.hud.hpoEstimatedBadge}</span>
                  )}
                  <p className="text-[9px] text-faint leading-normal">
                    F = m·g·(h/hPO + 1). ذروة القوة مش بتتحسب من الفيديو؛ محتاجة منصة قوة.
                  </p>
                </div>

                {/* Power Models Column */}
                <div className="bg-black/20 p-4.5 rounded-2xl border border-accent/10 space-y-2">
                  <span className="block font-black text-accent">⚡ Power Models (القدرة الميكانيكية)</span>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between items-center bg-black/15 px-2 py-1 rounded">
                      <span className="text-muted font-bold">Sayers 1999 (main):</span>
                      <span className="font-mono text-white font-bold">{stats.sayersPeakPower ? `${parseFloat(stats.sayersPeakPower).toFixed(0)} W` : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/15 px-2 py-1 rounded">
                      <span className="text-muted font-bold">Harman 1991:</span>
                      <span className="font-mono text-white font-bold">{stats.harmanPeakPower ? `${parseFloat(stats.harmanPeakPower).toFixed(0)} W` : '—'}</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-faint leading-normal">
                    تستخدم معادلات Sayers و Harman لتقدير إجمالي القدرة المتفجرة بالوات بناءً على طول الوثبة وكتلة الجسم.
                  </p>
                </div>
              </div>
            </div>

            {/* Jump Classification Tag */}
            {jumpType !== 'dj' && (
              <div className="space-y-2 bg-black/25 border border-zinc-900 p-3 rounded-2xl">
                <label className="block text-[9px] text-muted font-bold">تصنيف القفزة للحفظ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSaveJumpTag('sj_no_arms')} className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'sj_no_arms' ? 'bg-accent/20 text-accent border-accent/50' : 'bg-black/30 text-muted border-border'}`}>SJ (بدون يدين)</button>
                  <button type="button" onClick={() => setSaveJumpTag('cmj_no_arms')} className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'cmj_no_arms' ? 'bg-accent/20 text-accent border-accent/50' : 'bg-black/30 text-muted border-border'}`}>CMJ (بدون يدين)</button>
                  <button type="button" onClick={() => setSaveJumpTag('sj_arms')} className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'sj_arms' ? 'bg-accent/20 text-accent border-accent/50' : 'bg-black/30 text-muted border-border'}`}>SJ (باليدين)</button>
                  <button type="button" onClick={() => setSaveJumpTag('cmj_arms')} className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'cmj_arms' ? 'bg-accent/20 text-accent border-accent/50' : 'bg-black/30 text-muted border-border'}`}>CMJ (باليدين)</button>
                  <button type="button" onClick={() => setSaveJumpTag('approach')} className={`col-span-2 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'approach' ? 'bg-accent/20 text-accent border-accent/50' : 'bg-black/30 text-muted border-border'}`}>قفزة اقتراب (Approach)</button>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2 flex flex-col gap-2">
              <button onClick={saveMeasurement} disabled={isSaving} className="w-full py-3.5 btn-orange-gradient flex items-center justify-center gap-2 font-black text-xs rounded-xl cursor-pointer">
                <Save size={16} />
                {isSaving ? 'جاري الحفظ...' : 'حفظ النتيجة في سجل اللاعب'}
              </button>
              <button 
                onClick={handleExportVideoWithOverlay} 
                disabled={isExporting} 
                className="w-full py-3.5 bg-accent/30 border border-accent/50 hover:bg-accent/50 text-accent flex items-center justify-center gap-2 font-black text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
              >
                <Video size={16} />
                {isExporting ? `جاري التصدير (${exportProgress}%)...` : 'تصدير فيديو التحليل 🎥'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel p-4 md:p-6 relative text-start animate-fade-in">
      {isMobile ? renderMobileView() : renderDesktopView()}

      {isExporting && <ExportProgressOverlay progress={exportProgress} status={exportStatus} />}

      {exportedVideoUrl && (
        <ExportSuccessModal
          url={exportedVideoUrl}
          fileName={exportedVideoName}
          onShare={handleShareVideo}
          onClose={() => {
            URL.revokeObjectURL(exportedVideoUrl);
            setExportedVideoUrl(null);
            setExportedVideoBlob(null);
            setExportedVideoName('');
          }}
        />
      )}
    </div>
  );
}
