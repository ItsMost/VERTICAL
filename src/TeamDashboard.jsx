import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Award, ChevronDown, ChevronUp, Activity, Zap, Play, BookOpen, AlertCircle, HelpCircle, User, Loader2, X, Scaling, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamDashboard({ onSelectPlayer, onChangeTab, coaches = [], onEditPlayer }) {
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [latestScores, setLatestScores] = useState({}); // player_id -> { cmj, approach, rsi }
  const [expandedPlayerId, setExpandedPlayerId] = useState(null);
  const [showHandbookModal, setShowHandbookModal] = useState(false);
  const [isCoachDropdownOpen, setIsCoachDropdownOpen] = useState(false);
  const [activeHandbookTab, setActiveHandbookTab] = useState('men');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [teamAverages, setTeamAverages] = useState({ cmj: null, approach: null, rsi: null });

  // Fetch all measurements to calculate team averages
  useEffect(() => {
    async function fetchTeamAverages() {
      try {
        const { data, error } = await supabase
          .from('lab_jump_measurements')
          .select('test_type, jump_height_cm, rsi_score');
        
        if (!error && data) {
          let cmjSum = 0, cmjCount = 0;
          let appSum = 0, appCount = 0;
          let rsiSum = 0, rsiCount = 0;
          
          data.forEach(m => {
            if (m.test_type === 'cmj' || m.test_type === 'standard') {
              const val = parseFloat(m.jump_height_cm);
              if (val > 0) { cmjSum += val; cmjCount++; }
            } else if (m.test_type === 'approach') {
              const val = parseFloat(m.jump_height_cm);
              if (val > 0) { appSum += val; appCount++; }
            } else if (m.test_type === 'rsi') {
              const val = parseFloat(m.rsi_score);
              if (val > 0) { rsiSum += val; rsiCount++; }
            }
          });
          
          setTeamAverages({
            cmj: cmjCount > 0 ? cmjSum / cmjCount : null,
            approach: appCount > 0 ? appSum / appCount : null,
            rsi: rsiCount > 0 ? rsiSum / rsiCount : null
          });
        }
      } catch (err) {
        console.error("Error fetching team averages:", err);
      }
    }
    fetchTeamAverages();
  }, []);

  // Sync selectedCoachId with the first coach if not already set or if current selectedCoachId is not in the list anymore
  useEffect(() => {
    if (coaches && coaches.length > 0) {
      if (!selectedCoachId || (!coaches.some(c => c.id === selectedCoachId) && selectedCoachId !== 'all' && selectedCoachId !== 'unassigned')) {
        setSelectedCoachId('all');
      }
    } else {
      if (selectedCoachId !== 'all' && selectedCoachId !== 'unassigned') {
        setSelectedCoachId('all');
      }
    }
  }, [coaches, selectedCoachId]);

  // Fetch players and measurements on coach change
  useEffect(() => {
    if (selectedCoachId === undefined || selectedCoachId === null) {
      setPlayers([]);
      setLatestScores({});
      return;
    }

    async function fetchCoachRoster() {
      setLoading(true);
      try {
        let query = supabase.from('lab_players').select('*');
        
        if (selectedCoachId === 'unassigned') {
          query = query.is('coach_id', null);
        } else if (selectedCoachId !== 'all' && selectedCoachId) {
          query = query.eq('coach_id', selectedCoachId);
        }
        
        const { data: playersData, error: playersError } = await query.order('full_name');

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

        // Group measurements by player and test type, keeping the peak (maximum) one
        measurementsData.forEach(m => {
          const pId = m.player_id;
          if (!scores[pId]) return;

          if (m.test_type === 'cmj' || m.test_type === 'standard') {
            const currentVal = m.jump_height_cm ? parseFloat(m.jump_height_cm) : 0;
            const existingVal = scores[pId].cmj ? parseFloat(scores[pId].cmj.jump_height_cm || 0) : -1;
            if (currentVal > existingVal) {
              scores[pId].cmj = m;
            }
          } else if (m.test_type === 'approach') {
            const currentVal = m.jump_height_cm ? parseFloat(m.jump_height_cm) : 0;
            const existingVal = scores[pId].approach ? parseFloat(scores[pId].approach.jump_height_cm || 0) : -1;
            if (currentVal > existingVal) {
              scores[pId].approach = m;
            }
          } else if (m.test_type === 'rsi') {
            const currentVal = m.rsi_score ? parseFloat(m.rsi_score) : 0;
            const existingVal = scores[pId].rsi ? parseFloat(scores[pId].rsi.rsi_score || 0) : -1;
            if (currentVal > existingVal) {
              scores[pId].rsi = m;
            }
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

  const getComparisonBadge = (playerVal, avgVal) => {
    if (!playerVal || !avgVal) return null;
    const diffPct = ((playerVal - avgVal) / avgVal) * 100;
    const isPositive = diffPct >= 0;
    const absDiff = Math.abs(diffPct).toFixed(0);
    
    if (isPositive) {
      return (
        <span className="text-[9px] px-1.5 py-0.5 mt-1 rounded-md font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/30 block text-center">
          +{absDiff}% من المتوسط 📈
        </span>
      );
    } else {
      return (
        <span className="text-[9px] px-1.5 py-0.5 mt-1 rounded-md font-bold bg-orange-950/40 text-orange-400 border border-orange-800/30 block text-center">
          -{absDiff}% من المتوسط 📉
        </span>
      );
    }
  };

  // Calculate overall Biomechanical Score (0-100)
  const getBiomechanicalRating = (scores, player, age) => {
    const isFemale = player.gender === 'female';
    const isYouth = age < 17;
    const discount = isYouth ? 0.85 : 1.0;

    let totalPoints = 0;
    let testsCount = 0;

    const cmjVal = scores.cmj ? parseFloat(scores.cmj.jump_height_cm) : null;
    const approachVal = scores.approach ? parseFloat(scores.approach.jump_height_cm) : null;
    const rsiVal = scores.rsi ? parseFloat(scores.rsi.rsi_score) : null;

    if (cmjVal) {
      const eliteThresh = (isFemale ? 26 : 34) * discount * 2.54; // convert inches to cm
      const percentage = Math.min(100, (cmjVal / eliteThresh) * 100);
      totalPoints += percentage;
      testsCount++;
    }

    if (approachVal) {
      const eliteThresh = ((isFemale ? 26 : 34) + 6) * discount * 2.54; // approach elite usually ~6 inches higher
      const percentage = Math.min(100, (approachVal / eliteThresh) * 100);
      totalPoints += percentage;
      testsCount++;
    }

    if (rsiVal) {
      const eliteThresh = 3.0 * discount;
      const percentage = Math.min(100, (rsiVal / eliteThresh) * 100);
      totalPoints += percentage;
      testsCount++;
    }

    if (testsCount === 0) return 0;
    return Math.round(totalPoints / testsCount);
  };

  // Status rating helper (incorporates 15% youth discount if age < 17)
  const getStatus = (heightCm, type, gender, age) => {
    if (heightCm === undefined || heightCm === null || isNaN(heightCm) || parseFloat(heightCm) <= 0) {
      return { text: 'غير مسجل', color: 'text-gray-500 bg-gray-500/10 border-gray-750/20' };
    }

    const isYouth = age < 17;
    const discount = isYouth ? 0.85 : 1.0;
    const isFemale = gender === 'female';

    if (type === 'cmj' || type === 'approach') {
      const heightInches = parseFloat(heightCm) * 0.393701;
      
      const eliteThresh = (isFemale ? 26 : 34) * discount;
      const excellentThresh = (isFemale ? 22 : 30) * discount;
      const goodThresh = (isFemale ? 18 : 26) * discount;

      if (heightInches >= eliteThresh) {
        return { text: 'النخبة 🏆', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40' };
      }
      if (heightInches >= excellentThresh) {
        return { text: 'ممتاز ⭐', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' };
      }
      if (heightInches >= goodThresh) {
        return { text: 'جيد ⚡', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-800/40' };
      }
      return { text: 'يحتاج تطوير ⚠️', color: 'text-orange-500 bg-orange-950/40 border-orange-900/40' };
    } else if (type === 'rsi') {
      const rsiVal = parseFloat(heightCm);
      const eliteThresh = 3.0 * discount;
      const excellentThresh = 2.5 * discount;
      const goodThresh = 2.0 * discount;

      if (rsiVal >= eliteThresh) {
        return { text: 'النخبة 🏆', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40' };
      }
      if (rsiVal >= excellentThresh) {
        return { text: 'ممتاز ⭐', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' };
      }
      if (rsiVal >= goodThresh) {
        return { text: 'جيد ⚡', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-800/40' };
      }
      return { text: 'يحتاج تطوير ⚠️', color: 'text-orange-500 bg-orange-950/40 border-orange-900/40' };
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
      const diffCm = approachScore - cmjScore;
      
      if (diffCm < 10) {
        diagnosisText = `يعاني اللاعب من "عجز في توظيف القوة المطاطية والتوافق الحركي أثناء الاقتراب" (Elastic/Coordination Efficiency Deficit). قفزة الاقتراب الحركية (Approach Jump) بلغت ${approachScore.toFixed(1)} سم وهي أعلى بـ ${diffCm.toFixed(1)} سم فقط من القفزة من الثبات (${cmjScore.toFixed(1)} سم). بيوميكانيكياً، يجب أن يتجاوز الفارق 10-15 سم (4-6 إنشات) على الأقل. هذا النقص يشير إلى أن اللاعب لا يستفيد بكفاءة من طاقة الحركة الأفقية وسرعة الاقتراب لتحويلها إلى قوة رأسية، مع ضعف في تفعيل دورة التمدد والتقلص العضلي (Stretch-Shortening Cycle).`;
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
      diagnosisText = 'يرجى تسجيل قياسات القفز من الثبات (CMJ) وقفز الارتقاء من الحركة (Approach Jump) للبدء in تشخيص الكفاءة الميكانيكية للاعب.';
      prescriptionText = 'يتطلب تشخيص اللاعب البدء بإجراء دورة قياس كاملة للقفز العمودي ومؤشر الارتداد.';
    }

    return { positionText, diagnosisText, prescriptionText };
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === 'all' || player.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  return (
    <div className="glass-panel p-4 md:p-6 shadow-2xl transition-all duration-300 text-right animate-fade-in" style={{ direction: 'rtl' }}>
      
      {/* Top Controls: Header & Coach Dropdown */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-gray-800/60 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">لوحة تحكم الفريق Roster Dashboard</h2>
            <p className="text-xs text-gray-400 mt-1">تتبع وتصنيف الأداء البيوميكانيكي لجميع اللاعبين بناءً على المعايير المصرية</p>
          </div>
        </div>

        {/* Coach Dropdown & Handbook Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => setShowHandbookModal(true)}
            className="px-4 py-3 bg-cyan-950/40 hover:bg-cyan-600 text-cyan-400 hover:text-white border border-cyan-800/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-md transition-all shadow-md cursor-pointer"
          >
            <BookOpen size={14} /> دليل معايير النخبة المصرية 📖
          </button>
          
          <div className="flex items-center gap-3 relative">
            <label className="text-xs font-bold text-gray-400 shrink-0">المدرب المسؤول:</label>
            <div className="relative flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setIsCoachDropdownOpen(!isCoachDropdownOpen)}
                className="w-full sm:w-60 bg-[#111827]/60 border border-gray-800 text-xs text-white p-3 px-4 rounded-xl outline-none font-bold focus:border-cyan-500 flex items-center justify-between gap-2 cursor-pointer text-right min-w-[15rem]"
              >
                <span>
                  {selectedCoachId === 'all' 
                    ? 'جميع اللاعبين (الكل)' 
                    : selectedCoachId === 'unassigned' 
                      ? 'لاعبون بدون مدرب' 
                      : (coaches.find(c => c.id === selectedCoachId)?.full_name || '-- اختر مدرباً --')}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-205 ${isCoachDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isCoachDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setIsCoachDropdownOpen(false)} 
                    />
                    
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 right-0 z-50 mt-1.5 bg-[#0b1429]/95 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md max-h-72 overflow-y-auto w-full min-w-[15rem]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCoachId('all');
                          setIsCoachDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-right text-xs hover:bg-cyan-500/10 transition-colors block border-b border-gray-800/40 ${selectedCoachId === 'all' ? 'bg-cyan-500/20 text-white font-extrabold' : 'text-gray-450 font-bold'}`}
                      >
                        جميع اللاعبين (الكل)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCoachId('unassigned');
                          setIsCoachDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-right text-xs hover:bg-cyan-500/10 transition-colors block border-b border-gray-800/40 ${selectedCoachId === 'unassigned' ? 'bg-cyan-500/20 text-white font-extrabold' : 'text-gray-450 font-bold'}`}
                      >
                        لاعبون بدون مدرب
                      </button>
                      {coaches.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCoachId(c.id);
                            setIsCoachDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-right text-xs hover:bg-cyan-500/10 transition-colors block border-b border-gray-800/40 last:border-b-0 ${selectedCoachId === c.id ? 'bg-cyan-500/20 text-white font-extrabold' : 'text-gray-300'}`}
                        >
                          {c.full_name}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Search and Filter Options */}
      <div className="bg-[#111827]/25 border border-gray-800/60 p-4 rounded-2xl mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="ابحث عن لاعب بالاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111827]/40 border border-gray-800 text-xs text-white p-3 pr-10 rounded-xl outline-none font-bold focus:border-cyan-500 text-right placeholder-gray-500"
            />
            <span className="absolute right-3 top-3.5 text-gray-500 text-sm">🔍</span>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setGenderFilter('all')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${genderFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-[#111827]/20 border-gray-800 text-gray-405 hover:text-white'}`}
            >
              الكل
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${genderFilter === 'male' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-[#111827]/20 border-gray-800 text-gray-405 hover:text-white'}`}
            >
              ذكور
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${genderFilter === 'female' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-[#111827]/20 border-gray-800 text-gray-405 hover:text-white'}`}
            >
              إناث
            </button>
          </div>
        </div>
      </div>

      {/* Main Roster List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Loader2 className="animate-spin text-cyan-500" size={40} />
          <span className="text-xs font-bold">جاري تحميل قائمة الفريق وتحليل البيانات...</span>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-3xl p-8">
          <AlertCircle size={48} className="mx-auto text-yellow-500/40 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">لا يوجد لاعبين مطبقين</h3>
          <p className="text-xs max-w-sm mx-auto leading-relaxed text-gray-400">
            لم يتم العثور على لاعبين يطابقون خيارات البحث الحالية. يرجى إضافة لاعبين جدد وتخصيص هذا المدرب لهم.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map(player => {
            const age = getPlayerAge(player.date_of_birth);
            const playerHeight = localStorage.getItem(`player_height_${player.id}`) || '—';
            const playerStandingReach = localStorage.getItem(`standing_reach_${player.id}`) || '—';
            const standingReachNum = parseFloat(playerStandingReach);

            const scores = latestScores[player.id] || { cmj: null, approach: null, rsi: null };
            
            const cmjVal = scores.cmj ? parseFloat(scores.cmj.jump_height_cm) : null;
            const approachVal = scores.approach ? parseFloat(scores.approach.jump_height_cm) : null;
            const rsiVal = scores.rsi ? parseFloat(scores.rsi.rsi_score) : null;

            const maxReachCmj = (standingReachNum && cmjVal) ? (standingReachNum + cmjVal).toFixed(0) : null;
            const maxReachApproach = (standingReachNum && approachVal) ? (standingReachNum + approachVal).toFixed(0) : null;

            const cmjInches = cmjVal ? (cmjVal * 0.393701).toFixed(1) : null;
            const approachInches = approachVal ? (approachVal * 0.393701).toFixed(1) : null;

            const cmjStatus = getStatus(cmjVal, 'cmj', player.gender, age);
            const approachStatus = getStatus(approachVal, 'approach', player.gender, age);
            const rsiStatus = getStatus(rsiVal, 'rsi', player.gender, age);

            const isExpanded = expandedPlayerId === player.id;
            const critique = getBiomechanicalCritique(player, scores);
            const rating = getBiomechanicalRating(scores, player, age);

            return (
              <div 
                key={player.id} 
                className={`bg-[#111827]/40 backdrop-blur-xl border rounded-3xl p-5 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group ${
                  isExpanded ? 'border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.1)]' : 'border-gray-800'
                }`}
              >
                {/* Visual glow indicator border */}
                <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l transition-all duration-300 opacity-60 ${
                  rating >= 90 ? 'from-cyan-500 to-blue-500' : rating >= 75 ? 'from-emerald-500 to-teal-500' : rating >= 60 ? 'from-yellow-500 to-amber-500' : rating > 0 ? 'from-orange-500 to-red-500' : 'from-gray-700 to-gray-800'
                }`} />

                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-white text-base leading-tight">{player.full_name}</h4>
                          {onEditPlayer && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditPlayer(player);
                              }}
                              className="p-1 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all cursor-pointer"
                              title="تعديل بيانات اللاعب"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-455 mt-1 font-semibold flex items-center gap-1.5 flex-wrap">
                          <span>{age} سنة</span>
                          <span>•</span>
                          <span>{player.gender === 'female' ? 'لاعبة' : 'لاعب'}</span>
                          <span>•</span>
                          <span>{player.weight_kg} كجم</span>
                          <span>•</span>
                          <span>الطول: {playerHeight} سم</span>
                          <span>•</span>
                          <span>الوصول: {playerStandingReach} سم</span>
                        </div>
                      </div>
                    </div>

                    {/* Biomechanical score progress circle */}
                    {(() => {
                      const strokeDashoffset = 125.6 - (125.6 * rating) / 100;
                      return (
                        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center bg-black/20 rounded-full border border-gray-800/40">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                            <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                            <circle 
                              cx="25" 
                              cy="25" 
                              r="20" 
                              fill="none" 
                              stroke={rating >= 90 ? "#06b6d4" : rating >= 75 ? "#10b981" : rating >= 60 ? "#eab308" : rating > 0 ? "#ea580c" : "#374151"} 
                              strokeWidth="4" 
                              strokeDasharray="125.6"
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider">Score</span>
                            <span className="text-[11px] font-black text-white font-mono leading-none mt-0.5">{rating}%</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Youth/Junior Flag */}
                  {age < 17 && (
                    <div className="mb-3 px-3 py-1 bg-cyan-950/20 border border-cyan-800/30 rounded-xl text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                      <Scaling size={12} />
                      <span>معامل ناشئين مفعّل (خصم 15% من الحدود) 👶</span>
                    </div>
                  )}

                  {/* Metrics Dashboard */}
                  <div className="grid grid-cols-3 gap-2 border-t border-b border-gray-800/60 py-3 my-4 bg-black/15 rounded-2xl px-2">
                    {/* CMJ Mini Gauge */}
                    <div className="flex flex-col items-center justify-between text-center">
                      <span className="text-[9px] text-gray-455 font-extrabold block mb-1">CMJ ثبات</span>
                      {cmjVal ? (
                        <>
                          <span className="text-xs font-black text-white font-mono leading-none">
                            {cmjVal.toFixed(1)} <span className="text-[9px] text-gray-450 font-normal">سم</span>
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono mt-0.5">({cmjInches}")</span>
                          {maxReachCmj && (
                            <span className="text-[9px] text-cyan-400 font-bold mt-1">
                              الوصول: {maxReachCmj} سم
                            </span>
                          )}
                          <span className={`text-[8px] px-1.5 py-0.5 mt-1.5 rounded-md font-bold leading-none ${cmjStatus.color}`}>
                            {cmjStatus.text.replace(/[🏆⭐⚡⚠️]/g, '').trim()}
                          </span>
                          {getComparisonBadge(cmjVal, teamAverages.cmj)}
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-bold mt-1.5">لم يقاس</span>
                      )}
                    </div>

                    {/* Approach Mini Gauge */}
                    <div className="flex flex-col items-center justify-between text-center border-r border-l border-gray-800/80">
                      <span className="text-[9px] text-gray-455 font-extrabold block mb-1">Approach حركي</span>
                      {approachVal ? (
                        <>
                          <span className="text-xs font-black text-white font-mono leading-none">
                            {approachVal.toFixed(1)} <span className="text-[9px] text-gray-450 font-normal">سم</span>
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono mt-0.5">({approachInches}")</span>
                          {maxReachApproach && (
                            <span className="text-[9px] text-cyan-400 font-bold mt-1">
                              الوصول: {maxReachApproach} سم
                            </span>
                          )}
                          <span className={`text-[8px] px-1.5 py-0.5 mt-1.5 rounded-md font-bold leading-none ${approachStatus.color}`}>
                            {approachStatus.text.replace(/[🏆⭐⚡⚠️]/g, '').trim()}
                          </span>
                          {getComparisonBadge(approachVal, teamAverages.approach)}
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-bold mt-1.5">لم يقاس</span>
                      )}
                    </div>

                    {/* RSI Mini Gauge */}
                    <div className="flex flex-col items-center justify-between text-center">
                      <span className="text-[9px] text-gray-455 font-extrabold block mb-1">RSI ارتداد</span>
                      {rsiVal ? (
                        <>
                          <span className="text-xs font-black text-white font-mono leading-none">
                            {rsiVal.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-gray-500 font-normal mt-0.5">Index</span>
                          <span className={`text-[8px] px-1.5 py-0.5 mt-1.5 rounded-md font-bold leading-none ${rsiStatus.color}`}>
                            {rsiStatus.text.replace(/[🏆⭐⚡⚠️]/g, '').trim()}
                          </span>
                          {getComparisonBadge(rsiVal, teamAverages.rsi)}
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-600 font-bold mt-1.5">لم يقاس</span>
                      )}
                    </div>
                  </div>

                  {/* Expand Analysis Button */}
                  <button 
                    onClick={() => toggleExpand(player.id)}
                    className="w-full py-2 bg-black/25 hover:bg-black/40 border border-gray-800 text-gray-405 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 mb-2 cursor-pointer"
                  >
                    <span>{isExpanded ? 'إخفاء التحليل الحركي 📊' : 'عرض التحليل الميكانيكي الحيوي 📊'}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expandable Critique Section */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-800/80 bg-black/10 rounded-2xl overflow-hidden mt-3"
                      >
                        <div className="p-4 space-y-3.5 text-xs text-right leading-relaxed">
                          
                          <div className="flex items-center gap-2 border-b border-gray-800/60 pb-1.5 mb-2">
                            <Award className="text-cyan-455" size={14} />
                            <h4 className="font-extrabold text-xs text-gray-205">التحليل الحركي والبدني التفصيلي</h4>
                          </div>
                          
                          <div className="space-y-2.5">
                            <div className="bg-cyan-950/20 border border-cyan-500/15 p-3 rounded-xl flex items-start gap-2">
                              <HelpCircle size={14} className="text-cyan-450 shrink-0 mt-0.5" />
                              <div>
                                <span className="block font-black text-cyan-450 mb-0.5">الوضع المعياري الحالي:</span>
                                <p className="text-gray-300 font-semibold">{critique.positionText}</p>
                              </div>
                            </div>

                            <div className="bg-amber-950/20 border border-amber-500/15 p-3 rounded-xl flex items-start gap-2">
                              <Activity size={14} className="text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="block font-black text-amber-400 mb-0.5">التشخيص الميكانيكي الحيوي:</span>
                                <p className="text-gray-300 font-semibold">{critique.diagnosisText}</p>
                              </div>
                            </div>

                            <div className="bg-emerald-950/20 border border-emerald-500/15 p-3 rounded-xl flex items-start gap-2">
                              <Zap size={14} className="text-emerald-450 shrink-0 mt-0.5" />
                              <div>
                                <span className="block font-black text-emerald-450 mb-0.5">التوصيات التدريبية:</span>
                                <p className="text-gray-300 font-semibold">{critique.prescriptionText}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer action button */}
                <div className="mt-4 pt-3 border-t border-gray-800/40">
                  <button
                    onClick={() => {
                      onSelectPlayer(player);
                      onChangeTab('calculator');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-405 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-orange-500/10 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play size={12} fill="currentColor" />
                    <span>بدء قياسات الارتقاء للاعب ⏱️</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Benchmarks Handbook Handbook Modal */}
      {showHandbookModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in text-right" style={{ direction: 'rtl' }}>
          <div className="bg-[#0b1429] border border-gray-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative">
            <button 
              onClick={() => setShowHandbookModal(false)} 
              className="absolute top-4 left-4 text-gray-400 hover:text-white transition-all bg-black/20 p-2 rounded-full border border-gray-800 cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 mb-4 border-b border-gray-850 pb-2 flex items-center gap-2">
              <BookOpen className="text-cyan-400" size={22} /> دليل معايير الأداء والقياسات البيوميكانيكية
            </h2>
            
            {/* Modal Tabs */}
            <div className="flex border-b border-gray-800 mb-6 bg-black/20 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveHandbookTab('men')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeHandbookTab === 'men' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                الرجال (Men)
              </button>
              <button 
                onClick={() => setActiveHandbookTab('women')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeHandbookTab === 'women' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                السيدات (Women)
              </button>
              <button 
                onClick={() => setActiveHandbookTab('rsi')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeHandbookTab === 'rsi' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                مؤشر الارتداد (RSI)
              </button>
              <button 
                onClick={() => setActiveHandbookTab('juniors')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeHandbookTab === 'juniors' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                الناشئين (Juniors)
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {activeHandbookTab === 'men' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-405 leading-relaxed">
                    المعايير المعتمدة لتقييم قفز الثبات العمودي (CMJ) لفئة الرجال البالغين (الكبار):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#111827]/40 border border-cyan-500/20 p-3 rounded-2xl">
                      <span className="text-cyan-400 font-extrabold block">🏆 النخبة (Elite)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">أكثر من 34 إنش (86.4+ سم)</p>
                      <p className="text-[10px] text-gray-405 mt-1">يمثل تصنيف المحترفين الدوليين واللاعبين الأولمبيين.</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-emerald-500/20 p-3 rounded-2xl">
                      <span className="text-emerald-400 font-extrabold block">⭐ ممتاز (Excellent)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">30 إلى 33.9 إنش (76.2 - 86.1 سم)</p>
                      <p className="text-[10px] text-gray-405 mt-1">كفاءة بدنية ممتازة للاعبي الدوري الممتاز والدرجة الأولى.</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-yellow-500/20 p-3 rounded-2xl">
                      <span className="text-yellow-400 font-extrabold block">⚡ جيد (Good)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">26 إلى 29.9 إنش (66.0 - 75.9 سم)</p>
                      <p className="text-[10px] text-gray-405 mt-1">الحد المتوسط المقبول للرياضي المحترف في الرياضات الجماعية.</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-orange-500/20 p-3 rounded-2xl">
                      <span className="text-orange-500 font-extrabold block">⚠️ يحتاج تطوير (Under-developed)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">أقل من 26 إنش (دون 66 سم)</p>
                      <p className="text-[10px] text-gray-405 mt-1">يتطلب برنامجاً عاجلاً لتطوير إنتاج القوة الابتدائية والانفجارية.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeHandbookTab === 'women' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-405 leading-relaxed">
                    المعايير المعتمدة لتقييم قفز الثبات العمودي (CMJ) لفئة السيدات البالغات (الكبار):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#111827]/40 border border-cyan-500/20 p-3 rounded-2xl">
                      <span className="text-cyan-400 font-extrabold block">🏆 النخبة (Elite)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">أكثر من 26 إنش (66.0+ سم)</p>
                      <p className="text-[10px] text-gray-405 mt-1">تصنيف اللاعبات الأولمبيات ومحترفات الصف الأول عالمياً.</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-emerald-500/20 p-3 rounded-2xl">
                      <span className="text-emerald-400 font-extrabold block">⭐ ممتاز (Excellent)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">22 إلى 25.9 إنش (55.8 - 65.7 سم)</p>
                      <p className="text-[10px] text-gray-405 mt-1">مستوى متميز جداً يلبي أعلى متطلبات المنافسة الاحترافية.</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-yellow-500/20 p-3 rounded-2xl">
                      <span className="text-yellow-400 font-extrabold block">⚡ جيد (Good)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">18 إلى 21.9 إنش (45.7 - 55.6 سم)</p>
                      <p className="text-[10px] text-gray-405 mt-1">الحد المقبول للاعبات الرياضات الجماعية في الدوري الممتاز.</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-orange-500/20 p-3 rounded-2xl">
                      <span className="text-orange-550 font-extrabold block">⚠️ يحتاج تطوير (Under-developed)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">أقل من 18 إنش (دون 45.7 سم)</p>
                      <p className="text-[10px] text-gray-405 mt-1">يشير لعجز قوة ويتطلب تركيزاً مكثفاً على تدريبات RFD وقوة الساقين.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeHandbookTab === 'rsi' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-405 leading-relaxed">
                    مؤشر القوة الارتدادية التفاعلية (Reactive Strength Index - RSI) يقيس كفاءة دورة التمدد والتقلص العضلي الصلبة (SSC) أثناء قفز الهبوط (Drop Jump):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#111827]/40 border border-cyan-500/20 p-3 rounded-2xl">
                      <span className="text-cyan-400 font-extrabold block">🏆 النخبة (Elite)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">RSI أعلى من 3.0</p>
                      <p className="text-[10px] text-gray-405 mt-1">صلابة وتفاعل أوتار فائق مع تلامس سريع جداً مع الأرض.</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-emerald-500/20 p-3 rounded-2xl">
                      <span className="text-emerald-400 font-extrabold block">⭐ ممتاز (Excellent)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">RSI من 2.5 إلى 2.99</p>
                      <p className="text-[10px] text-gray-405 mt-1">ارتداد عصبي عضلي سريع وقدرة تخزين طاقة مطاطية ممتازة.</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-yellow-500/20 p-3 rounded-2xl">
                      <span className="text-yellow-400 font-extrabold block">⚡ جيد (Good)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">RSI من 2.0 إلى 2.49</p>
                      <p className="text-[10px] text-gray-405 mt-1">مستوى حركي متوازن يضمن الحماية من إصابات الكاحل والركبة.</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-orange-500/20 p-3 rounded-2xl">
                      <span className="text-orange-550 font-extrabold block">⚠️ يحتاج تطوير (Under-developed)</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">RSI أقل من 2.0</p>
                      <p className="text-[10px] text-gray-405 mt-1">يدل على بطء الامتصاص وتمدد الأربطة وزيادة خطر الإصابات.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeHandbookTab === 'juniors' && (
                <div className="bg-cyan-950/25 border border-cyan-800/35 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Scaling className="text-cyan-400 shrink-0" size={20} />
                    <h4 className="font-extrabold text-cyan-400 text-sm">تطبيق معامل نضوج الناشئين (Junior Maturity Adjustment)</h4>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                    من الناحية البيوميكانيكية، يمر الرياضيون تحت سن 17 عاماً بفترات نمو عظمي وتغيرات في مراكز ثقل الجسم، وبالتالي يقل تفعيلهم للمخازن المطاطية مقارنة بالكبار.
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed font-bold">
                    لتحقيق إنصاف تقييمي، يطبق نظام "The Lab" تلقائياً معامل تصغير تبلغ قيمته <span className="text-cyan-400 font-mono font-bold">0.85</span> (خصم 15% من حدود الصعوبة) على جميع جداول التقييم عند استشعار تاريخ ميلاد يقل صاحبه عن 17 عاماً.
                  </p>
                  <div className="bg-black/35 p-3 rounded-xl border border-gray-800 font-mono text-[11px] text-cyan-300 text-center">
                    {"حدود النخبة للناشئين = الحدود الأصلية × 0.85"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
