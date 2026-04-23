import React, { useState, useEffect, useRef } from 'react';
import { useJumpMechanics } from './useJumpMechanics';
import { supabase } from './supabaseClient'; 
import PlayerProfile from './PlayerProfile'; 
import RSICalculator from './RSICalculator'; 
import FVPCalculator from './FVPCalculator';
import VBTCamera from './VBTCamera'; 

export default function JumpCalculator() {
  const [activeTab, setActiveTab] = useState('calculator'); 

  // --- حالات إدارة اللاعبين ---
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [activePlayer, setActivePlayer] = useState(null);
  const [playerHistory, setPlayerHistory] = useState([]);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({ name: '', birthYear: '', weight: '', leg: '', gender: 'male' });
  const [isSaving, setIsSaving] = useState(false);

  // --- حالات التعديل الجديدة (Edit Mode) ---
  const [isEditingPlayer, setIsEditingPlayer] = useState(false);
  const [editPlayerForm, setEditPlayerForm] = useState({ id: '', name: '', birthYear: '', weight: '', leg: '', gender: '' });

  // --- إعدادات الحسابات والفيديو ---
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

  const calculateAgeFromYear = (year) => { return year ? new Date().getFullYear() - parseInt(year) : ''; };
  const getPlayerAge = (dobString) => { return dobString ? new Date().getFullYear() - new Date(dobString).getFullYear() : 0; };

  const handlePlayerSelect = async (e) => {
    const id = e.target.value;
    setSelectedPlayerId(id); 
    setShowResults(false);
    setIsEditingPlayer(false); 

    if (id) {
      const player = players.find(p => p.id === id);
      setActivePlayer(player); setBodyMass(player.weight_kg); setLegLength(player.leg_length_m);
      fetchPlayerHistory(id);
    } else {
      setActivePlayer(null); setPlayerHistory([]); setActiveTab('calculator'); 
    }
  };

  const fetchPlayerHistory = async (id) => {
    const { data, error } = await supabase.from('jump_measurements').select('*').eq('player_id', id).order('created_at', { ascending: true });
    if (!error && data) setPlayerHistory(data);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const weight = parseFloat(newPlayer.weight) || 0;
    const legLen = parseFloat(newPlayer.leg) || 0;

    if (weight <= 0 || legLen <= 0) return alert("برجاء إدخال الوزن وطول الرجل بشكل صحيح.");

    const formattedDate = `${newPlayer.birthYear}-01-01`;
    const { data, error } = await supabase.from('players').insert([
      { full_name: newPlayer.name, date_of_birth: formattedDate, weight_kg: weight, leg_length_m: legLen, gender: newPlayer.gender }
    ]).select();

    if (error) {
      alert("فشل في تسجيل اللاعب: " + error.message);
    } else if (data) {
      setPlayers([data[0], ...players]); setSelectedPlayerId(data[0].id); setActivePlayer(data[0]);
      setBodyMass(data[0].weight_kg); setLegLength(data[0].leg_length_m);
      setShowNewPlayerForm(false); setNewPlayer({ name: '', birthYear: '', weight: '', leg: '', gender: 'male' });
      alert("✅ تم تسجيل اللاعب بنجاح!");
    }
  };

  const handleDeletePlayer = async () => {
    if (!activePlayer) return;
    if (window.confirm(`هل أنت متأكد من مسح اللاعب "${activePlayer.full_name}" وكل سجلاته؟ هذا الإجراء لا يمكن التراجع عنه!`)) {
      const { error } = await supabase.from('players').delete().eq('id', activePlayer.id);
      if (!error) {
        setPlayers(players.filter(p => p.id !== activePlayer.id)); setSelectedPlayerId('');
        setActivePlayer(null); setPlayerHistory([]); setActiveTab('calculator');
        alert("تم مسح اللاعب بنجاح.");
      }
    }
  };

  const handleEditClick = () => {
    setEditPlayerForm({
      id: activePlayer.id,
      name: activePlayer.full_name,
      birthYear: activePlayer.date_of_birth ? activePlayer.date_of_birth.substring(0, 4) : '',
      weight: activePlayer.weight_kg,
      leg: activePlayer.leg_length_m,
      gender: activePlayer.gender
    });
    setIsEditingPlayer(true);
  };

  const handleUpdatePlayer = async (e) => {
    e.preventDefault();
    const weight = parseFloat(editPlayerForm.weight) || 0;
    const legLen = parseFloat(editPlayerForm.leg) || 0;

    if (weight <= 0 || legLen <= 0) return alert("برجاء إدخال الوزن وطول الرجل بشكل صحيح.");

    const formattedDate = `${editPlayerForm.birthYear}-01-01`;
    
    const { data, error } = await supabase
      .from('players')
      .update({
        full_name: editPlayerForm.name,
        date_of_birth: formattedDate,
        weight_kg: weight,
        leg_length_m: legLen,
        gender: editPlayerForm.gender
      })
      .eq('id', editPlayerForm.id)
      .select();

    if (error) {
      alert("فشل التحديث: " + error.message);
    } else if (data) {
      const updatedPlayer = data[0];
      setPlayers(players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
      setActivePlayer(updatedPlayer);
      setBodyMass(updatedPlayer.weight_kg);
      setLegLength(updatedPlayer.leg_length_m);
      setIsEditingPlayer(false);
      alert("✅ تم تحديث بيانات اللاعب بنجاح!");
    }
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
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#3b82f6', lineWidth: 3 }); drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#ffffff', lineWidth: 1 });
        const leftAnkle = results.poseLandmarks[27]; const rightAnkle = results.poseLandmarks[28];
        if (leftAnkle && rightAnkle && videoRef.current && !videoRef.current.paused) { const avgFootY = (leftAnkle.y + rightAnkle.y) / 2; flightDataRef.current.push({ time: videoRef.current.currentTime, y: avgFootY }); }
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
    if (data.length < 10) return alert("يرجى تشغيل الفيديو بالكامل أثناء تفعيل الذكاء الاصطناعي لجمع بيانات القفزة.");
    const sortedByY = [...data].sort((a, b) => b.y - a.y); const groundY = sortedByY.slice(0, 10).reduce((sum, d) => sum + d.y, 0) / 10; const threshold = groundY - 0.02; 
    let tStart = 0; let tEnd = 0;
    for (let i = 0; i < data.length; i++) { if (data[i].y < threshold && tStart === 0) { tStart = data[i].time; } if (tStart > 0 && data[i].y >= threshold && data[i].time > tStart + 0.15) { tEnd = data[i].time; break; } }
    if (tStart && tEnd) {
      setTakeoffTime(tStart); setLandingTime(tEnd); setShowResults(false); videoRef.current.currentTime = tStart; setCurrentTime(tStart); alert("✅ تم الكشف عن أوقات الإقلاع والهبوط أوتوماتيكياً بنجاح!");
    } else { alert("لم يتمكن الذكاء الاصطناعي من رؤية القفزة بوضوح، يرجى التحديد يدوياً."); }
  };

  const handleAnalyze = () => { if (takeoffTime === 0 || landingTime === 0) return alert("حدد الإقلاع والهبوط من الفيديو أولاً."); setShowResults(true); };

  const saveMeasurement = async () => {
    if (!selectedPlayerId) return alert("اختر لاعباً أولاً!"); setIsSaving(true);
    const mass = parseFloat(bodyMass); const g = 9.81; const h_push = parseFloat(legLength) * 0.45; const heightCm = parseFloat(stats?.heightCm || 0);
    const meanForce = mass * g * ((heightCm / 100) / h_push + 1); const peakPower = parseFloat(stats?.meanPower || 0) * 2.1;
    const { data, error } = await supabase.from('jump_measurements').insert([ { player_id: selectedPlayerId, test_type: 'standard', jump_height_cm: stats.heightCm, flight_time_sec: stats.flightTime, takeoff_velocity_ms: stats.takeoffVelocity, mean_power_watts: stats.meanPower, peak_power_watts: peakPower.toFixed(2), mean_force_newtons: meanForce.toFixed(2), leg_used: legUsed } ]).select();
    if (!error && data) { setPlayerHistory([...playerHistory, data[0]]); alert("تم الحفظ بنجاح."); setShowResults(false); }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 p-4 md:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-6">
        
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="w-full md:w-1/2">
              <select value={selectedPlayerId} onChange={handlePlayerSelect} className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                <option value="">-- اختر لاعباً --</option>
                {players.map(p => (<option key={p.id} value={p.id}>{p.full_name}</option>))}
              </select>
            </div>
            <button onClick={() => setShowNewPlayerForm(!showNewPlayerForm)} className="w-full md:w-auto px-6 py-3 bg-[#1f2937] hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-blue-400 rounded-xl font-bold transition-all shadow-md">
              {showNewPlayerForm ? "إلغاء التسجيل" : "+ لاعب جديد"}
            </button>
          </div>

          {showNewPlayerForm && (
            <form onSubmit={handleAddPlayer} className="mb-6 p-6 bg-[#0f1423] border border-gray-800 rounded-2xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5 animate-fade-in">
              <div className="lg:col-span-2">
                <label className="text-xs text-gray-400 block mb-1">الاسم الكامل</label>
                <input required type="text" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div><label className="text-xs text-gray-400 block mb-1">سنة الميلاد</label><input required type="number" min="1950" max={new Date().getFullYear()} value={newPlayer.birthYear} onChange={e => setNewPlayer({...newPlayer, birthYear: e.target.value})} className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none" /></div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">النوع</label>
                <select value={newPlayer.gender} onChange={e => setNewPlayer({...newPlayer, gender: e.target.value})} className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none">
                  <option value="male">ذكر</option><option value="female">أنثى</option>
                </select>
              </div>
              <div><label className="text-xs text-gray-400 block mb-1">الوزن (kg)</label><input required type="number" step="0.1" value={newPlayer.weight} onChange={e => setNewPlayer({...newPlayer, weight: e.target.value})} className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none" /></div>
              <div><label className="text-xs text-gray-400 block mb-1">طول الرجل (متر)</label><input required type="number" step="0.01" value={newPlayer.leg} onChange={e => setNewPlayer({...newPlayer, leg: e.target.value})} className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none" placeholder="مثال: 0.95" /></div>
              <div className="lg:col-span-6 mt-2"><button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-bold transition-all">حفظ بيانات اللاعب</button></div>
            </form>
          )}

          {activePlayer && (
            <div className="mb-6 bg-[#0f1423] p-4 rounded-2xl border border-gray-800">
              {isEditingPlayer ? (
                <form onSubmit={handleUpdatePlayer} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
                  <div className="lg:col-span-2">
                    <label className="text-xs text-blue-400 block mb-1">تعديل الاسم</label>
                    <input required type="text" value={editPlayerForm.name} onChange={e => setEditPlayerForm({...editPlayerForm, name: e.target.value})} className="w-full bg-[#1f2937] border border-blue-500/50 p-2 text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-blue-400 block mb-1">سنة الميلاد</label>
                    <input required type="number" value={editPlayerForm.birthYear} onChange={e => setEditPlayerForm({...editPlayerForm, birthYear: e.target.value})} className="w-full bg-[#1f2937] border border-blue-500/50 p-2 text-white rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-blue-400 block mb-1">النوع</label>
                    <select value={editPlayerForm.gender} onChange={e => setEditPlayerForm({...editPlayerForm, gender: e.target.value})} className="w-full bg-[#1f2937] border border-blue-500/50 p-2 text-white rounded-lg outline-none">
                      <option value="male">ذكر</option><option value="female">أنثى</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-blue-400 block mb-1">الوزن (kg)</label>
                    <input required type="number" step="0.1" value={editPlayerForm.weight} onChange={e => setEditPlayerForm({...editPlayerForm, weight: e.target.value})} className="w-full bg-[#1f2937] border border-blue-500/50 p-2 text-white rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-blue-400 block mb-1">طول الرجل (m)</label>
                    <input required type="number" step="0.01" value={editPlayerForm.leg} onChange={e => setEditPlayerForm({...editPlayerForm, leg: e.target.value})} className="w-full bg-[#1f2937] border border-blue-500/50 p-2 text-white rounded-lg outline-none" />
                  </div>
                  <div className="lg:col-span-6 flex gap-3 mt-2">
                    <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl font-bold transition-all shadow-lg">حفظ التعديلات</button>
                    <button type="button" onClick={() => setIsEditingPlayer(false)} className="px-6 bg-gray-600 hover:bg-gray-500 text-white rounded-xl font-bold transition-all">إلغاء</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-4 text-sm items-center">
                  <div className="flex-1 bg-[#1f2937] p-3 rounded-xl text-center border border-gray-700 min-w-[100px]"><p className="text-xs text-gray-400 mb-1">الاسم</p><p className="font-bold text-white text-lg truncate">{activePlayer.full_name}</p></div>
                  <div className="flex-1 bg-[#1f2937] p-3 rounded-xl text-center border border-gray-700 min-w-[80px]"><p className="text-xs text-gray-400 mb-1">العمر</p><p className="font-bold text-blue-400 text-lg">{getPlayerAge(activePlayer.date_of_birth)}</p></div>
                  <div className="flex-1 bg-[#1f2937] p-3 rounded-xl text-center border border-gray-700 min-w-[80px]"><p className="text-xs text-gray-400 mb-1">الوزن</p><p className="font-bold text-white text-lg">{activePlayer.weight_kg} kg</p></div>
                  
                  <div className="flex gap-2">
                    <button onClick={handleEditClick} title="تعديل بيانات اللاعب" className="p-3 bg-blue-900/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl border border-blue-900/50 transition-all">
                      ✏️ تعديل
                    </button>
                    <button onClick={handleDeletePlayer} title="مسح اللاعب نهائياً" className="p-3 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl border border-red-900/50 transition-all">
                      🗑️ حذف
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activePlayer && (
            <div className="flex border-b border-gray-800 overflow-x-auto pb-2 custom-scrollbar">
              <button onClick={() => setActiveTab('calculator')} className={`flex-none px-6 py-3 font-bold transition-all ${activeTab === 'calculator' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-900/10' : 'text-gray-500 hover:text-gray-300'}`}>🏋️‍♂️ قفزة عادية</button>
              <button onClick={() => setActiveTab('rsi')} className={`flex-none px-6 py-3 font-bold transition-all ${activeTab === 'rsi' ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-900/10' : 'text-gray-500 hover:text-gray-300'}`}>⚡ اختبار RSI</button>
              <button onClick={() => setActiveTab('fvp')} className={`flex-none px-6 py-3 font-bold transition-all ${activeTab === 'fvp' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-900/10' : 'text-gray-500 hover:text-gray-300'}`}>📈 منحنى FVP</button>
              <button onClick={() => setActiveTab('vbt')} className={`flex-none px-6 py-3 font-bold transition-all ${activeTab === 'vbt' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-900/10' : 'text-gray-500 hover:text-gray-300'}`}>🤖 VBT (الذكاء الاصطناعي)</button>
              <button onClick={() => setActiveTab('profile')} className={`flex-none px-6 py-3 font-bold transition-all ${activeTab === 'profile' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-900/10' : 'text-gray-500 hover:text-gray-300'}`}>📊 تقرير الأداء</button>
            </div>
          )}
        </div>

        {activePlayer ? (
          <>
            <div className={activeTab === 'calculator' ? 'block animate-fade-in' : 'hidden'}>
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl">
                
                <div className="mb-8 p-4 bg-[#0f1423] rounded-2xl border border-gray-800 relative">
                  {!videoSrc && (
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                      <div className="flex-1 relative">
                        <input type="file" accept="video/*" capture="environment" onChange={handleFileUpload} ref={cameraInputRef} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="bg-blue-600 hover:bg-blue-500 text-white text-center py-5 rounded-xl font-bold transition-all">افتح الكاميرا وصوّر</div>
                      </div>
                      <div className="flex-1 relative">
                        <input type="file" accept="video/*" onChange={handleFileUpload} ref={fileInputRef} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-center py-5 rounded-xl font-bold transition-all">اختر فيديو من المعرض</div>
                      </div>
                    </div>
                  )}

                  {videoSrc && (
                    <div className="flex flex-col items-center w-full relative">
                      <button onClick={clearVideo} className="absolute top-2 right-2 bg-red-600 p-2 rounded-full text-white z-20 shadow-lg">X</button>
                      
                      <div className="w-full max-w-lg mb-4 flex justify-between items-center bg-[#1f2937] p-3 rounded-xl border border-gray-700">
                         <span className="text-sm font-bold text-gray-300">نظام التعرف التلقائي</span>
                         <button onClick={() => setAiEnabled(!aiEnabled)} className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${aiEnabled ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
                           {aiEnabled ? '✅ الذكاء الاصطناعي مفعل' : '👁️ تفعيل الذكاء الاصطناعي'}
                         </button>
                      </div>

                      <div className="relative inline-block border-2 border-gray-700 rounded-xl overflow-hidden mb-5 shadow-lg w-full max-w-lg">
                        <video ref={videoRef} src={videoSrc} playsInline className="w-full h-auto" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
                        {aiEnabled && ( <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" /> )}
                      </div>
                      
                      <div className="w-full max-w-lg bg-[#1f2937] p-4 rounded-2xl border border-gray-700 mb-5">
                        <div className="flex items-center gap-4 mb-4">
                          <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">{currentTime.toFixed(2)}s</span>
                          <input type="range" min="0" max={duration || 0} step="0.001" value={currentTime} onChange={handleSeek} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                          <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">{duration.toFixed(2)}s</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          <button onClick={() => stepFrames(-1)} className="px-4 py-2 bg-[#0b0f19] hover:bg-gray-800 rounded-xl text-white text-sm font-bold border border-gray-700">-1 Frame</button>
                          <button onClick={togglePlay} className="px-8 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold mx-2 shadow-lg">{isPlaying ? '⏸ إيقاف' : '▶ تشغيل'}</button>
                          <button onClick={() => stepFrames(1)} className="px-4 py-2 bg-[#0b0f19] hover:bg-gray-800 rounded-xl text-white text-sm font-bold border border-gray-700">+1 Frame</button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 w-full justify-center">
                        <button onClick={() => { setTakeoffTime(currentTime); setShowResults(false); }} className="px-6 py-3 bg-indigo-900/40 hover:bg-indigo-600 text-indigo-300 border border-indigo-700 rounded-xl font-bold">تحديد كإقلاع (يدوي)</button>
                        <button onClick={() => { setLandingTime(currentTime); setShowResults(false); }} className="px-6 py-3 bg-purple-900/40 hover:bg-purple-600 text-purple-300 border border-purple-700 rounded-xl font-bold">تحديد كهبوط (يدوي)</button>
                        {aiEnabled && ( <button onClick={autoDetectJump} className="w-full max-w-lg mt-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105">🤖 حساب الإقلاع والهبوط أوتوماتيكياً (AI)</button> )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-[#0f1423] p-5 rounded-2xl border border-gray-800">
                  <div><label className="block text-xs text-gray-500 mb-1">FPS الكاميرا</label><input type="number" value={cameraFps} onChange={(e) => setCameraFps(Number(e.target.value))} className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-2.5 text-white outline-none" /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">الوزن (kg)</label><input type="number" value={bodyMass} onChange={(e) => setBodyMass(Number(e.target.value))} className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-2.5 text-white outline-none" /></div>
                  <div className="col-span-2 flex gap-3 text-center">
                    <div className="flex-1"><label className="text-xs text-gray-500">الإقلاع (ث)</label><p className="text-indigo-400 font-bold bg-[#0b0f19] p-2 rounded-xl border border-indigo-900/50 mt-1">{takeoffTime.toFixed(3)}</p></div>
                    <div className="flex-1"><label className="text-xs text-gray-500">الهبوط (ث)</label><p className="text-purple-400 font-bold bg-[#0b0f19] p-2 rounded-xl border border-purple-900/50 mt-1">{landingTime.toFixed(3)}</p></div>
                  </div>
                </div>

                <div className="bg-[#0f1423] p-4 rounded-2xl border border-gray-800 mb-6">
                  <p className="text-center text-gray-400 text-sm mb-3">حدد نوع القفزة للتقييم والتوازن:</p>
                  <div className="flex justify-center gap-4 flex-wrap">
                    <button onClick={() => setLegUsed('both')} className={`px-6 py-2 rounded-xl font-bold transition-all ${legUsed === 'both' ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#1f2937] text-gray-400 hover:bg-gray-700'}`}>القدمين معاً</button>
                    <button onClick={() => setLegUsed('right')} className={`px-6 py-2 rounded-xl font-bold transition-all ${legUsed === 'right' ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#1f2937] text-gray-400 hover:bg-gray-700'}`}>القدم اليمنى فقط</button>
                    <button onClick={() => setLegUsed('left')} className={`px-6 py-2 rounded-xl font-bold transition-all ${legUsed === 'left' ? 'bg-blue-600 text-white shadow-lg' : 'bg-[#1f2937] text-gray-400 hover:bg-gray-700'}`}>القدم اليسرى فقط</button>
                  </div>
                </div>

                <div className="flex justify-center mb-8">
                  <button onClick={handleAnalyze} className="px-14 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-xl shadow-lg transition-transform hover:scale-105">تحليل البيانات (Analyze)</button>
                </div>

                {showResults && stats && (
                  <div className="space-y-6 animate-fade-in-down">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                      <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-blue-500"><span className="block text-xs text-gray-400 mb-2">الارتفاع (Cm)</span><span className="text-3xl font-black text-white">{stats.heightCm}</span></div>
                      <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-emerald-500"><span className="block text-xs text-gray-400 mb-2">الارتفاع (In)</span><span className="text-3xl font-black text-white">{stats.heightInches || (stats.heightCm * 0.393701).toFixed(2)}</span></div>
                      <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-indigo-500"><span className="block text-xs text-gray-400 mb-2">طيران (s)</span><span className="text-3xl font-black text-white">{stats.flightTime}</span></div>
                      <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-purple-500"><span className="block text-xs text-gray-400 mb-2">السرعة (m/s)</span><span className="text-3xl font-black text-white">{stats.takeoffVelocity}</span></div>
                      <div className="col-span-2 bg-[#1f2937] p-5 rounded-2xl border-b-4 border-cyan-500"><span className="block text-xs text-gray-400 mb-2">متوسط القدرة (W)</span><span className="text-3xl font-black text-white">{stats.meanPower}</span></div>
                    </div>
                    <button onClick={saveMeasurement} disabled={isSaving} className="w-full py-4 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg">
                      {isSaving ? 'جاري الحفظ...' : 'حفظ الاختبار في السجل'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={activeTab === 'rsi' ? 'block animate-fade-in' : 'hidden'}><RSICalculator activePlayer={activePlayer} selectedPlayerId={selectedPlayerId} onSaveSuccess={(newJump) => setPlayerHistory([...playerHistory, newJump])} /></div>
            <div className={activeTab === 'fvp' ? 'block animate-fade-in' : 'hidden'}><FVPCalculator activePlayer={activePlayer} selectedPlayerId={selectedPlayerId} /></div>
            <div className={activeTab === 'vbt' ? 'block animate-fade-in' : 'hidden'}><VBTCamera /></div>
            <div className={activeTab === 'profile' ? 'block animate-fade-in' : 'hidden'}><PlayerProfile activePlayer={activePlayer} playerHistory={playerHistory} /></div>
          </>
        ) : (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-12 text-center text-gray-500 shadow-xl">يرجى اختيار لاعب أو تسجيل لاعب جديد للبدء</div>
        )}
      </div>
    </div>
  );
}