import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, LineChart, ScanEye, UserCircle, Edit3, Trash2, Plus, X, Play, Pause, Focus, Save, ChevronRight, ChevronLeft, Moon, Sun, Flame, Wind } from 'lucide-react';
import { useJumpMechanics } from './useJumpMechanics';
import { supabase } from './supabaseClient'; 
import PlayerProfile from './PlayerProfile'; 
import RSICalculator from './RSICalculator'; 
import FVPCalculator from './FVPCalculator';
import VBTCamera from './VBTCamera'; 

export default function JumpCalculator() {
  const [activeTab, setActiveTab] = useState('calculator'); 
  const [colorMode, setColorMode] = useState('dark'); 
  const [themeStyle, setThemeStyle] = useState('default'); 

  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [activePlayer, setActivePlayer] = useState(null);
  const [playerHistory, setPlayerHistory] = useState([]);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', birthYear: '', weight: '', leg: '', gender: 'male' });
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [editPlayerForm, setEditPlayerForm] = useState({ id: '', name: '', birthYear: '', weight: '', leg: '', gender: '' });

  // === إعدادات الفيديو المتطورة ===
  const [videoPreset, setVideoPreset] = useState('slow240');
  const [cameraFps, setCameraFps] = useState(240);
  const [videoFps, setVideoFps] = useState(30);

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
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  
  const stats = useJumpMechanics(cameraFps, videoFps, takeoffTime, landingTime, bodyMass, legLength);

  const canvasRef = useRef(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const poseRef = useRef(null);
  const flightDataRef = useRef([]); 

  useEffect(() => { fetchPlayers(); }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase.from('players').select('*').order('created_at', { ascending: false });
    if (!error && data) setPlayers(data);
  };

  const getPlayerAge = (dobString) => { return dobString ? new Date().getFullYear() - new Date(dobString).getFullYear() : 0; };

  const handlePlayerSelect = async (e) => {
    const id = e.target.value;
    setSelectedPlayerId(id); setShowResults(false); setIsEditingPlayer(false); 
    if (id) {
      const player = players.find(p => p.id === id);
      setActivePlayer(player); setBodyMass(player.weight_kg); setLegLength(player.leg_length_m); fetchPlayerHistory(id);
    } else { setActivePlayer(null); setPlayerHistory([]); setActiveTab('calculator'); }
  };

  const fetchPlayerHistory = async (id) => {
    const { data, error } = await supabase.from('jump_measurements').select('*').eq('player_id', id).order('created_at', { ascending: true });
    if (!error && data) setPlayerHistory(data);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const weight = parseFloat(newPlayer.weight) || 0; const legLen = parseFloat(newPlayer.leg) || 0;
    if (weight <= 0 || legLen <= 0) return alert("برجاء إدخال الوزن وطول الرجل بشكل صحيح.");
    const formattedDate = `${newPlayer.birthYear}-01-01`;
    const { data, error } = await supabase.from('players').insert([{ full_name: newPlayer.name, date_of_birth: formattedDate, weight_kg: weight, leg_length_m: legLen, gender: newPlayer.gender }]).select();
    if (!error && data) {
      setPlayers([data[0], ...players]); setSelectedPlayerId(data[0].id); setActivePlayer(data[0]);
      setBodyMass(data[0].weight_kg); setLegLength(data[0].leg_length_m);
      setShowNewPlayerForm(false); setNewPlayer({ name: '', birthYear: '', weight: '', leg: '', gender: 'male' });
    }
  };

  const handleDeletePlayer = async () => {
    if (!activePlayer) return;
    if (window.confirm(`هل أنت متأكد من مسح اللاعب "${activePlayer.full_name}" وكل سجلاته؟`)) {
      const { error } = await supabase.from('players').delete().eq('id', activePlayer.id);
      if (!error) { setPlayers(players.filter(p => p.id !== activePlayer.id)); setSelectedPlayerId(''); setActivePlayer(null); setPlayerHistory([]); setActiveTab('calculator'); }
    }
  };

  const handleEditClick = () => {
    setEditPlayerForm({ id: activePlayer.id, name: activePlayer.full_name, birthYear: activePlayer.date_of_birth ? activePlayer.date_of_birth.substring(0, 4) : '', weight: activePlayer.weight_kg, leg: activePlayer.leg_length_m, gender: activePlayer.gender });
    setIsEditingPlayer(true);
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    const weight = parseFloat(editPlayerForm.weight) || 0; const legLen = parseFloat(editPlayerForm.leg) || 0;
    if (weight <= 0 || legLen <= 0) return alert("برجاء إدخال الأرقام بشكل صحيح.");
    const formattedDate = `${editPlayerForm.birthYear}-01-01`;
    const { data, error } = await supabase.from('players').update({ full_name: editPlayerForm.name, date_of_birth: formattedDate, weight_kg: weight, leg_length_m: legLen, gender: editPlayerForm.gender }).eq('id', editPlayerForm.id).select();
    if (!error && data) {
      const updatedPlayer = data[0];
      setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)); setActivePlayer(updatedPlayer); setBodyMass(updatedPlayer.weight_kg); setLegLength(updatedPlayer.leg_length_m); setIsEditingPlayer(false);
    }
  };

  // وظيفة تغيير إعدادات الفيديو السريعة
  const handlePresetChange = (e) => {
    const val = e.target.value;
    setVideoPreset(val);
    if (val === 'slow240') { setCameraFps(240); setVideoFps(30); }
    else if (val === 'slow120') { setCameraFps(120); setVideoFps(30); }
    else if (val === 'normal30') { setCameraFps(30); setVideoFps(30); }
    else if (val === 'normal60') { setCameraFps(60); setVideoFps(60); }
  };

  const handleFileUpload = (e) => { const file = e.target.files[0]; if (file) { setVideoSrc(URL.createObjectURL(file)); setAiEnabled(false); flightDataRef.current = []; } };
  const clearVideo = () => { setVideoSrc(null); setTakeoffTime(0); setLandingTime(0); setCurrentTime(0); setIsPlaying(false); setShowResults(false); setAiEnabled(false); flightDataRef.current = []; };
  const togglePlay = () => { if (videoRef.current) { if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); } else { videoRef.current.pause(); setIsPlaying(false); } } };
  const handleTimeUpdate = () => { if (videoRef.current) setCurrentTime(videoRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (videoRef.current) setDuration(videoRef.current.duration); };
  const handleSeek = async (e) => { const time = Number(e.target.value); if (videoRef.current) { videoRef.current.currentTime = time; setCurrentTime(time); if (aiEnabled && poseRef.current) await poseRef.current.send({ image: videoRef.current }); } };
  const stepFrames = async (frames) => { if (videoRef.current && duration > 0) { videoRef.current.pause(); setIsPlaying(false); const timeStep = frames / (videoFps || 30); let newTime = videoRef.current.currentTime + timeStep; newTime = Math.max(0, Math.min(newTime, duration)); videoRef.current.currentTime = newTime; setCurrentTime(newTime); if (aiEnabled && poseRef.current) await poseRef.current.send({ image: videoRef.current }); } };

  useEffect(() => {
    if (!aiEnabled) return;
    const loadScript = (src) => { return new Promise((resolve) => { if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; } const script = document.createElement('script'); script.src = src; script.crossOrigin = "anonymous"; script.onload = resolve; document.body.appendChild(script); }); };
    const initAI = async () => { await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'); await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js'); const checkInterval = setInterval(() => { if (window.Pose && typeof window.Pose === 'function') { clearInterval(checkInterval); setScriptsLoaded(true); } }, 100); };
    initAI();
  }, [aiEnabled]);

  const reqRef = useRef(null);
  
  useEffect(() => {
    if (!scriptsLoaded || !aiEnabled) return;
    const { Pose, POSE_CONNECTIONS, drawConnectors, drawLandmarks } = window;
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    
    pose.onResults((results) => {
      const canvasCtx = canvasRef.current?.getContext('2d'); if (!canvasCtx || !canvasRef.current) return;
      if (results.image.width && canvasRef.current.width !== results.image.width) { canvasRef.current.width = results.image.width; canvasRef.current.height = results.image.height; }
      canvasCtx.save(); canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#3b82f6', lineWidth: 3 }); 
        drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ffffff', lineWidth: 1 });
        
        const lm = results.poseLandmarks;
        // الاعتماد الأكبر على مشط القدم (Toes 31, 32)
        const feetYPoints = [
          lm[27]?.y || 0, lm[28]?.y || 0, // كاحل
          lm[29]?.y || 0, lm[30]?.y || 0, // كعب
          lm[31]?.y || 0, lm[32]?.y || 0  // مشط القدم (الأهم)
        ].filter(y => y > 0);

        if (feetYPoints.length > 0) {
          const lowestY = Math.max(...feetYPoints); // أسفل نقطة لامسة للأرض
          flightDataRef.current.push({ time: videoRef.current.currentTime, y: lowestY });
        }
      }
      canvasCtx.restore();
    });
    
    poseRef.current = pose;
    let isProcessing = false;
    const processFrame = async () => { const video = videoRef.current; if (video && !video.paused && !video.ended) { if (!isProcessing && video.readyState >= 2) { isProcessing = true; await pose.send({ image: video }); isProcessing = false; } } reqRef.current = requestAnimationFrame(processFrame); };
    processFrame();
    return () => { cancelAnimationFrame(reqRef.current); pose.close(); };
  }, [scriptsLoaded, aiEnabled]);

  const autoDetectJump = () => {
    const data = flightDataRef.current;
    if (data.length < 15) return alert("يرجى تشغيل الفيديو بالكامل أثناء تفعيل الذكاء الاصطناعي لجمع بيانات القفزة.");
    
    let smoothedData = [];
    for(let i=0; i<data.length; i++) {
      let start = Math.max(0, i-2); let end = Math.min(data.length, i+3); let window = data.slice(start, end);
      let avgY = window.reduce((sum, d) => sum + d.y, 0) / window.length; smoothedData.push({ time: data[i].time, y: avgY });
    }

    const sortedY = [...smoothedData].sort((a, b) => b.y - a.y);
    const groundY = sortedY.slice(0, Math.max(5, Math.floor(sortedY.length * 0.02))).reduce((a,b)=>a+b.y, 0) / Math.max(5, Math.floor(sortedY.length * 0.02));
    
    let peakIndex = 0; let peakY = smoothedData[0].y;
    for(let i=1; i<smoothedData.length; i++) { if (smoothedData[i].y < peakY) { peakY = smoothedData[i].y; peakIndex = i; } }

    const jumpHeightPixels = groundY - peakY;
    if (jumpHeightPixels < 0.05) return alert("القفزة غير واضحة أو صغيرة جداً للاكتشاف التلقائي.");

    // حد الإقلاع بقى دقيق جداً (3% بس من الارتفاع عشان يلقط مشط القدم)
    const flightThreshold = groundY - (jumpHeightPixels * 0.03); 

    let tStart = 0; for (let i = peakIndex; i >= 0; i--) { if (smoothedData[i].y >= flightThreshold) { tStart = smoothedData[i].time; break; } }
    let tEnd = 0; for (let i = peakIndex; i < smoothedData.length; i++) { if (smoothedData[i].y >= flightThreshold) { tEnd = smoothedData[i].time; break; } }
    
    const camFps = parseFloat(cameraFps) || 240; const vidFps = parseFloat(videoFps) || 30;
    const timeScaleRatio = vidFps / camFps; const minFlightTimeVideo = 0.15 * timeScaleRatio; 

    if (tStart > 0 && tEnd > 0 && (tEnd - tStart) > minFlightTimeVideo) { 
      setTakeoffTime(tStart); setLandingTime(tEnd); setShowResults(false); videoRef.current.currentTime = tStart; setCurrentTime(tStart); 
      alert("✅ الذكاء الاصطناعي: تم التحديد بدقة (حتى مع الـ Slow-mo)!");
    } else { alert("لم يتم التعرف على قفزة واضحة."); }
  };

  const handleAnalyze = () => { if (takeoffTime === 0 || landingTime === 0) return alert("حدد الإقلاع والهبوط أولاً."); setShowResults(true); };

  const saveMeasurement = async () => {
    if (!selectedPlayerId) return; setIsSaving(true);
    const mass = parseFloat(bodyMass); const g = 9.81; const h_push = parseFloat(legLength) * 0.45; const heightCm = parseFloat(stats?.heightCm || 0);
    const meanForce = mass * g * ((heightCm / 100) / h_push + 1); const peakPower = parseFloat(stats?.meanPower || 0) * 2.1;
    const { data, error } = await supabase.from('jump_measurements').insert([ { player_id: selectedPlayerId, test_type: 'standard', jump_height_cm: stats.heightCm, flight_time_sec: stats.flightTime, takeoff_velocity_ms: stats.takeoffVelocity, mean_power_watts: stats.meanPower, peak_power_watts: peakPower.toFixed(2), mean_force_newtons: meanForce.toFixed(2), leg_used: legUsed } ]).select();
    if (!error && data) { setPlayerHistory([...playerHistory, data[0]]); setShowResults(false); }
    setIsSaving(false);
  };

  const tabs = [
    { id: 'calculator', name: 'القفزة', icon: Activity },
    { id: 'rsi', name: 'RSI', icon: Zap },
    { id: 'fvp', name: 'FVP', icon: LineChart },
    { id: 'vbt', name: 'VBT', icon: ScanEye },
    { id: 'profile', name: 'التقارير', icon: UserCircle }
  ];

  return (
    <div data-theme={`${themeStyle}-${colorMode}`} className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4 md:p-8 transition-colors duration-500" style={{ fontFamily: "'Tajawal', sans-serif", direction: "rtl" }}>
      
      <style>{`
        :root { transition: background-color 0.5s ease, color 0.5s ease; }
        [data-theme="default-dark"] { --bg-base: #0b0f19; --bg-panel: #111827; --bg-surface: #1f2937; --bg-input: #374151; --text-primary: #ffffff; --text-secondary: #9ca3af; --border-color: #4b5563; --border-light: #374151; --brand-main: #2563eb; --brand-hover: #3b82f6; --brand-text: #60a5fa; }
        [data-theme="default-light"] { --bg-base: #f3f4f6; --bg-panel: #ffffff; --bg-surface: #f9fafb; --bg-input: #e5e7eb; --text-primary: #111827; --text-secondary: #4b5563; --border-color: #d1d5db; --border-light: #e5e7eb; --brand-main: #2563eb; --brand-hover: #1d4ed8; --brand-text: #2563eb; }
        [data-theme="haikyuu-dark"] { --bg-base: #0a0a0a; --bg-panel: #171717; --bg-surface: #262626; --bg-input: #404040; --text-primary: #f5f5f5; --text-secondary: #fbd38d; --border-color: #c05621; --border-light: #7c2d12; --brand-main: #ea580c; --brand-hover: #f97316; --brand-text: #fbd38d; }
        [data-theme="haikyuu-light"] { --bg-base: #fff7ed; --bg-panel: #ffffff; --bg-surface: #ffedd5; --bg-input: #fed7aa; --text-primary: #1c1917; --text-secondary: #9a3412; --border-color: #fdba74; --border-light: #ffedd5; --brand-main: #ea580c; --brand-hover: #c05621; --brand-text: #ea580c; }
        [data-theme="gravity-dark"] { --bg-base: #082f49; --bg-panel: #164e63; --bg-surface: #155e75; --bg-input: #0e7490; --text-primary: #ecfeff; --text-secondary: #a5f3fc; --border-color: #06b6d4; --border-light: #0891b2; --brand-main: #0284c7; --brand-hover: #0ea5e9; --brand-text: #67e8f9; }
        [data-theme="gravity-light"] { --bg-base: #f0f9ff; --bg-panel: #ffffff; --bg-surface: #e0f2fe; --bg-input: #bae6fd; --text-primary: #082f49; --text-secondary: #0369a1; --border-color: #7dd3fc; --border-light: #e0f2fe; --brand-main: #0284c7; --brand-hover: #0369a1; --brand-text: #0284c7; }
      `}</style>

      <div className="w-full max-w-6xl mx-auto space-y-6">
        
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-[var(--bg-panel)]/90 backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-colors duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-main)] opacity-10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="w-full md:w-1/3 relative">
              <UserCircle className="absolute right-4 top-3.5 text-[var(--text-secondary)]" size={20} />
              <select value={selectedPlayerId} onChange={handlePlayerSelect} className="w-full bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-2xl py-3 pr-12 pl-4 outline-none focus:ring-2 focus:ring-[var(--brand-main)] transition-all cursor-pointer font-bold appearance-none">
                <option value="">-- اختر اللاعب --</option>
                {players.map(p => (<option key={p.id} value={p.id}>{p.full_name}</option>))}
              </select>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-2 bg-[var(--bg-surface)] p-1.5 rounded-2xl border border-[var(--border-light)]">
               <button onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')} title="تبديل الإضاءة" className="p-2.5 rounded-xl bg-[var(--bg-input)] text-[var(--brand-text)] hover:text-[var(--brand-hover)] transition-all flex items-center shadow-sm">
                 {colorMode === 'dark' ? <Sun size={20}/> : <Moon size={20}/>}
               </button>
               <div className="w-px h-6 bg-[var(--border-color)] mx-1 hidden sm:block"></div>
               <button onClick={() => setThemeStyle('default')} title="The Lab Theme" className={`p-2.5 rounded-xl transition-all ${themeStyle==='default' ? 'bg-[var(--brand-main)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'}`}><Activity size={20}/></button>
               <button onClick={() => setThemeStyle('haikyuu')} title="Haikyuu!! Theme" className={`p-2.5 rounded-xl transition-all ${themeStyle==='haikyuu' ? 'bg-[var(--brand-main)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'}`}><Flame size={20}/></button>
               <button onClick={() => setThemeStyle('gravity')} title="Gravity Theme" className={`p-2.5 rounded-xl transition-all ${themeStyle==='gravity' ? 'bg-[var(--brand-main)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]'}`}><Wind size={20}/></button>
            </div>

            <button onClick={() => setShowNewPlayerForm(!showNewPlayerForm)} className="w-full md:w-auto px-6 py-3 flex items-center justify-center gap-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--brand-text)] rounded-2xl font-bold transition-all shadow-md">
              {showNewPlayerForm ? <><X size={18}/> إلغاء</> : <><Plus size={18}/> تسجيل لاعب</>}
            </button>
          </div>

          <AnimatePresence>
            {showNewPlayerForm && (
              <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={handleAddPlayer} className="mb-6 p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-light)] grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5 overflow-hidden">
                <div className="lg:col-span-2"><label className="text-xs text-[var(--text-secondary)] block mb-1">الاسم الكامل</label><input required type="text" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)] transition-colors" /></div>
                <div><label className="text-xs text-[var(--text-secondary)] block mb-1">سنة الميلاد</label><input required type="number" min="1950" max={new Date().getFullYear()} value={newPlayer.birthYear} onChange={e => setNewPlayer({...newPlayer, birthYear: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" /></div>
                <div><label className="text-xs text-[var(--text-secondary)] block mb-1">النوع</label><select value={newPlayer.gender} onChange={e => setNewPlayer({...newPlayer, gender: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]"><option value="male">ذكر</option><option value="female">أنثى</option></select></div>
                <div><label className="text-xs text-[var(--text-secondary)] block mb-1">الوزن (kg)</label><input required type="number" step="0.1" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" /></div>
                <div><label className="text-xs text-[var(--text-secondary)] block mb-1">طول الرجل (متر)</label><input required type="number" step="0.01" value={newPlayer.leg} onChange={e => setNewPlayer({...newPlayer, leg: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-[var(--text-primary)] rounded-xl outline-none focus:border-[var(--brand-main)]" /></div>
                <div className="lg:col-span-6 mt-2"><button type="submit" className="w-full bg-[var(--brand-main)] hover:bg-[var(--brand-hover)] flex justify-center items-center gap-2 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg"><Save size={20}/> حفظ بيانات اللاعب</button></div>
              </motion.form>
            )}
          </AnimatePresence>

          {activePlayer && !isEditingPlayer && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-4 text-sm items-center mb-8">
              <div className="flex-1 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-light)] flex items-center justify-between min-w-[120px] shadow-inner"><span className="text-[var(--text-secondary)] text-xs">الاسم</span><span className="font-bold text-[var(--text-primary)] text-lg">{activePlayer.full_name}</span></div>
              <div className="flex-1 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-light)] flex items-center justify-between min-w-[100px] shadow-inner"><span className="text-[var(--text-secondary)] text-xs">العمر</span><span className="font-black text-[var(--brand-text)] text-lg">{getPlayerAge(activePlayer.date_of_birth)}</span></div>
              <div className="flex-1 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-light)] flex items-center justify-between min-w-[100px] shadow-inner"><span className="text-[var(--text-secondary)] text-xs">الوزن</span><span className="font-black text-[var(--text-primary)] text-lg">{activePlayer.weight_kg} <span className="text-xs text-[var(--text-secondary)]">kg</span></span></div>
              <div className="flex gap-2">
                <button onClick={handleEditClick} className="p-4 bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[var(--brand-text)] rounded-2xl border border-[var(--border-color)] transition-all"><Edit3 size={18} /></button>
                <button onClick={handleDeletePlayer} className="p-4 bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-red-500 rounded-2xl border border-[var(--border-color)] transition-all"><Trash2 size={18} /></button>
              </div>
            </motion.div>
          )}

          {isEditingPlayer && (
             <form onSubmit={handleUpdatePlayer} className="mb-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--brand-main)]/30">
               <div className="lg:col-span-2"><label className="text-xs text-[var(--brand-text)] block mb-1">تعديل الاسم</label><input required type="text" value={editPlayerForm.name} onChange={e => setEditPlayerForm({...editPlayerForm, name: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-[var(--text-primary)] rounded-xl outline-none" /></div>
               <div><label className="text-xs text-[var(--brand-text)] block mb-1">سنة الميلاد</label><input required type="number" value={editPlayerForm.birthYear} onChange={e => setEditPlayerForm({...editPlayerForm, birthYear: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-[var(--text-primary)] rounded-xl outline-none" /></div>
               <div><label className="text-xs text-[var(--brand-text)] block mb-1">الوزن (kg)</label><input required type="number" step="0.1" value={editPlayerForm.weight} onChange={e => setEditPlayerForm({...editPlayerForm, weight: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-[var(--text-primary)] rounded-xl outline-none" /></div>
               <div><label className="text-xs text-[var(--brand-text)] block mb-1">طول الرجل (m)</label><input required type="number" step="0.01" value={editPlayerForm.leg} onChange={e => setEditPlayerForm({...editPlayerForm, leg: e.target.value})} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] p-3 text-[var(--text-primary)] rounded-xl outline-none" /></div>
               <div className="lg:col-span-6 flex gap-3"><button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl font-bold">تأكيد التعديل</button><button type="button" onClick={() => setIsEditingPlayer(false)} className="px-6 bg-[var(--bg-input)] hover:bg-[var(--border-color)] text-[var(--text-primary)] rounded-xl">إلغاء</button></div>
             </form>
          )}

          {activePlayer && (
            <div className="flex bg-[var(--bg-surface)] p-2 rounded-2xl border border-[var(--border-light)] overflow-x-auto custom-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[110px] flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm transition-all duration-300
                      ${isActive 
                        ? 'bg-[var(--brand-main)] text-white shadow-lg shadow-[var(--brand-main)]/30' 
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-input)]'}`}
                  >
                    <Icon size={20} />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {activePlayer ? (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              
              {activeTab === 'calculator' && (
                <div className="bg-[var(--bg-panel)] backdrop-blur-xl border border-[var(--border-light)] rounded-3xl p-6 shadow-2xl transition-colors duration-500">
                  <div className="mb-8 p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)]">
                    {!videoSrc ? (
                      <div className="flex flex-col md:flex-row gap-4 w-full">
                        <label className="flex-1 cursor-pointer bg-[var(--brand-main)] hover:bg-[var(--brand-hover)] text-white text-center py-6 rounded-2xl font-bold shadow-lg transition-all flex flex-col items-center justify-center gap-2">
                          <input type="file" accept="video/*" capture="environment" onChange={handleFileUpload} ref={cameraInputRef} className="hidden" />
                          <Focus size={32} /> فتح الكاميرا للتصوير
                        </label>
                        <label className="flex-1 cursor-pointer bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-[var(--text-primary)] text-center py-6 rounded-2xl font-bold shadow-lg transition-all flex flex-col items-center justify-center gap-2">
                          <input type="file" accept="video/*" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                          <Play size={32} /> اختيار فيديو من المعرض
                        </label>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center w-full relative">
                        <button onClick={clearVideo} className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 p-2.5 rounded-full text-white z-20 shadow-lg transition-transform hover:scale-110"><X size={18}/></button>
                        
                        <div className="w-full max-w-lg mb-4 flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-2xl border border-[var(--border-color)]">
                           <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2"><ScanEye size={18} className="text-emerald-500"/> التتبع التلقائي</span>
                           <button onClick={() => setAiEnabled(!aiEnabled)} className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${aiEnabled ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}>
                             {aiEnabled ? 'مفعل' : 'تفعيل الذكاء الاصطناعي'}
                           </button>
                        </div>

                        <div className="relative inline-block border-4 border-[var(--border-light)] rounded-2xl overflow-hidden mb-5 shadow-2xl w-full max-w-lg bg-black">
                          <video ref={videoRef} src={videoSrc} playsInline className="w-full h-auto" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
                          {aiEnabled && <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />}
                        </div>
                        
                        <div className="w-full max-w-lg bg-[var(--bg-surface)] p-5 rounded-3xl border border-[var(--border-color)] mb-5 shadow-xl">
                          <div className="flex items-center gap-4 mb-5">
                            <span className="text-xs text-[var(--brand-text)] font-mono bg-[var(--bg-input)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">{currentTime.toFixed(2)}s</span>
                            <input type="range" min="0" max={duration || 0} step="0.001" value={currentTime} onChange={handleSeek} className="w-full h-2 bg-[var(--border-color)] rounded-full appearance-none cursor-pointer accent-[var(--brand-main)]" />
                            <span className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-input)] px-3 py-1.5 rounded-lg">{duration.toFixed(2)}s</span>
                          </div>
                          <div className="flex justify-center items-center gap-3">
                            <button onClick={() => stepFrames(-1)} className="p-3 bg-[var(--bg-input)] hover:bg-[var(--border-color)] rounded-xl text-[var(--text-primary)] transition-colors"><ChevronRight size={20}/></button>
                            <button onClick={togglePlay} className="px-10 py-3.5 bg-[var(--brand-main)] hover:bg-[var(--brand-hover)] rounded-2xl text-white font-bold shadow-lg flex items-center gap-2 transition-transform hover:scale-105">
                              {isPlaying ? <Pause size={20}/> : <Play size={20}/>}
                            </button>
                            <button onClick={() => stepFrames(1)} className="p-3 bg-[var(--bg-input)] hover:bg-[var(--border-color)] rounded-xl text-[var(--text-primary)] transition-colors"><ChevronLeft size={20}/></button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3 w-full max-w-lg justify-center">
                          <button onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }} className="flex-1 py-3 bg-[var(--bg-input)] hover:bg-[var(--brand-main)] text-[var(--text-primary)] hover:text-white border border-[var(--border-color)] rounded-2xl font-bold transition-all">تحديد كإقلاع</button>
                          <button onClick={() => { setLandingTime(currentTime); setShowResults(false); }} className="flex-1 py-3 bg-[var(--bg-input)] hover:bg-[var(--brand-main)] text-[var(--text-primary)] hover:text-white border border-[var(--border-color)] rounded-2xl font-bold transition-all">تحديد كهبوط</button>
                          {aiEnabled && ( <button onClick={autoDetectJump} className="w-full mt-2 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black shadow-lg transition-transform hover:scale-105">⚡ حساب أوتوماتيكي بالذكاء الاصطناعي</button> )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* === إعدادات الكاميرا والـ Slow-Mo === */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-inner">
                    <div className="col-span-2">
                      <label className="block text-xs text-[var(--text-secondary)] mb-1">نوع الفيديو (اختيار سريع)</label>
                      <select value={videoPreset} onChange={handlePresetChange} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-main)] transition-colors">
                        <option value="slow240">Slow-Mo (240 FPS / 8x)</option>
                        <option value="slow120">Slow-Mo (120 FPS / 4x)</option>
                        <option value="normal30">عادي (30 FPS)</option>
                        <option value="normal60">عادي (60 FPS)</option>
                      </select>
                    </div>
                    <div><label className="block text-xs text-[var(--text-secondary)] mb-1">FPS الكاميرا</label><input type="number" value={cameraFps} onChange={(e) => setCameraFps(Number(e.target.value))} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-main)] transition-colors" /></div>
                    <div><label className="block text-xs text-[var(--text-secondary)] mb-1">FPS الملف</label><input type="number" value={videoFps} onChange={(e) => setVideoFps(Number(e.target.value))} className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-main)] transition-colors" /></div>
                  </div>

                  <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] mb-6">
                    <p className="text-center text-[var(--text-secondary)] text-sm mb-4">نوع التوازن الحركي:</p>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => setLegUsed('both')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${legUsed === 'both' ? 'bg-[var(--brand-main)] text-white shadow-lg' : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'}`}>القدمين معاً</button>
                      <button onClick={() => setLegUsed('right')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${legUsed === 'right' ? 'bg-[var(--brand-main)] text-white shadow-lg' : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'}`}>اليمنى فقط</button>
                      <button onClick={() => setLegUsed('left')} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${legUsed === 'left' ? 'bg-[var(--brand-main)] text-white shadow-lg' : 'bg-[var(--bg-input)] text-[var(--text-secondary)]'}`}>اليسرى فقط</button>
                    </div>
                  </div>

                  <div className="flex justify-center mb-8">
                    <button onClick={handleAnalyze} className="px-16 py-4 bg-[var(--brand-main)] hover:bg-[var(--brand-hover)] text-white rounded-2xl font-black text-xl shadow-xl transition-transform hover:scale-105 flex items-center gap-2">
                      <Activity /> استخراج النتائج
                    </button>
                  </div>

                  <AnimatePresence>
                    {showResults && stats && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 border-t border-[var(--border-color)] pt-8">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                          <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-1 bg-[var(--brand-main)]"></div><span className="block text-xs text-[var(--text-secondary)] mb-2">الارتفاع (Cm)</span><span className="text-4xl font-black text-[var(--text-primary)]">{stats.heightCm}</span></div>
                          <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div><span className="block text-xs text-[var(--text-secondary)] mb-2">الارتفاع (In)</span><span className="text-4xl font-black text-[var(--text-primary)]">{stats.heightInches || (stats.heightCm * 0.393701).toFixed(1)}</span></div>
                          <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div><span className="block text-xs text-[var(--text-secondary)] mb-2">الطيران (s)</span><span className="text-4xl font-black text-[var(--text-primary)]">{stats.flightTime}</span></div>
                          <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-1 bg-purple-500"></div><span className="block text-xs text-[var(--text-secondary)] mb-2">السرعة (m/s)</span><span className="text-4xl font-black text-[var(--text-primary)]">{stats.takeoffVelocity}</span></div>
                          <div className="col-span-2 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] relative overflow-hidden"><div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500"></div><span className="block text-xs text-[var(--text-secondary)] mb-2">القدرة (W)</span><span className="text-4xl font-black text-[var(--text-primary)]">{stats.meanPower}</span></div>
                        </div>
                        <button onClick={saveMeasurement} disabled={isSaving} className="w-full py-4 bg-[var(--bg-input)] hover:bg-[var(--brand-main)] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-white rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2">
                          <Save size={20}/> {isSaving ? 'جاري الحفظ...' : 'حفظ النتيجة في ملف اللاعب'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {activeTab === 'rsi' && <RSICalculator activePlayer={activePlayer} selectedPlayerId={selectedPlayerId} onSaveSuccess={(newJump) => setPlayerHistory([...playerHistory, newJump])} />}
              {activeTab === 'fvp' && <FVPCalculator activePlayer={activePlayer} selectedPlayerId={selectedPlayerId} />}
              {activeTab === 'vbt' && <VBTCamera />}
              {activeTab === 'profile' && <PlayerProfile activePlayer={activePlayer} playerHistory={playerHistory} />}
            </motion.div>
          ) : (
            <motion.div key="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-[var(--bg-panel)] border border-[var(--border-light)] rounded-3xl p-16 text-center text-[var(--text-secondary)] shadow-2xl flex flex-col items-center justify-center transition-colors duration-500">
              <ScanEye size={64} className="text-[var(--border-color)] mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">مرحباً بك في The Lab 🧪</h2>
              <p className="max-w-md mx-auto leading-relaxed">يرجى اختيار لاعب من القائمة بالأعلى أو تسجيل لاعب جديد لبدء جلسة التحليل والميكانيكا الحيوية.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}