import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, LineChart, ScanEye, UserCircle, Edit3, Trash2, Plus, X, Play, Pause, Focus, Save, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, ChevronDown, ChevronUp, Moon, Sun, Award, Info, AlertTriangle, ShieldCheck, Sparkles, Users, Trophy } from 'lucide-react';
import { useJumpMechanics } from './useJumpMechanics';
import { supabase } from './supabaseClient'; 
import PlayerProfile from './PlayerProfile'; 
import RSICalculator from './RSICalculator'; 
import FVPCalculator from './FVPCalculator';
import TeamDashboard from './TeamDashboard';
import JumpTestingConsole from './JumpTestingConsole'; 
import Leaderboard from './Leaderboard';
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
  const [activeTab, setActiveTab] = useState('team'); 
  const [colorMode, setColorMode] = useState('dark'); 

  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [activePlayer, setActivePlayer] = useState(null);
  const [playerHistory, setPlayerHistory] = useState([]);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', birthYear: '', weight: '', leg: '', gender: 'male', height: '', standingReach: '', coachId: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveJumpTag, setSaveJumpTag] = useState('cmj');

  const [coaches, setCoaches] = useState([]);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [newCoachName, setNewCoachName] = useState('');

  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [editPlayerForm, setEditPlayerForm] = useState({ id: '', name: '', birthYear: '', weight: '', leg: '', gender: '', height: '', standingReach: '', coachId: '' });

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
  const [isSeeking, setIsSeeking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const reqRef = useRef(null);
  const timelineTrackRef = useRef(null);
  const lastSeekTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  const seekTimeoutRef = useRef(null);
  const pendingSeekTimeRef = useRef(null);
  const [activeDragType, setActiveDragType] = useState(null);
  const activeDragTypeRef = useRef(null);

  const currentTimeMobileRef = useRef(null);
  const currentFrameMobileRef = useRef(null);
  const currentTimeDesktopRef = useRef(null);
  const currentFrameDesktopRef = useRef(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isMobileSelectorOpen, setIsMobileSelectorOpen] = useState(false);
  const [expandedCoaches, setExpandedCoaches] = useState({ unassigned: true });

  const toggleCoachSelector = (coachId) => {
    setExpandedCoaches(prev => ({
      ...prev,
      [coachId]: !prev[coachId]
    }));
  };


  const updatePositionFromClientX = (clientX, type) => {
    const track = timelineTrackRef.current;
    if (!track || !duration) return;
    
    const rect = track.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl' || window.getComputedStyle(track).direction === 'rtl';
    
    const pct = rtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
    const clampedPct = Math.max(0, Math.min(1, pct));
    const targetTime = clampedPct * duration;
    
    // Apply safe time boundaries to prevent Safari freeze/0-seek bugs
    const safeTime = Math.max(0.01, Math.min(targetTime, duration - 0.01));
    
    if (type === 'takeoff') {
      setTakeoffTime(safeTime);
      setShowResults(false);
    } else if (type === 'landing') {
      setLandingTime(safeTime);
      setShowResults(false);
    } else if (type === 'touchdown') {
      setBoxTouchdownTime(safeTime);
      setShowResults(false);
    }
    
    setCurrentTime(safeTime);
    performSeek(safeTime);
  };

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
      console.warn("Safety timeout seek reset");
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

  const processPointerPosition = (e, type) => {
    updatePositionFromClientX(e.clientX, type);
  };

  const handleTimelinePointerDown = (e, type) => {
    if (!duration) return;
    e.preventDefault();
    
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    setIsDragging(true);
    setActiveDragType(type);
    activeDragTypeRef.current = type;
    
    processPointerPosition(e, type);
  };

  const handleTimelinePointerMove = (e) => {
    const type = activeDragTypeRef.current;
    if (!type) return;
    e.preventDefault();
    processPointerPosition(e, type);
  };

  const handleTimelinePointerUp = (e) => {
    const type = activeDragTypeRef.current;
    if (!type) return;
    e.preventDefault();
    
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    
    setIsDragging(false);
    setActiveDragType(null);
    activeDragTypeRef.current = null;
    
    if (videoRef.current) {
      isSeekingRef.current = false;
      setIsSeeking(false);
      pendingSeekTimeRef.current = null;
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
      
      let snapTime = currentTime;
      if (type === 'takeoff') snapTime = takeoffTime;
      else if (type === 'landing') snapTime = landingTime;
      else if (type === 'touchdown') snapTime = boxTouchdownTime;
      
      const safeTime = Math.max(0.01, Math.min(snapTime, duration - 0.01));
      
      try {
        const video = videoRef.current;
        video.currentTime = safeTime;
        if (video.paused) {
          video.play().then(() => {
            if (videoRef.current) videoRef.current.pause();
          }).catch(() => {});
        }
      } catch (err) {
        console.error("Snap seek error:", err);
      }
    }
  };

  // Touch event dragging listeners for iOS Safari support
  useEffect(() => {
    const track = timelineTrackRef.current;
    if (!track) return;

    const getTouchPosition = (e) => {
      if (!e.touches || e.touches.length === 0) return null;
      return e.touches[0].clientX;
    };

    const handleTouchStart = (e) => {
      if (!duration) return;
      
      const target = e.target.closest('[data-timeline-handle]');
      const type = target ? target.getAttribute('data-timeline-handle') : 'playhead';
      
      e.preventDefault();
      
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      
      setIsDragging(true);
      setActiveDragType(type);
      activeDragTypeRef.current = type;
      
      const clientX = getTouchPosition(e);
      if (clientX !== null) {
        updatePositionFromClientX(clientX, type);
      }
    };

    const handleTouchMove = (e) => {
      const type = activeDragTypeRef.current;
      if (!type) return;
      
      e.preventDefault();
      
      const clientX = getTouchPosition(e);
      if (clientX !== null) {
        updatePositionFromClientX(clientX, type);
      }
    };

    const handleTouchEnd = (e) => {
      const type = activeDragTypeRef.current;
      if (!type) return;
      
      e.preventDefault();
      
      setIsDragging(false);
      setActiveDragType(null);
      activeDragTypeRef.current = null;
      
      if (videoRef.current) {
        isSeekingRef.current = false;
        setIsSeeking(false);
        pendingSeekTimeRef.current = null;
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
          seekTimeoutRef.current = null;
        }
        
        let snapTime = currentTime;
        if (type === 'takeoff') snapTime = takeoffTime;
        else if (type === 'landing') snapTime = landingTime;
        else if (type === 'touchdown') snapTime = boxTouchdownTime;
        
        const safeTime = Math.max(0.01, Math.min(snapTime, duration - 0.01));
        
        try {
          const video = videoRef.current;
          video.currentTime = safeTime;
          if (video.paused) {
            video.play().then(() => {
              if (videoRef.current) videoRef.current.pause();
            }).catch(() => {});
          }
        } catch (err) {}
      }
    };

    track.addEventListener('touchstart', handleTouchStart, { passive: false });
    track.addEventListener('touchmove', handleTouchMove, { passive: false });
    track.addEventListener('touchend', handleTouchEnd, { passive: false });
    track.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      track.removeEventListener('touchstart', handleTouchStart);
      track.removeEventListener('touchmove', handleTouchMove);
      track.removeEventListener('touchend', handleTouchEnd);
      track.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [duration, takeoffTime, landingTime, boxTouchdownTime, currentTime]);
  
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

  useEffect(() => {
    fetchPlayers();
    fetchCoaches();
  }, []);

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

  const fetchCoaches = async () => {
    const { data, error } = await supabase.from('lab_coaches').select('*').order('created_at', { ascending: false });
    if (!error && data) setCoaches(data);
  };

  const handleRegisterCoach = async (e) => {
    if (e) e.preventDefault();
    if (!newCoachName.trim()) return alert("برجاء إدخال اسم المدرب.");
    const { data, error } = await supabase.from('lab_coaches').insert([{ full_name: newCoachName.trim() }]).select();
    if (!error && data) {
      setCoaches([data[0], ...coaches]);
      setNewCoachName('');
      setShowCoachModal(false);
      alert("✅ تم تسجيل المدرب بنجاح!");
    } else if (error) {
      alert("خطأ في تسجيل المدرب: " + error.message);
    }
  };

  const renderPlayerOptions = () => {
    const grouped = {};
    coaches.forEach(coach => {
      grouped[coach.id] = {
        name: coach.full_name,
        players: []
      };
    });
    
    const unassigned = [];
    
    players.forEach(player => {
      if (player.coach_id && grouped[player.coach_id]) {
        grouped[player.coach_id].players.push(player);
      } else {
        unassigned.push(player);
      }
    });

    const elements = [];
    
    coaches.forEach(coach => {
      const group = grouped[coach.id];
      if (group && group.players.length > 0) {
        elements.push(
          <optgroup key={coach.id} label={coach.full_name} className="text-gray-900 bg-white font-bold">
            {group.players.map(p => (
              <option key={p.id} value={p.id} className="text-gray-900 bg-white font-normal">{p.full_name}</option>
            ))}
          </optgroup>
        );
      }
    });
    
    if (unassigned.length > 0) {
      elements.push(
        <optgroup key="unassigned" label="لاعبون بدون مدرب" className="text-gray-900 bg-white font-bold">
          {unassigned.map(p => (
            <option key={p.id} value={p.id} className="text-gray-900 bg-white font-normal">{p.full_name}</option>
          ))}
        </optgroup>
      );
    }
    
    return elements;
  };

  const getPlayerAge = (dobString) => { return dobString ? new Date().getFullYear() - new Date(dobString).getFullYear() : 0; };

  const handlePlayerSelect = async (e) => {
    const id = e.target.value;
    setSelectedPlayerId(id); 
    setShowResults(false); setIsEditingPlayer(false); setTakeoffTime(0); setLandingTime(0); setVideoSrc(null); setAiEnabled(false);
    if (id) {
      const player = players.find(p => p.id === id);
      setActivePlayer(player); setBodyMass(player.weight_kg); setLegLength(player.leg_length_m); fetchPlayerHistory(id);
    } else { setActivePlayer(null); setPlayerHistory([]); setActiveTab('team'); }
  };

  const handleSelectPlayerFromDashboard = (player) => {
    setSelectedPlayerId(player.id);
    setActivePlayer(player);
    setBodyMass(player.weight_kg);
    setLegLength(player.leg_length_m);
    fetchPlayerHistory(player.id);
    setShowResults(false);
    setIsEditingPlayer(false);
    setTakeoffTime(0);
    setLandingTime(0);
    setVideoSrc(null);
    setAiEnabled(false);
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
    const coachId = newPlayer.coachId || null;
    const { data, error } = await supabase.from('lab_players').insert([{ 
      full_name: newPlayer.name, 
      date_of_birth: formattedDate, 
      weight_kg: weight, 
      leg_length_m: legLen, 
      gender: newPlayer.gender,
      coach_id: coachId 
    }]).select();
    if (!error && data) {
      const createdPlayer = data[0];
      if (newPlayer.height) localStorage.setItem(`player_height_${createdPlayer.id}`, newPlayer.height);
      if (newPlayer.standingReach) localStorage.setItem(`standing_reach_${createdPlayer.id}`, newPlayer.standingReach);
      
      setPlayers([createdPlayer, ...players]); setSelectedPlayerId(createdPlayer.id); setActivePlayer(createdPlayer);
      setBodyMass(createdPlayer.weight_kg); setLegLength(createdPlayer.leg_length_m);
      setPlayerHistory([]); setShowResults(false); setTakeoffTime(0); setLandingTime(0); setVideoSrc(null); setAiEnabled(false);
      setShowNewPlayerForm(false); setNewPlayer({ name: '', birthYear: '', weight: '', leg: '', gender: 'male', height: '', standingReach: '', coachId: '' });
    } else if (error) { alert("خطأ في تسجيل اللاعب: " + error.message); }
  };

  const handleDeletePlayer = async (idToUse = null, nameToUse = null) => {
    const id = idToUse || (activePlayer ? activePlayer.id : null);
    const name = nameToUse || (activePlayer ? activePlayer.full_name : '');
    if (!id) return;
    if (window.confirm(`هل أنت متأكد من مسح اللاعب "${name}" وكل سجلاته؟`)) {
      const { error } = await supabase.from('lab_players').delete().eq('id', id);
      if (!error) {
        setPlayers(players.filter(p => p.id !== id));
        if (selectedPlayerId === id || (activePlayer && activePlayer.id === id)) {
          setSelectedPlayerId('');
          setActivePlayer(null);
          setPlayerHistory([]);
        }
        setIsEditingPlayer(false);
        setActiveTab('team');
      } else {
        alert("خطأ في حذف اللاعب: " + error.message);
      }
    }
  };

  const handleEditPlayer = (player) => {
    const pHeight = localStorage.getItem(`player_height_${player.id}`) || '180';
    const pStandingReach = localStorage.getItem(`standing_reach_${player.id}`) || '230';
    setEditPlayerForm({ 
      id: player.id, 
      name: player.full_name, 
      birthYear: player.date_of_birth ? player.date_of_birth.substring(0, 4) : '', 
      weight: player.weight_kg, 
      leg: player.leg_length_m, 
      gender: player.gender,
      height: pHeight,
      standingReach: pStandingReach,
      coachId: player.coach_id || ''
    });
    setIsEditingPlayer(true);
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    const weight = parseFloat(editPlayerForm.weight) || 0; 
    const legLen = parseFloat(editPlayerForm.leg) || 0;
    if (weight <= 0 || legLen <= 0) return alert("برجاء إدخال الأرقام بشكل صحيح.");
    const formattedDate = `${editPlayerForm.birthYear}-01-01`;
    const coachId = editPlayerForm.coachId || null;
    const { data, error } = await supabase.from('lab_players').update({ 
      full_name: editPlayerForm.name, 
      date_of_birth: formattedDate, 
      weight_kg: weight, 
      leg_length_m: legLen, 
      gender: editPlayerForm.gender,
      coach_id: coachId
    }).eq('id', editPlayerForm.id).select();
    if (!error && data) {
      const updatedPlayer = data[0];
      localStorage.setItem(`player_height_${updatedPlayer.id}`, editPlayerForm.height);
      localStorage.setItem(`standing_reach_${updatedPlayer.id}`, editPlayerForm.standingReach);
      
      if (activePlayer && activePlayer.id === updatedPlayer.id) {
        setActivePlayer(updatedPlayer); 
        setBodyMass(updatedPlayer.weight_kg); 
        setLegLength(updatedPlayer.leg_length_m);
        setPlayerHeight(parseFloat(editPlayerForm.height) || 180);
        setStandingReach(parseFloat(editPlayerForm.standingReach) || 230);
      }
      
      setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)); 
      setIsEditingPlayer(false);
    } else if (error) {
      alert("خطأ في تعديل بيانات اللاعب: " + error.message);
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
  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        if (videoRef.current.currentTime >= duration - 0.1) {
          const startSafeTime = 0.01;
          videoRef.current.currentTime = startSafeTime;
          setCurrentTime(startSafeTime);
        }
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };
  const handleTimeUpdate = () => { if (isDragging) return; if (videoRef.current) setCurrentTime(videoRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (videoRef.current) setDuration(videoRef.current.duration); };
  const handleSeek = async (e) => {
    if (!videoRef.current) return;
    if (isSeekingRef.current) return;
    const time = Number(e.target.value);
    const video = videoRef.current;
    video.pause();
    setIsPlaying(false);
    
    const safeTime = Math.max(0.01, Math.min(time, duration - 0.01));
    
    isSeekingRef.current = true;
    setIsSeeking(true);
    
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      console.warn("Seek timeout safety trigger");
      handleVideoSeeked();
    }, 200);

    try {
      video.currentTime = safeTime;
      setCurrentTime(safeTime);
      
      if (video.paused) {
        video.play().then(() => {
          if (videoRef.current) videoRef.current.pause();
        }).catch(() => {});
      }
      
      if (aiEnabled && poseRef.current) {
        await poseRef.current.send({ image: videoRef.current });
      }
    } catch(err) {
      console.error("Seek error:", err);
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = null;
      }
      isSeekingRef.current = false;
      setIsSeeking(false);
    }
  };

  const handleVideoSeeked = async () => {
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
    isSeekingRef.current = false;
    setIsSeeking(false);
    
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // WebKit Paused Video Repaint Style Hack
      try {
        const video = videoRef.current;
        const originalDisplay = video.style.display;
        video.style.display = 'none';
        video.offsetHeight; // Force reflow
        video.style.display = originalDisplay;
      } catch (e) {}

      // iOS Safari paused render workaround: play and pause immediately if no pending seeks
      if (pendingSeekTimeRef.current === null && videoRef.current.paused) {
        try {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              if (videoRef.current) videoRef.current.pause();
            }).catch(() => {});
          }
        } catch (e) {}
      }

      if (aiEnabled && poseRef.current && !isDragging) {
        await poseRef.current.send({ image: videoRef.current });
      }
    }
    
    if (pendingSeekTimeRef.current !== null) {
      const nextTime = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      const video = videoRef.current;
      if (video) {
        isSeekingRef.current = true;
        setIsSeeking(true);
        if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
        seekTimeoutRef.current = setTimeout(() => {
          handleVideoSeeked();
        }, 200);
        try {
          video.currentTime = nextTime;
        } catch (err) {
          console.error("Queue seek error:", err);
          isSeekingRef.current = false;
          setIsSeeking(false);
        }
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
    
    try {
      // Synchronous style repaint hack inside user gesture context
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
    
    let finalTestType = saveJumpTag;
    if (jumpType === 'dj') {
      finalTestType = 'rsi';
    }

    const { data, error } = await supabase.from('lab_jump_measurements').insert([ { 
      player_id: selectedPlayerId, 
      test_type: finalTestType, 
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
    { id: 'team', name: 'Roster Dashboard', icon: Users },
    { id: 'calculator', name: 'Vertical Jump', icon: Activity },
    { id: 'rsi', name: 'RSI Calculator', icon: Zap },
    { id: 'fvp', name: 'FVP Curve', icon: LineChart },
    { id: 'leaderboard', name: 'Leaderboard', icon: Trophy },
    { id: 'profile', name: 'Athlete Profile', icon: UserCircle }
  ];

  return (
    <div data-theme={colorMode} className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4 md:p-6 pb-12 transition-all duration-300 text-shadow-contrast" style={{ direction: "rtl" }}>
      <div className="w-full max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* ================= TOP DYNAMIC CONTROL HUD ================= */}
        <header className="relative z-[110] w-full bg-[var(--bg-panel)] backdrop-blur-md border border-[var(--border-color)] p-4 rounded-3xl flex flex-col lg:flex-row items-center justify-between gap-4 shadow-xl">
          {/* Logo & App Branding */}
          <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <span className="text-xl font-bold font-mono">🧪</span>
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-wide font-mono">The Lab v2.0</h1>
                <p className="text-[10px] text-cyan-400 font-bold">مختبر الأداء الرياضي والميكانيكا الحيوية</p>
              </div>
            </div>
            {/* Color Mode Toggle on Mobile */}
            <button 
              onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')} 
              className="lg:hidden p-2 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white transition-all border border-[var(--border-light)] shadow-sm"
            >
              {colorMode === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
          </div>

          {/* HUD Control Strips */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-end">
            {/* Quick Action: Register Coach */}
            <button
              onClick={() => setShowCoachModal(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-black/35 hover:bg-cyan-600/15 text-cyan-400 border border-cyan-800/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-md transition-all shadow-md"
            >
              <Plus size={14} /> إضافة كابتن
            </button>

            {/* Quick Action: Add Athlete */}
            <button
              onClick={() => setShowNewPlayerForm(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-black/35 hover:bg-cyan-600/15 text-cyan-400 border border-cyan-800/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-md transition-all shadow-md"
            >
              <Plus size={14} /> تسجيل لاعب جديد
            </button>

            {/* Player Accordion Dropdown Selector */}
            <div className="relative w-full sm:w-64 z-[120]">
              <button
                type="button"
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl py-2.5 pr-10 pl-3 outline-none focus:ring-2 focus:ring-[var(--brand-main)] transition-all cursor-pointer font-bold text-right text-xs flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <UserCircle size={16} className="text-gray-400" />
                  {activePlayer ? activePlayer.full_name : '-- اختر رياضي للبدء --'}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isSelectorOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isSelectorOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsSelectorOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1.5 w-full bg-[#0b1429]/95 border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md max-h-72 overflow-y-auto">
                      {coaches.map(coach => {
                        const coachPlayers = players.filter(p => p.coach_id === coach.id);
                        const isExpanded = !!expandedCoaches[coach.id];
                        return (
                          <div key={coach.id} className="border-b border-[var(--border-light)] last:border-b-0">
                            <button
                              type="button"
                              onClick={() => toggleCoachSelector(coach.id)}
                              className="w-full px-3 py-2 bg-black/20 hover:bg-black/40 flex items-center justify-between text-xs font-bold text-cyan-400"
                            >
                              <span>👤 {coach.full_name} ({coachPlayers.length})</span>
                              <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isExpanded && (
                              <div className="bg-black/10 py-1">
                                {coachPlayers.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      handlePlayerSelect({ target: { value: p.id } });
                                      setIsSelectorOpen(false);
                                    }}
                                    className={`w-full px-5 py-2 text-right text-xs hover:bg-cyan-500/10 transition-colors block ${selectedPlayerId === p.id ? 'bg-cyan-500/20 text-white font-extrabold' : 'text-gray-300'}`}
                                  >
                                    {p.full_name}
                                  </button>
                                ))}
                                {coachPlayers.length === 0 && (
                                  <span className="block px-5 py-2 text-[10px] text-gray-500 text-right">لا يوجد لاعبين مسجلين للمدرب</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {players.filter(p => !p.coach_id || !coaches.some(c => c.id === p.coach_id)).length > 0 && (() => {
                        const unassignedPlayers = players.filter(p => !p.coach_id || !coaches.some(c => c.id === p.coach_id));
                        const isExpanded = !!expandedCoaches['unassigned'];
                        return (
                          <div className="border-b border-[var(--border-light)] last:border-b-0">
                            <button
                              type="button"
                              onClick={() => toggleCoachSelector('unassigned')}
                              className="w-full px-3 py-2 bg-black/20 hover:bg-black/40 flex items-center justify-between text-xs font-bold text-gray-400"
                            >
                              <span>👤 لاعبون بدون مدرب ({unassignedPlayers.length})</span>
                              <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            {isExpanded && (
                              <div className="bg-black/10 py-1">
                                {unassignedPlayers.map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      handlePlayerSelect({ target: { value: p.id } });
                                      setIsSelectorOpen(false);
                                    }}
                                    className={`w-full px-5 py-2 text-right text-xs hover:bg-cyan-500/10 transition-colors block ${selectedPlayerId === p.id ? 'bg-cyan-500/20 text-white font-extrabold' : 'text-gray-300'}`}
                                  >
                                    {p.full_name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Desktop Theme Toggle */}
            <button 
              onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')} 
              className="hidden lg:block p-2.5 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-white transition-all border border-[var(--border-light)] shadow-sm"
            >
              {colorMode === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
          </div>
        </header>

        {/* ================= MAIN CONTENT WORKSPACE ================= */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'team' ? (
              <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <TeamDashboard 
                  onSelectPlayer={handleSelectPlayerFromDashboard} 
                  onChangeTab={setActiveTab} 
                  coaches={coaches}
                  onEditPlayer={handleEditPlayer}
                />
              </motion.div>
            ) : activeTab === 'leaderboard' ? (
              <motion.div key="leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                <Leaderboard 
                  onSelectPlayer={handleSelectPlayerFromDashboard} 
                  onChangeTab={setActiveTab} 
                />
              </motion.div>
            ) : activePlayer ? (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                
                {activeTab === 'calculator' && (
                  <JumpTestingConsole
                    activePlayer={activePlayer}
                    selectedPlayerId={selectedPlayerId}
                    onSaveSuccess={(newJump) => setPlayerHistory([...playerHistory, newJump])}
                    displayUnit={displayUnit}
                    setDisplayUnit={setDisplayUnit}
                  />
                )}

                {activeTab === 'rsi' && <RSICalculator activePlayer={activePlayer} selectedPlayerId={selectedPlayerId} onSaveSuccess={(newJump) => setPlayerHistory([...playerHistory, newJump])} />}
                {activeTab === 'fvp' && <FVPCalculator activePlayer={activePlayer} selectedPlayerId={selectedPlayerId} />}
                {activeTab === 'profile' && (
                  <PlayerProfile 
                    activePlayer={activePlayer} 
                    playerHistory={playerHistory} 
                    onHistoryChange={(newHistory) => setPlayerHistory(newHistory)} 
                  />
                )}
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

      {/* ================= FLOATING GLASSMORPHIC DOCK NAVIGATION ================= */}
      <nav className="mt-8 mb-6 mx-auto w-fit bg-[#0a1224]/85 backdrop-blur-xl border border-[var(--border-color)] rounded-full px-6 py-2.5 flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative z-[100]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = tab.id !== 'team' && tab.id !== 'leaderboard' && !activePlayer;
          return (
            <button
              key={tab.id}
              disabled={isDisabled}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center px-4 py-1 rounded-2xl transition-all duration-300 select-none
                ${isActive 
                  ? 'text-cyan-400 scale-110 font-black' 
                  : isDisabled 
                    ? 'text-gray-600 cursor-not-allowed opacity-30' 
                    : 'text-gray-400 hover:text-white hover:scale-105'}`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-1 font-bold">{tab.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-dock-indicator"
                  className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* New Athlete Modal Dialog */}
      <AnimatePresence>
        {showNewPlayerForm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in" style={{ direction: 'rtl' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
              <button type="button" onClick={() => setShowNewPlayerForm(false)} className="absolute top-4 left-4 text-gray-400 hover:text-white transition-all bg-black/20 p-2 rounded-full border border-[var(--border-light)]">
                <X size={16} />
              </button>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 mb-4 border-b border-[var(--border-light)] pb-2 flex items-center gap-2">
                <Plus className="text-cyan-400" size={22} /> تسجيل رياضي جديد
              </h2>
              <form onSubmit={handleAddPlayer} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 font-bold">الاسم الكامل</label>
                  <input required type="text" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">سنة الميلاد</label>
                    <input required type="number" min="1950" max={new Date().getFullYear()} value={newPlayer.birthYear} onChange={e => setNewPlayer({...newPlayer, birthYear: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">النوع</label>
                    <select value={newPlayer.gender} onChange={e => setNewPlayer({...newPlayer, gender: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]">
                      <option value="male" className="text-gray-900 bg-white">ذكر</option>
                      <option value="female" className="text-gray-900 bg-white">أنثى</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">الوزن (kg)</label>
                    <input required type="number" step="0.1" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">طول الرجل (م)</label>
                    <input required type="number" step="0.01" value={newPlayer.leg} onChange={e => setNewPlayer({...newPlayer, leg: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">طول اللاعب (cm)</label>
                    <input type="number" value={newPlayer.height} onChange={e => setNewPlayer({...newPlayer, height: e.target.value})} placeholder="مثال: 182" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">الوصول من الثبات (cm)</label>
                    <input type="number" value={newPlayer.standingReach} onChange={e => setNewPlayer({...newPlayer, standingReach: e.target.value})} placeholder="مثال: 235" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 font-bold">المدرب المسؤول</label>
                  <select value={newPlayer.coachId || ''} onChange={e => setNewPlayer({...newPlayer, coachId: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]">
                    <option value="" className="text-gray-900 bg-white">-- بدون مدرب --</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id} className="text-gray-900 bg-white">{c.full_name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full btn-orange-gradient py-3 rounded-xl text-xs font-bold shadow-md flex justify-center items-center gap-1.5"><Save size={14}/> حفظ بيانات اللاعب</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Athlete Modal Dialog */}
      <AnimatePresence>
        {isEditingPlayer && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in" style={{ direction: 'rtl' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
              <button type="button" onClick={() => setIsEditingPlayer(false)} className="absolute top-4 left-4 text-gray-400 hover:text-white transition-all bg-black/20 p-2 rounded-full border border-[var(--border-light)]">
                <X size={16} />
              </button>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 mb-4 border-b border-[var(--border-light)] pb-2 flex items-center gap-2">
                <Edit3 className="text-cyan-400" size={20} /> تعديل بيانات اللاعب
              </h2>
              <form onSubmit={handleUpdatePlayer} className="space-y-4 text-right">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 font-bold">الاسم الكامل</label>
                  <input required type="text" value={editPlayerForm.name} onChange={e => setEditPlayerForm({...editPlayerForm, name: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">سنة الميلاد</label>
                    <input required type="number" min="1950" max={new Date().getFullYear()} value={editPlayerForm.birthYear} onChange={e => setEditPlayerForm({...editPlayerForm, birthYear: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">النوع</label>
                    <select value={editPlayerForm.gender} onChange={e => setEditPlayerForm({...editPlayerForm, gender: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]">
                      <option value="male" className="text-gray-900 bg-white">ذكر</option>
                      <option value="female" className="text-gray-900 bg-white">أنثى</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">الوزن (kg)</label>
                    <input required type="number" step="0.1" value={editPlayerForm.weight} onChange={e => setEditPlayerForm({...editPlayerForm, weight: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">طول الرجل (م)</label>
                    <input required type="number" step="0.01" value={editPlayerForm.leg} onChange={e => setEditPlayerForm({...editPlayerForm, leg: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">طول اللاعب (cm)</label>
                    <input type="number" value={editPlayerForm.height} onChange={e => setEditPlayerForm({...editPlayerForm, height: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1 font-bold">الوصول من الثبات (cm)</label>
                    <input type="number" value={editPlayerForm.standingReach} onChange={e => setEditPlayerForm({...editPlayerForm, standingReach: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1 font-bold">المدرب المسؤول</label>
                  <select value={editPlayerForm.coachId || ''} onChange={e => setEditPlayerForm({...editPlayerForm, coachId: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-2.5 text-xs text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]">
                    <option value="" className="text-gray-900 bg-white">-- بدون مدرب --</option>
                    {coaches.map(c => (
                      <option key={c.id} value={c.id} className="text-gray-900 bg-white">{c.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="submit" className="flex-1 btn-orange-gradient py-3 rounded-xl text-xs font-bold shadow-md flex justify-center items-center gap-1.5"><Save size={14}/> حفظ التعديلات</button>
                  <button type="button" onClick={() => handleDeletePlayer(editPlayerForm.id, editPlayerForm.name)} className="px-4 py-3 rounded-xl text-xs font-bold bg-red-950/40 border border-red-800/40 hover:bg-red-900/40 text-red-400 hover:text-red-300 transition-all flex justify-center items-center gap-1.5"><Trash2 size={14}/> حذف اللاعب</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Dialog Modal */}
      {showCoachModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" style={{ direction: 'rtl' }}>
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowCoachModal(false)} className="absolute top-4 left-4 text-gray-400 hover:text-white transition-all bg-black/20 p-2 rounded-full border border-[var(--border-light)]">
              <X size={16} />
            </button>
            <h2 className="text-lg font-black text-white mb-4 border-b border-[var(--border-light)] pb-2 flex items-center gap-2">
              <Plus className="text-cyan-400" size={20} /> تسجيل مدرب جديد
            </h2>
            <form onSubmit={handleRegisterCoach} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-bold">اسم المدرب الكامل</label>
                <input 
                  required 
                  type="text" 
                  value={newCoachName} 
                  onChange={e => setNewCoachName(e.target.value)} 
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-sm text-[var(--text-primary)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--brand-main)] focus:border-transparent transition-all" 
                  placeholder="مثال: الكابتن أحمد علي"
                />
              </div>
              <button type="submit" className="w-full btn-orange-gradient py-3 rounded-xl font-bold text-sm shadow-lg flex justify-center items-center gap-2">
                <Save size={18} /> حفظ بيانات المدرب
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}