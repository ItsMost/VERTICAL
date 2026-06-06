import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, LineChart, ScanEye, UserCircle, Edit3, Trash2, Plus, X, Play, Pause, Focus, Save, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, Moon, Sun, Award, Info, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { useJumpMechanics } from './useJumpMechanics';
import { supabase } from './supabaseClient'; 
import PlayerProfile from './PlayerProfile'; 
import RSICalculator from './RSICalculator'; 
import FVPCalculator from './FVPCalculator';
import VBTCamera from './VBTCamera'; 

// Animated counter helper
const AnimatedCounter = ({ value, duration = 1000, decimals = 1 }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const startTime = performance.now();
    const updateCount = (now) => {
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
  return <span className="font-mono">{count.toFixed(decimals)}</span>;
};

export default function JumpCalculator() {
  const [activeTab, setActiveTab] = useState('calculator'); 
  const [colorMode, setColorMode] = useState('dark'); 

  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [activePlayer, setActivePlayer] = useState(null);
  const [playerHistory, setPlayerHistory] = useState([]);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', birthYear: '', weight: '', leg: '', gender: 'male', height: '', standingReach: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [editPlayerForm, setEditPlayerForm] = useState({ id: '', name: '', birthYear: '', weight: '', leg: '', gender: '', height: '', standingReach: '' });

  // Custom states for Inches display and Manual Frame duration
  const [displayUnit, setDisplayUnit] = useState('cm');
  const [activeSettingsTab, setActiveSettingsTab] = useState('analysis');
  const [timeCalculationMethod, setTimeCalculationMethod] = useState('fps');
  const [manualFrameDuration, setManualFrameDuration] = useState(0.033);
  const [isFrameDurationManual, setIsFrameDurationManual] = useState(false);

  // Anthropometrics for Reach Jump Comparison
  const [playerHeight, setPlayerHeight] = useState(180);
  const [standingReach, setStandingReach] = useState(230);
  const [maxTouchHeight, setMaxTouchHeight] = useState('');

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
  const [landingCorrectionMode, setLandingCorrectionMode] = useState('ai_auto');
  const [jumpPhases, setJumpPhases] = useState(null); // { movementStart, deepestSquat, takeoff, apex, landing, kneeAngleAtLanding, correctionMs }

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const reqRef = useRef(null);
  const timelineTrackRef = useRef(null);
  const lastSeekTimeRef = useRef(0);

  const handleTimelineDragStart = (e, type) => {
    e.preventDefault();
    const track = timelineTrackRef.current;
    if (!track || !duration) return;

    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const rect = track.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl' || window.getComputedStyle(track).direction === 'rtl';
    let latestTime = currentTime;

    const handlePointerMove = (moveEvent) => {
      let clientX = moveEvent.clientX;
      if (moveEvent.touches && moveEvent.touches.length > 0) {
        clientX = moveEvent.touches[0].clientX;
      } else if (moveEvent.clientX === undefined && moveEvent.nativeEvent) {
        clientX = moveEvent.nativeEvent.clientX;
      }
      
      const pct = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
      const clampedPct = Math.max(0, Math.min(1, pct));
      const targetTime = clampedPct * duration;
      latestTime = targetTime;

      const performSeek = (time) => {
        const now = performance.now();
        if (videoRef.current && (now - lastSeekTimeRef.current > 40)) {
          try {
            videoRef.current.currentTime = time;
            lastSeekTimeRef.current = now;
          } catch (err) {
            console.error("Seeking error:", err);
          }
        }
      };

      if (type === 'takeoff') {
        setTakeoffTime(targetTime);
        performSeek(targetTime);
        setCurrentTime(targetTime);
        setShowResults(false);
      } else if (type === 'landing') {
        setLandingTime(targetTime);
        performSeek(targetTime);
        setCurrentTime(targetTime);
        setShowResults(false);
      } else if (type === 'touchdown') {
        setBoxTouchdownTime(targetTime);
        performSeek(targetTime);
        setCurrentTime(targetTime);
        setShowResults(false);
      } else if (type === 'playhead') {
        performSeek(targetTime);
        setCurrentTime(targetTime);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);

      if (videoRef.current) {
        try {
          videoRef.current.currentTime = latestTime;
        } catch (err) {
          console.error("Seeking error on up:", err);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
  };
  
  const getActiveCorrectionMs = () => {
    if (landingCorrectionMode === 'none') return 0;
    if (landingCorrectionMode === 'light') return 10;
    if (landingCorrectionMode === 'medium') return 25;
    if (landingCorrectionMode === 'heavy') return 50;
    return jumpPhases?.correctionMs || 0; // ai_auto
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

  // Sync manualFrameDuration with cameraFps when not manually overridden
  useEffect(() => {
    if (!isFrameDurationManual) {
      setManualFrameDuration(parseFloat((1 / cameraFps).toFixed(6)));
    }
  }, [cameraFps, isFrameDurationManual]);

  // Load playerHeight and standingReach from localStorage on selection
  useEffect(() => {
    if (selectedPlayerId) {
      const storedHeight = localStorage.getItem(`player_height_${selectedPlayerId}`);
      const storedReach = localStorage.getItem(`standing_reach_${selectedPlayerId}`);
      setPlayerHeight(storedHeight ? parseFloat(storedHeight) : 180);
      setStandingReach(storedReach ? parseFloat(storedReach) : 230);
    } else {
      setPlayerHeight(180);
      setStandingReach(230);
    }
    setMaxTouchHeight('');
  }, [selectedPlayerId, activePlayer]);

  // Save updates to localStorage helper functions
  const handleHeightChange = (val) => {
    setPlayerHeight(val);
    if (selectedPlayerId) {
      localStorage.setItem(`player_height_${selectedPlayerId}`, val);
    }
  };

  const handleStandingReachChange = (val) => {
    setStandingReach(val);
    if (selectedPlayerId) {
      localStorage.setItem(`standing_reach_${selectedPlayerId}`, val);
    }
  };

  const canvasRef = useRef(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const poseRef = useRef(null);
  const flightDataRef = useRef([]); // Stores: { time, y, leftKnee, rightKnee, leftHip, rightHip, hipY }

  // Calibration States
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState(0);
  const [referenceLength, setReferenceLength] = useState(0.90); // default leg length in meters
  const [pixelsPerMeter, setPixelsPerMeter] = useState(null);
  const [trackedJumpHeight, setTrackedJumpHeight] = useState(null);
  const calibrationClicksRef = useRef([]);

  useEffect(() => { fetchPlayers(); }, []);

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
            clearInterval(checkInterval); setScriptsLoaded(true);
          }
        }, 100);
      } catch (error) { console.error(error); }
    };
    loadMediaPipe();
  }, []);

  // Set the wrapper data-theme attribute whenever colorMode changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorMode);
  }, [colorMode]);

  // Automated FPS Detection once video file loads
  useEffect(() => {
    if (videoSrc && videoRef.current) {
      setIsFpsAutoDetected(false);
      const timer = setTimeout(() => {
        detectVideoFps(videoRef.current);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [videoSrc]);

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
    
    // Draw immediately
    if (videoRef.current && poseRef.current) {
      poseRef.current.send({ image: videoRef.current });
    }
    
    if (newClicks.length === 2) {
      const distInPixels = Math.hypot(newClicks[0].x - newClicks[1].x, newClicks[0].y - newClicks[1].y);
      const refLen = parseFloat(referenceLength) || 0.90;
      const ppm = distInPixels / refLen;
      setPixelsPerMeter(ppm);
      setLegLength(refLen); // calibrate the leg length directly
      setIsCalibrating(false);
      setCalibrationStep(0);
      alert(`✅ تمت معايرة طول الرجل بنجاح! مقياس الفيديو: ${ppm.toFixed(1)} بكسل لكل متر. تم ضبط طول الرجل على ${refLen} متر.`);
      
      setTimeout(() => {
        calibrationClicksRef.current = [];
        if (videoRef.current && poseRef.current) {
          poseRef.current.send({ image: videoRef.current });
        }
      }, 2000);
    }
  };

  const detectVideoFps = (videoEl) => {
    if (!videoEl || !videoEl.duration) return;
    
    // Use requestVideoFrameCallback with longer sampling and outlier removal
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
        
        // Collect at least 15 frame diffs over at least 300ms, timeout at 2s
        if (frameDiffs.length < 15 && (now - startTime) < 2000) {
          videoEl.requestVideoFrameCallback(callback);
        } else {
          videoEl.pause();
          if (frameDiffs.length >= 5) {
            // Remove outliers (top/bottom 20%)
            const sorted = [...frameDiffs].sort((a, b) => a - b);
            const trimCount = Math.floor(sorted.length * 0.2);
            const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
            const avgDiff = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
            
            if (avgDiff > 0) {
              const rawFps = 1 / avgDiff;
              // Snap to common rates with 15% tolerance
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
            // Fallback: assume 30fps
            setVideoFps(30);
            setCameraFps(30);
            setIsFpsAutoDetected(false);
          }
        }
      };
      
      // Seek past potential black frames before sampling
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

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from('lab_players').select('*').order('created_at', { ascending: false });
    if (!error && data) setPlayers(data);
  };

  const getPlayerAge = (dobString) => { return dobString ? new Date().getFullYear() - new Date(dobString).getFullYear() : 0; };

  const handlePlayerSelect = async (e) => {
    const id = e.target.value;
    setSelectedPlayerId(id); 
    setShowResults(false); setIsEditingPlayer(false); setTakeoffTime(0); setLandingTime(0); setVideoSrc(null); setAiEnabled(false);
    if (id) {
      const player = players.find(p => p.id === id);
      setActivePlayer(player); setBodyMass(player.weight_kg); setLegLength(player.leg_length_m); fetchPlayerHistory(id);
    } else { setActivePlayer(null); setPlayerHistory([]); setActiveTab('calculator'); }
  };

  const fetchPlayerHistory = async (id) => {
    const { data, error } = await supabase.from('lab_jump_measurements').select('*').eq('player_id', id).order('created_at', { ascending: true });
    if (!error && data) setPlayerHistory(data);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const weight = parseFloat(newPlayer.weight) || 0; const legLen = parseFloat(newPlayer.leg) || 0;
    if (weight <= 0 || legLen <= 0) return alert("برجاء إدخال الوزن وطول الرجل بشكل صحيح.");
    const formattedDate = `${newPlayer.birthYear}-01-01`;
    const { data, error } = await supabase.from('lab_players').insert([{ full_name: newPlayer.name, date_of_birth: formattedDate, weight_kg: weight, leg_length_m: legLen, gender: newPlayer.gender }]).select();
    if (!error && data) {
      const createdPlayer = data[0];
      if (newPlayer.height) localStorage.setItem(`player_height_${createdPlayer.id}`, newPlayer.height);
      if (newPlayer.standingReach) localStorage.setItem(`standing_reach_${createdPlayer.id}`, newPlayer.standingReach);
      
      setPlayers([createdPlayer, ...players]); setSelectedPlayerId(createdPlayer.id); setActivePlayer(createdPlayer);
      setBodyMass(createdPlayer.weight_kg); setLegLength(createdPlayer.leg_length_m);
      setPlayerHistory([]); setShowResults(false); setTakeoffTime(0); setLandingTime(0); setVideoSrc(null); setAiEnabled(false);
      setShowNewPlayerForm(false); setNewPlayer({ name: '', birthYear: '', weight: '', leg: '', gender: 'male', height: '', standingReach: '' });
    } else if (error) { alert("خطأ في تسجيل اللاعب: " + error.message); }
  };

  const handleDeletePlayer = async () => {
    if (!activePlayer) return;
    if (window.confirm(`هل أنت متأكد من مسح اللاعب "${activePlayer.full_name}" وكل سجلاته؟`)) {
      const { error } = await supabase.from('lab_players').delete().eq('id', activePlayer.id);
      if (!error) { setPlayers(players.filter(p => p.id !== activePlayer.id)); setSelectedPlayerId(''); setActivePlayer(null); setPlayerHistory([]); setActiveTab('calculator'); }
    }
  };

  const handleEditClick = () => {
    setEditPlayerForm({ 
      id: activePlayer.id, 
      name: activePlayer.full_name, 
      birthYear: activePlayer.date_of_birth ? activePlayer.date_of_birth.substring(0, 4) : '', 
      weight: activePlayer.weight_kg, 
      leg: activePlayer.leg_length_m, 
      gender: activePlayer.gender,
      height: playerHeight,
      standingReach: standingReach
    });
    setIsEditingPlayer(true);
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    const weight = parseFloat(editPlayerForm.weight) || 0; const legLen = parseFloat(editPlayerForm.leg) || 0;
    if (weight <= 0 || legLen <= 0) return alert("برجاء إدخال الأرقام بشكل صحيح.");
    const formattedDate = `${editPlayerForm.birthYear}-01-01`;
    const { data, error } = await supabase.from('lab_players').update({ full_name: editPlayerForm.name, date_of_birth: formattedDate, weight_kg: weight, leg_length_m: legLen, gender: editPlayerForm.gender }).eq('id', editPlayerForm.id).select();
    if (!error && data) {
      const updatedPlayer = data[0];
      localStorage.setItem(`player_height_${updatedPlayer.id}`, editPlayerForm.height);
      localStorage.setItem(`standing_reach_${updatedPlayer.id}`, editPlayerForm.standingReach);
      setPlayerHeight(parseFloat(editPlayerForm.height) || 180);
      setStandingReach(parseFloat(editPlayerForm.standingReach) || 230);
      
      setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)); setActivePlayer(updatedPlayer); setBodyMass(updatedPlayer.weight_kg); setLegLength(updatedPlayer.leg_length_m); setIsEditingPlayer(false);
    }
  };

  const handlePresetChange = (e) => {
    const val = e.target.value;
    setVideoPreset(val);
    if (val === 'slow240') { setCameraFps(240); setVideoFps(30); }
    else if (val === 'slow120') { setCameraFps(120); setVideoFps(30); }
    else if (val === 'normal30') { setCameraFps(30); setVideoFps(30); }
    else if (val === 'normal60') { setCameraFps(60); setVideoFps(60); }
  };

  const handleFileUpload = (e) => { const file = e.target.files[0]; if (file) { setVideoSrc(URL.createObjectURL(file)); setAiEnabled(false); flightDataRef.current = []; setAiDetectedFrameDuration(null); } };
  const clearVideo = () => { setVideoSrc(null); setTakeoffTime(0); setLandingTime(0); setCurrentTime(0); setIsPlaying(false); setShowResults(false); setAiEnabled(false); flightDataRef.current = []; setAiDetectedFrameDuration(null); };
  const togglePlay = () => { if (videoRef.current) { if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); } else { videoRef.current.pause(); setIsPlaying(false); } } };
  const handleTimeUpdate = () => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (videoRef.current) setDuration(videoRef.current.duration); };
  const handleSeek = async (e) => { const time = Number(e.target.value); if (videoRef.current) { try { videoRef.current.currentTime = time; } catch(err) { console.error("Seek error:", err); } setCurrentTime(time); if (aiEnabled && poseRef.current) await poseRef.current.send({ image: videoRef.current }); } };
  
  const stepFrames = async (frames) => { 
    if (videoRef.current && duration > 0) { 
      const video = videoRef.current;
      video.pause(); 
      setIsPlaying(false); 
      
      const timeStep = frames / (videoFps || 30); 
      let newTime = video.currentTime + timeStep; 
      newTime = Math.max(0, Math.min(newTime, duration)); 
      
      setTimeout(() => {
        try {
          video.currentTime = newTime; 
          setCurrentTime(newTime); 
        } catch (err) {
          console.error("Step frames error:", err);
        }
      }, 0);
      
      if (aiEnabled && poseRef.current) {
        const onSeeked = async () => {
          video.removeEventListener('seeked', onSeeked);
          await poseRef.current.send({ image: video });
        };
        video.addEventListener('seeked', onSeeked);
      }
    } 
  };

  // Math vector angles calculation (3 points: p1, p2 vertex, p3)
  const calculateAngle = (p1, p2, p3) => {
    const rad = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    let angle = Math.abs((rad * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360.0 - angle;
    return angle;
  };

  // AI MediaPipe pose results tracker
  useEffect(() => {
    if (!scriptsLoaded) return;
    const { Pose, POSE_CONNECTIONS, drawConnectors, drawLandmarks } = window;
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 2, smoothLandmarks: true, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
    
    pose.onResults((results) => {
      const canvasCtx = canvasRef.current?.getContext('2d'); if (!canvasCtx || !canvasRef.current) return;
      if (results.image.width && canvasRef.current.width !== results.image.width) { canvasRef.current.width = results.image.width; canvasRef.current.height = results.image.height; }
      canvasCtx.save(); canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
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
          drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#f97316', lineWidth: 3 }); 
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

        // Keep coordinates continuously if AI is enabled
        if (aiEnabled) {
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

      // Draw calibration helper clicks
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

      canvasCtx.restore();
    });
    
    poseRef.current = pose;
    let isProcessing = false;
    const processFrame = async () => { 
      const video = videoRef.current; 
      if (video && !video.paused && !video.ended) { 
        if ((aiEnabled || isCalibrating) && !isProcessing && video.readyState >= 2) { 
          isProcessing = true; 
          await pose.send({ image: video }); 
          isProcessing = false; 
        } 
      } 
      reqRef.current = requestAnimationFrame(processFrame); 
    };
    processFrame();
    return () => { cancelAnimationFrame(reqRef.current); pose.close(); };
  }, [scriptsLoaded, aiEnabled, isCalibrating]);

  // Smarter Takeoff/Landing detection using Joint angles & foot height
  const autoDetectJump = () => {
    const data = flightDataRef.current;
    if (data.length < 15) return alert("يرجى تشغيل الفيديو بالكامل مع تفعيل الذكاء الاصطناعي لجمع إحداثيات القفزة.");
    
    const getAvgKneeAngleAt = (frameData) => {
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
      // Find box touchdown: first frame where feet reach ground Y level
      const tdThreshold = groundY - (yRange * 0.05);
      for (let i = 0; i < smoothed.length; i++) {
        if (smoothed[i].y >= tdThreshold) {
          boxTouchdownIndex = i;
          break;
        }
      }
      if (boxTouchdownIndex === -1) boxTouchdownIndex = 0;
      setBoxTouchdownTime(smoothed[boxTouchdownIndex].time);
      
      // Takeoff: leaves ground again after box touchdown
      for (let i = boxTouchdownIndex + 3; i < smoothed.length; i++) {
        if (smoothed[i].y < tdThreshold) {
          takeoffIndex = i;
          break;
        }
      }
    } else {
      // CMJ or SJ: takeoff when foot leaves ground baseline
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
    
    // Landing: foot returns to baseline after takeoff
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
    videoRef.current.currentTime = tStart;
    setCurrentTime(tStart);
    
    // --- Step 4: Trace other biomechanical events ---
    // Deepest Squat
    let deepestSquatIndex = 0;
    let maxHipY = -1;
    const searchRangeEnd = takeoffIndex;
    const searchRangeStart = jumpType === 'dj' ? boxTouchdownIndex : 0;
    
    for (let i = searchRangeStart; i <= searchRangeEnd; i++) {
      if (smoothed[i].hipY > maxHipY) {
        maxHipY = smoothed[i].hipY;
        deepestSquatIndex = i;
      }
    }
    
    // Movement Start: hip starts descending from baseline
    const standingFrames = smoothed.slice(0, Math.max(3, Math.floor(takeoffIndex * 0.15)));
    const standingHipY = standingFrames.reduce((sum, d) => sum + d.hipY, 0) / standingFrames.length;
    
    let movementStartIndex = 0;
    for (let i = deepestSquatIndex; i >= 0; i--) {
      if (smoothed[i].hipY <= standingHipY + 1.5) {
        movementStartIndex = i;
        break;
      }
    }
    
    // Apex / Peak Height: minimum hipY coordinate in the air
    let apexIndex = takeoffIndex;
    let minHipY = 99999;
    for (let i = takeoffIndex; i <= landingIndex; i++) {
      if (smoothed[i].hipY < minHipY) {
        minHipY = smoothed[i].hipY;
        apexIndex = i;
      }
    }
    
    // Landing knee angle and automatic landing correction
    const landingFrameData = smoothed[landingIndex];
    const avgLandingKnee = getAvgKneeAngleAt(landingFrameData);
    
    let correctionMs = 0;
    if (avgLandingKnee < 165) {
      const diff = 175 - avgLandingKnee;
      correctionMs = Math.min(60, Math.max(0, Math.round(diff * 1.5))); // cap at 60ms
    }
    
    // Tracked vertical displacement in cm
    let displacementCm = 0;
    if (pixelsPerMeter) {
      const dispPixels = Math.max(0, smoothed[deepestSquatIndex].hipY - smoothed[apexIndex].hipY);
      displacementCm = (dispPixels / pixelsPerMeter) * 100;
    }
    
    // Prepare displacement points for graphing (relative to standingHipY)
    const points = smoothed.map((d, i) => {
      const pixelDisp = standingHipY - d.hipY;
      const cmDisp = pixelsPerMeter ? (pixelDisp / pixelsPerMeter) * 100 : pixelDisp * 0.15; // scale estimate if no calibration
      return {
        frame: i,
        time: d.time,
        displacement: cmDisp
      };
    });
    
    setJumpPhases({
      movementStart: {
        frame: movementStartIndex,
        time: smoothed[movementStartIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[movementStartIndex]),
        hipDisplacement: 0
      },
      deepestSquat: {
        frame: deepestSquatIndex,
        time: smoothed[deepestSquatIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[deepestSquatIndex]),
        hipDisplacement: pixelsPerMeter ? ((smoothed[movementStartIndex].hipY - smoothed[deepestSquatIndex].hipY) / pixelsPerMeter) * 100 : -10
      },
      takeoff: {
        frame: takeoffIndex,
        time: smoothed[takeoffIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[takeoffIndex]),
        hipDisplacement: pixelsPerMeter ? ((smoothed[movementStartIndex].hipY - smoothed[takeoffIndex].hipY) / pixelsPerMeter) * 100 : 0
      },
      apex: {
        frame: apexIndex,
        time: smoothed[apexIndex].time,
        kneeAngle: getAvgKneeAngleAt(smoothed[apexIndex]),
        displacementCm: displacementCm,
        hipDisplacement: displacementCm
      },
      landing: {
        frame: landingIndex,
        time: smoothed[landingIndex].time,
        kneeAngle: avgLandingKnee,
        hipDisplacement: 0
      },
      boxTouchdown: jumpType === 'dj' ? {
        frame: boxTouchdownIndex,
        time: smoothed[boxTouchdownIndex].time
      } : null,
      kneeAngleAtLanding: avgLandingKnee,
      correctionMs: correctionMs,
      points: points
    });
    
    if (pixelsPerMeter) {
      setTrackedJumpHeight(displacementCm.toFixed(1));
    }
    
    alert(`✅ تم تحليل إحداثيات القفزة وحساب المراحل بنجاح! زاوية ركبة الهبوط: ${avgLandingKnee.toFixed(0)}° (تصحيح هبوط: ${correctionMs}ms).`);
  };

  const handleAnalyze = () => { 
    if (takeoffTime === 0 || landingTime === 0) return alert("حدد الإقلاع والهبوط أولاً."); 
    
    // Auto populate phases if not already generated
    if (!jumpPhases && flightDataRef.current.length > 5) {
      autoDetectJump();
    }
    
    setShowResults(true); 
  };

  const saveMeasurement = async () => {
    if (!selectedPlayerId) return; setIsSaving(true);
    const powerVal = parseFloat(stats.harmanPeakPower) > 0 ? parseFloat(stats.harmanPeakPower) : parseFloat(stats.meanPower) * 2.1;
    const { data, error } = await supabase.from('lab_jump_measurements').insert([ { 
      player_id: selectedPlayerId, 
      test_type: 'standard', 
      jump_height_cm: stats.heightCm, 
      flight_time_sec: stats.flightTime, 
      takeoff_velocity_ms: stats.takeoffVelocity, 
      mean_power_watts: stats.meanPower, 
      peak_power_watts: powerVal.toFixed(2), 
      mean_force_newtons: (parseFloat(bodyMass) * 9.81 * ((parseFloat(stats.heightCm)/100)/(((parseFloat(legLength) > 2 ? parseFloat(legLength)/100 : parseFloat(legLength)) || 1.0)*0.45) + 1)).toFixed(2), 
      leg_used: legUsed 
    } ]).select();
    if (!error && data) { 
      setPlayerHistory([...playerHistory, data[0]]); 
      setShowResults(false); 
      alert("✅ تم حفظ نتيجة القفزة بنجاح في ملف اللاعب!");
    }
    setIsSaving(false);
  };

  const tabs = [
    { id: 'calculator', name: 'الوثبة الرأسية', icon: Activity },
    { id: 'rsi', name: 'مؤشر RSI', icon: Zap },
    { id: 'fvp', name: 'منحنى FVP', icon: LineChart },
    { id: 'vbt', name: 'سرعة البار VBT', icon: ScanEye },
    { id: 'profile', name: 'ملف التقرير', icon: UserCircle }
  ];

  return (
    <div data-theme={colorMode} className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4 md:p-6 pb-24 md:pb-6 transition-all duration-300 text-shadow-contrast" style={{ direction: "rtl" }}>
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* ================= DESKTOP SIDEBAR ================= */}
        <aside className="hidden md:flex flex-col w-[290px] shrink-0 gap-5">
          {/* Sidebar Header & Player Selector */}
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
              <h1 className="text-xl font-black text-white tracking-wide font-mono">The Lab 🧪</h1>
              <button onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white transition-all border border-[var(--border-light)] shadow-sm">
                {colorMode === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
              </button>
            </div>
            
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-400">اختر لاعب للبدء:</label>
              <div className="relative">
                <UserCircle className="absolute right-3.5 top-3 text-gray-400" size={18} />
                <select value={selectedPlayerId} onChange={handlePlayerSelect} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl py-2.5 pr-10 pl-3 outline-none focus:ring-2 focus:ring-[var(--brand-main)] transition-all cursor-pointer font-bold appearance-none text-xs">
                  <option value="" className="text-gray-900 bg-white">-- اختر لاعب --</option>
                  {players.map(p => (<option key={p.id} value={p.id} className="text-gray-900 bg-white">{p.full_name}</option>))}
                </select>
              </div>
              
              <button onClick={() => setShowNewPlayerForm(!showNewPlayerForm)} className="w-full py-2 flex items-center justify-center gap-1.5 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-[var(--text-secondary)] rounded-xl font-bold transition-all shadow-md text-xs">
                {showNewPlayerForm ? <><X size={14}/> إلغاء</> : <><Plus size={14}/> تسجيل لاعب جديد</>}
              </button>
            </div>
          </div>

          {/* New Player Form (Collapsible in Sidebar) */}
          <AnimatePresence>
            {showNewPlayerForm && (
              <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={handleAddPlayer} className="p-5 bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-color)] space-y-3 overflow-hidden">
                <h3 className="text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)] pb-1.5">لاعب جديد</h3>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">الاسم الكامل</label>
                  <input required type="text" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">سنة الميلاد</label>
                    <input required type="number" min="1950" max={new Date().getFullYear()} value={newPlayer.birthYear} onChange={e => setNewPlayer({...newPlayer, birthYear: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">النوع</label>
                    <select value={newPlayer.gender} onChange={e => setNewPlayer({...newPlayer, gender: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]">
                      <option value="male" className="text-gray-900 bg-white">ذكر</option>
                      <option value="female" className="text-gray-900 bg-white">أنثى</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">الوزن (kg)</label>
                    <input required type="number" step="0.1" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">طول الرجل (م)</label>
                    <input required type="number" step="0.01" value={newPlayer.leg} onChange={e => setNewPlayer({...newPlayer, leg: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">طول اللاعب (cm)</label>
                    <input type="number" value={newPlayer.height} onChange={e => setNewPlayer({...newPlayer, height: e.target.value})} placeholder="مثال: 182" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">الوصول من الثبات (cm)</label>
                    <input type="number" value={newPlayer.standingReach} onChange={e => setNewPlayer({...newPlayer, standingReach: e.target.value})} placeholder="مثال: 235" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                </div>
                <button type="submit" className="w-full btn-orange-gradient py-2 rounded-xl text-xs font-bold shadow-md flex justify-center items-center gap-1.5"><Save size={14}/> حفظ البيانات</button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Active Player Info Card & Edit (Sidebar) */}
          {activePlayer && (
            <div className="glass-panel p-5 space-y-4">
              {!isEditingPlayer ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-extrabold text-white text-base">{activePlayer.full_name}</h2>
                      <p className="text-[10px] text-[var(--text-secondary)] font-bold">{getPlayerAge(activePlayer.date_of_birth)} سنة | {activePlayer.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={handleEditClick} className="p-2 bg-[var(--bg-input)] text-gray-400 hover:text-[var(--text-secondary)] rounded-lg border border-[var(--border-light)] transition-all"><Edit3 size={14} /></button>
                      <button onClick={handleDeletePlayer} className="p-2 bg-[var(--bg-input)] text-gray-400 hover:text-red-500 rounded-lg border border-[var(--border-light)] transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/10 p-2.5 rounded-xl border border-[var(--border-light)] text-center">
                      <span className="block text-[9px] text-gray-400 font-bold">الوزن</span>
                      <span className="font-extrabold text-white text-sm font-mono">{activePlayer.weight_kg} kg</span>
                    </div>
                    <div className="bg-black/10 p-2.5 rounded-xl border border-[var(--border-light)] text-center">
                      <span className="block text-[9px] text-gray-400 font-bold">طول الرجل</span>
                      <span className="font-extrabold text-white text-sm font-mono">{activePlayer.leg_length_m} m</span>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdatePlayer} className="space-y-3 animate-fade-in">
                  <h3 className="text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border-light)] pb-1.5">تعديل بيانات اللاعب</h3>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">الاسم الكامل</label>
                    <input required type="text" value={editPlayerForm.name} onChange={e => setEditPlayerForm({...editPlayerForm, name: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">سنة الميلاد</label>
                      <input required type="number" value={editPlayerForm.birthYear} onChange={e => setEditPlayerForm({...editPlayerForm, birthYear: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">الوزن (kg)</label>
                      <input required type="number" step="0.1" value={editPlayerForm.weight} onChange={e => setEditPlayerForm({...editPlayerForm, weight: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">طول الرجل (متر)</label>
                    <input required type="number" step="0.01" value={editPlayerForm.leg} onChange={e => setEditPlayerForm({...editPlayerForm, leg: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">طول اللاعب (cm)</label>
                      <input type="number" value={editPlayerForm.height} onChange={e => setEditPlayerForm({...editPlayerForm, height: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">الوصول من الثبات (cm)</label>
                      <input type="number" value={editPlayerForm.standingReach} onChange={e => setEditPlayerForm({...editPlayerForm, standingReach: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold">تأكيد</button>
                    <button type="button" onClick={() => setIsEditingPlayer(false)} className="px-3 bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-white text-xs rounded-xl">إلغاء</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Sidebar Vertical Tabs Menu (Desktop) */}
          {activePlayer && (
            <nav className="glass-panel p-3 flex flex-col gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-300
                      ${isActive 
                        ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-[#070a13] shadow-md shadow-cyan-500/20 border border-cyan-500/20' 
                        : 'text-gray-400 hover:text-white bg-transparent hover:bg-[var(--bg-input)]'}`}
                  >
                    <Icon size={16} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          )}
          
          {/* Footer/Connection details */}
          <div className="glass-panel p-4 text-[10px] text-gray-500 flex flex-col gap-1 items-center">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck size={12} /> متصل بـ Supabase
            </span>
            <span>The Lab v2.0 © 2026</span>
          </div>
        </aside>

        {/* ================= MOBILE HEADER BAR ================= */}
        <header className="md:hidden w-full flex flex-col gap-4 bg-[var(--bg-panel)] backdrop-blur-md border border-[var(--border-color)] p-4 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-black text-white tracking-wide font-mono">The Lab 🧪</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white transition-all border border-[var(--border-light)] shadow-sm">
                {colorMode === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <UserCircle className="absolute right-3 top-2.5 text-gray-400" size={18} />
              <select value={selectedPlayerId} onChange={handlePlayerSelect} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl py-2 pr-9 pl-3 outline-none font-bold text-xs appearance-none">
                <option value="" className="text-gray-900 bg-white">-- اختر لاعب --</option>
                {players.map(p => (<option key={p.id} value={p.id} className="text-gray-900 bg-white">{p.full_name}</option>))}
              </select>
            </div>
            <button onClick={() => setShowNewPlayerForm(!showNewPlayerForm)} className="px-3 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-[var(--text-secondary)] rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1">
              {showNewPlayerForm ? <X size={14}/> : <Plus size={14}/>}
            </button>
          </div>

          {/* New Player Form on Mobile */}
          <AnimatePresence>
            {showNewPlayerForm && (
              <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={handleAddPlayer} className="p-4 bg-black/20 rounded-xl border border-[var(--border-light)] space-y-3 overflow-hidden text-xs">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">الاسم الكامل</label>
                  <input required type="text" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">سنة الميلاد</label>
                    <input required type="number" min="1950" max={new Date().getFullYear()} value={newPlayer.birthYear} onChange={e => setNewPlayer({...newPlayer, birthYear: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">النوع</label>
                    <select value={newPlayer.gender} onChange={e => setNewPlayer({...newPlayer, gender: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]">
                      <option value="male" className="text-gray-900 bg-white">ذكر</option>
                      <option value="female" className="text-gray-900 bg-white">أنثى</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">الوزن (kg)</label>
                    <input required type="number" step="0.1" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">طول الرجل (م)</label>
                    <input required type="number" step="0.01" value={newPlayer.leg} onChange={e => setNewPlayer({...newPlayer, leg: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">طول اللاعب (cm)</label>
                    <input type="number" value={newPlayer.height} onChange={e => setNewPlayer({...newPlayer, height: e.target.value})} placeholder="مثال: 182" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">الوصول من الثبات (cm)</label>
                    <input type="number" value={newPlayer.standingReach} onChange={e => setNewPlayer({...newPlayer, standingReach: e.target.value})} placeholder="مثال: 235" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-[var(--text-primary)] rounded-lg outline-none focus:border-[var(--brand-main)]" />
                  </div>
                </div>
                <button type="submit" className="w-full btn-orange-gradient py-2 rounded-xl text-xs font-bold shadow-md flex justify-center items-center gap-1"><Save size={14}/> حفظ البيانات</button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Active Player Card on Mobile */}
          {activePlayer && !isEditingPlayer && (
            <div className="bg-black/10 p-3 rounded-xl border border-[var(--border-light)] flex items-center justify-between text-xs">
              <div>
                <span className="font-extrabold text-white">{activePlayer.full_name}</span>
                <span className="text-gray-400 mx-2">|</span>
                <span className="font-bold text-[var(--text-secondary)]">{getPlayerAge(activePlayer.date_of_birth)} سنة</span>
                <span className="text-gray-400 mx-2">|</span>
                <span className="font-bold text-white">{activePlayer.weight_kg} kg</span>
              </div>
              <div className="flex gap-2">
                <button onClick={handleEditClick} className="p-1.5 bg-[var(--bg-input)] text-gray-400 hover:text-[var(--text-secondary)] rounded-lg border border-[var(--border-light)]"><Edit3 size={12} /></button>
                <button onClick={handleDeletePlayer} className="p-1.5 bg-[var(--bg-input)] text-gray-400 hover:text-red-500 rounded-lg border border-[var(--border-light)]"><Trash2 size={12} /></button>
              </div>
            </div>
          )}

          {isEditingPlayer && (
            <form onSubmit={handleUpdatePlayer} className="p-3 bg-black/20 rounded-xl border border-[var(--border-color)] space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">تعديل الاسم</label>
                <input required type="text" value={editPlayerForm.name} onChange={e => setEditPlayerForm({...editPlayerForm, name: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">الوزن (kg)</label>
                  <input required type="number" step="0.1" value={editPlayerForm.weight} onChange={e => setEditPlayerForm({...editPlayerForm, weight: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">طول الرجل (م)</label>
                  <input required type="number" step="0.01" value={editPlayerForm.leg} onChange={e => setEditPlayerForm({...editPlayerForm, leg: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none focus:border-[var(--brand-main)]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">طول اللاعب (cm)</label>
                  <input type="number" value={editPlayerForm.height} onChange={e => setEditPlayerForm({...editPlayerForm, height: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">الوصول من الثبات (cm)</label>
                  <input type="number" value={editPlayerForm.standingReach} onChange={e => setEditPlayerForm({...editPlayerForm, standingReach: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2 text-xs text-white rounded-lg outline-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-xs font-bold">حفظ</button>
                <button type="button" onClick={() => setIsEditingPlayer(false)} className="px-3 bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-white text-xs rounded-lg">إلغاء</button>
              </div>
            </form>
          )}
        </header>

        {/* ================= MAIN CONTENT WORKSPACE ================= */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activePlayer ? (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                
                {activeTab === 'calculator' && (
                  <div className="glass-panel p-4 md:p-6 shadow-2xl transition-all duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Left Panel: Live Skeleton HUD Overlay */}
                      <div className="lg:col-span-7 bg-black/20 p-5 rounded-3xl border border-[var(--border-light)] flex flex-col items-center justify-start gap-4">
                        <div className="w-full mb-4 flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border-light)]">
                           <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><ScanEye size={18} className="text-cyan-400 animate-pulse"/> التتبع الحي لزوايا المفاصل (AI HUD)</span>
                           <div className="flex items-center gap-2">
                             {!scriptsLoaded && <span className="text-[10px] text-cyan-400 animate-pulse font-bold">جاري تحميل الذكاء الاصطناعي...</span>}
                             <button onClick={() => setAiEnabled(!aiEnabled)} className={`px-5 py-1.5 rounded-xl font-bold text-xs transition-all ${aiEnabled ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]' : 'bg-black/40 text-gray-400'}`}>
                               {aiEnabled ? 'مفعل' : 'تفعيل'}
                             </button>
                           </div>
                        </div>

                        {!videoSrc ? (
                          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center py-16">
                            <label className="flex-1 w-full max-w-xs cursor-pointer btn-orange-gradient text-center py-9 rounded-2xl font-black flex flex-col items-center justify-center gap-2">
                              <input type="file" accept="video/*" capture="environment" onChange={handleFileUpload} ref={cameraInputRef} className="hidden" />
                              <Focus size={36} /> فتح الكاميرا للتصوير
                            </label>
                            <label className="flex-1 w-full max-w-xs cursor-pointer bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-[var(--text-primary)] text-center py-9 rounded-2xl font-black flex flex-col items-center justify-center gap-2 transition-all">
                              <input type="file" accept="video/*" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                              <Play size={36} /> اختيار فيديو من المعرض
                            </label>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center w-full relative">
                            <button onClick={clearVideo} className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 p-2 rounded-full text-white z-20 shadow-lg transition-transform hover:scale-110"><X size={16}/></button>
                            
                            <div className="relative inline-block border border-[var(--border-light)] rounded-2xl overflow-hidden mb-5 shadow-2xl w-full bg-black">
                              <video ref={videoRef} src={videoSrc} playsInline muted preload="auto" className="w-full h-auto max-h-[48vh] object-contain mx-auto" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
                              <canvas 
                                ref={canvasRef} 
                                onClick={handleCanvasClick} 
                                className={`absolute top-0 left-0 w-full h-full ${isCalibrating ? 'cursor-crosshair z-10' : 'pointer-events-none'}`} 
                              />
                            </div>
                            
                            {/* Filmstrip Draggable Timeline */}
                            <div className="w-full bg-black/35 p-4 rounded-2xl border border-[var(--border-light)] mb-5 text-right" style={{ direction: 'rtl' }}>
                              <div className="flex items-center justify-between text-xs text-gray-400 mb-2 font-bold px-1">
                                <span>خط الزمن السينمائي (Filmstrip Timeline)</span>
                                <span className="text-cyan-400">اسحب المؤشرات لتحديد اللحظات بدقة 🚀</span>
                              </div>
                              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 relative mb-4">
                                {/* Badges row for mobile (hidden on desktop) */}
                                <div className="flex justify-between items-center w-full md:hidden mb-1">
                                  {/* Current Time Badge */}
                                  <div className="flex items-center gap-1.5 bg-[var(--bg-input)] px-2.5 py-1 rounded-xl border border-[var(--border-light)]">
                                    <span className="text-[10px] text-gray-400">الوقت الحالي:</span>
                                    <span className="text-xs text-[var(--brand-text)] font-mono font-bold">{currentTime.toFixed(3)}s</span>
                                    <span className="text-[9px] text-gray-500 font-mono">F {Math.round(currentTime * (videoFps || 30))}</span>
                                  </div>
                                  
                                  {/* Duration Time Badge */}
                                  <div className="flex items-center gap-1.5 bg-[var(--bg-input)] px-2.5 py-1 rounded-xl border border-[var(--border-light)]">
                                    <span className="text-[10px] text-gray-400">الإجمالي:</span>
                                    <span className="text-xs text-gray-300 font-mono font-bold">{duration.toFixed(3)}s</span>
                                    <span className="text-[9px] text-gray-500 font-mono">F {Math.round(duration * (videoFps || 30))}</span>
                                  </div>
                                </div>

                                {/* Current Time Badge for Desktop (hidden on mobile) */}
                                <div className="hidden md:flex flex-col text-xs text-[var(--brand-text)] font-mono bg-[var(--bg-input)] px-2.5 py-1.5 rounded-xl border border-[var(--border-light)] text-center shrink-0">
                                  <span>{currentTime.toFixed(3)}s</span>
                                  <span className="text-[9px] text-gray-500">F {Math.round(currentTime * (videoFps || 30))}</span>
                                </div>
                                
                                {/* Timeline Track */}
                                <div 
                                  ref={timelineTrackRef}
                                  className="relative w-full md:flex-1 h-12 bg-[#070b13] border border-cyan-950/80 rounded-2xl select-none touch-none cursor-pointer"
                                  onPointerDown={(e) => {
                                    if (e.target.closest('[data-timeline-handle]')) return;
                                    handleTimelineDragStart(e, 'playhead');
                                  }}
                                  style={{ touchAction: 'none' }}
                                >
                                  {/* Ruler-style ticks */}
                                  <div className="absolute inset-0 flex justify-between items-center px-4 pointer-events-none opacity-20">
                                    {Array.from({ length: 25 }).map((_, i) => {
                                      const isMajor = i % 5 === 0;
                                      return (
                                        <div 
                                          key={i} 
                                          className={`w-0.5 bg-cyan-500/80 rounded-full transition-all ${
                                            isMajor ? 'h-5 opacity-80' : 'h-2.5 opacity-40'
                                          }`}
                                        />
                                      );
                                    })}
                                  </div>

                                  {/* Shadow overlays for takeoff and landing ranges */}
                                  {duration > 0 && takeoffTime > 0 && landingTime > takeoffTime && (
                                    <div 
                                      className="absolute top-2 bottom-2 bg-cyan-500/10 border-l border-r border-cyan-400/30 pointer-events-none"
                                      style={{
                                        right: `${(takeoffTime / duration) * 100}%`,
                                        left: `${100 - (landingTime / duration) * 100}%`
                                      }}
                                    />
                                  )}

                                  {/* Draggable Playhead */}
                                  {duration > 0 && (
                                    <div 
                                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-[0_0_8px_#facc15] z-10 pointer-events-none"
                                      style={{ right: `${(currentTime / duration) * 100}%` }}
                                    >
                                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-400 rotate-45 border border-black animate-pulse"></div>
                                    </div>
                                  )}

                                  {/* Draggable Takeoff Handle */}
                                  {duration > 0 && takeoffTime > 0 && (
                                    <div 
                                      data-timeline-handle="takeoff"
                                      onPointerDown={(e) => handleTimelineDragStart(e, 'takeoff')}
                                      className="absolute top-0 bottom-0 w-8 -mr-4 z-20 cursor-ew-resize touch-none flex justify-center"
                                      style={{ right: `${(takeoffTime / duration) * 100}%`, touchAction: 'none' }}
                                    >
                                      {/* Visual handle line */}
                                      <div className="w-1 h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)] relative">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-cyan-500 text-[#070a13] text-[9px] font-black rounded border border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.6)] flex items-center gap-0.5 select-none whitespace-nowrap">
                                          🚀 إقلاع
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Draggable Landing Handle */}
                                  {duration > 0 && landingTime > 0 && (
                                    <div 
                                      data-timeline-handle="landing"
                                      onPointerDown={(e) => handleTimelineDragStart(e, 'landing')}
                                      className="absolute top-0 bottom-0 w-8 -mr-4 z-20 cursor-ew-resize touch-none flex justify-center"
                                      style={{ right: `${(landingTime / duration) * 100}%`, touchAction: 'none' }}
                                    >
                                      {/* Visual handle line */}
                                      <div className="w-1 h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] relative">
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-[9px] font-black rounded border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)] flex items-center gap-0.5 select-none whitespace-nowrap">
                                          🛬 هبوط
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Draggable Touchdown Handle (if DJ) */}
                                  {duration > 0 && jumpType === 'dj' && boxTouchdownTime > 0 && (
                                    <div 
                                      data-timeline-handle="touchdown"
                                      onPointerDown={(e) => handleTimelineDragStart(e, 'touchdown')}
                                      className="absolute top-0 bottom-0 w-8 -mr-4 z-20 cursor-ew-resize touch-none flex justify-center"
                                      style={{ right: `${(boxTouchdownTime / duration) * 100}%`, touchAction: 'none' }}
                                    >
                                      {/* Visual handle line */}
                                      <div className="w-1 h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] relative">
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-black rounded border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)] flex items-center gap-0.5 select-none whitespace-nowrap">
                                          📥 تلامس
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Duration Time Badge for Desktop (hidden on mobile) */}
                                <div className="hidden md:flex flex-col text-xs text-gray-400 font-mono bg-[var(--bg-input)] px-2.5 py-1.5 rounded-xl border border-[var(--border-light)] text-center shrink-0">
                                  <span>{duration.toFixed(3)}s</span>
                                  <span className="text-[9px] text-gray-500">F {Math.round(duration * (videoFps || 30))}</span>
                                </div>
                              </div>
                              
                              {/* Controller Buttons */}
                              <div className="flex justify-center items-center gap-3">
                                <button onClick={() => stepFrames(-10)} title="العودة 10 إطارات" className="p-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white transition-colors"><ChevronsRight size={18} /></button>
                                <button onClick={() => stepFrames(-1)} title="العودة إطار واحد" className="p-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white transition-colors"><ChevronRight size={18} /></button>
                                
                                <button onClick={togglePlay} className="px-10 py-3 btn-orange-gradient rounded-xl font-bold flex items-center justify-center gap-2">
                                  {isPlaying ? <Pause size={18}/> : <Play size={18}/>}
                                </button>
                                
                                <button onClick={() => stepFrames(1)} title="التقدم إطار واحد" className="p-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white transition-colors"><ChevronLeft size={18} /></button>
                                <button onClick={() => stepFrames(10)} title="التقدم 10 إطارات" className="p-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] rounded-xl text-white transition-colors"><ChevronsLeft size={18} /></button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2.5 w-full justify-center">
                              <button onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }} className={`flex-1 py-3 border rounded-xl font-bold transition-all text-xs sm:text-sm ${takeoffTime > 0 ? 'bg-cyan-600/30 text-cyan-400 border-cyan-500/50' : 'bg-[var(--bg-input)] border-[var(--border-light)] text-white hover:bg-[var(--border-color)]'}`}>
                                {takeoffTime > 0 ? '🚀 تعديل الإقلاع' : '🚀 تحديد إقلاع'}
                              </button>
                              <button onClick={() => { setLandingTime(currentTime); setShowResults(false); }} className={`flex-1 py-3 border rounded-xl font-bold transition-all text-xs sm:text-sm ${landingTime > 0 ? 'bg-red-600/30 text-red-400 border-red-500/50' : 'bg-[var(--bg-input)] border-[var(--border-light)] text-white hover:bg-[var(--border-color)]'}`}>
                                {landingTime > 0 ? '🛬 تعديل الهبوط' : '🛬 تحديد هبوط'}
                              </button>
                              {aiEnabled && ( <button onClick={autoDetectJump} className="w-full mt-1 py-3.5 btn-orange-gradient text-white rounded-xl font-black shadow-lg text-sm">⚡ كشف تلقائي ذكي بالزوايا وارتفاع الكاحل</button> )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Right Panel: Biomechanical Settings and Results */}
                      <div className="lg:col-span-5 flex flex-col justify-between gap-6">
                        
                        {/* Configuration panel */}
                        <div className="bg-black/20 p-5 rounded-3xl border border-[var(--border-light)] space-y-4">
                          <h4 className="font-extrabold text-sm text-cyan-400 border-b border-[var(--border-light)] pb-2 flex items-center gap-1.5">
                            <Activity size={18} /> إعدادات التحليل والمدخلات
                          </h4>

                          {/* Settings Tabs */}
                          <div className="flex border border-cyan-500/20 bg-black/40 p-1 rounded-2xl gap-1">
                            <button
                              type="button"
                              onClick={() => setActiveSettingsTab('analysis')}
                              className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeSettingsTab === 'analysis' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-white bg-transparent border border-transparent'}`}
                            >
                              🎥 تحليل الفيديو
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveSettingsTab('anthropometrics')}
                              className={`flex-1 py-2 text-center font-extrabold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeSettingsTab === 'anthropometrics' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-white bg-transparent border border-transparent'}`}
                            >
                              ⚖️ قياسات اللاعب
                            </button>
                          </div>

                          {activeSettingsTab === 'analysis' && (
                            <div className="space-y-4 animate-fade-in">

                          {/* Advanced Jump Biomechanics Inputs */}
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">نوع القفزة (Jump Type)</label>
                              <div className="grid grid-cols-3 gap-2 p-1 bg-black/30 rounded-2xl border border-[var(--border-light)]">
                                {[
                                  { id: 'cmj', name: 'عمودي نزول (CMJ)' },
                                  { id: 'sj', name: 'ثبات (SJ)' },
                                  { id: 'dj', name: 'سقوط صندوق (DJ)' }
                                ].map(type => (
                                  <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => { setJumpType(type.id); setShowResults(false); }}
                                    className={`py-2 px-1 text-[10px] font-bold rounded-xl transition-all ${jumpType === type.id ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-[#070a13] shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:text-white bg-transparent'}`}
                                  >
                                    {type.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1 font-bold text-cyan-400">معامل تصحيح الركبة للهبوط</label>
                              <div className="grid grid-cols-5 gap-1 p-1 bg-black/30 rounded-2xl border border-[var(--border-light)]">
                                {[
                                  { id: 'ai_auto', name: '🤖 AI' },
                                  { id: 'none', name: '❌ بدون' },
                                  { id: 'light', name: '⏱️ خفيف' },
                                  { id: 'medium', name: '⏱️ وسط' },
                                  { id: 'heavy', name: '⏱️ شديد' }
                                ].map(mode => (
                                  <button
                                    key={mode.id}
                                    type="button"
                                    onClick={() => setLandingCorrectionMode(mode.id)}
                                    className={`py-1.5 px-0.5 text-[9px] font-bold rounded-lg transition-all ${landingCorrectionMode === mode.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'text-gray-500 hover:text-white bg-transparent border border-transparent'}`}
                                  >
                                    {mode.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {jumpType === 'dj' && (
                            <div className="grid grid-cols-2 gap-4 bg-cyan-950/15 border border-cyan-500/25 p-3 rounded-2xl animate-fade-in text-[10px]">
                              <div>
                                <label className="block text-[9px] text-gray-400 mb-1">ارتفاع الصندوق (cm)</label>
                                <input type="number" value={boxHeight} onChange={e => setBoxHeight(Number(e.target.value))} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-gray-400 mb-1">وقت لمس الأرض ($t_{touchdown}$)</label>
                                <div className="flex gap-2">
                                  <input type="number" step="0.001" value={boxTouchdownTime} onChange={e => setBoxTouchdownTime(Number(e.target.value))} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-2 px-3 text-xs text-white outline-none font-mono" />
                                  <button type="button" onClick={() => setBoxTouchdownTime(currentTime)} className="px-2.5 bg-cyan-500 text-[#070a13] rounded-xl text-xs font-bold shrink-0">هنا 📍</button>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">نوع تصوير الفيديو</label>
                              <div className="grid grid-cols-4 gap-1 p-1 bg-black/30 rounded-2xl border border-[var(--border-light)]">
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
                                    className={`py-2 px-1 text-[10px] font-bold rounded-xl transition-all ${videoPreset === preset.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white bg-transparent border border-transparent'}`}
                                  >
                                    {preset.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">الرجل المستخدمة للقفز</label>
                              <div className="grid grid-cols-3 gap-2 p-1 bg-black/30 rounded-2xl border border-[var(--border-light)]">
                                {[
                                  { id: 'both', name: 'القدمين معاً' },
                                  { id: 'right', name: 'اليمين فقط' },
                                  { id: 'left', name: 'اليسار فقط' }
                                ].map(leg => (
                                  <button
                                    key={leg.id}
                                    type="button"
                                    onClick={() => setLegUsed(leg.id)}
                                    className={`py-2 px-1 text-[10px] font-bold rounded-xl transition-all ${legUsed === leg.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white bg-transparent border border-transparent'}`}
                                  >
                                    {leg.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* FPS Inputs */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] text-gray-400">FPS ملف الفيديو</label>
                                {isFpsAutoDetected && <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded">كشف تلقائي ✓</span>}
                              </div>
                              <input type="number" value={videoFps} onChange={(e) => setVideoFps(Number(e.target.value))} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-[var(--brand-main)]" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1 font-bold">FPS الكاميرا (الفعلي)</label>
                              <input type="number" value={cameraFps} onChange={(e) => setCameraFps(Number(e.target.value))} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-[var(--brand-main)]" />
                            </div>
                          </div>

                          {/* Time Calculation Method & Custom Frame Duration */}
                          <div className="space-y-3 pt-1">
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">طريقة حساب الوقت (Time Calculation)</label>
                              <div className="grid grid-cols-2 gap-2 p-1 bg-black/30 rounded-2xl border border-[var(--border-light)]">
                                {[
                                  { id: 'fps', name: '⏱️ تلقائي من FPS' },
                                  { id: 'manual', name: '✏️ زمن إطار مخصص' }
                                ].map(method => (
                                  <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => {
                                      setTimeCalculationMethod(method.id);
                                      if (method.id === 'fps') {
                                        setIsFrameDurationManual(false);
                                      }
                                    }}
                                    className={`py-2 px-1 text-[10px] font-bold rounded-xl transition-all ${timeCalculationMethod === method.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white bg-transparent border border-transparent'}`}
                                  >
                                    {method.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {timeCalculationMethod === 'manual' && (
                              <div className="bg-cyan-950/10 border border-cyan-500/20 p-3 rounded-2xl animate-fade-in space-y-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-[10px] text-gray-400 font-bold">زمن الإطار الفعلي (ثانية):</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsFrameDurationManual(false);
                                      setManualFrameDuration(parseFloat((1 / cameraFps).toFixed(6)));
                                    }}
                                    className="text-[8px] text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold hover:bg-cyan-900/30"
                                  >
                                    إعادة ضبط للتلقائي ↺
                                  </button>
                                </div>
                                <input
                                  type="number"
                                  step="0.000001"
                                  value={manualFrameDuration}
                                  onChange={(e) => {
                                    setManualFrameDuration(e.target.value);
                                    setIsFrameDurationManual(true);
                                  }}
                                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-2 px-3 text-xs text-white outline-none font-mono focus:border-[var(--brand-main)]"
                                />
                                <p className="text-[8px] text-gray-500 leading-normal">
                                  * لتعديل القفزة في الصورة (مثل 0.033ث بدلاً من 0.0333ث)، اكتب القيمة هنا مباشرة وسيتم تحديث الارتفاع والقوة تلقائياً.
                                </p>
                              </div>
                            )}

                            {/* AI Frame Duration Advisor */}
                            {aiDetectedFrameDuration && (
                              <div className="bg-emerald-950/15 border border-emerald-500/25 p-3 rounded-2xl animate-fade-in flex flex-col gap-1.5 text-right">
                                <div className="flex items-center gap-1.5 text-emerald-400 justify-between">
                                  <div className="flex items-center gap-1.5 flex-row-reverse">
                                    <Sparkles size={14} className="animate-pulse" />
                                    <span className="text-[10px] font-extrabold">مستشار الإطارات الذكي (AI Analyzer)</span>
                                  </div>
                                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">نشط</span>
                                </div>
                                <div className="text-[9px] text-gray-400 leading-normal">
                                  تم قياس الفارق الفعلي بين الإطارات للفيديو تلقائياً بالذكاء الاصطناعي:
                                  <span className="text-white font-mono font-bold block mt-1 text-center bg-black/40 py-1 rounded border border-emerald-500/10">
                                    {aiDetectedFrameDuration} ثانية ({ (1 / aiDetectedFrameDuration).toFixed(2) } إطار/ثانية)
                                  </span>
                                </div>
                                {timeCalculationMethod !== 'manual' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTimeCalculationMethod('manual');
                                      setManualFrameDuration(aiDetectedFrameDuration);
                                      setIsFrameDurationManual(true);
                                    }}
                                    className="w-full mt-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/35 py-1 px-2 rounded-xl text-[9px] font-bold transition-all"
                                  >
                                    ⚡ استخدام زمن الإطار الذكي وتعديله يدوياً
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setManualFrameDuration(aiDetectedFrameDuration);
                                      setIsFrameDurationManual(true);
                                    }}
                                    className="w-full mt-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/35 py-1 px-2 rounded-xl text-[9px] font-bold transition-all"
                                  >
                                    ↺ تعيين قيمة الإطار الذكي المقترحة
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* WhatsApp Compressed Video Warning Tooltip */}
                          <div className="bg-cyan-950/15 border border-cyan-500/25 p-3 rounded-xl flex gap-2">
                             <AlertTriangle className="text-cyan-400 shrink-0" size={16} />
                             <div className="text-[10px] text-gray-400 leading-relaxed">
                                <strong className="text-cyan-400">ملحوظة هامة لفيديوهات واتساب (WhatsApp/Slow-Mo):</strong>
                                <p className="mt-0.5">يقوم واتساب بضغط فيديوهات التصوير البطيء إلى <span className="text-white font-bold">30 FPS</span> مع إطالة زمن الفيديو. في هذه الحالة، يجب ضبط <span className="text-white font-bold">FPS الملف على 30</span> وضبط <span className="text-white font-bold">FPS الكاميرا على معدل التصوير الأصلي (مثال: 240)</span> لتحقيق الدقة الكاملة.</p>
                             </div>
                          </div>

                          {/* Limb & Scale Calibration Helper */}
                          <div className="bg-black/10 border border-[var(--border-light)] p-3.5 rounded-2xl space-y-3">
                            <span className="block text-xs text-cyan-400 font-bold border-b border-[var(--border-light)] pb-1.5 flex items-center gap-1.5 flex-row-reverse">
                              📐 معايرة مقياس الفيديو وطول الرجل
                            </span>
                            
                            <div className="flex items-center gap-2 justify-between">
                              <label className="text-[10px] text-gray-400 shrink-0">طول الرجل المرجعي (m):</label>
                              <input 
                                type="number" 
                                step="0.01" 
                                value={referenceLength} 
                                onChange={(e) => setReferenceLength(Number(e.target.value))} 
                                className="w-20 bg-[var(--bg-input)] border border-[var(--border-color)] p-1 text-xs text-center text-white rounded font-mono" 
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
                                className="w-full py-2 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-cyan-500/30 text-[var(--text-secondary)] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                              >
                                📏 ابدأ معايرة طول الرجل من الفيديو
                              </button>
                            ) : (
                              <div className="bg-cyan-950/20 border border-cyan-500/40 p-2.5 rounded-xl text-center animate-pulse">
                                {calibrationStep === 1 && <p className="text-cyan-400 text-xs font-bold">1️⃣ اضغط على <span className="text-white font-extrabold">مفصل الفخذ (Hip Joint)</span> بالفيديو</p>}
                                {calibrationStep === 2 && <p className="text-cyan-400 text-xs font-bold">2️⃣ اضغط على <span className="text-white font-extrabold">مفصل الكاحل (Ankle Joint)</span> بالفيديو</p>}
                              </div>
                            )}
                          </div>
                          </div>
                          )}

                          {activeSettingsTab === 'anthropometrics' && (
                            <div className="space-y-4 bg-black/10 border border-[var(--border-light)] p-4 rounded-2xl animate-fade-in">
                            <span className="block text-xs text-cyan-400 font-bold border-b border-[var(--border-light)] pb-1.5 text-right">
                              ⚖️ القياسات الأنثروبومترية الحية (Interactive Telemetry)
                            </span>
                            
                            {/* Body Weight Control */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">وزن اللاعب (Body Mass):</span>
                                <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{bodyMass} kg</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button type="button" onClick={() => { setBodyMass(prev => Math.max(40, prev - 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-black flex items-center justify-center">-</button>
                                <input 
                                  type="range" 
                                  min="40" 
                                  max="150" 
                                  step="1" 
                                  value={bodyMass} 
                                  onChange={(e) => { setBodyMass(Number(e.target.value)); setShowResults(false); }} 
                                  className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-main)]" 
                                />
                                <button type="button" onClick={() => { setBodyMass(prev => Math.min(150, prev + 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-black flex items-center justify-center">+</button>
                              </div>
                              {/* Weight Quick Presets */}
                              <div className="flex flex-wrap gap-1.5 justify-center">
                                {[60, 70, 80, 90, 100, 110].map(w => (
                                  <button
                                    key={w}
                                    type="button"
                                    onClick={() => { setBodyMass(w); setShowResults(false); }}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all border ${bodyMass === w ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border-light)] hover:text-white'}`}
                                  >
                                    {w} kg
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Leg Length Control */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">طول الرجل (Leg Length):</span>
                                <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{legLength.toFixed(2)} m</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button type="button" onClick={() => { setLegLength(prev => Math.max(0.5, prev - 0.02)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-black flex items-center justify-center">-</button>
                                <input 
                                  type="range" 
                                  min="0.50" 
                                  max="1.30" 
                                  step="0.01" 
                                  value={legLength} 
                                  onChange={(e) => { setLegLength(Number(e.target.value)); setShowResults(false); }} 
                                  className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-main)]" 
                                />
                                <button type="button" onClick={() => { setLegLength(prev => Math.min(1.30, prev + 0.02)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-black flex items-center justify-center">+</button>
                              </div>
                              {/* Leg Length Quick Presets */}
                              <div className="flex flex-wrap gap-1.5 justify-center">
                                {[0.80, 0.90, 1.00, 1.10, 1.20].map(l => (
                                  <button
                                    key={l}
                                    type="button"
                                    onClick={() => { setLegLength(l); setShowResults(false); }}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all border ${Math.abs(legLength - l) < 0.01 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border-light)] hover:text-white'}`}
                                  >
                                    {l.toFixed(2)} m
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Player Height Control */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">طول اللاعب (Player Height):</span>
                                <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{playerHeight} cm</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button type="button" onClick={() => { handleHeightChange(Math.max(130, playerHeight - 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-black flex items-center justify-center">-</button>
                                <input 
                                  type="range" 
                                  min="130" 
                                  max="220" 
                                  step="1" 
                                  value={playerHeight} 
                                  onChange={(e) => { handleHeightChange(Number(e.target.value)); setShowResults(false); }} 
                                  className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-main)]" 
                                />
                                <button type="button" onClick={() => { handleHeightChange(Math.min(220, playerHeight + 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-black flex items-center justify-center">+</button>
                              </div>
                              {/* Height Quick Presets */}
                              <div className="flex flex-wrap gap-1.5 justify-center">
                                {[160, 170, 180, 190, 200].map(h => (
                                  <button
                                    key={h}
                                    type="button"
                                    onClick={() => { handleHeightChange(h); setShowResults(false); }}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all border ${playerHeight === h ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border-light)] hover:text-white'}`}
                                  >
                                    {h} cm
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Standing Reach Control */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400">الوصول من الثبات (Standing Reach):</span>
                                <span className="font-mono font-black text-white bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">{standingReach} cm</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button type="button" onClick={() => { handleStandingReachChange(Math.max(150, standingReach - 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-black flex items-center justify-center">-</button>
                                <input 
                                  type="range" 
                                  min="150" 
                                  max="300" 
                                  step="1" 
                                  value={standingReach} 
                                  onChange={(e) => { handleStandingReachChange(Number(e.target.value)); setShowResults(false); }} 
                                  className="flex-1 h-1.5 bg-[var(--bg-input)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-main)]" 
                                />
                                <button type="button" onClick={() => { handleStandingReachChange(Math.min(300, standingReach + 1)); setShowResults(false); }} className="w-8 h-8 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-white font-black flex items-center justify-center">+</button>
                              </div>
                              {/* Standing Reach Quick Presets */}
                              <div className="flex flex-wrap gap-1.5 justify-center">
                                {[210, 225, 240, 255, 270].map(r => (
                                  <button
                                    key={r}
                                    type="button"
                                    onClick={() => { handleStandingReachChange(r); setShowResults(false); }}
                                    className={`px-3 py-1 rounded-lg text-[9px] font-bold transition-all border ${standingReach === r ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border-light)] hover:text-white'}`}
                                  >
                                    {r} cm
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          )}

                          <button onClick={handleAnalyze} className="w-full btn-orange-gradient py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                             <Activity size={18} /> استخراج وتحليل النتائج ميكانيكياً
                          </button>
                        </div>

                        {/* Display calculations outputs */}
                        <div className="bg-black/20 p-5 rounded-3xl border border-[var(--border-light)] flex-1 flex flex-col justify-start space-y-4 min-h-[300px] overflow-y-auto custom-scrollbar">
                          {!showResults ? (
                            <div className="text-center text-gray-500 flex flex-col items-center justify-center py-16 gap-2">
                              <Activity size={40} className="opacity-20 animate-pulse text-[var(--brand-main)]" />
                              <p className="text-sm font-bold leading-relaxed px-4">يرجى تحديد أوقات القفز ثم الضغط على "استخراج وتحليل النتائج" لتوليد الأرقام الميكانيكية المعيارية.</p>
                            </div>
                          ) : (
                            <div className="space-y-5 animate-fade-in text-right">
                              <div className="flex justify-between items-center border-b border-cyan-500/25 pb-2">
                                <div className="text-xs font-bold text-cyan-400">
                                  🚀 شاشة نتائج الـ Cockpit HUD البيوميكانيكية
                                </div>
                                <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-cyan-500/20">
                                  <button
                                    type="button"
                                    onClick={() => setDisplayUnit('cm')}
                                    className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all duration-200 ${displayUnit === 'cm' ? 'bg-cyan-500 text-[#070a13] shadow shadow-cyan-500/30' : 'text-gray-400 hover:text-white bg-transparent'}`}
                                  >
                                    سم (Cm)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDisplayUnit('in')}
                                    className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all duration-200 ${displayUnit === 'in' ? 'bg-cyan-500 text-[#070a13] shadow shadow-cyan-500/30' : 'text-gray-400 hover:text-white bg-transparent'}`}
                                  >
                                    بوصة (Inches)
                                  </button>
                                </div>
                              </div>
                              
                              {/* Main Circular HUD Altometer */}
                              <div className="flex flex-col items-center justify-center p-6 bg-black/40 rounded-3xl border border-cyan-500/30 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none animate-pulse"></div>
                                
                                <div className="relative w-44 h-44 flex items-center justify-center">
                                  <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="88" cy="88" r="72" fill="none" stroke="rgba(6,182,212,0.08)" strokeWidth="12" />
                                    <circle 
                                      cx="88" 
                                      cy="88" 
                                      r="72" 
                                      fill="none" 
                                      stroke="url(#cyanTealGradient)" 
                                      strokeWidth="12" 
                                      strokeLinecap="round"
                                      strokeDasharray={452}
                                      strokeDashoffset={452 - (452 * Math.min(1.0, (jumpType === 'dj' ? parseFloat(stats.rsi || 0)/4.0 : parseFloat(stats.heightCm)/100)))} 
                                      style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                                    />
                                    <defs>
                                      <linearGradient id="cyanTealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#00f5d4" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                      </linearGradient>
                                    </defs>
                                  </svg>
                                  
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                      {jumpType === 'dj' ? 'مؤشر RSI القوة' : 'ارتفاع القفزة'}
                                    </span>
                                    <span className="text-3xl font-black text-white drop-shadow-[0_0_10px_rgba(0,245,212,0.6)] font-mono my-1">
                                      {jumpType === 'dj' ? (
                                        <AnimatedCounter value={stats.rsi || 0} decimals={2} />
                                      ) : (
                                        <AnimatedCounter value={displayUnit === 'in' ? stats.heightInches : stats.heightCm} decimals={1} />
                                      )}
                                    </span>
                                    <span className="text-xs text-cyan-400 font-bold">
                                      {jumpType === 'dj' ? 'Score' : (displayUnit === 'in' ? 'Inches' : 'Cm')}
                                    </span>
                                  </div>
                                </div>

                                {jumpType === 'dj' && (
                                  <div className="mt-4 text-xs font-bold text-center bg-cyan-950/40 px-3 py-1 rounded-xl border border-cyan-500/20 text-cyan-400 animate-pulse">
                                    RSI = {stats.rsi} (معدل القفز السريع)
                                  </div>
                                )}
                              </div>

                              {/* Secondary HUD gauges: Power and flight details */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-black/30 p-3 rounded-2xl border border-[var(--border-light)] flex flex-col items-center justify-center text-center relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-cyan-400 m-2 animate-ping"></div>
                                  <span className="block text-[10px] text-gray-400 mb-1 font-bold">القدرة القصوى (Power)</span>
                                  <span className="text-xl font-black text-white font-mono">
                                    <AnimatedCounter value={parseFloat(stats.harmanPeakPower) > 0 ? stats.harmanPeakPower : parseFloat(stats.meanPower)*2.1} decimals={0} />
                                    <span className="text-[10px] text-cyan-400 font-bold mr-1">W</span>
                                  </span>
                                  <span className="text-[9px] text-gray-500 mt-0.5">Harman Model</span>
                                </div>

                                <div className="bg-black/30 p-3 rounded-2xl border border-[var(--border-light)] flex flex-col items-center justify-center text-center">
                                  <span className="block text-[10px] text-gray-400 mb-1 font-bold">سرعة الإقلاع (Velocity)</span>
                                  <span className="text-xl font-black text-white font-mono">
                                    <AnimatedCounter value={stats.takeoffVelocity} decimals={2} />
                                    <span className="text-[10px] text-cyan-400 font-bold mr-1">m/s</span>
                                  </span>
                                  <span className="text-[9px] text-gray-500 mt-0.5">Takeoff Speed</span>
                                </div>
                              </div>

                              {/* Sayers/Harman Power comparison metrics */}
                              <div className="bg-black/30 p-4 rounded-xl border border-[var(--border-light)] space-y-2 text-sm">
                                <span className="block text-[10px] text-cyan-400 font-bold border-b border-cyan-500/25 pb-1">نماذج القدرة الميكانيكية والتسارع (Power & Acceleration)</span>
                                <div className="flex justify-between">
                                  <span className="text-gray-400 font-bold">Sayers Peak Power:</span>
                                  <span className="font-mono font-black text-white">{stats.sayersPeakPower} W</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400 font-bold">Harman Peak Power:</span>
                                  <span className="font-mono font-black text-white">{stats.harmanPeakPower} W</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400 font-bold">عجلة الدفع للأرض (a_push):</span>
                                  <span className="font-mono font-black text-cyan-400">{stats.pushAcceleration} m/s²</span>
                                </div>
                                {activeCorrectionMs > 0 && (
                                  <div className="flex justify-between border-t border-gray-700/50 pt-1.5 mt-1.5 text-xs">
                                    <span className="text-cyan-400 font-bold">خصم ثني الركبة المطبق:</span>
                                    <span className="font-mono font-black text-white">-{activeCorrectionMs} ms</span>
                                  </div>
                                )}
                              </div>

                              {/* SVG Biomechanical displacement chart */}
                              {jumpPhases?.points && jumpPhases.points.length > 5 && (
                                <div className="bg-black/40 border border-[var(--border-light)] p-3.5 rounded-2xl space-y-2.5">
                                  <span className="block text-[10px] text-cyan-400 font-bold border-b border-cyan-500/25 pb-1 flex justify-between">
                                    <span>منحنى إزاحة الفخذ العمودية (Hip displacement)</span>
                                    <span className="text-[9px] text-gray-400">الارتفاع بالـ AI: {jumpPhases.apex?.displacementCm?.toFixed(1)} cm</span>
                                  </span>
                                  <div className="w-full h-32 relative">
                                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                      <line x1="0" y1="80" x2="100" y2="80" stroke="#4b5563" strokeWidth="0.5" strokeDasharray="2,2" />
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
                                          <path d={d} fill="none" stroke="#00f5d4" strokeWidth="2" />
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
                                            <circle key={label} cx={x} cy={y} r="3.5" fill={color} stroke="#ffffff" strokeWidth="0.5" />
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
                                  <div className="flex justify-between text-[8px] text-gray-500">
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]"></span> البداية</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#a855f7]"></span> القرفصاء</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]"></span> الإقلاع</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span> القمة</span>
                                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span> الهبوط</span>
                                  </div>
                                </div>
                              )}

                              {/* Phase Breakdown Table */}
                              {jumpPhases && (
                                <div className="bg-black/30 border border-[var(--border-light)] p-3 rounded-2xl text-[10px] space-y-1.5">
                                  <span className="block text-[10px] text-cyan-400 font-bold border-b border-cyan-500/25 pb-1">جدول تحليل مراحل القفزة (Phase breakdown)</span>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-right border-collapse">
                                      <thead>
                                        <tr className="border-b border-gray-700/50 text-gray-400">
                                          <th className="pb-1 font-bold">المرحلة</th>
                                          <th className="pb-1 font-bold text-center">الإطار (Frame)</th>
                                          <th className="pb-1 font-bold text-center">الزمن (s)</th>
                                          <th className="pb-1 font-bold text-center">زاوية الركبة</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-800/40 text-white">
                                        {jumpType === 'dj' && jumpPhases.boxTouchdown && (
                                          <tr>
                                            <td className="py-1.5 font-bold text-blue-400">هبوط الصندوق 🛬</td>
                                            <td className="py-1.5 text-center font-mono">{jumpPhases.boxTouchdown.frame}</td>
                                            <td className="py-1.5 text-center font-mono">{jumpPhases.boxTouchdown.time.toFixed(3)}s</td>
                                            <td className="py-1.5 text-center font-mono">-</td>
                                          </tr>
                                        )}
                                        {jumpType !== 'sj' && (
                                          <tr>
                                            <td className="py-1.5 font-bold text-[#38bdf8]">بدء النزول 📉</td>
                                            <td className="py-1.5 text-center font-mono">{jumpPhases.movementStart.frame}</td>
                                            <td className="py-1.5 text-center font-mono">{jumpPhases.movementStart.time.toFixed(3)}s</td>
                                            <td className="py-1.5 text-center font-mono">{jumpPhases.movementStart.kneeAngle.toFixed(0)}°</td>
                                          </tr>
                                        )}
                                        {jumpType !== 'sj' && (
                                          <tr>
                                            <td className="py-1.5 font-bold text-purple-400">أقصى قرفصاء 🧘</td>
                                            <td className="py-1.5 text-center font-mono">{jumpPhases.deepestSquat.frame}</td>
                                            <td className="py-1.5 text-center font-mono">{jumpPhases.deepestSquat.time.toFixed(3)}s</td>
                                            <td className="py-1.5 text-center font-mono">{jumpPhases.deepestSquat.kneeAngle.toFixed(0)}°</td>
                                          </tr>
                                        )}
                                        <tr>
                                          <td className="py-1.5 font-bold text-cyan-400">لحظة الإقلاع 🚀</td>
                                          <td className="py-1.5 text-center font-mono">{jumpPhases.takeoff.frame}</td>
                                          <td className="py-1.5 text-center font-mono">{jumpPhases.takeoff.time.toFixed(3)}s</td>
                                          <td className="py-1.5 text-center font-mono">{jumpPhases.takeoff.kneeAngle.toFixed(0)}°</td>
                                        </tr>
                                        <tr>
                                          <td className="py-1.5 font-bold text-[#10b981]">قمة الارتفاع ⛰️</td>
                                          <td className="py-1.5 text-center font-mono">{jumpPhases.apex.frame}</td>
                                          <td className="py-1.5 text-center font-mono">{jumpPhases.apex.time.toFixed(3)}s</td>
                                          <td className="py-1.5 text-center font-mono">{jumpPhases.apex.kneeAngle.toFixed(0)}°</td>
                                        </tr>
                                        <tr>
                                          <td className="py-1.5 font-bold text-red-400">ملامسة الأرض 👣</td>
                                          <td className="py-1.5 text-center font-mono">{jumpPhases.landing.frame}</td>
                                          <td className="py-1.5 text-center font-mono">{jumpPhases.landing.time.toFixed(3)}s</td>
                                          <td className="py-1.5 text-center font-mono">{jumpPhases.landing.kneeAngle.toFixed(0)}°</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Reach Jump comparison tool */}
                              <div className="bg-black/35 border border-[var(--border-light)] p-4 rounded-2xl space-y-3">
                                <span className="block text-[10px] text-cyan-400 font-bold border-b border-cyan-500/25 pb-1 text-right">
                                  📐 أداة مقارنة ارتفاع اللمس (Reach Jump vs. Flight Time)
                                </span>
                                <div className="grid grid-cols-3 gap-2 text-right">
                                  <div>
                                    <label className="block text-[8px] text-gray-400 mb-1">طول اللاعب (cm)</label>
                                    <input
                                      type="number"
                                      value={playerHeight || ''}
                                      onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-1.5 px-2 text-xs text-white outline-none font-mono focus:border-[var(--brand-main)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] text-gray-400 mb-1">الوصول من الثبات (cm)</label>
                                    <input
                                      type="number"
                                      value={standingReach || ''}
                                      onChange={(e) => handleStandingReachChange(parseFloat(e.target.value) || 0)}
                                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-1.5 px-2 text-xs text-white outline-none font-mono focus:border-[var(--brand-main)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] text-gray-400 mb-1">أقصى لمس بالقفز (cm)</label>
                                    <input
                                      type="number"
                                      value={maxTouchHeight}
                                      onChange={(e) => setMaxTouchHeight(parseFloat(e.target.value) || '')}
                                      placeholder="مثال: 314"
                                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-1.5 px-2 text-xs text-white outline-none font-mono focus:border-[var(--brand-main)]"
                                    />
                                  </div>
                                </div>

                                {maxTouchHeight > standingReach && (
                                  <div className="bg-cyan-950/20 border border-cyan-500/30 p-3 rounded-xl animate-fade-in space-y-2 text-right">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-400">قفزة اللمس الفعلية (Reach Jump):</span>
                                      <span className="font-extrabold text-cyan-400 font-mono text-sm">
                                        {(maxTouchHeight - standingReach).toFixed(1)} سم
                                        <span className="text-[10px] text-gray-400 mr-1">
                                          ({((maxTouchHeight - standingReach) / 2.54).toFixed(1)} بوصة)
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-400">ارتفاع طيران مركز الثقل (Flight Time):</span>
                                      <span className="font-extrabold text-white font-mono text-sm">
                                        {parseFloat(stats.heightCm).toFixed(1)} سم
                                        <span className="text-[10px] text-gray-400 mr-1">
                                          ({parseFloat(stats.heightInches).toFixed(1)} بوصة)
                                        </span>
                                      </span>
                                    </div>
                                    <div className="border-t border-cyan-950/50 pt-2 flex justify-between items-center text-xs">
                                      <span className="text-gray-300 font-bold">الفارق بين القياسين:</span>
                                      <span className="font-bold text-amber-400 font-mono">
                                        {Math.abs((maxTouchHeight - standingReach) - parseFloat(stats.heightCm)).toFixed(1)} سم
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Biomechanical Explanation Box */}
                                <div className="bg-amber-950/10 border border-amber-500/20 p-3.5 rounded-xl space-y-1.5 leading-relaxed text-right">
                                  <span className="block text-[10px] text-amber-400 font-extrabold">
                                    💡 إضاءة بيوميكانيكية: لماذا يختلف ارتفاع اللمس عن زمن الطيران؟
                                  </span>
                                  <div className="text-[9px] text-gray-400 space-y-1">
                                    <p>
                                      * <strong>ارتفاع اللمس ({maxTouchHeight && standingReach ? `${(maxTouchHeight - standingReach).toFixed(0)} سم` : "الـ 79 سم مثلاً"}):</strong> يقيس المسافة بين أطراف أصابعك. عند مد ذراع واحدة، يرتفع لوح الكتف ويدور الجذع ويتحول الجسم جانباً، مما يضيف <strong>5 إلى 10 سم</strong> مدى حركة ذراع إضافي دون أن يرتفع مركز ثقلك (الورك) نفس المسافة.
                                    </p>
                                    <p>
                                      * <strong>ارتفاع الطيران ({parseFloat(stats.heightCm) > 0 ? `${parseFloat(stats.heightCm).toFixed(0)} سم` : "الـ 70 سم مثلاً"}):</strong> يقيس الارتفاع الحقيقي لـ <strong>مركز ثقل جسمك (CoM)</strong> بالهواء. إذا قمت بثني ركبتيك قليلاً عند الهبوط لامتصاص الصدمة، فإن القدم تلمس الأرض مبكراً في الكاميرا، فيقل زمن الطيران المحسوب وتظهر النتيجة أقل.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <button onClick={saveMeasurement} disabled={isSaving} className="w-full py-3.5 btn-orange-gradient flex items-center justify-center gap-2">
                                <Save size={18} />
                                {isSaving ? 'جاري الحفظ...' : 'حفظ النتيجة في سجل اللاعب'}
                              </button>
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  </div>
                )}

                {activeTab === 'rsi' && <RSICalculator activePlayer={activePlayer} selectedPlayerId={selectedPlayerId} onSaveSuccess={(newJump) => setPlayerHistory([...playerHistory, newJump])} />}
                {activeTab === 'fvp' && <FVPCalculator activePlayer={activePlayer} selectedPlayerId={selectedPlayerId} />}
                {activeTab === 'vbt' && <VBTCamera />}
                {activeTab === 'profile' && <PlayerProfile activePlayer={activePlayer} playerHistory={playerHistory} />}
              </motion.div>
            ) : (
              <motion.div key="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-panel p-16 text-center text-gray-400 shadow-2xl flex flex-col items-center justify-center transition-colors duration-500">
                <ScanEye size={64} className="text-cyan-500 mb-4 opacity-50 animate-pulse" />
                <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">مرحباً بك في مختبر الأداء 🧪</h2>
                <p className="max-w-md mx-auto leading-relaxed">
                  الرجاء اختيار لاعب من القائمة بالأعلى أو تسجيل لاعب جديد لبدء اختبارات الميكانيكا الحيوية والقدرة الحركية.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      {activePlayer && (
        <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-[var(--bg-panel)] backdrop-blur-md border border-[var(--border-color)] rounded-2xl p-2 flex justify-around items-center shadow-lg shadow-black/40">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'text-[var(--text-secondary)] scale-105 font-bold' 
                    : 'text-gray-400 hover:text-white'}`}
              >
                <Icon size={18} />
                <span className="text-[9px] mt-0.5">{tab.name}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}