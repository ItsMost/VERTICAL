import { useState, useEffect, useRef } from 'react';
import { toast } from '../../components/Toast';
import useJumpMechanics from '../../useJumpMechanics';
import { ExportProgressOverlay, ExportSuccessModal } from '../../components/jump-console/ExportOverlays';
import { supportsStandingJumpModels } from '../../lib/testTypes';
import { useData } from '../../context/DataContext';
import { legStiffnessDalleau } from '../../lib/biomechanics';
import { Card, Metric, MiniStat, Pill, Segmented, Field, fmt, DASH } from '../../ui';
import { ChevronDown, Camera, FolderOpen, ScanLine, Download } from 'lucide-react';
import { fill } from '../../i18n/screens';
import { ScanEye, X, Play, Pause, Save } from 'lucide-react';

export default function VideoJumpTest({ testType }: { testType: string }) {
  const { addMeasurement, updatePlayerFields, activePlayer, selectedPlayerId, playerHistory, language, t: tr } = useData();
  const [displayUnit, setDisplayUnit] = useState<'cm' | 'inches'>('cm');
  // Video & Playback States
  const [videoPreset, setVideoPreset] = useState('slow240');
  const [cameraFps, setCameraFps] = useState(240);
  const [videoFps, setVideoFps] = useState(30);
  const [, setIsFpsAutoDetected] = useState(false);
  const [, setAiDetectedFrameDuration] = useState<any>(null);
  
  const [takeoffTime, setTakeoffTime] = useState(0);
  const [landingTime, setLandingTime] = useState(0);
  const [bodyMass, setBodyMass] = useState(72);
  const [legLength, setLegLength] = useState(1.0);
  const [videoSrc, setVideoSrc] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const legUsed = 'both';
  const [jumpType, setJumpType] = useState('cmj');
  const [boxHeight, setBoxHeight] = useState(30);
  const [boxTouchdownTime, setBoxTouchdownTime] = useState(0);

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
  const [, setIsMobile] = useState(false);

  // Calibration States
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [referenceLength, setReferenceLength] = useState(0.90);
  const [pixelsPerMeter, setPixelsPerMeter] = useState<any>(null);
  const [, setTrackedJumpHeight] = useState<any>(null);
  const calibrationClicksRef = useRef<any[]>([]);

  // Jog Wheel States & Refs
  const jogWheelRef = useRef<any>(null);
  const [, setJogAngle] = useState(0);
  const isDraggingJog = useRef(false);
  const lastAngle = useRef(0);

  const canvasRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const fileInputRef = useRef<any>(null);
  const cameraInputRef = useRef<any>(null);
  const reqRef = useRef<any>(null);
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef<any>(null);
  const pendingSeekTimeRef = useRef<any>(null);
  const [, setIsSeeking] = useState(false);
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
      return new Promise<void>((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const script = document.createElement('script'); script.src = src; script.crossOrigin = "anonymous"; script.onload = () => resolve();
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
          drawConnectors?.(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#D97757', lineWidth: 3 }); 
          drawLandmarks?.(canvasCtx, results.poseLandmarks, { color: '#ffffff', lineWidth: 1 });

          if (leftKnee && leftKnee.visibility > 0.5) {
            const kx = leftKnee.x * canvasRef.current.width;
            const ky = leftKnee.y * canvasRef.current.height;
            canvasCtx.fillStyle = '#D97757';
            canvasCtx.font = 'bold 13px Cairo';
            canvasCtx.fillText(`${tr.s.knee} L: ${leftKneeAngle.toFixed(0)}°`, kx - 75, ky);
          }
          if (rightKnee && rightKnee.visibility > 0.5) {
            const kx = rightKnee.x * canvasRef.current.width;
            const ky = rightKnee.y * canvasRef.current.height;
            canvasCtx.fillStyle = '#22C55E';
            canvasCtx.font = 'bold 13px Cairo';
            canvasCtx.fillText(`${tr.s.knee} R: ${rightKneeAngle.toFixed(0)}°`, kx + 15, ky);
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
      let startTime: number | null = null;
      let lastMediaTime: number | null = null;
      const frameDiffs: number[] = [];
      
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
    if (data.length < 15) return toast.info(tr.s.aiNeedFullVideo);
    
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
    
    toast.success(fill(tr.s.aiPhasesDone, { knee: avgLandingKnee.toFixed(0), ms: correctionMs }));
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

  const drawCalibrationPoints = (clicksList: any[] | null = null) => {
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
      const refLen = parseFloat(String(referenceLength)) || 0.90;
      const ppm = distInPixels / refLen;
      setPixelsPerMeter(ppm);
      setLegLength(refLen); 
      setIsCalibrating(false);
      setCalibrationStep(0);
      toast.success(fill(tr.s.calibrationDone, { ppm: ppm.toFixed(1), leg: refLen }));
      
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
        return toast.info(tr.s.needMarks); 
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
    parseFloat(String(manualFrameDuration)) || 0.033,
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
      jump_height_cm: parseFloat(stats.heightCm), 
      flight_time_sec: parseFloat(stats.flightTime), 
      contact_time_sec: stats.contactTime ? parseFloat(stats.contactTime) : null,
      rsi_score: stats.rsi ? parseFloat(stats.rsi) : null,
      box_height_cm: jumpType === 'dj' && boxHeight ? Number(boxHeight) : null,
      takeoff_velocity_ms: stats.takeoffVelocity ? parseFloat(stats.takeoffVelocity) : null, 
      // Sayers / Samozino only describe standing SJ/CMJ, not approach or drop jumps
      mean_power_watts: supportsStandingJumpModels(finalTestType) && stats.meanPower ? parseFloat(stats.meanPower) : null, 
      peak_power_watts: supportsStandingJumpModels(finalTestType) && powerVal > 0 ? Number(powerVal.toFixed(2)) : null, 
      mean_force_newtons: supportsStandingJumpModels(finalTestType) && stats.meanForce ? parseFloat(stats.meanForce) : null, 
      leg_used: legUsed 
    });
    
    if (savedRecord) { 
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
    const shareText = fill(tr.s.shareText, { name: athleteName, h: jumpHeight.toFixed(1) });

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
          toast.error(fill(tr.s.shareFailed, { msg: err.message }));
        }
      }
    } else {
      toast.info(tr.ui.jcYourBrowserDoesNot);
    }
  };

  const handleExportVideoWithOverlay = async () => {
    if (!videoSrc || !videoRef.current) return toast.info(tr.s.loadVideoFirst);
    if (!stats || !stats.heightCm || takeoffTime <= 0 || landingTime <= 0) {
      return toast.info(tr.s.analyzeFirst);
    }

    const exportVideo = videoRef.current;
    
    // Save original playback states
    window.tempOriginalUserTime = exportVideo.currentTime;
    window.tempOriginalMuted = exportVideo.muted;
    window.tempOriginalLoop = exportVideo.loop;

    let canvasElement: HTMLCanvasElement | null = null;
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

      // Capture full video duration
      const startTime = 0;
      const endTime = Math.max(0, exportVideo.duration - 0.05);

      setExportStatus(tr.ui.jcSeekingToStartPosition);

      exportVideo.currentTime = startTime;
      await new Promise<void>((resolve) => {
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

      const chunks: Blob[] = [];

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

        const activeTestName = (tr.testTypes as Record<string, string>)[saveJumpTag] || tr.s.verticalJump;

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
          
          const jumpText = fill(tr.s.jumpNumber, { n: jumpNum });
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
        ctx.fillText('VERTICAL LAB', hudX + 8, hudY - 8);
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
      toast.error(fill(tr.s.exportFailed, { msg: err.message }));
      
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

  /* ====================================================================
     View (single responsive layout)
  ==================================================================== */

  // Keep the engine's jump type / save tag in step with the chosen test
  useEffect(() => {
    setJumpType(testType === 'rsi' ? 'dj' : testType.startsWith('sj') ? 'sj' : 'cmj');
    setSaveJumpTag(testType);
    setShowResults(false);
  }, [testType]);

  const s = tr.s;
  const frameOf = (tm: number) => Math.round(tm * (videoFps || 30));
  const isDj = jumpType === 'dj';
  const ct = parseFloat(stats.contactTime) || 0;
  const ft = parseFloat(stats.flightTime) || 0;
  const stiffness = isDj ? legStiffnessDalleau(Number(bodyMass), ct, ft) : null;
  const extraLoad = Number(bodyMass) - (Number(activePlayer?.weight_kg) || Number(bodyMass));
  const heightShown = displayUnit === 'cm' ? stats.heightCm : stats.heightInches;
  const presets = [
    { id: 'slow240', label: '240', cam: 240, vid: 30 },
    { id: 'slow120', label: '120', cam: 120, vid: 30 },
    { id: 'normal60', label: '60', cam: 60, vid: 60 },
    { id: 'normal30', label: '30', cam: 30, vid: 30 },
  ];
  const marks: { key: string; label: string; time: number; set: (v: number) => void }[] = [
    ...(isDj ? [{ key: 'td', label: s.markTouchdown, time: boxTouchdownTime, set: setBoxTouchdownTime }] : []),
    { key: 'to', label: s.markTakeoff, time: takeoffTime, set: setTakeoffTime },
    { key: 'la', label: s.markLanding, time: landingTime, set: setLandingTime },
  ];
  const touchJump = standingReach > 0 && Number(maxTouchHeight) > standingReach ? Number(maxTouchHeight) - standingReach : null;
  const phaseRows = jumpPhases
    ? ([
        ['boxTouchdown', s.phaseBox],
        ['movementStart', s.phaseStart],
        ['deepestSquat', s.phaseSquat],
        ['takeoff', s.phaseTakeoff],
        ['apex', s.phaseApex],
        ['landing', s.phaseLanding],
      ] as const).filter(([k]) => jumpPhases[k])
    : [];

  return (
    <div className="space-y-4">
      {/* ---------------- video ---------------- */}
      {!videoSrc ? (
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <label className="btn-primary cursor-pointer min-h-[88px] flex-col">
              <Camera size={24} />{s.openCamera}
              <input type="file" accept="video/*" capture="environment" onChange={handleFileUpload} ref={cameraInputRef} className="sr-only" />
            </label>
            <label className="btn-ghost cursor-pointer min-h-[88px] flex-col">
              <FolderOpen size={24} />{s.pickVideo}
              <input type="file" accept="video/*" onChange={handleFileUpload} ref={fileInputRef} className="sr-only" />
            </label>
          </div>
          <AiToggle />
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="relative bg-black">
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              muted
              controls={false}
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onSeeked={handleVideoSeeked}
              onEnded={() => setIsPlaying(false)}
              className="w-full max-h-[60svh] object-contain"
              {...({ 'webkit-playsinline': 'true' } as Record<string, string>)}
            />
            <canvas ref={canvasRef} onClick={handleCanvasClick} className={`absolute inset-0 w-full h-full ${isCalibrating ? 'cursor-crosshair' : 'pointer-events-none'}`} />
            <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-2 pointer-events-none" dir="ltr">
              <span className="rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs text-text">{s.frame} {frameOf(currentTime)} · {currentTime.toFixed(3)}s</span>
              <span className="rounded-full bg-black/70 px-2.5 py-1 font-mono text-xs text-muted">{cameraFps} fps</span>
            </div>
            <button type="button" onClick={clearVideo} aria-label={s.removeVideo} className="icon-btn absolute bottom-2 end-2 bg-black/70 rounded-full text-text">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* timeline */}
            <div className="relative" dir="ltr">
              {duration > 0 && marks.filter(m => m.time > 0).map(m => (
                <span key={m.key} className="absolute -top-1 w-0.5 h-3 bg-accent" style={{ left: `${(m.time / duration) * 100}%` }} aria-hidden />
              ))}
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.001}
                value={currentTime}
                aria-label={s.frame}
                className="w-full accent-[var(--color-accent)] h-10"
                onPointerDown={() => { setIsDragging(true); videoRef.current?.pause(); setIsPlaying(false); }}
                onPointerUp={() => setIsDragging(false)}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  setCurrentTime(v);
                  if (videoRef.current) videoRef.current.currentTime = v;
                }}
              />
            </div>

            {/* frame stepping */}
            <div className="grid grid-cols-7 gap-1" dir="ltr">
              {[-10, -5, -1].map(n => <button key={n} type="button" onClick={() => stepFrames(n)} className="btn-ghost !px-0 font-mono text-xs">{n}</button>)}
              <button type="button" onClick={togglePlay} aria-label={isPlaying ? s.pause : s.play} className="btn-primary !px-0">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              {[1, 5, 10].map(n => <button key={n} type="button" onClick={() => stepFrames(n)} className="btn-ghost !px-0 font-mono text-xs">+{n}</button>)}
            </div>

            {/* markers */}
            <div className={`grid gap-2 ${marks.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {marks.map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => { m.set(currentTime); setShowResults(false); }}
                  className={`rounded-[var(--radius-control)] border min-h-[56px] flex flex-col items-center justify-center font-semibold text-sm ${m.time > 0 ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'}`}
                >
                  {m.label}
                  <span className="font-mono text-[11px] text-faint" dir="ltr">{m.time > 0 ? `${s.frame} ${frameOf(m.time)}` : DASH}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-faint">{s.markHint}</p>
            <AiToggle />
            <button type="button" onClick={handleAnalyze} className="btn-primary w-full"><ScanLine size={18} />{s.analyze}</button>
          </div>
        </Card>
      )}

      {/* ---------------- results ---------------- */}
      {showResults && stats.heightCm && (
        <Card title={s.result} action={
          <Segmented size="sm" value={displayUnit} onChange={setDisplayUnit} options={[{ value: 'cm', label: 'cm' }, { value: 'inches', label: 'in' }]} />
        }>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">{(tr.testTypes as Record<string, string>)[testType] ?? testType}</p>
              <Metric value={fmt(parseFloat(heightShown), 1)} unit={displayUnit === 'cm' ? 'cm' : 'in'} />
              <p className="text-xs text-faint mt-2 font-mono" dir="ltr">{s.formula} · t = {stats.flightTime}s</p>
            </div>
            {isDj && (
              <div>
                <p className="text-xs text-muted">RSI</p>
                <Metric value={stats.rsi || DASH} />
                <p className="text-xs text-faint mt-2">{s.contactTime}: <span className="font-mono">{ct > 0 ? Math.round(ct * 1000) : DASH} ms</span></p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <MiniStat label={s.takeoffVelocity} value={stats.takeoffVelocity || DASH} unit="m/s" />
            {isDj ? (
              <MiniStat label={s.legStiffness} value={stiffness !== null ? (stiffness / 1000).toFixed(1) : DASH} unit="kN/m" />
            ) : (
              <>
                <MiniStat label={s.peakPower} value={stats.sayersPeakPower ? parseFloat(stats.sayersPeakPower).toFixed(0) : DASH} unit="W" />
                <MiniStat label={s.harmanPower} value={stats.harmanPeakPower ? parseFloat(stats.harmanPeakPower).toFixed(0) : DASH} unit="W" />
                <MiniStat label={s.meanForce} value={stats.meanForce ? parseFloat(stats.meanForce).toFixed(0) : DASH} unit="N" />
                <MiniStat label={s.meanPower} value={stats.meanPower ? parseFloat(stats.meanPower).toFixed(0) : DASH} unit="W" />
                <MiniStat label="BW" value={stats.meanForce && Number(bodyMass) > 0 ? (parseFloat(stats.meanForce) / (Number(bodyMass) * 9.81)).toFixed(2) : DASH} unit="×" />
              </>
            )}
          </div>
          {!isDj && (
            <p className="text-xs text-faint mt-3 flex flex-wrap gap-2 items-center">
              {stats.hpoEstimated && <Pill tone="warning">{s.hpoEstimated}</Pill>}
              {s.forceNeedsPlate}
            </p>
          )}

          {phaseRows.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <h3 className="text-sm font-semibold text-muted">{s.phases}</h3>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {phaseRows.map(([k, label]) => (
                  <li key={k} className="rounded-[var(--radius-control)] bg-surface-2 p-3">
                    <p className="text-xs font-semibold">{label}</p>
                    <p className="text-[11px] text-faint font-mono" dir="ltr">
                      {s.frame} {jumpPhases[k].frame} · {Number(jumpPhases[k].time).toFixed(3)}s
                      {jumpPhases[k].kneeAngle ? ` · ${s.knee} ${Number(jumpPhases[k].kneeAngle).toFixed(0)}°` : ''}
                    </p>
                  </li>
                ))}
              </ul>
              {jumpPhases?.points?.length > 5 && (
                <div>
                  <p className="text-xs text-muted mb-1">{s.hipCurve}{jumpPhases.apex?.displacementCm ? ` · ${jumpPhases.apex.displacementCm.toFixed(1)} cm` : ''}</p>
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-24" style={{ direction: 'ltr' }} aria-hidden>
                    {(() => {
                      const pts = jumpPhases.points;
                      const max = Math.max(...pts.map((pt: any) => Math.abs(pt.displacement))) || 1;
                      const d = pts.map((pt: any, i: number) => `${i ? 'L' : 'M'} ${(i / (pts.length - 1)) * 100} ${36 - (pt.displacement / max) * 30}`).join(' ');
                      return <path d={d} fill="none" className="stroke-accent" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />;
                    })()}
                  </svg>
                </div>
              )}
            </div>
          )}

          <button type="button" onClick={saveMeasurement} disabled={isSaving || !selectedPlayerId} className="btn-primary w-full mt-4">
            <Save size={18} />{isSaving ? s.saving : s.saveTest}
          </button>
        </Card>
      )}

      {/* ---------------- advanced drawer ---------------- */}
      <details className="group rounded-[var(--radius-card)] bg-surface border border-border">
        <summary className="list-none cursor-pointer flex items-center justify-between gap-3 px-5 min-h-[56px] font-semibold">
          {s.advanced}
          <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 space-y-5">
          <div>
            <p className="text-xs font-medium text-muted mb-1.5">{s.recording} (fps)</p>
            <Segmented size="sm" value={videoPreset} onChange={(v: string) => {
              const pr = presets.find(x => x.id === v)!;
              setVideoPreset(v); setCameraFps(pr.cam); setVideoFps(pr.vid); setShowResults(false);
            }} options={presets.map(pr => ({ value: pr.id, label: pr.label }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={s.videoFps} type="number" inputMode="numeric" value={videoFps} onChange={e => setVideoFps(Number(e.target.value))} />
            <Field label={s.cameraFps} type="number" inputMode="numeric" value={cameraFps} onChange={e => setCameraFps(Number(e.target.value))} />
          </div>
          <Toggle label={s.autoFps} on={isFpsDetectionActive} onClick={() => setIsFpsDetectionActive(!isFpsDetectionActive)} />
          <Toggle
            label={s.manualFrame}
            on={timeCalculationMethod === 'manual'}
            onClick={() => {
              const next = timeCalculationMethod === 'manual' ? 'fps' : 'manual';
              setTimeCalculationMethod(next);
              if (next === 'manual' && !isFrameDurationManual) setManualFrameDuration(parseFloat((1 / (cameraFps || 240)).toFixed(6)));
            }}
          />
          {timeCalculationMethod === 'manual' && (
            <Field
              label={s.manualFrameSec}
              type="number"
              inputMode="decimal"
              step="0.000001"
              min="0.0001"
              value={manualFrameDuration}
              onChange={e => { setIsFrameDurationManual(true); setManualFrameDuration(e.target.value as any); }}
              hint={<span dir="ltr">= {(1 / (parseFloat(String(manualFrameDuration)) || 1)).toFixed(1)} {s.realFps} · video {videoFps} fps</span>}
            />
          )}
          <div>
            <p className="text-xs font-medium text-muted mb-1.5">{s.landingCorrection}</p>
            <Segmented size="sm" value={landingCorrectionMode} onChange={setLandingCorrectionMode} options={[
              { value: 'none', label: s.corrNone }, { value: 'light', label: `${s.corrLight} 10ms` }, { value: 'medium', label: `${s.corrMedium} 25ms` }, { value: 'heavy', label: `${s.corrHeavy} 50ms` },
            ]} />
          </div>
          {isDj && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={s.boxHeightCm} type="number" inputMode="decimal" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))} />
              <Field label={`${s.markTouchdown} (s)`} type="number" inputMode="decimal" step="0.001" value={boxTouchdownTime} onChange={e => setBoxTouchdownTime(Number(e.target.value))} />
            </div>
          )}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-muted">{s.bodyMassKg}</span>
              <span className="font-mono" dir="ltr">{bodyMass} kg{extraLoad > 0 ? ` (+${extraLoad} ${s.extraLoad})` : ''}</span>
            </div>
            <input type="range" min={30} max={160} step={0.5} value={bodyMass} onChange={e => { setBodyMass(Number(e.target.value)); setShowResults(false); }} className="w-full h-10 accent-[var(--color-accent)]" aria-label={s.bodyMassKg} />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">{s.calibration}</p>
            <div className="flex gap-2 items-end">
              <div className="flex-1"><Field label={s.refLegM} type="number" inputMode="decimal" step="0.01" value={referenceLength} onChange={e => setReferenceLength(Number(e.target.value))} /></div>
              <button type="button" className="btn-ghost" disabled={!videoSrc} onClick={() => {
                setIsCalibrating(true); setCalibrationStep(1); calibrationClicksRef.current = []; setPixelsPerMeter(null); setTrackedJumpHeight(null);
              }}>{s.startCalibration}</button>
            </div>
            {isCalibrating && <p className="text-sm text-accent">{calibrationStep === 1 ? s.calStep1 : s.calStep2}</p>}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">{s.reachTool}</p>
            <div className="grid grid-cols-3 gap-2">
              <Field label={s.heightCm} type="number" inputMode="decimal" value={playerHeight || ''} onChange={e => handleHeightChange(parseFloat(e.target.value) || 0)} />
              <Field label={s.standingReachCm} type="number" inputMode="decimal" value={standingReach || ''} onChange={e => handleStandingReachChange(parseFloat(e.target.value) || 0)} />
              <Field label={s.maxTouchCm} type="number" inputMode="decimal" value={maxTouchHeight} onChange={e => setMaxTouchHeight(e.target.value)} />
            </div>
            {touchJump !== null && (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <MiniStat label={s.touchJump} value={touchJump.toFixed(1)} unit="cm" />
                <MiniStat label={s.flightJump} value={fmt(parseFloat(stats.heightCm))} unit="cm" />
                <MiniStat label={s.difference} value={stats.heightCm ? Math.abs(touchJump - parseFloat(stats.heightCm)).toFixed(1) : DASH} unit="cm" />
              </div>
            )}
          </div>

          <button type="button" onClick={handleExportVideoWithOverlay} disabled={isExporting || !showResults} className="btn-ghost w-full">
            <Download size={16} />{isExporting ? `${s.exporting} ${exportProgress}%` : s.exportVideo}
          </button>
        </div>
      </details>

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

  function AiToggle() {
    return (
      <div className="mt-3 rounded-[var(--radius-control)] border border-border p-3 space-y-1">
        <Toggle label={<span className="flex items-center gap-2"><ScanEye size={16} className={aiEnabled ? 'text-accent' : ''} />{s.aiTracking}</span>} on={aiEnabled} onClick={() => setAiEnabled(!aiEnabled)} />
        {aiEnabled && <p className="text-xs text-faint">{s.aiHint}</p>}
      </div>
    );
  }
}

function Toggle({ label, on, onClick }: { label: React.ReactNode; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} className="w-full flex items-center justify-between gap-3 min-h-[44px] text-sm font-medium">
      <span>{label}</span>
      <span className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-surface-2 border border-border'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-text transition-all ${on ? 'start-[22px]' : 'start-0.5'}`} />
      </span>
    </button>
  );
}
