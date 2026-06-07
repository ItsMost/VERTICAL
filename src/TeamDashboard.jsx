import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Award, ChevronDown, ChevronUp, Activity, Zap, Play, BookOpen, AlertCircle, HelpCircle, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamDashboard({ onSelectPlayer, onChangeTab, coaches = [] }) {
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestScores, setLatestScores] = useState({}); // player_id -> { cmj, approach, rsi }
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);

  // Sync selectedCoachId with the first coach if not already set or if current selectedCoachId is not in the list anymore
  useEffect(() => {
    if (coaches && coaches.length > 0) {
      if (!selectedCoachId || !coaches.some(c => c.id === selectedCoachId)) {
        setSelectedCoachId(coaches[0].id);
      }
    } else {
      setSelectedCoachId('');
    }
  }, [coaches, selectedCoachId]);


  // Fetch players and measurements on coach change
  useEffect(() => {
    if (!selectedCoachId) {
      setPlayers([]);
      setLatestScores({});
      return;
    }

    async function fetchCoachRoster() {
      setLoading(true);
      try {
        const { data: playersData, error: playersError } = await supabase
          .from('lab_players')
          .select('*')
          .eq('coach_id', selectedCoachId)
          .order('full_name');

        if (playersError || !playersData) {
          setPlayers([]);
          setLatestScores({});
          setLoading(false);
          return;
        }

        setPlayers(playersData);

        if (playersData.length === 0) {
          setLatestScores({});
          setLoading(false);
          return;
        }

        // Fetch measurements for all players in this roster
        const playerIds = playersData.map(p => p.id);
        const { data: measurementsData, error: measurementsError } = await supabase
          .from('lab_jump_measurements')
          .select('*')
          .in('player_id', playerIds)
          .order('created_at', { ascending: true }); // Ascending so that later logs overwrite older in the loop

        if (measurementsError || !measurementsData) {
          setLatestScores({});
          setLoading(false);
          return;
        }

        // Initialize scores structure
        const scores = {};
        playerIds.forEach(id => {
          scores[id] = { cmj: null, approach: null, rsi: null };
        });

        // Group measurements by player and test type, keeping the latest one
        measurementsData.forEach(m => {
          const pId = m.player_id;
          if (!scores[pId]) return;

          // 'standard' test_type is mapped to 'cmj' for backwards compatibility
          if (m.test_type === 'cmj' || m.test_type === 'standard') {
            scores[pId].cmj = m;
          } else if (m.test_type === 'approach') {
            scores[pId].approach = m;
          } else if (m.test_type === 'rsi') {
            scores[pId].rsi = m;
          }
        });

        setLatestScores(scores);
      } catch (err) {
        console.error('Error fetching roster data:', err);
      }
      setLoading(false);
    }

    fetchCoachRoster();
  }, [selectedCoachId]);

  // Age calculation helper
  const getPlayerAge = (dob) => {
    if (!dob) return 20;
    const currentYear = new Date().getFullYear();
    const birthYear = parseInt(dob.substring(0, 4));
    return currentYear - birthYear;
  };

  // Status rating helper (incorporates 15% youth discount if age < 17)
  const getStatus = (heightCm, type, gender, age) => {
    if (heightCm === undefined || heightCm === null || isNaN(heightCm) || parseFloat(heightCm) <= 0) {
      return { text: 'غير مسجل', color: 'text-gray-500 bg-gray-500/10 border-gray-500/20' };
    }

    const isYouth = age < 17;
    const discount = isYouth ? 0.85 : 1.0;
    const isFemale = gender === 'female';

    if (type === 'cmj' || type === 'approach') {
      // Convert height in cm to inches for benchmarking
      const heightInches = parseFloat(heightCm) * 0.393701;
      
      const eliteThresh = (isFemale ? 26 : 34) * discount;
      const excellentThresh = (isFemale ? 22 : 30) * discount;
      const goodThresh = (isFemale ? 18 : 26) * discount;

      if (heightInches >= eliteThresh) {
        return { text: 'نخبة 👑', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      }
      if (heightInches >= excellentThresh) {
        return { text: 'ممتاز 🏆', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      }
      if (heightInches >= goodThresh) {
        return { text: 'جيد 👍', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
      }
      return { text: 'تحت المعدل ⚠️', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    } else if (type === 'rsi') {
      const rsiVal = parseFloat(heightCm); // If type is rsi, heightCm parameter is actually the rsi score
      const eliteThresh = 3.0 * discount;
      const excellentThresh = 2.5 * discount;
      const goodThresh = 2.0 * discount;

      if (rsiVal >= eliteThresh) {
        return { text: 'نخبة 👑', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      }
      if (rsiVal >= excellentThresh) {
        return { text: 'ممتاز ⚡', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      }
      if (rsiVal >= goodThresh) {
        return { text: 'جيد 👍', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
      }
      return { text: 'ضعيف ⚠️', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    }

    return { text: '—', color: 'text-gray-500' };
  };

  // Toggle expanded row
  const toggleExpand = (playerId) => {
    setExpandedPlayerId(prev => (prev === playerId ? null : playerId));
  };

  // Generate dynamic critique based on scores
  const getBiomechanicalCritique = (player, scores) => {
    const age = getPlayerAge(player.date_of_birth);
    const gender = player.gender;
    const isFemale = gender === 'female';
    const isYouth = age < 17;

    const cmjScore = scores.cmj ? parseFloat(scores.cmj.jump_height_cm) : 0;
    const approachScore = scores.approach ? parseFloat(scores.approach.jump_height_cm) : 0;
    const rsiScore = scores.rsi ? parseFloat(scores.rsi.rsi_score) : 0;

    const cmjInches = cmjScore * 0.393701;
    const approachInches = approachScore * 0.393701;

    let positionText = '';
    let diagnosisText = '';
    let prescriptionText = '';

    // 1. Determine position in matrix
    if (cmjScore > 0) {
      const cmjStatus = getStatus(cmjScore, 'cmj', gender, age).text;
      if (rsiScore > 0) {
        const rsiStatus = getStatus(rsiScore, 'rsi', gender, age).text;
        positionText = `اللاعب يقع في فئة (${cmjStatus.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}) بالنسبة للقفز العمودي من الثبات، وفئة (${rsiStatus.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}) بالنسبة لمؤشر القوة التفاعلية (RSI).`;
      } else {
        positionText = `اللاعب يقع في فئة (${cmjStatus.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}) بالنسبة للقفز العمودي من الثبات. لم يتم تسجيل اختبار الـ RSI له حتى الآن.`;
      }
    } else {
      positionText = 'لا توجد اختبارات قفز عمودي مسجلة للاعب حالياً لإجراء التصنيف المعياري.';
    }

    // 2. Biomechanical Diagnosis
    if (cmjScore > 0 && approachScore > 0) {
      const diffInches = approachInches - cmjInches;
      const diffCm = approachScore - cmjScore;
      
      if (diffInches < 4) {
        diagnosisText = `يعاني اللاعب من عجز تنسيقي ومطاطي (Elastic & Coordination Deficit). قفزة الاقتراب الحركية (Approach Jump) بلغت ${approachScore.toFixed(1)} سم وهي أعلى بـ ${diffCm.toFixed(1)} سم فقط من القفزة من الثبات (${cmjScore.toFixed(1)} سم). بيوميكانيكياً، يجب أن يتجاوز الفارق 10-15 سم (4-6 إنشات) على الأقل. هذا النقص يشير إلى أن اللاعب لا يستفيد بكفاءة من طاقة الحركة الأفقية وسرعة الاقتراب لتحويلها إلى قوة رأسية، مع ضعف في تفعيل دورة التمدد والتقلص العضلي (Stretch-Shortening Cycle).`;
        prescriptionText = 'تطوير القوة الانفجارية المرنة باستخدام تدريبات البلايومترك السريع (Fast Plyometrics)، والقفز من الحركة مع التركيز على توافق الأطراف وسرعة الامتصاص والدفع الرأسي. يوصى بإدراج تدريبات تسارع الخطوة الأخيرة والارتقاء الحركي الموجه.';
      } else {
        diagnosisText = `يظهر اللاعب كفاءة حركية ممتازة في الاستفادة من طاقة الحركة الأفقية. قفزة الاقتراب الحركية بلغت ${approachScore.toFixed(1)} سم بفارق إيجابي يبلغ ${diffCm.toFixed(1)} سم عن قفزة الثبات (${cmjScore.toFixed(1)} سم)، وهو ما يقع في النطاق البيوميكانيكي الأمثل (+10 سم فما فوق). يعكس هذا توافقاً عصبياً عضلياً رائعاً وقدرة عالية على تخزين وإطلاق طاقة الارتداد (SSC) أثناء الارتقاء الحركي.`;
        prescriptionText = 'الاستمرار على البرنامج الحالي مع دمج تدريبات بلايومترك عالية الشدة (High-Intensity Plyometrics) للمحافظة على صلابة الأوتار، وتحسين زوايا الانطلاق وتوجيه الدفع لزيادة الكفاءة.';
      }
    } else if (cmjScore > 0) {
      diagnosisText = `تم تسجيل القفزة من الثبات فقط (${cmjScore.toFixed(1)} سم). الفحص البيوميكانيكي غير مكتمل لعدم توفر قفزة حركة (Approach Jump). من الضروري إجراء اختبار قفزة الاقتراب لتحديد الفارق الديناميكي وتشخيص ما إذا كان اللاعب يعاني من عجز مطاطي أو توافقي.`;
      
      if (rsiScore > 0 && rsiScore < 2.0) {
        prescriptionText = 'التركيز على تقوية صلابة المفصل الكاحلي (Ankle Stiffness) والحد من زمن التلامس مع الأرض باستخدام قفزات Pogo قصيرة متكررة، وقفز الحبل السريع، وتدريبات الكاحل المقاومة لزيادة مؤشر الـ RSI.';
      } else {
        prescriptionText = 'التركيز على تمارين القوة العضلية القصوى والانفجارية للقسم السفلي (تمارين القرفصاء والرفعة المميتة) لزيادة إنتاج القوة الابتدائية (Rate of Force Development).';
      }
    } else {
      diagnosisText = 'يرجى تسجيل قياسات القفز من الثبات (CMJ) وقفز الارتقاء من الحركة (Approach Jump) للبدء في تشخيص الكفاءة الميكانيكية للاعب.';
      prescriptionText = 'يتطلب تشخيص اللاعب البدء بإجراء دورة قياس كاملة للقفز العمودي ومؤشر الارتداد.';
    }

    return { positionText, diagnosisText, prescriptionText };
  };

  return (
    <div className="glass-panel p-4 md:p-6 shadow-2xl transition-all duration-300 text-right" style={{ direction: 'rtl' }}>
      
      {/* Top Controls: Header & Coach Dropdown */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-[var(--border-light)] pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">لوحة تحكم الفريق Roster Dashboard</h2>
            <p className="text-xs text-gray-400 mt-1">تتبع وتصنيف الأداء البيوميكانيكي لجميع اللاعبين بناءً على المعايير المصرية</p>
          </div>
        </div>

        {/* Coach Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-gray-400 shrink-0">المدرب المسؤول:</label>
          <div className="relative flex-1 md:flex-initial">
            <select
              value={selectedCoachId}
              onChange={(e) => setSelectedCoachId(e.target.value)}
              className="w-full md:w-60 bg-[var(--bg-input)] border border-[var(--border-color)] text-xs text-white p-3 px-4 rounded-xl outline-none font-bold focus:border-[var(--brand-main)] appearance-none cursor-pointer pr-10"
            >
              <option value="">-- اختر مدرباً --</option>
              {coaches.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Roster List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Loader2 className="animate-spin text-cyan-500" size={40} />
          <span className="text-xs font-bold">جاري تحميل قائمة الفريق وتحليل البيانات...</span>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-20 text-gray-500 border border-dashed border-[var(--border-light)] rounded-3xl p-8">
          <AlertCircle size={48} className="mx-auto text-yellow-500/50 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">لا يوجد لاعبين مسجلين</h3>
          <p className="text-xs max-w-sm mx-auto leading-relaxed">لم يتم العثور على لاعبين مرتبطين بهذا المدرب حالياً. يرجى إضافة لاعبين جدد وتخصيص هذا المدرب لهم في القائمة الجانبية.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Table Header (Hidden on Mobile) */}
          <div className="hidden md:grid grid-cols-12 gap-4 bg-black/30 border border-[var(--border-light)] p-4 rounded-2xl text-xs font-bold text-gray-400 text-center items-center">
            <div className="col-span-3 text-right pr-4">اسم اللاعب</div>
            <div className="col-span-3">القفزة من ثبات (CMJ)</div>
            <div className="col-span-3">القفزة من حركة (Approach)</div>
            <div className="col-span-2">مؤشر الارتداد (RSI)</div>
            <div className="col-span-1">التحليل</div>
          </div>

          {/* Roster Rows */}
          {players.map(player => {
            const age = getPlayerAge(player.date_of_birth);
            const scores = latestScores[player.id] || { cmj: null, approach: null, rsi: null };
            
            const cmjVal = scores.cmj ? parseFloat(scores.cmj.jump_height_cm) : null;
            const approachVal = scores.approach ? parseFloat(scores.approach.jump_height_cm) : null;
            const rsiVal = scores.rsi ? parseFloat(scores.rsi.rsi_score) : null;

            const cmjInches = cmjVal ? (cmjVal * 0.393701).toFixed(1) : null;
            const approachInches = approachVal ? (approachVal * 0.393701).toFixed(1) : null;

            const cmjStatus = getStatus(cmjVal, 'cmj', player.gender, age);
            const approachStatus = getStatus(approachVal, 'approach', player.gender, age);
            const rsiStatus = getStatus(rsiVal, 'rsi', player.gender, age);

            const isExpanded = expandedPlayerId === player.id;
            const critique = getBiomechanicalCritique(player, scores);

            return (
              <div 
                key={player.id} 
                className={`border border-[var(--border-light)] rounded-2xl overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'bg-[var(--bg-panel)] shadow-xl ring-1 ring-cyan-500/20' : 'bg-[var(--bg-panel)]/40 hover:bg-[var(--bg-panel)]/80'
                }`}
              >
                {/* Row Header Clickable */}
                <div 
                  onClick={() => toggleExpand(player.id)}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 p-4 text-center items-center cursor-pointer select-none text-xs font-medium"
                >
                  {/* Player Info */}
                  <div className="col-span-1 md:col-span-3 text-right flex items-center gap-3 pr-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="font-extrabold text-white text-sm">{player.full_name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {age} سنة • {player.gender === 'female' ? 'لاعبة' : 'لاعب'} • {player.weight_kg} كجم
                        {age < 17 && <span className="text-cyan-400 font-extrabold mr-1">(خصم ناشئين 15% 👶)</span>}
                      </div>
                    </div>
                  </div>

                  {/* CMJ Score */}
                  <div className="col-span-1 md:col-span-3 flex md:flex-col items-center justify-between md:justify-center gap-1 bg-black/10 md:bg-transparent p-2 md:p-0 rounded-xl">
                    <span className="md:hidden text-gray-500 text-[10px] font-bold">القفزة من ثبات (CMJ):</span>
                    {cmjVal ? (
                      <div className="flex flex-col items-center">
                        <span className="font-mono font-black text-white text-sm">
                          {cmjInches}" <span className="text-[10px] text-gray-400 font-bold">({cmjVal.toFixed(1)} سم)</span>
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 mt-1 rounded-md font-bold ${cmjStatus.color}`}>
                          {cmjStatus.text}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-600 font-bold">لم تقاس</span>
                    )}
                  </div>

                  {/* Approach Score */}
                  <div className="col-span-1 md:col-span-3 flex md:flex-col items-center justify-between md:justify-center gap-1 bg-black/10 md:bg-transparent p-2 md:p-0 rounded-xl">
                    <span className="md:hidden text-gray-500 text-[10px] font-bold">القفزة من حركة (Approach):</span>
                    {approachVal ? (
                      <div className="flex flex-col items-center">
                        <span className="font-mono font-black text-white text-sm">
                          {approachInches}" <span className="text-[10px] text-gray-400 font-bold">({approachVal.toFixed(1)} سم)</span>
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 mt-1 rounded-md font-bold ${approachStatus.color}`}>
                          {approachStatus.text}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-600 font-bold">لم تقاس</span>
                    )}
                  </div>

                  {/* RSI Score */}
                  <div className="col-span-1 md:col-span-2 flex md:flex-col items-center justify-between md:justify-center gap-1 bg-black/10 md:bg-transparent p-2 md:p-0 rounded-xl">
                    <span className="md:hidden text-gray-500 text-[10px] font-bold">مؤشر الارتداد (RSI):</span>
                    {rsiVal ? (
                      <div className="flex flex-col items-center">
                        <span className="font-mono font-black text-white text-sm">{rsiVal.toFixed(2)}</span>
                        <span className={`text-[9px] px-2 py-0.5 mt-1 rounded-md font-bold ${rsiStatus.color}`}>
                          {rsiStatus.text}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-600 font-bold">لم تقاس</span>
                    )}
                  </div>

                  {/* Expand Icon */}
                  <div className="col-span-1 flex justify-center md:block">
                    <div className="p-2 rounded-xl bg-[var(--bg-input)] text-gray-400 hover:text-white transition-colors">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Critique Panel */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-[var(--border-light)] bg-black/20"
                    >
                      <div className="p-5 space-y-4 text-xs leading-relaxed text-right">
                        
                        <div className="flex items-center gap-2 border-b border-[var(--border-light)] pb-2 mb-3">
                          <Award className="text-yellow-500" size={16} />
                          <h4 className="font-black text-sm text-white">التحليل الفني والميكانيكي لـ {player.full_name}</h4>
                        </div>

                        {/* Benchmark Classification */}
                        <div className="bg-cyan-950/10 border border-cyan-500/20 p-3.5 rounded-xl flex items-start gap-3">
                          <HelpCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-black text-cyan-400 mb-1">الوضع المعياري الحالي:</span>
                            <p className="text-gray-300 font-medium">{critique.positionText}</p>
                          </div>
                        </div>

                        {/* Biomechanical Diagnosis */}
                        <div className="bg-amber-950/10 border border-amber-500/20 p-3.5 rounded-xl flex items-start gap-3">
                          <Activity size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-black text-amber-400 mb-1">التشخيص البدني (Biomechanical Diagnosis):</span>
                            <p className="text-gray-300 font-medium leading-relaxed">{critique.diagnosisText}</p>
                          </div>
                        </div>

                        {/* Training Prescription */}
                        <div className="bg-emerald-950/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-start gap-3">
                          <Zap size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-black text-emerald-400 mb-1">التوصية التدريبية (Prescription):</span>
                            <p className="text-gray-300 font-medium leading-relaxed">{critique.prescriptionText}</p>
                          </div>
                        </div>

                        {/* Call to action: Select player for test */}
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => {
                              onSelectPlayer(player);
                              onChangeTab('calculator');
                            }}
                            className="px-5 py-2.5 btn-orange-gradient rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-md transition-transform hover:scale-105"
                          >
                            <Play size={14} />
                            بدء القياس والتحليل لهذا اللاعب ⏱️
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Benchmarks Quick Reference */}
      <div className="mt-8 bg-black/10 border border-[var(--border-light)] p-5 rounded-3xl text-xs space-y-3">
        <h4 className="font-extrabold text-white flex items-center gap-2 border-b border-[var(--border-light)] pb-2">
          <BookOpen size={16} className="text-cyan-400" />
          المعايير المرجعية للأداء الرياضي (المعايير المصرية وعقود الناشئين)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-400 leading-relaxed">
          <div>
            <span className="block font-bold text-white mb-1 text-cyan-400">الوثبة العمودية (CMJ):</span>
            <ul className="list-disc pr-4 space-y-1">
              <li><strong className="text-blue-400">النخبة:</strong> الرجال &gt; 34" (86.4 سم) | السيدات &gt; 26" (66 سم)</li>
              <li><strong className="text-emerald-400">الممتاز:</strong> الرجال 30" - 33.9" | السيدات 22" - 25.9"</li>
              <li><strong className="text-yellow-400">الجيد:</strong> الرجال 26" - 29.9" | السيدات 18" - 21.9"</li>
              <li><strong className="text-red-400">تحت المعدل:</strong> أقل من تلك المستويات.</li>
            </ul>
          </div>
          <div>
            <span className="block font-bold text-white mb-1 text-cyan-400">مؤشر القوة التفاعلية (RSI):</span>
            <ul className="list-disc pr-4 space-y-1">
              <li><strong className="text-blue-400">النخبة:</strong> مؤشر أكبر من 3.0 (ارتداد متفجر للغاية)</li>
              <li><strong className="text-emerald-400">الممتاز:</strong> مؤشر يتراوح بين 2.5 - 2.9 (ارتداد ممتاز)</li>
              <li><strong className="text-yellow-400">الجيد:</strong> مؤشر يتراوح بين 2.0 - 2.4 (ارتداد جيد)</li>
              <li><strong className="text-red-400">ضعيف:</strong> مؤشر أقل من 2.0 (مرونة الكاحل غير كافية)</li>
            </ul>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 pt-2 border-t border-[var(--border-light)] flex items-center gap-1.5">
          <AlertCircle size={12} className="text-cyan-500" />
          يتم تطبيق خصم ناشئين تلقائي بنسبة <strong>15%</strong> على جميع العتبات الرقمية أعلاه للاعبين الذين تقل أعمارهم عن 17 عاماً.
        </p>
      </div>

    </div>
  );
}
