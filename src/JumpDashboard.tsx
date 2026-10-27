import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { calculateElasticityQuadrant, calculateCNSReadiness } from './useJumpMechanics';
import type { Player, JumpMeasurement, ElasticityQuadrantData, CNSReadiness } from './types/athletics';
import { Activity, Zap, TrendingUp, User, ShieldAlert, Award, Plus, Calendar } from 'lucide-react';

export default function JumpDashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [playerHistory, setPlayerHistory] = useState<JumpMeasurement[]>([]);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);

  const [showNewPlayerForm, setShowNewPlayerForm] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    dob: '',
    weight: '',
    leg: '',
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      // Try lab_players first, fallback to players
      const { data: labData, error: labError } = await supabase
        .from('lab_players')
        .select('*')
        .order('created_at', { ascending: false });

      if (!labError && labData && labData.length > 0) {
        setPlayers(labData);
      } else {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) setPlayers(data);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePlayerSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPlayerId(id);

    if (id) {
      const player = players.find((p) => p.id === id) || null;
      setActivePlayer(player);
      fetchPlayerHistory(id);
    } else {
      setActivePlayer(null);
      setPlayerHistory([]);
    }
  };

  const fetchPlayerHistory = async (id: string) => {
    try {
      const { data: labMeasures, error: labErr } = await supabase
        .from('lab_jump_measurements')
        .select('*')
        .eq('player_id', id)
        .order('created_at', { ascending: false });

      if (!labErr && labMeasures && labMeasures.length > 0) {
        setPlayerHistory(labMeasures);
      } else {
        const { data, error } = await supabase
          .from('jump_measurements')
          .select('*')
          .eq('player_id', id)
          .order('created_at', { ascending: false });
        if (!error && data) setPlayerHistory(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('lab_players')
        .insert([
          {
            full_name: newPlayer.name,
            date_of_birth: newPlayer.dob,
            weight_kg: parseFloat(newPlayer.weight),
            leg_length_m: parseFloat(newPlayer.leg) || 1.0,
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
      }
    } catch (err) {
      console.error('Error adding player:', err);
    }
  };

  // Biomechanics calculations:
  // 1. All-time CMJ & RSI
  const cmjJumps = playerHistory.filter((j) => j.test_type === 'cmj' || j.test_type === 'cmj_arms' || j.test_type === 'standard');
  const bestCmj = cmjJumps.length > 0 ? Math.max(...cmjJumps.map((j) => parseFloat(String(j.jump_height_cm)) || 0)) : 0;
  const recentCmj = cmjJumps.length > 0 ? parseFloat(String(cmjJumps[0].jump_height_cm)) || 0 : bestCmj;

  const cmjNoArmsJumps = playerHistory.filter((j) => j.test_type === 'cmj_no_arms' || j.test_type === 'cmj_no_arm');
  const bestCmjNoArms = cmjNoArmsJumps.length > 0 ? Math.max(...cmjNoArmsJumps.map((j) => parseFloat(String(j.jump_height_cm)) || 0)) : 0;

  const sjJumps = playerHistory.filter((j) => j.test_type === 'sj' || j.test_type === 'sj_no_arms');
  const bestSj = sjJumps.length > 0 ? Math.max(...sjJumps.map((j) => parseFloat(String(j.jump_height_cm)) || 0)) : 0;

  const djJumps = playerHistory.filter((j) => j.test_type === 'rsi' || j.test_type === 'dj');
  const bestDj = djJumps.length > 0 ? Math.max(...djJumps.map((j) => parseFloat(String(j.jump_height_cm)) || 0)) : 0;

  // 2. Elasticity vs Strength Quadrant - EUR strictly measured by CMJ (No Arms) and SJ
  const elasticityData: ElasticityQuadrantData = calculateElasticityQuadrant(bestCmjNoArms, bestSj, bestDj);

  // 3. CNS Readiness Monitor
  const baselineCmjHistory = cmjJumps.map((j) => parseFloat(String(j.jump_height_cm)) || 0);
  const cnsReadiness: CNSReadiness = calculateCNSReadiness(recentCmj, baselineCmjHistory);

  return (
    <div className="glass-panel p-6 shadow-2xl text-right border border-white/10 relative overflow-hidden" style={{ direction: 'rtl' }}>
      <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-5 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#00F0FF]/10 rounded-2xl border border-[#00F0FF]/30 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">لوحة تحليلات القفز والجاهزية العصبية (Jump Dashboard)</h3>
            <p className="text-xs text-gray-400 mt-1">تتبع مرونة الأوتار، مربع المرونة ضد القوة، ومعدل إجهاد الجهاز العصبي المركزي (CNS)</p>
          </div>
        </div>

        {/* Player Selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedPlayerId}
            onChange={handlePlayerSelect}
            className="glass-input p-2.5 text-xs font-bold w-full sm:w-64 cursor-pointer"
          >
            <option value="">-- اختر رياضياً من الفريق --</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNewPlayerForm(!showNewPlayerForm)}
            className="p-2.5 btn-electric rounded-xl shrink-0 cursor-pointer"
            title="إضافة رياضي جديد"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {showNewPlayerForm && (
        <form onSubmit={handleAddPlayer} className="glass-card p-4 border border-white/10 rounded-2xl mb-6 max-w-xl mx-auto space-y-3">
          <h4 className="text-sm font-bold text-white mb-2">إضافة لاعب جديد</h4>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="اسم اللاعب"
              value={newPlayer.name}
              onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
              className="glass-input text-xs"
              required
            />
            <input
              type="date"
              value={newPlayer.dob}
              onChange={(e) => setNewPlayer({ ...newPlayer, dob: e.target.value })}
              className="glass-input text-xs"
              required
            />
            <input
              type="number"
              step="0.5"
              placeholder="الوزن (kg)"
              value={newPlayer.weight}
              onChange={(e) => setNewPlayer({ ...newPlayer, weight: e.target.value })}
              className="glass-input text-xs"
              required
            />
            <input
              type="number"
              step="0.01"
              placeholder="طول الرجل (m)"
              value={newPlayer.leg}
              onChange={(e) => setNewPlayer({ ...newPlayer, leg: e.target.value })}
              className="glass-input text-xs"
            />
          </div>
          <button type="submit" className="w-full py-2.5 btn-electric rounded-xl text-xs font-bold cursor-pointer">
            حفظ اللاعب
          </button>
        </form>
      )}

      {activePlayer ? (
        <div className="space-y-6">
          {/* Athlete Info Bar */}
          <div className="glass-card p-4 border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/30 flex items-center justify-center text-white font-bold text-lg">
                {activePlayer.full_name[0]}
              </div>
              <div>
                <h4 className="text-base font-black text-white">{activePlayer.full_name}</h4>
                <p className="text-xs text-gray-400 font-sans">
                  الكتلة: <span className="font-mono text-white">{activePlayer.weight_kg} kg</span> • العمر: <span className="font-mono text-white">{calculateAge(activePlayer.date_of_birth)} سنة</span>
                </p>
              </div>
            </div>

            {/* CNS Readiness Capsule */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl border" style={{ backgroundColor: `${cnsReadiness.color}15`, borderColor: `${cnsReadiness.color}40` }}>
              <Zap size={20} style={{ color: cnsReadiness.color }} />
              <div>
                <span className="text-[10px] font-bold block" style={{ color: cnsReadiness.color }}>
                  مؤشر جاهزية الجهاز العصبي (CNS Readiness):
                </span>
                <span className="text-xs font-black text-white">{cnsReadiness.statusLabelAr}</span>
              </div>
            </div>
          </div>

          {/* Biomechanical Feature 1: Elasticity vs Strength Quadrant */}
          <div className="glass-card p-6 border border-white/10 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <TrendingUp className="text-[#00F0FF]" size={18} />
                  مربع المرونة ضد القوة العضلية (Elasticity vs Strength Quadrant)
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  حساب معامل استغلال الانقباض اللامركزي (EUR = CMJ No Arms / SJ) ومؤشر الارتداد (DJ / CMJ) لتحديد نوع البروفايل الحركي.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full border" style={{ color: elasticityData.color, borderColor: elasticityData.color, backgroundColor: `${elasticityData.color}15` }}>
                {elasticityData.titleAr}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-[#0B0F19] p-4 rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] text-gray-400 block mb-1">معدل الاستغلال اللامركزي (EUR)</span>
                <span className="text-2xl font-black text-[#00F0FF] font-mono metric-num">{elasticityData.eur}</span>
                <span className="text-[9px] text-gray-500 block mt-1">(الهدف المثالي: 1.05 - 1.15)</span>
              </div>
              <div className="bg-[#0B0F19] p-4 rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] text-gray-400 block mb-1">مؤشر القفز الارتدادي (DJ/CMJ)</span>
                <span className="text-2xl font-black text-emerald-400 font-mono metric-num">{elasticityData.reactiveIndex}</span>
                <span className="text-[9px] text-gray-500 block mt-1">(الهدف المثالي: 0.95 - 1.05)</span>
              </div>
              <div className="bg-[#0B0F19] p-4 rounded-2xl border border-white/10 text-center">
                <span className="text-[10px] text-gray-400 block mb-1">أفضل وثب عمودي (CMJ PB)</span>
                <span className="text-2xl font-black text-white font-mono metric-num">{bestCmj.toFixed(1)} <span className="text-xs text-gray-500 font-sans">cm</span></span>
                <span className="text-[9px] text-[#00F0FF] block mt-1">الرقم القياسي المسجل</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-black/40 text-xs text-gray-300 leading-relaxed font-sans" style={{ borderColor: `${elasticityData.color}40` }}>
              💡 <b>الوصفة الفسيولوجية:</b> {elasticityData.descriptionAr}
            </div>
          </div>

          {/* Biomechanical Feature 2: CNS Readiness Monitor Card */}
          <div className="glass-card p-6 border border-white/10 rounded-3xl" style={{ borderRightWidth: 4, borderRightColor: cnsReadiness.color }}>
            <h4 className="text-base font-black text-white mb-2 flex items-center gap-2">
              <ShieldAlert style={{ color: cnsReadiness.color }} size={18} />
              مراقب الإجهاد العصبي المركزي (CNS Fatigue Monitor)
            </h4>
            <p className="text-xs text-gray-300 mb-4 leading-relaxed font-sans">
              مقارنة أحدث قفزة ({cnsReadiness.todayCmj} cm) بالمتوسط المرجعي التراكمي ({cnsReadiness.baselineCmj} cm).
              معدل الانخفاض الحالي: <span className="font-mono font-bold" style={{ color: cnsReadiness.color }}>{cnsReadiness.percentDrop}%</span>.
            </p>
            <div className="p-3 rounded-xl bg-[#0B0F19] border border-white/10 text-xs font-sans text-gray-200">
              📌 {cnsReadiness.recommendationAr}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-16 text-center border border-white/10 rounded-3xl">
          <User size={48} className="mx-auto text-gray-600 mb-3" />
          <h4 className="text-base font-bold text-gray-300 mb-1">اختر لاعباً من القائمة لعرض التحليلات</h4>
          <p className="text-xs text-gray-500">سيتم استعراض مربع المرونة، معامل EUR، ومؤشر الجاهزية العصبية فوراً.</p>
        </div>
      )}
    </div>
  );
}
