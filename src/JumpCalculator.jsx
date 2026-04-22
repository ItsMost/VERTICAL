import React, { useState, useEffect, useRef } from 'react';
import { useJumpMechanics } from './useJumpMechanics';
import { supabase } from './supabaseClient';
import PlayerProfile from './PlayerProfile';
import RSICalculator from './RSICalculator';
import FVPCalculator from './FVPCalculator'; // استدعاء وحش الـ FVP

export default function JumpCalculator() {
  const [activeTab, setActiveTab] = useState('calculator');

  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [activePlayer, setActivePlayer] = useState(null);
  const [playerHistory, setPlayerHistory] = useState([]);
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);

  const [newPlayer, setNewPlayer] = useState({
    name: '',
    birthYear: '',
    weight: '',
    leg: '',
    gender: 'male',
  });
  const [isSaving, setIsSaving] = useState(false);

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

  const stats = useJumpMechanics(
    cameraFps,
    videoFps,
    takeoffTime,
    landingTime,
    bodyMass,
    legLength
  );

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPlayers(data);
  };

  const calculateAgeFromYear = (year) => {
    if (!year) return '';
    return new Date().getFullYear() - parseInt(year);
  };

  const getPlayerAge = (dobString) => {
    if (!dobString) return 0;
    return new Date().getFullYear() - new Date(dobString).getFullYear();
  };

  const handlePlayerSelect = async (e) => {
    const id = e.target.value;
    setSelectedPlayerId(id);
    setShowResults(false);

    if (id) {
      const player = players.find((p) => p.id === id);
      setActivePlayer(player);
      setBodyMass(player.weight_kg);
      setLegLength(player.leg_length_m);
      fetchPlayerHistory(id);
    } else {
      setActivePlayer(null);
      setPlayerHistory([]);
      setActiveTab('calculator');
    }
  };

  const fetchPlayerHistory = async (id) => {
    const { data, error } = await supabase
      .from('jump_measurements')
      .select('*')
      .eq('player_id', id)
      .order('created_at', { ascending: true });
    if (!error && data) setPlayerHistory(data);
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    const formattedDate = `${newPlayer.birthYear}-01-01`;
    const { data, error } = await supabase
      .from('players')
      .insert([
        {
          full_name: newPlayer.name,
          date_of_birth: formattedDate,
          weight_kg: parseFloat(newPlayer.weight),
          leg_length_m: parseFloat(newPlayer.leg),
          gender: newPlayer.gender,
        },
      ])
      .select();

    if (!error && data) {
      setPlayers([data[0], ...players]);
      setSelectedPlayerId(data[0].id);
      setActivePlayer(data[0]);
      setBodyMass(data[0].weight_kg);
      setLegLength(data[0].leg_length_m);
      setShowNewPlayerForm(false);
      setNewPlayer({
        name: '',
        birthYear: '',
        weight: '',
        leg: '',
        gender: 'male',
      });
      setPlayerHistory([]);
    } else {
      alert('حدث خطأ. تأكد من صحة البيانات.');
    }
  };

  const handleDeletePlayer = async () => {
    if (!activePlayer) return;
    if (
      window.confirm(
        `هل أنت متأكد من مسح اللاعب "${activePlayer.full_name}" وكل سجلاته؟`
      )
    ) {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', activePlayer.id);
      if (!error) {
        setPlayers(players.filter((p) => p.id !== activePlayer.id));
        setSelectedPlayerId('');
        setActivePlayer(null);
        setPlayerHistory([]);
        setShowResults(false);
        setActiveTab('calculator');
      }
    }
  };

  const handleAnalyze = () => {
    if (takeoffTime === 0 || landingTime === 0)
      return alert('حدد الإقلاع والهبوط أولاً.');
    if (landingTime <= takeoffTime)
      return alert('وقت الهبوط يجب أن يكون بعد الإقلاع.');
    setShowResults(true);
  };

  const saveMeasurement = async () => {
    if (!selectedPlayerId) return alert('اختر لاعباً أولاً!');
    setIsSaving(true);

    const mass = parseFloat(bodyMass);
    const g = 9.81;
    const h_push = parseFloat(legLength) * 0.45;
    const height = parseFloat(stats?.heightCm || 0);
    const v = parseFloat(stats?.takeoffVelocity || 0);
    const meanForce = mass * g * (height / 100 / h_push + 1);
    const impulse = mass * v;
    const peakPower = parseFloat(stats?.meanPower || 0) * 2.1;

    const { data, error } = await supabase
      .from('jump_measurements')
      .insert([
        {
          player_id: selectedPlayerId,
          test_type: 'standard',
          jump_height_cm: stats.heightCm,
          flight_time_sec: stats.flightTime,
          takeoff_velocity_ms: stats.takeoffVelocity,
          mean_power_watts: stats.meanPower,
          peak_power_watts: peakPower.toFixed(2),
          mean_force_newtons: meanForce.toFixed(2),
          impulse_ns: impulse.toFixed(2),
          leg_used: legUsed,
        },
      ])
      .select();

    if (!error && data) {
      setPlayerHistory([...playerHistory, data[0]]);
      alert('تم الحفظ بنجاح.');
      setShowResults(false);
      setLegUsed('both');
    } else {
      alert('حدث خطأ أثناء الحفظ.');
    }
    setIsSaving(false);
  };

  // وظائف الفيديو
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) setVideoSrc(URL.createObjectURL(file));
  };
  const clearVideo = () => {
    setVideoSrc(null);
    setTakeoffTime(0);
    setLandingTime(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowResults(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };
  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        if (videoRef.current.currentTime >= duration)
          videoRef.current.currentTime = 0;
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };
  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };
  const handleSeek = (e) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };
  const stepFrames = (frames) => {
    if (videoRef.current && duration > 0) {
      videoRef.current.pause();
      setIsPlaying(false);
      const timeStep = frames / videoFps;
      let newTime = videoRef.current.currentTime + timeStep;
      newTime = Math.max(0, Math.min(newTime, duration));
      videoRef.current.currentTime = newTime;
    }
  };
  const setTakeoff = () => {
    if (videoRef.current) {
      setTakeoffTime(videoRef.current.currentTime);
      setShowResults(false);
    }
  };
  const setLanding = () => {
    if (videoRef.current) {
      setLandingTime(videoRef.current.currentTime);
      setShowResults(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 p-4 md:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-6">
        {/* قسم الإدارة العلوية */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="w-full md:w-1/2">
              <select
                value={selectedPlayerId}
                onChange={handlePlayerSelect}
                className="w-full bg-[#1f2937] text-white border border-gray-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="">-- اختر لاعباً --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowNewPlayerForm(!showNewPlayerForm)}
              className="w-full md:w-auto px-6 py-3 bg-[#1f2937] hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-blue-400 rounded-xl font-bold transition-all shadow-md"
            >
              {showNewPlayerForm ? 'إلغاء التسجيل' : '+ لاعب جديد'}
            </button>
          </div>

          {/* فورم الإضافة */}
          {showNewPlayerForm && (
            <form
              onSubmit={handleAddPlayer}
              className="mb-6 p-6 bg-[#0f1423] border border-gray-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5"
            >
              <div className="lg:col-span-2">
                <label className="text-xs text-gray-400 block mb-1">
                  الاسم الكامل
                </label>
                <input
                  required
                  type="text"
                  value={newPlayer.name}
                  onChange={(e) =>
                    setNewPlayer({ ...newPlayer, name: e.target.value })
                  }
                  className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1 flex justify-between">
                  <span>سنة الميلاد</span>
                  {newPlayer.birthYear && (
                    <span className="text-blue-400 font-bold">
                      {calculateAgeFromYear(newPlayer.birthYear)} سنة
                    </span>
                  )}
                </label>
                <input
                  required
                  type="number"
                  min="1950"
                  max={new Date().getFullYear()}
                  value={newPlayer.birthYear}
                  onChange={(e) =>
                    setNewPlayer({ ...newPlayer, birthYear: e.target.value })
                  }
                  className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  النوع
                </label>
                <select
                  value={newPlayer.gender}
                  onChange={(e) =>
                    setNewPlayer({ ...newPlayer, gender: e.target.value })
                  }
                  className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                </select>
              </div>
              <div className="flex gap-2 lg:col-span-1">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">
                    الوزن (kg)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    value={newPlayer.weight}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, weight: e.target.value })
                    }
                    className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-1">
                    الرجل (m)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newPlayer.leg}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, leg: e.target.value })
                    }
                    className="w-full bg-[#1f2937] border border-gray-700 p-3 text-white rounded-xl outline-none"
                  />
                </div>
              </div>
              <div className="lg:col-span-5 mt-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-bold transition-all"
                >
                  حفظ بيانات اللاعب
                </button>
              </div>
            </form>
          )}

          {activePlayer && (
            <>
              <div className="flex flex-wrap gap-4 text-sm items-center mb-6">
                <div className="flex-1 bg-[#1f2937] p-3 rounded-xl text-center border border-gray-700 min-w-[100px]">
                  <p className="text-xs text-gray-400 mb-1">الاسم</p>
                  <p className="font-bold text-white text-lg truncate">
                    {activePlayer.full_name}
                  </p>
                </div>
                <div className="flex-1 bg-[#1f2937] p-3 rounded-xl text-center border border-gray-700 min-w-[80px]">
                  <p className="text-xs text-gray-400 mb-1">العمر</p>
                  <p className="font-bold text-blue-400 text-lg">
                    {getPlayerAge(activePlayer.date_of_birth)}
                  </p>
                </div>
                <div className="flex-1 bg-[#1f2937] p-3 rounded-xl text-center border border-gray-700 min-w-[80px]">
                  <p className="text-xs text-gray-400 mb-1">النوع</p>
                  <p className="font-bold text-white text-lg">
                    {activePlayer.gender === 'female' ? 'أنثى' : 'ذكر'}
                  </p>
                </div>
                <button
                  onClick={handleDeletePlayer}
                  className="p-4 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl border border-red-900/50 hover:border-red-500 transition-all"
                  title="مسح اللاعب"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              {/* القائمة (Tabs) محدثة بـ 4 أزرار شاملة الـ FVP */}
              <div className="flex border-b border-gray-800 overflow-x-auto pb-2 custom-scrollbar">
                <button
                  onClick={() => setActiveTab('calculator')}
                  className={`flex-none min-w-[150px] px-4 py-3 font-bold transition-all ${
                    activeTab === 'calculator'
                      ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-900/10'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  🏋️‍♂️ قفزة عادية
                </button>
                <button
                  onClick={() => setActiveTab('rsi')}
                  className={`flex-none min-w-[150px] px-4 py-3 font-bold transition-all ${
                    activeTab === 'rsi'
                      ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-900/10'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  ⚡ اختبار RSI
                </button>
                <button
                  onClick={() => setActiveTab('fvp')}
                  className={`flex-none min-w-[150px] px-4 py-3 font-bold transition-all ${
                    activeTab === 'fvp'
                      ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-900/10'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  📈 منحنى FVP
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-none min-w-[150px] px-4 py-3 font-bold transition-all ${
                    activeTab === 'profile'
                      ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-900/10'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  📊 تقرير الأداء
                </button>
              </div>
            </>
          )}
        </div>

        {activePlayer ? (
          <>
            {/* تاب 1: الاختبار العادي (CMJ) */}
            <div
              className={
                activeTab === 'calculator' ? 'block animate-fade-in' : 'hidden'
              }
            >
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-2xl">
                {/* --- قسم الفيديو --- */}
                <div className="mb-8 p-4 bg-[#0f1423] rounded-2xl border border-gray-800 relative">
                  {!videoSrc && (
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                      <div className="flex-1 relative">
                        <input
                          type="file"
                          accept="video/*"
                          capture="environment"
                          onChange={handleFileUpload}
                          ref={cameraInputRef}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="bg-blue-600 hover:bg-blue-500 text-white text-center py-5 rounded-xl border border-blue-500 font-bold transition-all flex items-center justify-center gap-3">
                          افتح الكاميرا وصوّر
                        </div>
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleFileUpload}
                          ref={fileInputRef}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="bg-[#1f2937] hover:bg-gray-700 text-gray-300 text-center py-5 rounded-xl border border-gray-600 font-bold transition-all flex items-center justify-center gap-3">
                          اختر فيديو من المعرض
                        </div>
                      </div>
                    </div>
                  )}

                  {videoSrc && (
                    <div className="flex flex-col items-center w-full relative">
                      <button
                        onClick={clearVideo}
                        className="absolute top-2 right-2 z-10 bg-red-600 hover:bg-red-500 text-white p-2 rounded-full shadow-lg"
                      >
                        X
                      </button>
                      <video
                        ref={videoRef}
                        src={videoSrc}
                        playsInline
                        className="max-h-80 w-auto rounded-xl border-2 border-gray-700 mb-5 shadow-lg"
                        onLoadedMetadata={() =>
                          setDuration(videoRef.current.duration)
                        }
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => setIsPlaying(false)}
                      />

                      <div className="w-full max-w-lg flex items-center gap-4 mb-5">
                        <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">
                          {currentTime.toFixed(2)}s
                        </span>
                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          step="0.001"
                          value={currentTime}
                          onChange={handleSeek}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <span className="text-xs text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded">
                          {duration.toFixed(2)}s
                        </span>
                      </div>

                      <div className="flex flex-wrap justify-center gap-2 mb-6 bg-gray-800/50 p-2 rounded-2xl border border-gray-700/50">
                        <button
                          onClick={() => stepFrames(-1)}
                          className="px-4 py-2 bg-[#1f2937] hover:bg-gray-700 rounded-xl text-white text-sm font-bold"
                        >
                          -1 Frame
                        </button>
                        <button
                          onClick={togglePlay}
                          className="px-8 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold mx-2"
                        >
                          {isPlaying ? '⏸ إيقاف' : '▶ تشغيل'}
                        </button>
                        <button
                          onClick={() => stepFrames(1)}
                          className="px-4 py-2 bg-[#1f2937] hover:bg-gray-700 rounded-xl text-white text-sm font-bold"
                        >
                          +1 Frame
                        </button>
                      </div>

                      <div className="flex gap-4 w-full justify-center">
                        <button
                          onClick={setTakeoff}
                          className="px-8 py-3 bg-indigo-900/40 hover:bg-indigo-600 text-indigo-300 border border-indigo-700/50 rounded-xl font-bold"
                        >
                          تحديد كإقلاع (Take-off)
                        </button>
                        <button
                          onClick={setLanding}
                          className="px-8 py-3 bg-purple-900/40 hover:bg-purple-600 text-purple-300 border border-purple-700/50 rounded-xl font-bold"
                        >
                          تحديد كهبوط (Landing)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 bg-[#0f1423] p-5 rounded-2xl border border-gray-800">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      FPS الكاميرا
                    </label>
                    <input
                      type="number"
                      value={cameraFps}
                      onChange={(e) => setCameraFps(Number(e.target.value))}
                      className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      FPS الملف
                    </label>
                    <input
                      type="number"
                      value={videoFps}
                      onChange={(e) => setVideoFps(Number(e.target.value))}
                      className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      الوزن (kg)
                    </label>
                    <input
                      type="number"
                      value={bodyMass}
                      onChange={(e) => setBodyMass(Number(e.target.value))}
                      className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      طول الرجل (m)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={legLength}
                      onChange={(e) => setLegLength(Number(e.target.value))}
                      className="w-full bg-[#1f2937] border border-gray-700 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>
                  <div className="col-span-2 flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1 text-center">
                        الإقلاع (ث)
                      </label>
                      <input
                        type="text"
                        value={takeoffTime.toFixed(3)}
                        readOnly
                        className="w-full bg-[#0b0f19] border border-indigo-900/50 rounded-xl p-2.5 text-indigo-400 font-mono font-bold text-center"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1 text-center">
                        الهبوط (ث)
                      </label>
                      <input
                        type="text"
                        value={landingTime.toFixed(3)}
                        readOnly
                        className="w-full bg-[#0b0f19] border border-purple-900/50 rounded-xl p-2.5 text-purple-400 font-mono font-bold text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#0f1423] p-4 rounded-2xl border border-gray-800 mb-6">
                  <p className="text-center text-gray-400 text-sm mb-3">
                    حدد نوع القفزة للتقييم والتوازن:
                  </p>
                  <div className="flex justify-center gap-4 flex-wrap">
                    <button
                      onClick={() => setLegUsed('both')}
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${
                        legUsed === 'both'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-[#1f2937] text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      القدمين معاً
                    </button>
                    <button
                      onClick={() => setLegUsed('right')}
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${
                        legUsed === 'right'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-[#1f2937] text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      القدم اليمنى فقط
                    </button>
                    <button
                      onClick={() => setLegUsed('left')}
                      className={`px-6 py-2 rounded-xl font-bold transition-all ${
                        legUsed === 'left'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'bg-[#1f2937] text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      القدم اليسرى فقط
                    </button>
                  </div>
                </div>

                <div className="flex justify-center mb-8">
                  <button
                    onClick={handleAnalyze}
                    className="px-14 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-xl shadow-lg hover:scale-105 transition-transform"
                  >
                    تحليل البيانات (Analyze)
                  </button>
                </div>

                {showResults && stats && (
                  <div className="space-y-6 animate-fade-in-down">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-blue-500">
                        <span className="block text-xs text-gray-400 mb-2">
                          الارتفاع (Cm)
                        </span>
                        <span className="text-3xl font-black text-white">
                          {stats.heightCm}
                        </span>
                      </div>
                      <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-emerald-500">
                        <span className="block text-xs text-gray-400 mb-2">
                          الارتفاع (In)
                        </span>
                        <span className="text-3xl font-black text-white">
                          {stats.heightInches}
                        </span>
                      </div>
                      <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-indigo-500">
                        <span className="block text-xs text-gray-400 mb-2">
                          طيران (s)
                        </span>
                        <span className="text-3xl font-black text-white">
                          {stats.flightTime}
                        </span>
                      </div>
                      <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-purple-500">
                        <span className="block text-xs text-gray-400 mb-2">
                          السرعة (m/s)
                        </span>
                        <span className="text-3xl font-black text-white">
                          {stats.takeoffVelocity}
                        </span>
                      </div>
                      <div className="bg-[#1f2937] p-5 rounded-2xl border-b-4 border-cyan-500">
                        <span className="block text-xs text-gray-400 mb-2">
                          القدرة (W)
                        </span>
                        <span className="text-3xl font-black text-white">
                          {stats.meanPower}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={saveMeasurement}
                      disabled={isSaving}
                      className="w-full py-4 bg-blue-700/80 hover:bg-blue-600 text-white rounded-xl font-bold text-lg"
                    >
                      حفظ القفزة في سجل اللاعب
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* تاب 2: اختبار RSI */}
            <div
              className={
                activeTab === 'rsi' ? 'block animate-fade-in' : 'hidden'
              }
            >
              <RSICalculator
                activePlayer={activePlayer}
                selectedPlayerId={selectedPlayerId}
                onSaveSuccess={(newMeasurement) => {
                  setPlayerHistory([...playerHistory, newMeasurement]);
                }}
              />
            </div>

            {/* تاب 3: اختبار منحنى القوة والسرعة FVP */}
            <div
              className={
                activeTab === 'fvp' ? 'block animate-fade-in' : 'hidden'
              }
            >
              <FVPCalculator
                activePlayer={activePlayer}
                selectedPlayerId={selectedPlayerId}
              />
            </div>

            {/* تاب 4: البروفايل */}
            <div
              className={
                activeTab === 'profile' ? 'block animate-fade-in' : 'hidden'
              }
            >
              <PlayerProfile
                activePlayer={activePlayer}
                playerHistory={playerHistory}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
