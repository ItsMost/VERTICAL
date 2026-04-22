import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function JumpDashboard() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerHistory, setPlayerHistory] = useState([]);

  // تفاصيل اللاعب المختار
  const [activePlayer, setActivePlayer] = useState(null);

  // حالة نموذج إضافة لاعب جديد
  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    dob: '',
    weight: '',
    leg: '',
  });

  // حالات نتائج التحليل
  const [currentStats, setCurrentStats] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // --- دالة حساب العمر تلقائياً بدقة ---
  const calculateAge = (dobString) => {
    if (!dobString) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    // إذا لم يأتِ شهر الميلاد بعد في السنة الحالية، أو نحن في نفس الشهر لكن لم يأتِ اليوم بعد
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePlayerSelect = async (e) => {
    const id = e.target.value;
    setSelectedPlayerId(id);
    setCurrentStats(null);

    if (id) {
      const player = players.find((p) => p.id === id);
      setActivePlayer(player);
      fetchPlayerHistory(id);
    } else {
      setActivePlayer(null);
      setPlayerHistory([]);
    }
  };

  const fetchPlayerHistory = async (id) => {
    const { data, error } = await supabase
      .from('jump_measurements')
      .select('*')
      .eq('player_id', id)
      .order('created_at', { ascending: false });
    if (!error && data) setPlayerHistory(data);
  };

  // --- تسجيل لاعب جديد ---
  const handleAddPlayer = async (e) => {
    e.preventDefault();

    // إرسال البيانات بما فيها تاريخ الميلاد
    const { data, error } = await supabase
      .from('players')
      .insert([
        {
          full_name: newPlayer.name,
          date_of_birth: newPlayer.dob,
          weight_kg: parseFloat(newPlayer.weight),
          leg_length_m: parseFloat(newPlayer.leg),
        },
      ])
      .select();

    if (!error && data) {
      setPlayers([data[0], ...players]);
      setSelectedPlayerId(data[0].id);
      setActivePlayer(data[0]);
      setShowNewPlayerForm(false);
      setNewPlayer({ name: '', dob: '', weight: '', leg: '' });
      setPlayerHistory([]);
    } else {
      console.error('Error adding player:', error);
      alert(
        'حدث خطأ أثناء التسجيل. تأكد من إدخال البيانات بشكل صحيح وتجربة اسم غير مكرر.'
      );
    }
  };

  // --- محرك الحسابات البيوميكانيكية الدقيقة ---
  const simulateVideoAnalysis = () => {
    if (!activePlayer) return alert('الرجاء اختيار أو تسجيل لاعب أولاً!');

    // محاكاة استخراج زمن الطيران من الفيديو (في تطبيقك ستحصل عليه من الكاميرا/الفيديو)
    const flightTime = 0.65; // مثال
    const g = 9.81;
    const mass = parseFloat(activePlayer.weight_kg);
    const h_push = parseFloat(activePlayer.leg_length_m) * 0.45; // مسافة الدفع

    // الحسابات الفيزيائية (Samozino)
    const jumpHeightCm = (Math.pow(flightTime, 2) * g * 100) / 8;
    const takeoffVelocity = (flightTime * g) / 2;
    const meanForce = mass * g * (jumpHeightCm / 100 / h_push + 1);
    const meanPower = meanForce * (takeoffVelocity / 2);
    const impulse = mass * takeoffVelocity;
    const peakPower = meanPower * 2.1;

    setCurrentStats({
      jump_height_cm: jumpHeightCm.toFixed(2),
      flight_time_sec: flightTime.toFixed(3),
      takeoff_velocity_ms: takeoffVelocity.toFixed(2),
      mean_power_watts: meanPower.toFixed(2),
      peak_power_watts: peakPower.toFixed(2),
      mean_force_newtons: meanForce.toFixed(2),
      impulse_ns: impulse.toFixed(2),
    });
  };

  const saveMeasurement = async () => {
    if (!selectedPlayerId || !currentStats) return;
    setIsSaving(true);

    const { data, error } = await supabase
      .from('jump_measurements')
      .insert([{ player_id: selectedPlayerId, ...currentStats }])
      .select();

    if (!error && data) {
      setPlayerHistory([data[0], ...playerHistory]);
      setCurrentStats(null);
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200 p-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* العناوين والتصميم */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">
            SYSTEM: ARISE
          </h1>
          <p className="mt-2 text-indigo-300 font-medium">
            Biomechanics & Jump Analysis Engine
          </p>
        </div>

        {/* لوحة تحكم وتسجيل اللاعب */}
        <div className="bg-gray-900 border border-blue-900/50 rounded-2xl p-6 shadow-[0_0_25px_rgba(59,130,246,0.15)] backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="w-full md:w-1/2">
              <label className="block text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wide">
                Select Hunter / Player
              </label>
              <select
                value={selectedPlayerId}
                onChange={handlePlayerSelect}
                className="w-full bg-[#13131a] text-white border border-blue-600/50 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="">-- Choose a Player --</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowNewPlayerForm(!showNewPlayerForm)}
              className="w-full md:w-auto px-6 py-3 bg-gray-800 border border-purple-500/50 hover:bg-gray-800/80 text-purple-400 rounded-lg font-bold transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              {showNewPlayerForm
                ? 'Close Registration'
                : '+ Register New Player'}
            </button>
          </div>

          {/* فورم تسجيل اللاعب الجديد (مُحدث بتاريخ الميلاد) */}
          {showNewPlayerForm && (
            <div className="mt-6 p-5 bg-[#111118] border border-purple-900/40 rounded-xl animate-fade-in-down">
              <h3 className="text-purple-400 mb-4 font-bold uppercase tracking-wider text-sm">
                Hunter Registration Form
              </h3>
              <form
                onSubmit={handleAddPlayer}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
              >
                <div className="lg:col-span-2">
                  <label className="text-xs text-gray-500 uppercase">
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Sung Jin-Woo"
                    value={newPlayer.name}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, name: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 p-2 text-white rounded focus:ring-2 focus:ring-blue-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">
                    Date of Birth
                  </label>
                  <input
                    required
                    type="date"
                    value={newPlayer.dob}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, dob: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 p-2 text-white rounded focus:ring-2 focus:ring-blue-500 mt-1 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">
                    Weight (kg)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    placeholder="e.g. 75"
                    value={newPlayer.weight}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, weight: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 p-2 text-white rounded focus:ring-2 focus:ring-blue-500 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase">
                    Leg Length (m)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.95"
                    value={newPlayer.leg}
                    onChange={(e) =>
                      setNewPlayer({ ...newPlayer, leg: e.target.value })
                    }
                    className="w-full bg-gray-900 border border-gray-700 p-2 text-white rounded focus:ring-2 focus:ring-blue-500 mt-1"
                  />
                </div>
                <div className="lg:col-span-5 mt-2">
                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all uppercase tracking-widest"
                  >
                    Awaken (Register)
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* عرض حالة اللاعب المختار مع العمر */}
          {activePlayer && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-200 border-t border-gray-800 pt-5">
              <div className="bg-[#15161e] p-3 rounded border border-gray-800 text-center">
                <p className="text-xs text-gray-500 uppercase">Name</p>
                <p className="font-bold text-white truncate">
                  {activePlayer.full_name}
                </p>
              </div>
              <div className="bg-[#15161e] p-3 rounded border border-gray-800 text-center">
                <p className="text-xs text-gray-500 uppercase">Age</p>
                {/* هنا يتم عرض العمر المحسوب تلقائياً */}
                <p className="font-bold text-white">
                  {calculateAge(activePlayer.date_of_birth)}{' '}
                  <span className="text-gray-500 text-xs font-normal">
                    Years
                  </span>
                </p>
              </div>
              <div className="bg-[#15161e] p-3 rounded border border-gray-800 text-center">
                <p className="text-xs text-gray-500 uppercase">Body Mass</p>
                <p className="font-bold text-white">
                  {activePlayer.weight_kg}{' '}
                  <span className="text-gray-500 text-xs font-normal">kg</span>
                </p>
              </div>
              <div className="bg-[#15161e] p-3 rounded border border-gray-800 text-center">
                <p className="text-xs text-gray-500 uppercase">Leg Length</p>
                <p className="font-bold text-white">
                  {activePlayer.leg_length_m}{' '}
                  <span className="text-gray-500 text-xs font-normal">m</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* قسم التحليل البيوميكانيكي */}
        <div className="bg-gray-900 border border-purple-900/50 rounded-2xl p-6 shadow-[0_0_25px_rgba(168,85,247,0.1)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-purple-400">
              Analysis Engine
            </h2>
            <button
              onClick={simulateVideoAnalysis}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2 rounded-lg font-bold shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all"
            >
              Analyze Video Frames
            </button>
          </div>

          {currentStats && (
            <div className="bg-[#0f1016] border border-blue-500/30 p-6 rounded-xl animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                  label="Jump Height"
                  value={currentStats.jump_height_cm}
                  unit="cm"
                />
                <StatCard
                  label="Flight Time"
                  value={currentStats.flight_time_sec}
                  unit="sec"
                />
                <StatCard
                  label="Velocity"
                  value={currentStats.takeoff_velocity_ms}
                  unit="m/s"
                />
                <StatCard
                  label="Mean Power"
                  value={currentStats.mean_power_watts}
                  unit="W"
                />
                <StatCard
                  label="Peak Power"
                  value={currentStats.peak_power_watts}
                  unit="W"
                  color="text-purple-400"
                />
                <StatCard
                  label="Mean Force"
                  value={currentStats.mean_force_newtons}
                  unit="N"
                  color="text-red-400"
                />
                <StatCard
                  label="Impulse"
                  value={currentStats.impulse_ns}
                  unit="N.s"
                  color="text-green-400"
                />
              </div>
              <button
                onClick={saveMeasurement}
                disabled={isSaving}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-extrabold text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50"
              >
                {isSaving ? 'Extracting Data...' : 'Save Jump Record'}
              </button>
            </div>
          )}
        </div>

        {/* لوحة تاريخ اللاعب */}
        {activePlayer && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-blue-400 mb-4 uppercase tracking-wider">
              Hunter History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-sm uppercase">
                    <th className="p-3">Date</th>
                    <th className="p-3">Height (cm)</th>
                    <th className="p-3">Power (W)</th>
                    <th className="p-3">Force (N)</th>
                    <th className="p-3">Velocity (m/s)</th>
                  </tr>
                </thead>
                <tbody>
                  {playerHistory.map((jump) => (
                    <tr
                      key={jump.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-3 text-blue-200">
                        {new Date(jump.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 font-bold text-white">
                        {jump.jump_height_cm}
                      </td>
                      <td className="p-3 text-purple-300">
                        {jump.mean_power_watts}
                      </td>
                      <td className="p-3 text-red-300">
                        {jump.mean_force_newtons}
                      </td>
                      <td className="p-3 text-green-300">
                        {jump.takeoff_velocity_ms}
                      </td>
                    </tr>
                  ))}
                  {playerHistory.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-gray-500">
                        No jump records found for this player.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, color = 'text-blue-400' }) {
  return (
    <div className="bg-[#15161e] p-4 rounded-lg border border-gray-800 text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-black ${color} drop-shadow-[0_0_8px_currentColor]`}
      >
        {value}{' '}
        <span className="text-sm font-normal text-gray-500">{unit}</span>
      </p>
    </div>
  );
}
