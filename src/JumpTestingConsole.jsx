import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import useJumpMechanics from './useJumpMechanics';
import { 
  Activity, Zap, ScanEye, X, Play, Pause, Focus, Save, Award, HelpCircle, Scaling, Video,
  Share2, CheckCircle, Download
} from 'lucide-react';

const AnimatedCounter = ({ value, duration = 1000, decimals = 1 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (start === end) return;
    const totalMiliseconds = duration;
    const increment = end - start;
    const startTime = performance.now();
    const updateCount = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalMiliseconds, 1);
      const easeProgress = progress * (2 - progress); // easeOutQuad
      setCount(start + increment * easeProgress);
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };
    requestAnimationFrame(updateCount);
  }, [value, duration]);
  return <span className="font-mono">{count.toFixed(decimals)}</span>;
};

export default function JumpTestingConsole({ 
  activePlayer, 
  selectedPlayerId, 
  onSaveSuccess, 
  displayUnit, 
  setDisplayUnit,
  language = 'ar',
  playerHistory
}) {
  // Video & Playback States
  const [videoPreset, setVideoPreset] = useState('slow240');
  const [cameraFps, setCameraFps] = useState(240);
  const [videoFps, setVideoFps] = useState(30);
  const [isFpsAutoDetected, setIsFpsAutoDetected] = useState(false);
  const [aiDetectedFrameDuration, setAiDetectedFrameDuration] = useState(null);
  
  const [takeoffTime, setTakeoffTime] = useState(0);
  const [landingTime, setLandingTime] = useState(0);
  const [bodyMass, setBodyMass] = useState(72);
  const [legLength, setLegLength] = useState(1.0);
  const [videoSrc, setVideoSrc] = useState(null);
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

  const [playerHeight, setPlayerHeight] = useState(180);
  const [standingReach, setStandingReach] = useState(230);
  const [maxTouchHeight, setMaxTouchHeight] = useState('');

  const [saveJumpTag, setSaveJumpTag] = useState('sj_no_arms');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [exportedVideoUrl, setExportedVideoUrl] = useState(null);
  const [exportedVideoBlob, setExportedVideoBlob] = useState(null);
  const [exportedVideoName, setExportedVideoName] = useState('');

  const [landingCorrectionMode, setLandingCorrectionMode] = useState('none');
  const [jumpPhases, setJumpPhases] = useState(null);
  
  // MediaPipe AI tracking states
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const poseRef = useRef(null);
  const flightDataRef = useRef([]);
  
  // FPS auto-detection state
  const [isFpsDetectionActive, setIsFpsDetectionActive] = useState(false);

  // Mobile Viewport detection
  const [isMobile, setIsMobile] = useState(false);

  // Calibration States
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [referenceLength, setReferenceLength] = useState(0.90);
  const [pixelsPerMeter, setPixelsPerMeter] = useState(null);
  const [trackedJumpHeight, setTrackedJumpHeight] = useState(null);
  const calibrationClicksRef = useRef([]);

  // Jog Wheel States & Refs
  const jogWheelRef = useRef(null);
  const [jogAngle, setJogAngle] = useState(0);
  const isDraggingJog = useRef(false);
  const lastAngle = useRef(0);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const reqRef = useRef(null);
  const lastSeekTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef(null);
  const pendingSeekTimeRef = useRef(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentTimeMobileRef = useRef(null);
  const currentFrameMobileRef = useRef(null);
  const currentTimeDesktopRef = useRef(null);
  const currentFrameDesktopRef = useRef(null);

  // Sync with activePlayer when changed
  useEffect(() => {
    if (activePlayer) {
      setBodyMass(activePlayer.weight_kg || 72);
      setLegLength(activePlayer.leg_length_m || 1.0);
      setPlayerHeight(activePlayer.height_cm || 180);
      setStandingReach(activePlayer.standing_reach_cm || 230);
      
      const storedHeight = localStorage.getItem(`player_height_${activePlayer.id}`);
      const storedReach = localStorage.getItem(`standing_reach_${activePlayer.id}`);
      if (storedHeight) setPlayerHeight(parseFloat(storedHeight));
      if (storedReach) setStandingReach(parseFloat(storedReach));
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
    const loadScript = (src) => {
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
      } catch (error) { console.error(error); }
    };
    loadMediaPipe();
  }, []);

  // AI MediaPipe pose results tracker
  useEffect(() => {
    if (!scriptsLoaded) return;
    const { Pose, POSE_CONNECTIONS, drawConnectors, drawLandmarks } = window;
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    
    pose.onResults((results) => {
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
        canvasCtx.fillStyle = '#fbbf24'; 
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
          canvasCtx.strokeStyle = '#fbbf24'; 
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

        const calculateAngle = (a, b, c) => {
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
          drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00f5d4', lineWidth: 3 }); 
          drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ffffff', lineWidth: 1 });

          if (leftKnee && leftKnee.visibility > 0.5) {
            const kx = leftKnee.x * canvasRef.current.width;
            const ky = leftKnee.y * canvasRef.current.height;
            canvasCtx.fillStyle = '#ff8c3a';
            canvasCtx.font = 'bold 13px Cairo';
            canvasCtx.fillText(`ركبة L: ${leftKneeAngle.toFixed(0)}°`, kx - 75, ky);
          }
          if (rightKnee && rightKnee.visibility > 0.5) {
            const kx = rightKnee.x * canvasRef.current.width;
            const ky = rightKnee.y * canvasRef.current.height;
            canvasCtx.fillStyle = '#4ade80';
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
              rightHip: rightHipAngle
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
  const performSeek = (time) => {
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
    } catch (err) {
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

  const detectVideoFps = (videoEl) => {
    if (!videoEl || !videoEl.duration) return;
    
    if (videoEl.requestVideoFrameCallback) {
      let frameCount = 0;
      let startTime = null;
      let lastMediaTime = null;
      const frameDiffs = [];
      
      const callback = (now, metadata) => {
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

  const handleFileUpload = (e) => { 
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
    if (data.length < 15) return alert("يرجى تشغيل الفيديو بالكامل مع تفعيل الذكاء الاصطناعي لجمع إحداثيات القفزة.");
    
    const getAvgKneeAngleAt = (frameData) => {
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
    
    alert(`✅ تم تحديد مراحل الحركة بالذكاء الاصطناعي بنجاح! زاوية الركبة عند الهبوط: ${avgLandingKnee.toFixed(0)}° (تصحيح الهبوط: ${correctionMs}ms).`);
  };

  const calculateJumpPhasesFromData = () => {
    const data = flightDataRef.current;
    if (data.length < 5) return;
    
    const getAvgKneeAngleAt = (frameData) => {
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

  const stepFrames = async (frames) => {
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
    } catch (err) {}
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
      ctx.fillStyle = idx === 0 ? '#a855f7' : '#3b82f6';
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
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  const handleCanvasClick = (e) => {
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
      alert(`✅ تمت معايرة طول الرجل بنجاح! مقياس الفيديو: ${ppm.toFixed(1)} بكسل لكل متر. تم ضبط طول الرجل على ${refLen} متر.`);
      
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
  const handleJogStart = (e) => {
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

  const handleJogMove = (e) => {
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
        return alert("حدد الإقلاع والهبوط يدوياً أولاً، أو قم بتشغيل الفيديو بالكامل مع تفعيل الذكاء الاصطناعي لتتبع الحركة تلقائياً."); 
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
    parseFloat(manualFrameDuration) || 0.033
  );

  const saveMeasurement = async () => {
    if (!selectedPlayerId) return; 
    setIsSaving(true);
    const powerVal = parseFloat(stats.harmanPeakPower) > 0 ? parseFloat(stats.harmanPeakPower) : parseFloat(stats.meanPower) * 2.1;
    
    let finalTestType = saveJumpTag;
    if (jumpType === 'dj') {
      finalTestType = 'rsi';
    }

    const calculatedForce = (parseFloat(bodyMass) * 9.81 * ((parseFloat(stats.heightCm)/100)/(((parseFloat(legLength) > 2 ? parseFloat(legLength)/100 : parseFloat(legLength)) || 1.0)*0.45) + 1)).toFixed(2);

    const { data, error } = await supabase.from('lab_jump_measurements').insert([ { 
      player_id: selectedPlayerId, 
      test_type: finalTestType, 
      jump_height_cm: stats.heightCm, 
      flight_time_sec: stats.flightTime, 
      takeoff_velocity_ms: stats.takeoffVelocity, 
      mean_power_watts: stats.meanPower, 
      peak_power_watts: powerVal.toFixed(2), 
      mean_force_newtons: calculatedForce, 
      leg_used: legUsed 
    } ]).select();
    
    if (!error && data) { 
      if (onSaveSuccess) {
        onSaveSuccess(data[0]);
      }
      setShowResults(false); 
      alert("✅ تم حفظ نتيجة القفزة بنجاح في ملف اللاعب!");
    } else if (error) {
      alert("خطأ في حفظ القياس: " + error.message);
    }
    setIsSaving(false);
  };

  const handleHeightChange = (val) => {
    setPlayerHeight(val);
    localStorage.setItem(`player_height_${selectedPlayerId}`, val);
  };

  const handleStandingReachChange = (val) => {
    setStandingReach(val);
    localStorage.setItem(`standing_reach_${selectedPlayerId}`, val);
  };

  const handleShareVideo = async () => {
    if (!exportedVideoBlob || !exportedVideoUrl) return;

    const jumpHeight = stats?.heightCm ? parseFloat(stats.heightCm) : 0;
    const athleteName = activePlayer?.full_name || (language === 'en' ? 'Athlete' : 'اللاعب');
    const shareText = language === 'en'
      ? `PeakForce Lab: ${athleteName} jumped ${jumpHeight.toFixed(1)}cm! Check out the biomechanical analysis.`
      : `PeakForce Lab: اللاعب ${athleteName} سجل قفزة بارتفاع ${jumpHeight.toFixed(1)} سم! شاهد تحليل الأداء الحركي.`;

    const file = new File([exportedVideoBlob], exportedVideoName, { type: exportedVideoBlob.type || 'video/mp4' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: language === 'en' ? 'PeakForce Lab - Jump Analysis' : 'PeakForce Lab - تحليل الوثب',
          text: shareText,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          alert(language === 'en' ? 'Sharing failed: ' + err.message : 'فشلت المشاركة: ' + err.message);
        }
      }
    } else {
      alert(language === 'en'
        ? 'Your browser does not support direct sharing of video files. Please download the video and share it manually.'
        : 'متصفحك لا يدعم مشاركة ملفات الفيديو مباشرة. يرجى حفظ الفيديو ومشاركته يدوياً.');
    }
  };

  const handleExportVideoWithOverlay = async () => {
    if (!videoSrc || !videoRef.current) return alert("الرجاء تحميل فيديو أولاً.");
    if (!stats || !stats.heightCm || takeoffTime <= 0 || landingTime <= 0) {
      return alert("الرجاء تحديد زمن الإقلاع والهبوط واستخراج التحليل أولاً.");
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
      setExportStatus(language === 'en' ? 'Preparing video player...' : 'جاري تهيئة مشغل الفيديو...');

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

      const jumpHeight = parseFloat(stats.heightCm) || 0;
      const flightTime = parseFloat(stats.flightTime) || 0.5;

      // Capture full video duration
      const startTime = 0;
      const endTime = Math.max(0, exportVideo.duration - 0.05);

      setExportStatus(language === 'en' ? 'Seeking to start position...' : 'جاري الانتقال إلى موضع البدء...');

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

      setExportStatus(language === 'en' ? 'Initializing recorder...' : 'جاري تهيئة مسجل الفيديو...');

      const stream = (canvasElement.captureStream ? canvasElement.captureStream(30) : (canvasElement.webkitCaptureStream ? canvasElement.webkitCaptureStream(30) : null));
      if (!stream) throw new Error(language === 'en' ? 'Canvas captureStream is not supported by this browser.' : 'خاصية التقاط الفيديو غير مدعومة في هذا المتصفح.');

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
      } catch (e) {
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

      setExportStatus(language === 'en' ? 'Starting video playback...' : 'جاري تشغيل الفيديو...');
      
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

      const getYForHeight = (heightVal) => {
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
          const history = poseHistoryRef.current;
          const closest = history.find(hl => Math.abs(hl.time - t) < 0.04);
          if (closest && closest.landmarks) {
            if (drawConnectors && POSE_CONNECTIONS) {
              drawConnectors(ctx, closest.landmarks, POSE_CONNECTIONS, { color: '#ff6b00', lineWidth: 3 });
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

            const calculateAngle = (p1, p2, p3) => {
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
              ctx.fillStyle = '#ff6b00';
              ctx.fillText(`${language === 'en' ? 'Knee L:' : 'ركبة L:'} ${leftKneeAngle.toFixed(0)}°`, kx - 70, ky);
            }
            if (rightHip && rightKnee && rightAnkle && rightHip.visibility > 0.5 && rightKnee.visibility > 0.5 && rightAnkle.visibility > 0.5) {
              const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
              const kx = rightKnee.x * w;
              const ky = rightKnee.y * h;
              ctx.fillStyle = '#ffa500';
              ctx.fillText(`${language === 'en' ? 'Knee R:' : 'ركبة R:'} ${rightKneeAngle.toFixed(0)}°`, kx + 15, ky);
            }
            ctx.restore();
          }
        }

        // Draw horizontal grid lines in orange
        ctx.strokeStyle = 'rgba(255, 107, 0, 0.05)';
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
        ctx.fillStyle = '#ff6b00';
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
          ctx.shadowColor = '#ff6b00';
          ctx.shadowBlur = 12;
          const grad = ctx.createLinearGradient(0, groundY, 0, yVal);
          grad.addColorStop(0, '#ff8c00');
          grad.addColorStop(1, '#ff3c00');
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
        ctx.shadowColor = '#ff6b00';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#ff6b00';
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
        
        ctx.fillStyle = '#ff6b00';
        ctx.font = '900 8px Cairo';
        ctx.fillText(language === 'en' ? 'HEIGHT' : 'الارتفاع', circleX, circleY + 14);
        ctx.restore();

        // Draw top-right stats box - REDESIGNED, LARGER, MORE CHIC
        const labelY = topY - 30;
        ctx.save();
        ctx.shadowColor = '#ff6b00';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(10, 18, 36, 0.9)';
        ctx.strokeStyle = '#ff6b00';
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
        ctx.fillStyle = '#ff6b00';
        ctx.font = '900 9px Cairo';
        ctx.fillText(language === 'en' ? 'LIVE HEIGHT' : 'الارتفاع المباشر', w - 100, labelY - 3);

        // Value - LARGER FONT (20px)
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 20px Cairo';
        ctx.fillText(`${currentHeight.toFixed(1)} cm`, w - 100, labelY + 16);

        if (t >= t_peak_display) {
          ctx.save();
          ctx.shadowColor = '#ff6b00';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#ff6b00';
          ctx.font = '900 10px Cairo';
          ctx.fillText(language === 'en' ? 'PEAK JUMP 👑' : 'الارتقاء الأقصى 👑', w - 100, labelY - 22);
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
            ctx.shadowColor = '#ff6b00';
            ctx.shadowBlur = 15;
            
            ctx.fillStyle = '#ff6b00';
            ctx.font = '900 11px Cairo';
            ctx.fillText(language === 'en' ? 'MAX HEIGHT 👑' : 'الارتقاء الأقصى 👑', textX, textY - 32);
            
            ctx.font = '900 48px Cairo';
            ctx.fillStyle = '#ffffff';
          } else {
            ctx.fillStyle = '#ff9800';
            ctx.font = '900 42px Cairo';
          }
          
          ctx.strokeStyle = '#070a13';
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
        ctx.shadowColor = 'rgba(255, 107, 0, 0.35)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(10, 18, 36, 0.88)';
        ctx.strokeStyle = 'rgba(255, 107, 0, 0.45)';
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
            label = language === 'en' ? 'ATHLETE' : 'اللاعب';
            val = activePlayer?.full_name || 'Athlete';
          } else if (i === 1) {
            label = language === 'en' ? 'WEIGHT' : 'الوزن';
            val = `${bodyMass} kg`;
          } else if (i === 2) {
            label = language === 'en' ? 'DATE' : 'التاريخ';
            val = new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-EG');
          } else if (i === 3) {
            label = language === 'en' ? 'TEST TYPE' : 'نوع الاختبار';
            val = activeTestName;
          }

          // Draw Label
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ff6b00';
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
          
          ctx.shadowColor = '#ff6b00';
          ctx.shadowBlur = 20;
          
          const fontSize = Math.round(36 * pulseScale);
          ctx.font = `900 ${fontSize}px Cairo`;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#070a13';
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
        ctx.fillStyle = 'rgba(255, 107, 0, 0.4)';
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

    } catch (err) {
      alert("حدث خطأ أثناء تصدير الفيديو: " + err.message);
      
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
        <div className="lg:col-span-8 bg-black/20 p-5 rounded-3xl border border-gray-800 flex flex-col items-center justify-start gap-5">
          
          {/* Viewport Header */}
          <div className="w-full flex justify-between items-center bg-[#111827]/40 p-3 rounded-xl border border-gray-800">
             <span className="text-sm font-bold text-white flex items-center gap-2"><ScanEye size={18} className="text-cyan-400"/> شاشة عرض وتحليل الفيديو (Video Viewport)</span>
          </div>

          {/* File Upload Area */}
          {!videoSrc ? (
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center py-20 bg-black/10 rounded-2xl border border-dashed border-gray-800">
              <label className="flex-1 w-full max-w-xs cursor-pointer btn-orange-gradient text-center py-10 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-transform hover:scale-103 shadow-lg">
                <input type="file" accept="video/*" capture="environment" onChange={handleFileUpload} ref={cameraInputRef} className="hidden" />
                <Focus size={36} /> فتح الكاميرا للتصوير 🎥
              </label>
              <label className="flex-1 w-full max-w-xs cursor-pointer bg-[#111827]/40 hover:bg-gray-800/60 border border-gray-850 text-white text-center py-10 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-all">
                <input type="file" accept="video/*" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                <Play size={36} className="text-cyan-400" /> اختيار فيديو من المعرض 📁
              </label>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full relative">
              {/* Close button */}
              <button onClick={clearVideo} className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-500 p-2.5 rounded-full text-white z-20 shadow-lg transition-transform hover:scale-110 cursor-pointer"><X size={16}/></button>
              
              {/* Widescreen Video Viewport with HUD Telemetry overlay */}
              <div className="relative inline-block border border-gray-800 rounded-3xl overflow-hidden mb-5 shadow-2xl w-full bg-black">
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
                  <span className="px-2 py-0.5 rounded-md bg-black/60 border border-red-500/30 text-[9px] font-bold text-red-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> REC
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-black/60 border border-cyan-500/30 text-[9px] font-mono text-cyan-400">
                    {cameraFps} FPS
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 z-10 bg-black/60 border border-gray-800 px-3 py-1 rounded-xl text-[9px] font-bold text-gray-300">
                  الوزن الإضافي: <span className="text-cyan-400 font-mono">{bodyMass - (activePlayer?.weight_kg || 70)} kg</span>
                </div>
              </div>

              {/* Widescreen Cockpit Scrubber Console */}
              <div className="w-full bg-[#111827]/40 p-5 rounded-3xl border border-gray-800 mb-5">
                
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  {/* Analog rotatable jog wheel */}
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <div 
                      ref={jogWheelRef}
                      onMouseDown={handleJogStart}
                      onTouchStart={handleJogStart}
                      className="relative w-32 h-32 rounded-full bg-gradient-to-br from-gray-800 to-black border-4 border-gray-900 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none group"
                    >
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 group-hover:border-cyan-500/50 group-active:border-cyan-400 group-active:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 pointer-events-none"></div>
                      
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
                        <div className="w-1 h-4 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                      </div>

                      {/* Center Display */}
                      <div className="absolute w-22 h-22 rounded-full bg-[#0a0d16] border border-gray-850 shadow-inner flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[7px] text-gray-500 font-extrabold tracking-wider leading-none">FRAME</span>
                        <span className="text-xs font-black text-white font-mono leading-none mt-1.5">
                          F {Math.round(currentTime * (videoFps || 30))}
                        </span>
                        <span className="text-[8px] text-cyan-400 font-bold mt-1 font-mono">
                          {currentTime.toFixed(2)}s
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-500 font-bold">قرص التوجيه الدقيق (Jog Wheel)</span>
                  </div>

                  {/* Frame Controllers and markings stepper */}
                  <div className="flex-1 w-full space-y-4">
                    <div className="flex justify-between items-center text-xs text-gray-400 font-bold px-1">
                      <span>جهاز تحكم الإطارات والتوقيت (Console Jog Controller)</span>
                      <span className="text-cyan-400">اسحب القرص أو اضغط الإطارات بدقة ⏱️</span>
                    </div>

                    <div className="grid grid-cols-6 gap-1.5 justify-center">
                      <button onClick={() => stepFrames(-10)} title="العودة 10 إطارات" className="py-2.5 bg-black/45 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">-10</button>
                      <button onClick={() => stepFrames(-5)} title="العودة 5 إطارات" className="py-2.5 bg-black/45 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">-5</button>
                      <button onClick={() => stepFrames(-1)} title="العودة إطار واحد" className="py-2.5 bg-black/45 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">-1</button>
                      
                      <button onClick={() => stepFrames(1)} title="التقدم إطار واحد" className="py-2.5 bg-black/45 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">+1</button>
                      <button onClick={() => stepFrames(5)} title="التقدم 5 إطارات" className="py-2.5 bg-black/45 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">+5</button>
                      <button onClick={() => stepFrames(10)} title="التقدم 10 إطارات" className="py-2.5 bg-black/45 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-300 hover:text-white transition-all font-mono text-[10px] font-bold cursor-pointer">+10</button>
                    </div>

                    <div className="flex justify-center">
                      <button onClick={togglePlay} className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-lg hover:shadow-cyan-500/10 cursor-pointer w-full max-w-[200px]">
                        {isPlaying ? <><Pause size={14}/> إيقاف مؤقت</> : <><Play size={14}/> تشغيل الفيديو</>}
                      </button>
                    </div>

                    <div className="flex gap-2 w-full pt-1">
                      <button onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }} className={`flex-1 py-2.5 border rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${takeoffTime > 0 ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500/50 shadow' : 'bg-black/30 border-gray-800 text-white hover:bg-gray-805'}`}>
                        <span>{takeoffTime > 0 ? '🚀 تعديل الإقلاع' : '🚀 تحديد إقلاع'}</span>
                        {takeoffTime > 0 && <span className="text-[9px] font-mono font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded">F {Math.round(takeoffTime * (videoFps || 30))}</span>}
                      </button>
                      <button onClick={() => { setLandingTime(currentTime); setShowResults(false); }} className={`flex-1 py-2.5 border rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer ${landingTime > 0 ? 'bg-red-600/30 text-red-400 border-red-500/50 shadow' : 'bg-black/30 border-gray-800 text-white hover:bg-gray-805'}`}>
                        <span>{landingTime > 0 ? '🛬 تعديل الهبوط' : '🛬 تحديد هبوط'}</span>
                        {landingTime > 0 && <span className="text-[9px] font-mono font-bold bg-red-950/40 px-1.5 py-0.5 rounded">F {Math.round(landingTime * (videoFps || 30))}</span>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Filmstrip Timeline Progress Bar */}
                <div className="mt-5 relative w-full h-8 bg-black/60 border border-gray-850 rounded-2xl overflow-hidden flex items-center px-4">
                  {/* Ruler-style ticks */}
                  <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none opacity-20">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className={`w-0.5 bg-cyan-500 rounded-full ${i % 5 === 0 ? 'h-4' : 'h-2'}`} />
                    ))}
                  </div>

                  {/* Shadow overlays for takeoff and landing ranges */}
                  {duration > 0 && takeoffTime > 0 && landingTime > takeoffTime && (
                    <div 
                      className="absolute top-0 bottom-0 bg-cyan-500/10 border-l border-r border-cyan-500/35 pointer-events-none"
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
          
          <div className="bg-black/20 p-5 rounded-3xl border border-gray-800 space-y-4">
            <h4 className="font-extrabold text-sm text-cyan-400 border-b border-gray-800 pb-2 flex items-center gap-1.5">
              <Activity size={18} /> إعدادات التحليل والمدخلات
            </h4>

            {/* Settings Tabs */}
            <div className="flex border border-cyan-500/20 bg-black/40 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setActiveSettingsTab('analysis')}
                className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeSettingsTab === 'analysis' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-white bg-transparent border border-transparent'}`}
              >
                🎥 تحليل الفيديو
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab('anthropometrics')}
                className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeSettingsTab === 'anthropometrics' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-white bg-transparent border border-transparent'}`}
              >
                ⚖️ قياسات اللاعب
              </button>
            </div>

            {activeSettingsTab === 'analysis' && (
              <div className="space-y-4 animate-fade-in text-right">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Jump Type (نوع القفزة)</label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-black/35 rounded-2xl border border-gray-800">
                      {[
                        { id: 'cmj', name: 'CMJ (Countermovement)' },
                        { id: 'sj', name: 'SJ (Squat Jump)' },
                        { id: 'dj', name: 'DJ (Drop Jump)' }
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => { setJumpType(type.id); setShowResults(false); }}
                          className={`py-2 px-1 text-[9px] font-bold rounded-xl transition-all cursor-pointer ${jumpType === type.id ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-[#070a13] shadow' : 'text-gray-400 bg-transparent'}`}
                        >
                          {type.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1 font-bold text-cyan-400">Landing Knee Correction (معامل تصحيح الركبة)</label>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-black/35 rounded-2xl border border-gray-800">
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
                          className={`py-1.5 px-0.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${landingCorrectionMode === mode.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 bg-transparent'}`}
                        >
                          {mode.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {jumpType === 'dj' && (
                  <div className="grid grid-cols-2 gap-3 bg-cyan-950/15 border border-cyan-500/25 p-3 rounded-2xl animate-fade-in text-[10px]">
                    <div>
                      <label className="block text-[9px] text-gray-400 mb-1">Box Height (ارتفاع الصندوق cm)</label>
                      <input type="number" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))} className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-400 mb-1">Ground Contact Time (وقت ملامسة الأرض)</label>
                      <div className="flex gap-2">
                        <input type="number" step="0.001" value={boxTouchdownTime} onChange={e => setBoxTouchdownTime(Number(e.target.value))} className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                        <button type="button" onClick={() => setBoxTouchdownTime(currentTime)} className="px-2 bg-cyan-500 text-[#070a13] rounded-xl text-[10px] font-bold shrink-0 cursor-pointer">هنا 📍</button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  {/* Smart FPS Auto-Detect Switch */}
                  <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-2xl border border-gray-800">
                    <span className="text-[10px] text-gray-300 font-bold flex items-center gap-1">🔍 Smart FPS Auto-Detect (كشف FPS تلقائي)</span>
                    <button
                      type="button"
                      onClick={() => setIsFpsDetectionActive(!isFpsDetectionActive)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${isFpsDetectionActive ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-gray-800'}`}
                    >
                      <span className={`absolute top-1 bottom-1 w-4 h-4 rounded-full bg-white transition-all ${isFpsDetectionActive ? 'right-7' : 'right-1'}`} />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Video Recording Type (نوع تصوير الفيديو)</label>
                    <div className="grid grid-cols-4 gap-1 p-1 bg-black/35 rounded-2xl border border-gray-805">
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
                          className={`py-2 px-1 text-[9px] font-bold rounded-xl transition-all cursor-pointer ${videoPreset === preset.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/35' : 'text-gray-400 bg-transparent'}`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-gray-400 mb-1 block">Video File FPS (FPS ملف الفيديو)</label>
                    <input type="number" value={videoFps} onChange={(e) => setVideoFps(Number(e.target.value))} className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-400 mb-1 block">Camera FPS (FPS الكاميرا)</label>
                    <input type="number" value={cameraFps} onChange={(e) => setCameraFps(Number(e.target.value))} className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-cyan-500" />
                  </div>
                </div>

                {/* AI tracking toggle */}
                <div className="bg-black/15 border border-gray-850 p-3 rounded-2xl mb-3">
                  <button
                    type="button"
                    onClick={() => setAiEnabled(!aiEnabled)}
                    className={`w-full py-2 px-3 text-[10px] font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      aiEnabled
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                        : 'bg-black/30 text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    <ScanEye size={14} className={aiEnabled ? 'animate-pulse' : ''} />
                    {aiEnabled ? 'تتبع تلقائي بالذكاء الاصطناعي (مفعّل)' : 'تتبع تلقائي بالذكاء الاصطناعي (معطّل)'}
                  </button>
                </div>

                {/* Limb & Scale Calibration Helper */}
                <div className="bg-black/15 border border-gray-850 p-3.5 rounded-2xl space-y-3">
                  <span className="block text-xs text-cyan-400 font-bold border-b border-gray-800 pb-1.5 flex items-center gap-1.5 flex-row-reverse">
                    📐 Video Scale & Leg Calibration (معايرة مقياس الفيديو وطول الرجل)
                  </span>
                  
                  <div className="flex items-center gap-2 justify-between">
                    <label className="text-[10px] text-gray-400 shrink-0">Reference Leg Length (m):</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={referenceLength} 
                      onChange={(e) => setReferenceLength(Number(e.target.value))} 
                      className="w-20 bg-[#111827]/60 border border-gray-800 p-1 text-xs text-center text-white rounded font-mono" 
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
                      className="w-full py-2 bg-black/35 hover:bg-gray-800 border border-cyan-500/20 text-gray-300 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      📏 ابدأ معايرة طول الرجل من الفيديو
                    </button>
                  ) : (
                    <div className="bg-cyan-950/20 border border-cyan-500/40 p-2 rounded-xl text-center animate-pulse">
                      {calibrationStep === 1 && <p className="text-cyan-400 text-[10px] font-bold">1️⃣ اضغط على <span className="text-white font-extrabold">مفصل الفخذ (Hip Joint)</span> بالفيديو</p>}
                      {calibrationStep === 2 && <p className="text-cyan-400 text-[10px] font-bold">2️⃣ اضغط على <span className="text-white font-extrabold">مفصل الكاحل (Ankle Joint)</span> بالفيديو</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSettingsTab === 'anthropometrics' && (
              <div className="space-y-4 bg-black/10 border border-gray-850 p-4 rounded-2xl animate-fade-in text-right">
                <span className="block text-xs text-cyan-400 font-bold border-b border-gray-800 pb-1.5 text-right">
                  ⚖️ القياسات الأنثروبومترية الحية (Interactive Telemetry)
                </span>
                
                {/* Body Weight Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold">وزن اللاعب (Body Mass):</span>
                    <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{bodyMass} kg</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setBodyMass(prev => Math.max(40, prev - 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-gray-850 border border-gray-800 text-white font-black flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="40" 
                      max="150" 
                      step="1" 
                      value={bodyMass} 
                      onChange={(e) => { setBodyMass(Number(e.target.value)); setShowResults(false); }} 
                      className="flex-1 h-1.5 bg-[#111827]/60 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                    />
                    <button type="button" onClick={() => { setBodyMass(prev => Math.min(150, prev + 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-gray-850 border border-gray-800 text-white font-black flex items-center justify-center">+</button>
                  </div>
                </div>

                {/* Leg Length Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold">طول الرجل (Leg Length):</span>
                    <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{legLength.toFixed(2)} m</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setLegLength(prev => Math.max(0.5, prev - 0.02)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-gray-850 border border-gray-800 text-white font-black flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="0.50" 
                      max="1.30" 
                      step="0.01" 
                      value={legLength} 
                      onChange={(e) => { setLegLength(Number(e.target.value)); setShowResults(false); }} 
                      className="flex-1 h-1.5 bg-[#111827]/60 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                    />
                    <button type="button" onClick={() => { setLegLength(prev => Math.min(1.30, prev + 0.02)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-gray-855 border border-gray-800 text-white font-black flex items-center justify-center">+</button>
                  </div>
                </div>

                {/* Player Height Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold">طول اللاعب (Player Height):</span>
                    <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{playerHeight} cm</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { handleHeightChange(Math.max(130, playerHeight - 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-gray-855 border border-gray-800 text-white font-black flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="130" 
                      max="220" 
                      step="1" 
                      value={playerHeight} 
                      onChange={(e) => { handleHeightChange(Number(e.target.value)); setShowResults(false); }} 
                      className="flex-1 h-1.5 bg-[#111827]/60 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                    />
                    <button type="button" onClick={() => { handleHeightChange(Math.min(220, playerHeight + 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-gray-855 border border-gray-800 text-white font-black flex items-center justify-center">+</button>
                  </div>
                </div>

                {/* Standing Reach Control */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold">الوصول من الثبات (Standing Reach):</span>
                    <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{standingReach} cm</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { handleStandingReachChange(Math.max(150, standingReach - 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-gray-855 border border-gray-800 text-white font-black flex items-center justify-center">-</button>
                    <input 
                      type="range" 
                      min="150" 
                      max="300" 
                      step="1" 
                      value={standingReach} 
                      onChange={(e) => { handleStandingReachChange(Number(e.target.value)); setShowResults(false); }} 
                      className="flex-1 h-1.5 bg-[#111827]/60 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                    />
                    <button type="button" onClick={() => { handleStandingReachChange(Math.min(300, standingReach + 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-gray-855 border border-gray-800 text-white font-black flex items-center justify-center">+</button>
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
          <div className="col-span-12 bg-[#111827]/40 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 mt-4 space-y-6 animate-fade-in text-right">
            <div className="flex justify-between items-center border-b border-cyan-500/20 pb-3">
              <div className="text-sm font-extrabold text-cyan-405 flex items-center gap-1.5">
                🚀 لوحة القيادة والتحليل الميكانيكي الحيوي (Cockpit Analysis HUD)
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-cyan-500/20">
                <button
                  type="button"
                  onClick={() => setDisplayUnit('cm')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer ${displayUnit === 'cm' ? 'bg-cyan-500 text-[#070a13] shadow' : 'text-gray-400 hover:text-white bg-transparent'}`}
                >
                  سم (Cm)
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayUnit('in')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all duration-200 cursor-pointer ${displayUnit === 'in' ? 'bg-cyan-500 text-[#070a13] shadow' : 'text-gray-400 hover:text-white bg-transparent'}`}
                >
                  بوصة (Inches)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {/* Column 1: Altimeter scale */}
              <div className="bg-black/35 p-5 rounded-3xl border border-cyan-500/20 flex flex-col items-center justify-between text-center relative overflow-hidden min-h-[300px]">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none animate-pulse"></div>
                <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider mb-4 block">
                  📊 Biomechanical Altimeter (الارتفاع الرأسي)
                </span>
                
                <div className="flex gap-4 items-stretch h-48 w-full px-4 justify-center">
                  <div className="flex flex-col justify-between text-[8px] text-gray-505 font-mono font-bold py-1 select-none text-left w-10">
                    <span>100 cm</span>
                    <span>80 cm</span>
                    <span>60 cm</span>
                    <span>40 cm</span>
                    <span>20 cm</span>
                    <span>0 cm</span>
                  </div>
                  
                  <div className="w-8 bg-gray-955 border border-gray-850 rounded-full relative overflow-hidden flex items-end">
                    <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none opacity-20 z-10">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-0.5 w-full bg-cyan-400" />
                      ))}
                    </div>
                    
                    {(() => {
                      const heightCm = parseFloat(stats.heightCm) || 0;
                      const pct = Math.min(100, (heightCm / 100) * 100);
                      return (
                        <div 
                          className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
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
                    <span className="text-xs text-cyan-400 font-bold mr-1">
                      {jumpType === 'dj' ? 'Index' : (displayUnit === 'in' ? 'in' : 'cm')}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-500 block mt-1">الوثب الفعلي لمركز الثقل</span>
                </div>
              </div>

              {/* Column 2: Speedometer power */}
              <div className="bg-[#1f2937]/15 p-5 rounded-3xl border border-gray-800 flex flex-col items-center justify-between text-center relative overflow-hidden min-h-[300px]">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wider mb-4 block">
                  ⚡ Cockpit Power Telemetry (القدرة الانفجارية)
                </span>
                
                <div className="relative w-44 h-24 flex items-center justify-center overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 100 55">
                    <path d="M 15 50 A 35 35 0 0 1 85 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round" />
                    {(() => {
                      const powerVal = parseFloat(stats.harmanPeakPower) > 0 ? parseFloat(stats.harmanPeakPower) : parseFloat(stats.meanPower)*2.1;
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
                          <line x1="50" y1="50" x2={x2} y2={y2} stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx="50" cy="50" r="3" fill="#ea580c" />
                        </>
                      );
                    })()}
                    <defs>
                      <linearGradient id="powerGaugeGradientHUD" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                <div className="text-center mt-2 space-y-1">
                  <div className="text-xl font-black text-orange-505 font-mono">
                    <AnimatedCounter value={parseFloat(stats.harmanPeakPower) > 0 ? stats.harmanPeakPower : parseFloat(stats.meanPower)*2.1} decimals={0} />
                    <span className="text-[10px] text-orange-500/80 font-bold mr-1">Watts</span>
                  </div>
                  <span className="text-[9px] text-gray-500 block">ذروة القدرة الميكانيكية (Harman Model)</span>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full mt-4 pt-3 border-t border-gray-800/40 text-[9px]">
                  <div className="bg-black/20 p-2 rounded-xl text-center">
                    <span className="text-gray-500 block text-[8px] font-bold">Sayers Power</span>
                    <span className="font-bold text-white font-mono">{stats.sayersPeakPower} W</span>
                  </div>
                  <div className="bg-black/20 p-2 rounded-xl text-center">
                    <span className="text-gray-550 block text-[8px] font-bold">سرعة الإقلاع V0</span>
                    <span className="font-bold text-cyan-400 font-mono">{stats.takeoffVelocity} m/s</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Stepper phase */}
              <div className="bg-black/35 p-5 rounded-3xl border border-gray-800 flex flex-col justify-start min-h-[300px]">
                <span className="text-[10px] text-cyan-450 font-extrabold uppercase tracking-wider mb-4 block">
                  📊 Biomechanical Phase Stepper (مراحل الحركة بالزوايا)
                </span>
                
                <div className="space-y-3 relative pr-3 border-r border-gray-800 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {jumpType === 'dj' && jumpPhases?.boxTouchdown && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-black shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-blue-500/15">
                        <span className="font-extrabold text-[10px] text-blue-400 block leading-tight">هبوط الصندوق (Drop Impact)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-gray-500 font-mono">
                          <span>إطار: {jumpPhases.boxTouchdown.frame}</span>
                          <span>زمن: {jumpPhases.boxTouchdown.time.toFixed(3)}s</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {jumpType !== 'sj' && jumpPhases?.movementStart && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-black shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-cyan-500/15">
                        <span className="font-extrabold text-[10px] text-cyan-400 block leading-tight">بدء النزول الحركي (Eccentric Phase)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-gray-500 font-mono">
                          <span>إطار: {jumpPhases.movementStart.frame}</span>
                          <span>زمن: {jumpPhases.movementStart.time.toFixed(3)}s</span>
                          <span>ركبة: {jumpPhases.movementStart.kneeAngle.toFixed(0)}°</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {jumpType !== 'sj' && jumpPhases?.deepestSquat && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-purple-400 border-2 border-black shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-purple-550/15">
                        <span className="font-extrabold text-[10px] text-purple-400 block leading-tight">أقصى قرفصاء (Amortization Peak)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-gray-500 font-mono">
                          <span>إطار: {jumpPhases.deepestSquat.frame}</span>
                          <span>زمن: {jumpPhases.deepestSquat.time.toFixed(3)}s</span>
                          <span>ركبة: {jumpPhases.deepestSquat.kneeAngle.toFixed(0)}°</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {jumpPhases?.takeoff && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-emerald-550/15">
                        <span className="font-extrabold text-[10px] text-emerald-400 block leading-tight">الدفع والإقلاع (Takeoff Drive)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-gray-500 font-mono">
                          <span>إطار: {jumpPhases.takeoff.frame}</span>
                          <span>زمن: {jumpPhases.takeoff.time.toFixed(3)}s</span>
                          <span>ركبة: {jumpPhases.takeoff.kneeAngle.toFixed(0)}°</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {jumpPhases?.landing && (
                    <div className="relative flex items-start gap-3 flex-row-reverse text-right">
                      <div className="absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-black shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                      <div className="flex-1 bg-black/20 p-2 rounded-xl border border-red-500/15">
                        <span className="font-extrabold text-[10px] text-red-400 block leading-tight">لمس الأرض (Landing Touchdown)</span>
                        <div className="flex justify-between items-center mt-1 text-[9px] text-gray-500 font-mono">
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
              <div className="bg-black/35 border border-gray-800 p-4 rounded-3xl space-y-3 mt-4">
                <span className="block text-xs text-cyan-400 font-bold border-b border-gray-800 pb-1.5 flex justify-between items-center">
                  <span>منحنى إزاحة الفخذ العمودية (Hip displacement)</span>
                  <span className="text-[10px] text-gray-500 font-mono">الارتفاع الميكانيكي الفعلي: {jumpPhases.apex?.displacementCm?.toFixed(1)} cm</span>
                </span>
                <div className="w-full h-36 relative">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <line x1="0" y1="80" x2="100" y2="80" stroke="#374151" strokeWidth="0.5" strokeDasharray="3,3" />
                    {(() => {
                      const pts = jumpPhases.points;
                      const displacements = pts.map(p => Math.abs(p.displacement));
                      const maxCm = Math.max(...displacements) || 1;
                      const d = pts.map((p, idx) => {
                        const x = (idx / (pts.length - 1)) * 100;
                        const y = 80 - (p.displacement / maxCm) * 60;
                        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ');
                      return (
                        <path d={d} fill="none" stroke="#00f5d4" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 0 4px rgba(0, 245, 212, 0.4))' }} />
                      );
                    })()}
                    {(() => {
                      const pts = jumpPhases.points;
                      const maxCm = Math.max(...pts.map(p => Math.abs(p.displacement))) || 1;
                      const drawCircle = (index, color, label) => {
                        if (index === undefined || index === -1 || index >= pts.length) return null;
                        const x = (index / (pts.length - 1)) * 100;
                        const y = 80 - (pts[index].displacement / maxCm) * 60;
                        return (
                          <circle key={label} cx={x} cy={y} r="4" fill={color} stroke="#ffffff" strokeWidth="1" />
                        );
                      };
                      return [
                        drawCircle(jumpPhases.movementStart?.frame, '#38bdf8', 'Start'),
                        drawCircle(jumpPhases.deepestSquat?.frame, '#a855f7', 'Squat'),
                        drawCircle(jumpPhases.takeoff?.frame, '#06b6d4', 'Takeoff'),
                        drawCircle(jumpPhases.apex?.frame, '#10b981', 'Apex'),
                        drawCircle(jumpPhases.landing?.frame, '#ef4444', 'Landing')
                      ];
                    })()}
                  </svg>
                </div>
                <div className="flex justify-between text-[9px] text-gray-500 font-bold bg-black/20 p-2 rounded-xl">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span> البداية</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]"></span> القرفصاء</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]"></span> الإقلاع</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span> القمة</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span> الهبوط</span>
                </div>
              </div>
            )}

            {/* Reach jump comparison */}
            <div className="bg-black/35 border border-gray-800 p-4 rounded-3xl space-y-3 mt-4">
              <span className="block text-xs text-cyan-400 font-bold border-b border-gray-800 pb-1.5">
                📐 أداة مقارنة ارتفاع اللمس (Reach Jump vs. Flight Time)
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] text-gray-500 mb-1">طول اللاعب (cm)</label>
                  <input
                    type="number"
                    value={playerHeight || ''}
                    onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-input)] border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-gray-500 mb-1">الوصول من الثبات (cm)</label>
                  <input
                    type="number"
                    value={standingReach || ''}
                    onChange={(e) => handleStandingReachChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[var(--bg-input)] border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-gray-500 mb-1">أقصى لمس بالقفز (cm)</label>
                  <input
                    type="number"
                    value={maxTouchHeight}
                    onChange={(e) => setMaxTouchHeight(parseFloat(e.target.value) || '')}
                    placeholder="مثال: 314"
                    className="w-full bg-[var(--bg-input)] border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-cyan-500"
                  />
                </div>
              </div>

              {maxTouchHeight > standingReach && (
                <div className="bg-cyan-950/20 border border-cyan-500/30 p-3 rounded-2xl animate-fade-in space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-semibold">قفزة اللمس الفعلية (Reach Jump):</span>
                    <span className="font-extrabold text-cyan-400 font-mono">
                      {(maxTouchHeight - standingReach).toFixed(1)} سم
                      <span className="text-[10px] text-gray-500 mr-1">({((maxTouchHeight - standingReach) / 2.54).toFixed(1)} بوصة)</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-semibold">ارتفاع طيران مركز الثقل:</span>
                    <span className="font-extrabold text-white font-mono">
                      {parseFloat(stats.heightCm).toFixed(1)} سم
                      <span className="text-[10px] text-gray-500 mr-1">({parseFloat(stats.heightInches).toFixed(1)} بوصة)</span>
                    </span>
                  </div>
                  <div className="border-t border-cyan-950/50 pt-2 flex justify-between items-center">
                    <span className="text-gray-300 font-bold">الفارق البيوميكانيكي بين القياسين:</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {Math.abs((maxTouchHeight - standingReach) - parseFloat(stats.heightCm)).toFixed(1)} سم
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Jump Tag Selector for Logging */}
            {jumpType !== 'dj' && (
              <div className="space-y-2 bg-black/20 border border-gray-850 p-3.5 rounded-2xl mt-4">
                <label className="block text-[10px] text-gray-400 font-bold mb-1">
                  تصنيف القفزة لحفظها (Jump Classification)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('sj_no_arms')}
                    className={`py-2 px-2.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'sj_no_arms'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow'
                        : 'bg-[var(--bg-input)] text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    🏋️‍♂️ SJ (بدون يدين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('cmj_no_arms')}
                    className={`py-2 px-2.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'cmj_no_arms'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow'
                        : 'bg-[var(--bg-input)] text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    🚀 CMJ (بدون يدين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('sj_arms')}
                    className={`py-2 px-2.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'sj_arms'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow'
                        : 'bg-[var(--bg-input)] text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    🏋️‍♂️ SJ (بمساعدة اليدين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('cmj_arms')}
                    className={`py-2 px-2.5 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'cmj_arms'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow'
                        : 'bg-[var(--bg-input)] text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    🚀 CMJ (بمساعدة اليدين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveJumpTag('approach')}
                    className={`col-span-2 py-2 px-3 text-[9px] font-bold rounded-xl border transition-all cursor-pointer ${
                      saveJumpTag === 'approach'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow'
                        : 'bg-[var(--bg-input)] text-gray-400 border-gray-800 hover:text-white'
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
                className="flex-1 py-4 bg-cyan-600/30 border border-cyan-500/50 hover:bg-cyan-600/50 text-cyan-400 flex items-center justify-center gap-2 font-black text-sm rounded-2xl cursor-pointer transition-all disabled:opacity-50"
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
        <div className="w-full flex justify-between items-center bg-[#111827]/40 p-3.5 rounded-2xl border border-gray-800">
          <span className="text-xs font-bold text-white flex items-center gap-1.5"><ScanEye size={16} className="text-cyan-400"/> شاشة تحليل الفيديو (Mobile HUD)</span>
        </div>

        {/* Video Viewport & Scrubber Container */}
        <div className="bg-black/20 p-4 rounded-3xl border border-gray-800 flex flex-col gap-4">
          {!videoSrc ? (
            /* File Upload Area */
            <div className="flex flex-col gap-3.5 w-full justify-center items-center py-12 bg-black/10 rounded-2xl border border-dashed border-gray-800">
              <label className="w-full max-w-xs cursor-pointer btn-orange-gradient text-center py-6 rounded-2xl font-black flex flex-col items-center justify-center gap-1.5 transition-transform shadow-lg text-xs">
                <input type="file" accept="video/*" capture="environment" onChange={handleFileUpload} ref={cameraInputRef} className="hidden" />
                <Focus size={24} /> فتح الكاميرا للتصوير 🎥
              </label>
              <label className="w-full max-w-xs cursor-pointer bg-[#111827]/40 border border-gray-850 text-white text-center py-6 rounded-2xl font-black flex flex-col items-center justify-center gap-1.5 transition-all text-xs">
                <input type="file" accept="video/*" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                <Play size={24} className="text-cyan-400" /> اختيار فيديو من المعرض 📁
              </label>
            </div>
          ) : (
            /* Video Scrubber View */
            <div className="flex flex-col items-center w-full relative">
              {/* Close button */}
              <button onClick={clearVideo} className="absolute top-2.5 right-2.5 bg-red-600/90 hover:bg-red-500 p-2 rounded-full text-white z-20 shadow-lg transition-transform hover:scale-105 cursor-pointer">
                <X size={14}/>
              </button>
              
              {/* Video Viewport */}
              <div className="relative inline-block border border-gray-800 rounded-2xl overflow-hidden mb-3 shadow-2xl w-full bg-black">
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
                  <span className="px-1.5 py-0.5 rounded bg-black/60 border border-red-500/30 text-[8px] font-bold text-red-500 flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span> REC
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/60 border border-cyan-500/30 text-[8px] font-mono text-cyan-400">
                    {cameraFps} FPS
                  </span>
                </div>

                <div className="absolute bottom-2.5 right-2.5 z-10 bg-black/60 border border-gray-800 px-2 py-0.5 rounded-lg text-[8px] font-bold text-gray-300">
                  الوزن الإضافي: <span className="text-cyan-400 font-mono">{bodyMass - (activePlayer?.weight_kg || 70)} kg</span>
                </div>
              </div>

              {/* Scrubber Console Controls */}
              <div className="w-full bg-[#111827]/40 p-4 rounded-2xl border border-gray-800 space-y-4">
                <div className="flex flex-col items-center gap-4">
                  {/* Compact Jog Wheel */}
                  <div 
                    ref={jogWheelRef}
                    onMouseDown={handleJogStart}
                    onTouchStart={handleJogStart}
                    className="relative w-28 h-28 rounded-full bg-gradient-to-br from-gray-800 to-black border-4 border-gray-900 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none group"
                  >
                    <div className="absolute inset-0 rounded-full border border-cyan-500/20 group-active:border-cyan-400 transition-all duration-300 pointer-events-none"></div>
                    
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
                      <div className="w-0.5 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
                    </div>

                    {/* Center Display */}
                    <div className="absolute w-20 h-20 rounded-full bg-[#0a0d16] border border-gray-850 shadow-inner flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[6px] text-gray-500 font-extrabold tracking-wider leading-none">FRAME</span>
                      <span className="text-[10px] font-black text-white font-mono leading-none mt-1">
                        F {Math.round(currentTime * (videoFps || 30))}
                      </span>
                      <span className="text-[8px] text-cyan-400 font-bold mt-0.5 font-mono">
                        {currentTime.toFixed(2)}s
                      </span>
                    </div>
                  </div>

                  {/* Frame Buttons and timing selectors */}
                  <div className="w-full space-y-3">
                    <div className="grid grid-cols-6 gap-1 justify-center">
                      <button onClick={() => stepFrames(-10)} className="py-2 bg-black/45 border border-gray-805 rounded-lg text-gray-300 font-mono text-[9px] font-bold cursor-pointer">-10</button>
                      <button onClick={() => stepFrames(-5)} className="py-2 bg-black/45 border border-gray-805 rounded-lg text-gray-300 font-mono text-[9px] font-bold cursor-pointer">-5</button>
                      <button onClick={() => stepFrames(-1)} className="py-2 bg-black/45 border border-gray-805 rounded-lg text-gray-300 font-mono text-[9px] font-bold cursor-pointer">-1</button>
                      <button onClick={() => stepFrames(1)} className="py-2 bg-black/45 border border-gray-805 rounded-lg text-gray-300 font-mono text-[9px] font-bold cursor-pointer">+1</button>
                      <button onClick={() => stepFrames(5)} className="py-2 bg-black/45 border border-gray-805 rounded-lg text-gray-300 font-mono text-[9px] font-bold cursor-pointer">+5</button>
                      <button onClick={() => stepFrames(10)} className="py-2 bg-black/45 border border-gray-805 rounded-lg text-gray-300 font-mono text-[9px] font-bold cursor-pointer">+10</button>
                    </div>

                    <div className="flex justify-center">
                      <button onClick={togglePlay} className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 text-[10px] shadow-lg cursor-pointer w-full max-w-[160px]">
                        {isPlaying ? <><Pause size={12}/> إيقاف مؤقت</> : <><Play size={12}/> تشغيل الفيديو</>}
                      </button>
                    </div>

                    <div className="flex gap-2 w-full">
                      <button onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }} className={`flex-1 py-2 border rounded-xl font-bold transition-all text-[10px] flex items-center justify-center gap-1 cursor-pointer ${takeoffTime > 0 ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500/50 shadow' : 'bg-black/30 border-gray-800 text-white hover:bg-gray-805'}`}>
                        <span>🚀 إقلاع</span>
                        {takeoffTime > 0 && <span className="text-[8px] font-mono font-bold bg-cyan-950/40 px-1 py-0.5 rounded">F {Math.round(takeoffTime * (videoFps || 30))}</span>}
                      </button>
                      <button onClick={() => { setLandingTime(currentTime); setShowResults(false); }} className={`flex-1 py-2 border rounded-xl font-bold transition-all text-[10px] flex items-center justify-center gap-1 cursor-pointer ${landingTime > 0 ? 'bg-red-600/30 text-red-400 border-red-500/50 shadow' : 'bg-black/30 border-gray-800 text-white hover:bg-gray-805'}`}>
                        <span>🛬 هبوط</span>
                        {landingTime > 0 && <span className="text-[8px] font-mono font-bold bg-red-950/40 px-1 py-0.5 rounded">F {Math.round(landingTime * (videoFps || 30))}</span>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Filmstrip Timeline Progress Bar */}
                <div className="relative w-full h-6 bg-black/60 border border-gray-850 rounded-xl overflow-hidden flex items-center px-3 mt-2">
                  <div className="absolute inset-0 flex justify-between items-center px-3 pointer-events-none opacity-20">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <div key={i} className={`w-0.5 bg-cyan-500 rounded-full ${i % 5 === 0 ? 'h-3' : 'h-1.5'}`} />
                    ))}
                  </div>

                  {duration > 0 && takeoffTime > 0 && landingTime > takeoffTime && (
                    <div 
                      className="absolute top-0 bottom-0 bg-cyan-500/10 border-l border-r border-cyan-500/35 pointer-events-none"
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
        <div className="bg-black/20 p-4 rounded-3xl border border-gray-800 flex flex-col gap-4">
          <div className="flex border border-cyan-500/20 bg-black/40 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveSettingsTab('analysis')}
              className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${activeSettingsTab === 'analysis' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-white bg-transparent border border-transparent'}`}
            >
              🎥 تحليل الفيديو
            </button>
            <button
              type="button"
              onClick={() => setActiveSettingsTab('anthropometrics')}
              className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${activeSettingsTab === 'anthropometrics' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-white bg-transparent border border-transparent'}`}
            >
              ⚖️ قياسات اللاعب
            </button>
          </div>

          {activeSettingsTab === 'analysis' && (
            <div className="space-y-4 text-right">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Jump Type (نوع القفزة)</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-black/35 rounded-2xl border border-gray-800">
                  {[
                    { id: 'cmj', name: 'CMJ' },
                    { id: 'sj', name: 'SJ' },
                    { id: 'dj', name: 'DJ' }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => { setJumpType(type.id); setShowResults(false); }}
                      className={`py-2 px-1 text-[9px] font-bold rounded-xl transition-all cursor-pointer ${jumpType === type.id ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-[#070a13] shadow' : 'text-gray-400 bg-transparent'}`}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 font-bold text-cyan-400">Landing Knee Correction (معامل تصحيح الركبة)</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-black/35 rounded-2xl border border-gray-800">
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
                      className={`py-1.5 px-0.5 text-[9px] font-bold rounded-lg transition-all cursor-pointer ${landingCorrectionMode === mode.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 bg-transparent'}`}
                    >
                      {mode.name}
                    </button>
                  ))}
                </div>
              </div>

              {jumpType === 'dj' && (
                <div className="grid grid-cols-2 gap-3 bg-cyan-950/15 border border-cyan-500/25 p-3 rounded-2xl text-[10px]">
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1">Box Height (ارتفاع الصندوق cm)</label>
                    <input type="number" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))} className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1">Ground Contact Time (وقت ملامسة الأرض)</label>
                    <div className="flex gap-2">
                      <input type="number" step="0.001" value={boxTouchdownTime} onChange={e => setBoxTouchdownTime(Number(e.target.value))} className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                      <button type="button" onClick={() => setBoxTouchdownTime(currentTime)} className="px-2 bg-cyan-500 text-[#070a13] rounded-xl text-[10px] font-bold shrink-0 cursor-pointer">هنا 📍</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-2xl border border-gray-800">
                  <span className="text-[10px] text-gray-300 font-bold">🔍 Smart FPS Auto-Detect (كشف FPS تلقائي)</span>
                  <button
                    type="button"
                    onClick={() => setIsFpsDetectionActive(!isFpsDetectionActive)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${isFpsDetectionActive ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-gray-800'}`}
                  >
                    <span className={`absolute top-1 bottom-1 w-4 h-4 rounded-full bg-white transition-all ${isFpsDetectionActive ? 'right-7' : 'right-1'}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 mb-1">Video Recording Type (نوع تصوير الفيديو)</label>
                  <div className="grid grid-cols-4 gap-1 p-1 bg-black/35 rounded-2xl border border-gray-805">
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
                        className={`py-2 px-1 text-[9px] font-bold rounded-xl transition-all cursor-pointer ${videoPreset === preset.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/35' : 'text-gray-400 bg-transparent'}`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-gray-400 mb-1 block">Video File FPS (FPS ملف الفيديو)</label>
                  <input type="number" value={videoFps} onChange={(e) => setVideoFps(Number(e.target.value))} className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                </div>
                <div>
                  <label className="text-[9px] text-gray-400 mb-1 block">Camera FPS (FPS الكاميرا)</label>
                  <input type="number" value={cameraFps} onChange={(e) => setCameraFps(Number(e.target.value))} className="w-full bg-[#111827]/60 border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                </div>
              </div>

              {/* AI Auto-Tracking Toggle (Mobile) */}
              <div className="bg-black/15 border border-gray-850 p-2.5 rounded-2xl mb-1.5">
                <button
                  type="button"
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`w-full py-2 px-3 text-[9px] font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    aiEnabled
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      : 'bg-black/30 text-gray-400 border-gray-800 hover:text-white'
                  }`}
                >
                  <ScanEye size={12} className={aiEnabled ? 'animate-pulse' : ''} />
                  {aiEnabled ? 'تتبع تلقائي بالذكاء الاصطناعي (مفعّل)' : 'تتبع تلقائي بالذكاء الاصطناعي (معطّل)'}
                </button>
              </div>

              {/* Calibration */}
              <div className="bg-black/15 border border-gray-850 p-3 rounded-2xl space-y-3">
                <span className="block text-[10px] text-cyan-400 font-bold border-b border-gray-800 pb-1">
                  <span>📐 Video Scale & Leg Calibration (معايرة الفيديو وطول الرجل)</span>
                </span>
                
                <div className="flex items-center gap-2 justify-between">
                  <label className="text-[9px] text-gray-400">Reference Leg Length (m):</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={referenceLength} 
                    onChange={(e) => setReferenceLength(Number(e.target.value))} 
                    className="w-16 bg-[#111827]/60 border border-gray-800 p-1 text-xs text-center text-white rounded font-mono" 
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
                    className="w-full py-2 bg-black/35 border border-cyan-500/20 text-gray-300 rounded-xl text-[9px] font-bold transition-all cursor-pointer"
                  >
                    📏 ابدأ المعايرة باللمس
                  </button>
                ) : (
                  <div className="bg-cyan-950/20 border border-cyan-500/40 p-2 rounded-xl text-center text-[9px]">
                    {calibrationStep === 1 && <p className="text-cyan-400 font-bold">1️⃣ اضغط على <span className="text-white font-extrabold">مفصل الفخذ</span> بالفيديو</p>}
                    {calibrationStep === 2 && <p className="text-cyan-400 font-bold">2️⃣ اضغط على <span className="text-white font-extrabold">مفصل الكاحل</span> بالفيديو</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSettingsTab === 'anthropometrics' && (
            <div className="space-y-4 text-right">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold">وزن اللاعب:</span>
                  <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded">{bodyMass} kg</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min="40" max="150" step="1" value={bodyMass} onChange={(e) => { setBodyMass(Number(e.target.value)); setShowResults(false); }} className="flex-1 h-1.5 bg-[#111827]/60 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold">طول القامة:</span>
                  <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded">{playerHeight} cm</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min="120" max="230" step="1" value={playerHeight} onChange={(e) => { handleHeightChange(Number(e.target.value)); setShowResults(false); }} className="flex-1 h-1.5 bg-[#111827]/60 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-bold">الوصول من الثبات:</span>
                  <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded">{standingReach} cm</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="range" min="150" max="300" step="1" value={standingReach} onChange={(e) => { handleStandingReachChange(Number(e.target.value)); setShowResults(false); }} className="flex-1 h-1.5 bg-[#111827]/60 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-800">
                <label className="block text-[9px] text-gray-500 mb-1">أقصى لمس بالقفز (cm)</label>
                <input
                  type="number"
                  value={maxTouchHeight}
                  onChange={(e) => setMaxTouchHeight(parseFloat(e.target.value) || '')}
                  placeholder="مثال: 314"
                  className="w-full bg-[var(--bg-input)] border border-gray-800 rounded-xl p-2 px-3 text-xs text-white outline-none font-mono"
                />
              </div>

              {maxTouchHeight > standingReach && (
                <div className="bg-cyan-950/20 border border-cyan-500/30 p-2.5 rounded-2xl space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-semibold">قفزة اللمس الفعلية:</span>
                    <span className="font-extrabold text-cyan-400 font-mono">{(maxTouchHeight - standingReach).toFixed(1)} سم</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-semibold">ارتفاع طيران مركز الثقل:</span>
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
          <div className="bg-[#111827]/40 backdrop-blur-xl border border-gray-800 rounded-3xl p-4 space-y-5 text-right">
            <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
              <span className="text-[11px] font-extrabold text-cyan-400">🚀 لوحة القيادة الميكانيكية الحيوية (Mobile Cockpit)</span>
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-cyan-500/10">
                <button type="button" onClick={() => setDisplayUnit('cm')} className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${displayUnit === 'cm' ? 'bg-cyan-500 text-[#070a13]' : 'text-gray-400'}`}>Cm</button>
                <button type="button" onClick={() => setDisplayUnit('inches')} className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer ${displayUnit === 'inches' ? 'bg-cyan-500 text-[#070a13]' : 'text-gray-400'}`}>In</button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex flex-col gap-5 items-center">
              {/* Altimeter height scale */}
              <div className="w-full bg-black/30 p-4 rounded-2xl border border-gray-800/80 flex flex-col items-center gap-3">
                <span className="text-[10px] text-cyan-400 font-bold">📏 الارتفاع الرأسي (BIOMECHANICAL ALTIMETER)</span>
                
                <div className="flex items-end gap-4 h-48 w-full justify-center">
                  <div className="w-12 h-full bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden relative flex flex-col justify-end p-1">
                    <div 
                      className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-xl transition-all duration-1000 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                      style={{ 
                        height: `${Math.min(100, (parseFloat(stats.heightCm) / (displayUnit === 'cm' ? 100 : 40)) * 100)}%` 
                      }}
                    />
                  </div>
                  <div className="flex flex-col justify-between h-full text-[8px] font-mono text-gray-500 text-left">
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
                  <span className="text-[10px] text-cyan-400 font-black mr-1">{displayUnit === 'cm' ? 'cm' : 'inches'}</span>
                </div>
              </div>

              {/* Power Speedometer */}
              <div className="w-full bg-black/30 p-4 rounded-2xl border border-gray-800/80 flex flex-col items-center gap-2">
                <span className="text-[10px] text-cyan-400 font-bold font-Cairo">⚡ القدرة الانفجارية (POWER TELEMETRY)</span>
                
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
                      strokeDashoffset={125.6 - (125.6 * Math.min(100, (parseFloat(stats.harmanPeakPower) > 0 ? parseFloat(stats.harmanPeakPower) : parseFloat(stats.meanPower) * 2.1) / 7500)) * 1}
                      className="transition-all duration-1000"
                    />
                    <defs>
                      <linearGradient id="powerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#fb923c" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <div className="absolute bottom-1 text-center">
                    <span className="text-lg font-black text-white font-mono">
                      <AnimatedCounter value={parseFloat(stats.harmanPeakPower) > 0 ? stats.harmanPeakPower : (parseFloat(stats.meanPower) * 2.1).toFixed(0)} decimals={0} />
                    </span>
                    <span className="text-[8px] text-gray-500 block">Peak Watts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stepper Timeline & Diagnostics */}
            <div className="bg-black/15 p-3 rounded-2xl border border-gray-855 space-y-4">
              <span className="block text-[10px] text-cyan-400 font-bold border-b border-gray-800 pb-1.5">📊 المراحل الميكانيكية للقفزة</span>
              
              <div className="space-y-4 pr-1">
                {[
                  { title: "المرحلة اللامركزية (Eccentric)", color: "bg-purple-500", desc: "يبدأ الهبوط والتخزين المرن للطاقة العضلية في العضلات القابضة للورك والركبة." },
                  { title: "مرحلة التحول (Amortization)", color: "bg-cyan-400", desc: "النقطة الحرجة للتحول من الانقباض اللامركزي للمركزي. سرعة التحول تحدد كفاءة الـ SSC." },
                  { title: "المرحلة المركزية (Concentric)", color: "bg-blue-500", desc: "التفريغ الانفجاري للطاقة المخزنة ودفع الأرض بقوة أقصى للوصول لسرعة الانطلاق." },
                  { title: "مرحلة الطيران (Flight Phase)", color: "bg-emerald-400", desc: "يبدأ مركز ثقل اللاعب في الصعود لقمة المسار الحركي محكوماً بـ flight time." },
                  { title: "مرحلة الهبوط (Landing Correction)", color: "bg-red-400", desc: "امتصاص الصدمات وقوى رد فعل الأرض بتفعيل معامل تصحيح الركبة المختار." }
                ].map((phase, idx) => (
                  <div key={idx} className="relative pl-1">
                    <div className={`absolute right-[-17px] top-1 w-2.5 h-2.5 rounded-full ${phase.color} border-2 border-black`}></div>
                    <span className="block text-[10px] font-black text-white">{phase.title}</span>
                    <p className="text-[9px] text-gray-400 leading-relaxed mt-0.5">{phase.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Biomechanical Calculations & Force Estimation Card */}
            <div className="bg-black/35 border border-gray-800 p-4 rounded-3xl space-y-4 text-right">
              <span className="block text-xs text-cyan-400 font-extrabold border-b border-gray-800 pb-1.5 flex justify-between items-center">
                <span>🔬 Biomechanical Physics & Force Estimation</span>
                <span className="text-[9px] text-gray-500 font-bold font-mono">Physics Engine v2.0</span>
              </span>

              <div className="grid grid-cols-1 gap-4 text-xs text-gray-300">
                {/* Height Formula Column */}
                <div className="bg-black/20 p-4.5 rounded-2xl border border-cyan-500/10 space-y-2">
                  <span className="block font-black text-cyan-400">📏 Jump Height (حساب الارتفاع)</span>
                  <div className="bg-black/30 p-2 rounded-xl font-mono text-center text-[10px] text-white">
                    Height = (g * Tf²) / 8
                  </div>
                  <p className="text-[10px] text-gray-405 leading-relaxed">
                    g = 9.81 m/s² | Tf = {stats.flightTime}s <br />
                    Height = <span className="text-cyan-400 font-bold">{(parseFloat(stats.heightCm)).toFixed(1)} cm</span>
                  </p>
                  <p className="text-[9px] text-gray-500 leading-normal">
                    يعتمد الارتفاع على زمن الطيران الكلي. بما أن الجاذبية الأرضية هي المؤثر الوحيد أثناء التحليق، يمثل زمن التحليق قياساً بالغ الدقة لارتفاع مركز ثقل الجسم.
                  </p>
                </div>

                {/* Force Estimation Column */}
                <div className="bg-black/20 p-4.5 rounded-2xl border border-teal-500/10 space-y-2">
                  <span className="block font-black text-teal-400">🏋️ Takeoff Force (الدفع الأرضي المقدر)</span>
                  <div className="bg-black/30 p-2 rounded-xl font-mono text-center text-[10px] text-white flex justify-between px-3">
                    <span>Avg: {parseFloat(stats.meanForce).toFixed(0)} N</span>
                    <span>Peak: {parseFloat(stats.peakForce).toFixed(0)} N</span>
                  </div>
                  <p className="text-[10px] text-gray-405 leading-relaxed">
                    متوسط الدفع: <span className="text-teal-400 font-bold">{(parseFloat(stats.meanForce) / (bodyMass * 9.81)).toFixed(2)} BW</span> <br />
                    ذروة الدفع: <span className="text-teal-400 font-bold">{(parseFloat(stats.peakForce) / (bodyMass * 9.81)).toFixed(2)} BW</span>
                  </p>
                  <p className="text-[9px] text-gray-500 leading-normal">
                    تُعبر القوة التفاعلية الأرضية (GRF) عن شدة دفع أرجل اللاعب للأرض لحظة الصعود. النسب المثالية للرياضيين النخبة تتعدى 2.5 أضعاف وزن الجسم (Peak &gt; 2.5 BW).
                  </p>
                </div>

                {/* Power Models Column */}
                <div className="bg-black/20 p-4.5 rounded-2xl border border-purple-500/10 space-y-2">
                  <span className="block font-black text-purple-400">⚡ Power Models (القدرة الميكانيكية)</span>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between items-center bg-black/15 px-2 py-1 rounded">
                      <span className="text-gray-450 font-bold">Harman Peak:</span>
                      <span className="font-mono text-white font-bold">{parseFloat(stats.harmanPeakPower).toFixed(0)} W</span>
                    </div>
                    <div className="flex justify-between items-center bg-black/15 px-2 py-1 rounded">
                      <span className="text-gray-450 font-bold">Sayers Peak:</span>
                      <span className="font-mono text-white font-bold">{parseFloat(stats.sayersPeakPower).toFixed(0)} W</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-500 leading-normal">
                    تستخدم معادلات Sayers و Harman لتقدير إجمالي القدرة المتفجرة بالوات بناءً على طول الوثبة وكتلة الجسم.
                  </p>
                </div>
              </div>
            </div>

            {/* Jump Classification Tag */}
            {jumpType !== 'dj' && (
              <div className="space-y-2 bg-black/25 border border-gray-855 p-3 rounded-2xl">
                <label className="block text-[9px] text-gray-400 font-bold">تصنيف القفزة للحفظ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setSaveJumpTag('sj_no_arms')} className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'sj_no_arms' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-black/30 text-gray-400 border-gray-800'}`}>SJ (بدون يدين)</button>
                  <button type="button" onClick={() => setSaveJumpTag('cmj_no_arms')} className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'cmj_no_arms' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-black/30 text-gray-400 border-gray-800'}`}>CMJ (بدون يدين)</button>
                  <button type="button" onClick={() => setSaveJumpTag('sj_arms')} className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'sj_arms' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-black/30 text-gray-400 border-gray-800'}`}>SJ (باليدين)</button>
                  <button type="button" onClick={() => setSaveJumpTag('cmj_arms')} className={`py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'cmj_arms' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-black/30 text-gray-400 border-gray-800'}`}>CMJ (باليدين)</button>
                  <button type="button" onClick={() => setSaveJumpTag('approach')} className={`col-span-2 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${saveJumpTag === 'approach' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-black/30 text-gray-400 border-gray-800'}`}>قفزة اقتراب (Approach)</button>
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
                className="w-full py-3.5 bg-cyan-600/30 border border-cyan-500/50 hover:bg-cyan-600/50 text-cyan-400 flex items-center justify-center gap-2 font-black text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
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
    <div className="glass-panel p-4 md:p-6 shadow-2xl transition-all duration-300 relative text-right animate-fade-in" style={{ direction: 'rtl' }}>
      {isMobile ? renderMobileView() : renderDesktopView()}

      {/* Fullscreen Export Progress Overlay */}
      {isExporting && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/60 text-white p-6">
          <div className="bg-[#0b1329] border border-cyan-500/30 p-8 rounded-3xl flex flex-col items-center gap-4 max-w-sm w-full text-center shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-fade-in">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#06b6d4"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - exportProgress / 100)}
                  className="transition-all duration-200"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-black text-lg text-cyan-400 font-mono">
                {exportProgress}%
              </div>
            </div>
            <h3 className="text-lg font-black text-white mt-2">جاري تصدير فيديو التحليل 🎥</h3>
            {exportStatus && (
              <p className="text-sm text-cyan-400 font-bold animate-pulse mt-1">
                {exportStatus}
              </p>
            )}
            <p className="text-xs text-gray-400 leading-relaxed mt-2">
              يرجى الانتظار بينما نقوم بتركيب شريط الارتفاع المضيء والمنحنى الميكانيكي الحيوي على الفيديو الخاص بك...
            </p>
          </div>
        </div>
      )}

      {/* Export Success Modal */}
      {exportedVideoUrl && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="bg-[#0b1329]/95 border border-cyan-500/30 p-6 md:p-8 rounded-3xl flex flex-col items-center gap-5 max-w-md w-full text-center shadow-[0_0_60px_rgba(6,182,212,0.25)] relative backdrop-blur-xl">
            {/* Close button */}
            <button 
              onClick={() => {
                URL.revokeObjectURL(exportedVideoUrl);
                setExportedVideoUrl(null);
                setExportedVideoBlob(null);
                setExportedVideoName('');
              }} 
              className="absolute top-4 left-4 text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-800 p-2 rounded-full cursor-pointer transition-all"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 mb-1">
              <CheckCircle size={32} />
            </div>

            <h3 className="text-xl font-black text-white font-semibold">
              {language === 'en' ? 'Video Exported Successfully! 🎉' : 'تم تصدير الفيديو بنجاح! 🎉'}
            </h3>
            
            <p className="text-xs text-gray-400 leading-relaxed -mt-2">
              {language === 'en' 
                ? 'Your video analysis is ready. Preview it below, share it directly, or download it to your device.' 
                : 'فيديو التحليل الخاص بك جاهز الآن. يمكنك معاينته بالأسفل، مشاركته مباشرة، أو تحميله على جهازك.'}
            </p>

            {/* Video Player Preview - autoplaying in a muted loop */}
            <div className="w-full rounded-2xl overflow-hidden border border-gray-800 bg-black aspect-video relative">
              <video 
                src={exportedVideoUrl} 
                controls 
                playsInline 
                autoPlay 
                muted 
                loop 
                className="w-full h-full object-contain"
              />
            </div>

            {/* Action Buttons - side-by-side Save and Share */}
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              {/* Share Button */}
              <button 
                onClick={handleShareVideo}
                className="py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95"
              >
                <Share2 size={16} />
                {language === 'en' ? 'Share Video' : 'مشاركة الفيديو'}
              </button>

              {/* Save (Download) Button */}
              <a 
                href={exportedVideoUrl} 
                download={exportedVideoName}
                className="py-3 bg-gray-800 border border-gray-750 hover:bg-gray-700 text-white font-black text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 text-center active:scale-95"
              >
                <Download size={16} />
                {language === 'en' ? 'Save Video' : 'حفظ الفيديو'}
              </a>
            </div>

            {/* iOS Helper Tip */}
            <div className="w-full p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-right">
              <p className="text-[11px] text-cyan-300 leading-relaxed font-semibold">
                {language === 'en'
                  ? '💡 iPhone/iPad Users: To save the video directly to your Photos App (Gallery), click "Share Video" then select "Save Video" from the options list.'
                  : '💡 لمستخدمي الآيفون والآيباد: لحفظ الفيديو مباشرة في ألبوم الصور (الاستوديو)، اضغط على "مشاركة الفيديو" ثم اختر "حفظ الفيديو" (Save Video) من القائمة.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
