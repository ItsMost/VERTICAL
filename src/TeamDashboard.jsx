import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Award, ChevronDown, ChevronUp, Activity, Zap, Play, BookOpen, AlertCircle, HelpCircle, User, Loader2, X, Scaling, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamDashboard({ onSelectPlayer, onChangeTab, coaches = [], onEditPlayer, language = 'ar' }) {
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

  const t = {
    ar: {
      title: 'لوحة تحكم الفريق Roster Dashboard',
      subtitle: 'تتبع وتصنيف الأداء البيوميكانيكي لجميع اللاعبين بناءً على المعايير المصرية',
      handbookBtn: 'دليل معايير النخبة المصرية 📖',
      coachLabel: 'المدرب المسؤول:',
      allPlayers: 'جميع اللاعبين (الكل)',
      unassignedPlayers: 'لاعبون بدون مدرب',
      chooseCoach: '-- اختر مدرباً --',
      searchPlaceholder: 'ابحث عن لاعب بالاسم...',
      all: 'الكل',
      male: 'ذكور',
      female: 'إناث',
      loadingText: 'جاري تحميل قائمة الفريق وتحليل البيانات...',
      noPlayersTitle: 'لا يوجد لاعبين مطبقين',
      noPlayersDesc: 'لم يتم العثور على لاعبين يطابقون خيارات البحث الحالية. يرجى إضافة لاعبين جدد وتخصيص هذا المدرب لهم.',
      cmjTitle: 'CMJ ثبات',
      approachTitle: 'Approach حركي',
      rsiTitle: 'RSI ارتداد',
      cm: 'سم',
      notMeasured: 'لم يقاس',
      reach: 'الوصول:',
      showAnalysis: 'عرض التحليل الميكانيكي الحيوي 📊',
      hideAnalysis: 'إخفاء التحليل الحركي 📊',
      detailedAnalysis: 'التحليل الحركي والبدني التفصيلي',
      standardStatus: 'الوضع المعياري الحالي:',
      biomechanicalDiag: 'التشخيص الميكانيكي الحيوي:',
      trainingPresc: 'التوصيات التدريبية:',
      startJumpBtn: 'بدء قياسات الارتقاء للاعب ⏱️',
      juniorFlag: 'معامل ناشئين مفعّل (خصم 15% من الحدود) 👶',
      ageYears: 'سنة',
      genderFemale: 'لاعبة',
      genderMale: 'لاعب',
      kg: 'كجم',
      height: 'الطول:',
      standingReach: 'الوصول:',
      modalTitle: 'دليل معايير الأداء والقياسات البيوميكانيكية',
      modalMen: 'الرجال (Men)',
      modalWomen: 'السيدات (Women)',
      modalRsi: 'مؤشر الارتداد (RSI)',
      modalJuniors: 'الناشئين (Juniors)',
      menDesc: 'المعايير المعتمدة لتقييم قفز الثبات العمودي (CMJ) لفئة الرجال البالغين (الكبار):',
      menElite: '🏆 النخبة (Elite)',
      menEliteVal: 'أكثر من 34 إنش (86.4+ سم)',
      menEliteDesc: 'يمثل تصنيف المحترفين الدوليين واللاعبين الأولمبيين.',
      menExcellent: '⭐ ممتاز (Excellent)',
      menExcellentVal: '30 إلى 33.9 إنش (76.2 - 86.1 سم)',
      menExcellentDesc: 'كفاءة بدنية ممتازة للاعبي الدوري الممتاز والدرجة الأولى.',
      menGood: '⚡ جيد (Good)',
      menGoodVal: '26 إلى 29.9 إنش (66.0 - 75.9 سم)',
      menGoodDesc: 'الحد المتوسط المقبول للرياضي المحترف في الرياضات الجماعية.',
      menNeedsDev: '⚠️ يحتاج تطوير (Under-developed)',
      menNeedsDevVal: 'أقل من 26 إنش (دون 66 سم)',
      menNeedsDevDesc: 'يتطلب برنامجاً عاجلاً لتطوير إنتاج القوة الابتدائية والانفجارية.',
      womenDesc: 'المعايير المعتمدة لتقييم قفز الثبات العمودي (CMJ) لفئة السيدات البالغات (الكبار):',
      womenElite: '🏆 النخبة (Elite)',
      womenEliteVal: 'أكثر من 26 إنش (66.0+ سم)',
      womenEliteDesc: 'تصنيف اللاعبات الأولمبيات ومحترفات الصف الأول عالمياً.',
      womenExcellent: '⭐ ممتاز (Excellent)',
      womenExcellentVal: '22 إلى 25.9 إنش (55.8 - 65.7 سم)',
      womenExcellentDesc: 'مستوى متميز جداً يلبي أعلى متطلبات المنافسة الاحترافية.',
      womenGood: '⚡ جيد (Good)',
      womenGoodVal: '18 إلى 21.9 إنش (45.7 - 55.6 سم)',
      womenGoodDesc: 'الحد المقبول للاعبات الرياضات الجماعية في الدوري الممتاز.',
      womenNeedsDev: '⚠️ يحتاج تطوير (Under-developed)',
      womenNeedsDevVal: 'أقل من 18 إنش (دون 45.7 سم)',
      womenNeedsDevDesc: 'يشير لعجز قوة ويتطلب تركيزاً مكثفاً على تدريبات RFD وقوة الساقين.',
      rsiDesc: 'مؤشر القوة الارتدادية التفاعلية (Reactive Strength Index - RSI) يقيس كفاءة دورة التمدد والتقلص العضلي الصلبة (SSC) أثناء قفز الهبوط (Drop Jump):',
      rsiElite: '🏆 النخبة (Elite)',
      rsiEliteVal: 'RSI أعلى من 3.0',
      rsiEliteDesc: 'صلابة وتفاعل أوتار فائق مع تلامس سريع جداً مع الأرض.',
      rsiExcellent: '⭐ ممتاز (Excellent)',
      rsiExcellentVal: 'RSI من 2.5 إلى 2.99',
      rsiExcellentDesc: 'ارتداد عصبي عضلي سريع وقدرة تخزين طاقة مطاطية ممتازة.',
      rsiGood: '⚡ جيد (Good)',
      rsiGoodVal: 'RSI من 2.0 إلى 2.49',
      rsiGoodDesc: 'مستوى حركي متوازن يضمن الحماية من إصابات الكاحل والركبة.',
      rsiNeedsDev: '⚠️ يحتاج تطوير (Under-developed)',
      rsiNeedsDevVal: 'RSI أقل من 2.0',
      rsiNeedsDevDesc: 'يدل على بطء الامتصاص وتمدد الأربطة وزيادة خطر الإصابات.',
      juniorsTitle: 'تطبيق معامل نضوج الناشئين (Junior Maturity Adjustment)',
      juniorsDesc: 'من الناحية البيوميكانيكية، يمر الرياضيون تحت سن 17 عاماً بفترات نمو عظمي وتغيرات في مراكز ثقل الجسم، وبالتالي يقل تفعيلهم للمخازن المطاطية مقارنة بالكبار.',
      juniorsFormula: 'لتحقيق إنصاف تقييمي، يطبق نظام "The Lab" تلقائياً معامل تصغير تبلغ قيمته 0.85 (خصم 15% من حدود الصعوبة) على جميع جداول التقييم عند استشعار تاريخ ميلاد يقل صاحبه عن 17 عاماً.',
      juniorsLabel: 'حدود النخبة للناشئين = الحدود الأصلية × 0.85',
      avgDiff: 'من المتوسط'
    },
    en: {
      title: 'Team Roster Dashboard',
      subtitle: 'Track and classify the biomechanical performance of all athletes based on standard criteria',
      handbookBtn: 'Elite Standards Handbook 📖',
      coachLabel: 'Responsible Coach:',
      allPlayers: 'All Players (All)',
      unassignedPlayers: 'Unassigned Players',
      chooseCoach: '-- Choose Coach --',
      searchPlaceholder: 'Search athlete by name...',
      all: 'All',
      male: 'Male',
      female: 'Female',
      loadingText: 'Loading roster and analyzing biomechanical performance...',
      noPlayersTitle: 'No Athletes Match Criteria',
      noPlayersDesc: 'No athletes were found matching the current filters. Please add new athletes and assign them to this coach.',
      cmjTitle: 'Static CMJ',
      approachTitle: 'Approach Jump',
      rsiTitle: 'RSI Rebound',
      cm: 'cm',
      notMeasured: 'Not measured',
      reach: 'Reach:',
      showAnalysis: 'Show Biomechanical Analysis 📊',
      hideAnalysis: 'Hide Biomechanical Analysis 📊',
      detailedAnalysis: 'Detailed Biomechanical & Physical Analysis',
      standardStatus: 'Current Benchmark Status:',
      biomechanicalDiag: 'Biomechanical Diagnosis:',
      trainingPresc: 'Training Recommendations:',
      startJumpBtn: 'Start Jump Testing ⏱️',
      juniorFlag: 'Junior maturity adjustment active (15% limit discount) 👶',
      ageYears: 'years',
      genderFemale: 'Female',
      genderMale: 'Male',
      kg: 'kg',
      height: 'Height:',
      standingReach: 'Reach:',
      modalTitle: 'Biomechanical Performance & Benchmarks Handbook',
      modalMen: 'Men',
      modalWomen: 'Women',
      modalRsi: 'RSI Rebound',
      modalJuniors: 'Juniors',
      menDesc: 'Approved benchmarks for evaluating Static Countermovement Jump (CMJ) in adult male athletes:',
      menElite: '🏆 Elite',
      menEliteVal: 'Over 34 inches (86.4+ cm)',
      menEliteDesc: 'Represents international elite professionals and Olympic athletes.',
      menExcellent: '⭐ Excellent',
      menExcellentVal: '30 to 33.9 inches (76.2 - 86.1 cm)',
      menExcellentDesc: 'Excellent physical efficiency for Premier League and high-division players.',
      menGood: '⚡ Good',
      menGoodVal: '26 to 29.9 inches (66.0 - 75.9 cm)',
      menGoodDesc: 'Standard acceptable average for professional team sports athletes.',
      menNeedsDev: '⚠️ Needs Development',
      menNeedsDevVal: 'Less than 26 inches (under 66 cm)',
      menNeedsDevDesc: 'Requires an urgent program targeting rate of force development (RFD).',
      womenDesc: 'Approved benchmarks for evaluating Static Countermovement Jump (CMJ) in adult female athletes:',
      womenElite: '🏆 Elite',
      womenEliteVal: 'Over 26 inches (66.0+ cm)',
      womenEliteDesc: 'Represents international elite and Olympic level female athletes.',
      womenExcellent: '⭐ Excellent',
      womenExcellentVal: '22 to 25.9 inches (55.8 - 65.7 cm)',
      womenExcellentDesc: 'Outstanding capacity satisfying the highest professional requirements.',
      womenGood: '⚡ Good',
      womenGoodVal: '18 to 21.9 inches (45.7 - 55.6 cm)',
      womenGoodDesc: 'Acceptable limit for elite female team sports players.',
      womenNeedsDev: '⚠️ Needs Development',
      womenNeedsDevVal: 'Less than 18 inches (under 45.7 cm)',
      womenNeedsDevDesc: 'Indicates force deficit; requires lower-limb strength and RFD development.',
      rsiDesc: 'Reactive Strength Index (RSI) measures Stretch-Shortening Cycle (SSC) efficiency and tendon stiffness during a Drop Jump (DJ):',
      rsiElite: '🏆 Elite',
      rsiEliteVal: 'RSI over 3.0',
      rsiEliteDesc: 'Exceptional tendon stiffness and fast ground contact times.',
      rsiExcellent: '⭐ Excellent',
      rsiExcellentVal: 'RSI from 2.5 to 2.99',
      rsiExcellentDesc: 'Rapid neuromuscular rebound and superb elastic storage capacity.',
      rsiGood: '⚡ Good',
      rsiGoodVal: 'RSI from 2.0 to 2.49',
      rsiGoodDesc: 'Balanced reactive level providing protection against lower limb injuries.',
      rsiNeedsDev: '⚠️ Needs Development',
      rsiNeedsDevVal: 'RSI under 2.0',
      rsiNeedsDevDesc: 'Indicates slow force absorption and higher susceptibility to ligament injury.',
      juniorsTitle: 'Junior Maturity Adjustment Application',
      juniorsDesc: 'From a biomechanical standpoint, athletes under the age of 17 undergo bone growth phases and structural changes, reducing elastic storage recruitment compared to adults.',
      juniorsFormula: 'To ensure evaluation equity, the system automatically applies a 0.85 scaling factor (15% limit discount) on all difficulty benchmarks for junior athletes.',
      juniorsLabel: 'Junior Elite Limits = Adult Limits × 0.85',
      avgDiff: 'of average'
    }
  }[language];

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
          +{absDiff}% {language === 'en' ? 'of avg 📈' : 'من المتوسط 📈'}
        </span>
      );
    } else {
      return (
        <span className="text-[9px] px-1.5 py-0.5 mt-1 rounded-md font-bold bg-orange-950/40 text-orange-400 border border-orange-800/30 block text-center">
          -{absDiff}% {language === 'en' ? 'of avg 📉' : 'من المتوسط 📉'}
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

  const getBorderGlowClass = (score) => {
    const isEn = language === 'en';
    if (score >= 90) return isEn ? 'border-l-4 border-l-cyan-500 border-r-0' : 'border-r-4 border-r-cyan-500 border-l-0';
    if (score >= 75) return isEn ? 'border-l-4 border-l-emerald-500 border-r-0' : 'border-r-4 border-r-emerald-500 border-l-0';
    if (score >= 60) return isEn ? 'border-l-4 border-l-yellow-500 border-r-0' : 'border-r-4 border-r-yellow-500 border-l-0';
    if (score > 0) return isEn ? 'border-l-4 border-l-orange-500 border-r-0' : 'border-r-4 border-r-orange-500 border-l-0';
    return isEn ? 'border-l-4 border-l-gray-800 border-r-0' : 'border-r-4 border-r-gray-800 border-l-0';
  };

  // Status rating helper (incorporates 15% youth discount if age < 17)
  const getStatus = (heightCm, type, gender, age) => {
    if (heightCm === undefined || heightCm === null || isNaN(heightCm) || parseFloat(heightCm) <= 0) {
      return { text: language === 'en' ? 'Not Recorded' : 'غير مسجل', color: 'text-gray-500 bg-gray-500/10 border-gray-755/20' };
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
        return { text: language === 'en' ? 'Elite 🏆' : 'النخبة 🏆', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40' };
      }
      if (heightInches >= excellentThresh) {
        return { text: language === 'en' ? 'Excellent ⭐' : 'ممتاز ⭐', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' };
      }
      if (heightInches >= goodThresh) {
        return { text: language === 'en' ? 'Good ⚡' : 'جيد ⚡', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-800/40' };
      }
      return { text: language === 'en' ? 'Needs Development ⚠️' : 'يحتاج تطوير ⚠️', color: 'text-orange-500 bg-orange-950/40 border-orange-900/40' };
    } else if (type === 'rsi') {
      const rsiVal = parseFloat(heightCm);
      const eliteThresh = 3.0 * discount;
      const excellentThresh = 2.5 * discount;
      const goodThresh = 2.0 * discount;

      if (rsiVal >= eliteThresh) {
        return { text: language === 'en' ? 'Elite 🏆' : 'النخبة 🏆', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/40' };
      }
      if (rsiVal >= excellentThresh) {
        return { text: language === 'en' ? 'Excellent ⭐' : 'ممتاز ⭐', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40' };
      }
      if (rsiVal >= goodThresh) {
        return { text: language === 'en' ? 'Good ⚡' : 'جيد ⚡', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-800/40' };
      }
      return { text: language === 'en' ? 'Needs Development ⚠️' : 'يحتاج تطوير ⚠️', color: 'text-orange-500 bg-orange-950/40 border-orange-900/40' };
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
        positionText = language === 'en'
          ? `Athlete falls under the (${cmjStatus.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}) category for Static CMJ, and (${rsiStatus.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}) category for Reactive Strength Index (RSI).`
          : `اللاعب يقع في فئة (${cmjStatus.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}) بالنسبة للقفز العمودي من الثبات، وفئة (${rsiStatus.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}) بالنسبة لمؤشر القوة التفاعلية (RSI).`;
      } else {
        positionText = language === 'en'
          ? `Athlete falls under the (${cmjStatus.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}) category for Static CMJ. No RSI tests have been recorded yet.`
          : `اللاعب يقع في فئة (${cmjStatus.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim()}) بالنسبة للقفز العمودي من الثبات. لم يتم تسجيل اختبار الـ RSI له حتى الآن.`;
      }
    } else {
      positionText = language === 'en'
        ? 'No vertical jump tests recorded for this athlete to perform benchmark classification.'
        : 'لا توجد اختبارات قفز عمودي مسجلة للاعب حالياً لإجراء التصنيف المعياري.';
    }

    // 2. Biomechanical Diagnosis
    if (cmjScore > 0 && approachScore > 0) {
      const diffCm = approachScore - cmjScore;
      
      if (diffCm < 10) {
        diagnosisText = language === 'en'
          ? `Athlete suffers from "Elastic/Coordination Efficiency Deficit" during approach. Approach jump reached ${approachScore.toFixed(1)} cm, which is only ${diffCm.toFixed(1)} cm higher than Static CMJ (${cmjScore.toFixed(1)} cm). Biomechanically, the difference should exceed 10-15 cm (4-6 inches). This indicates inefficient utilization of horizontal velocity, weak stretch-shortening cycle (SSC) recruitment, and coordination issues.`
          : `يعاني اللاعب من "عجز في توظيف القوة المطاطية والتوافق الحركي أثناء الاقتراب" (Elastic/Coordination Efficiency Deficit). قفزة الاقتراب الحركية (Approach Jump) بلغت ${approachScore.toFixed(1)} سم وهي أعلى بـ ${diffCm.toFixed(1)} سم فقط من القفزة من الثبات (${cmjScore.toFixed(1)} سم). بيوميكانيكياً، يجب أن يتجاوز الفارق 10-15 سم (4-6 إنشات) على الأقل. هذا النقص يشير إلى أن اللاعب لا يستفيد بكفاءة من طاقة الحركة الأفقية وسرعة الاقتراب لتحويلها إلى قوة رأسية، مع ضعف في تفعيل دورة التمدد والتقلص العضلي (Stretch-Shortening Cycle).`;
        prescriptionText = language === 'en'
          ? 'Develop explosive-elastic power using fast plyometric drills, jumps from movement focusing on limb coordination, quick absorption, and vertical drive. Incorporate last-step acceleration and guided approach takeoff drills.'
          : 'تطوير القوة الانفجارية المرنة باستخدام تدريبات البلايومترك السريع (Fast Plyometrics)، والقفز من الحركة مع التركيز على توافق الأطراف وسرعة الامتصاص والدفع الرأسي. يوصى بإدراج تدريبات تسارع الخطوة الأخيرة والارتقاء الحركي الموجه.';
      } else {
        diagnosisText = language === 'en'
          ? `Athlete shows excellent coordination and efficiency in utilizing horizontal velocity. Approach jump reached ${approachScore.toFixed(1)} cm (+${diffCm.toFixed(1)} cm difference over Static CMJ of ${cmjScore.toFixed(1)} cm), which is in the optimal biomechanical range (+10 cm and above). This reflects great neuromuscular coordination and high capacity to store and release elastic energy (SSC) during approach takeoff.`
          : `يظهر اللاعب كفاءة حركية ممتازة في الاستفادة من طاقة الحركة الأفقية. قفزة الاقتراب الحركية بلغت ${approachScore.toFixed(1)} سم بفارق إيجابي يبلغ ${diffCm.toFixed(1)} سم عن قفزة الثبات (${cmjScore.toFixed(1)} سم)، وهو ما يقع في النطاق البيوميكانيكي الأمثل (+10 سم فما فوق). يعكس هذا توافقاً عصبياً عضلياً رائعاً وقدرة عالية على تخزين وإطلاق طاقة الارتداد (SSC) أثناء الارتقاء الحركي.`;
        prescriptionText = language === 'en'
          ? 'Continue the current program while integrating High-Intensity Plyometrics to maintain tendon stiffness, and improve takeoff angles and drive direction for enhanced efficiency.'
          : 'الاستمرار على البرنامج الحالي مع دمج تدريبات بلايومترك عالية الشدة (High-Intensity Plyometrics) للمحافظة على صلابة الأوتار، وتحسين زوايا الانطلاق وتوجيه الدفع لزيادة الكفاءة.';
      }
    } else if (cmjScore > 0) {
      diagnosisText = language === 'en'
        ? `Only Static CMJ was recorded (${cmjScore.toFixed(1)} cm). Biomechanical examination is incomplete due to the lack of an Approach Jump. It is necessary to perform the approach jump test to determine the dynamic difference and diagnose potential elastic or coordination deficits.`
        : `تم تسجيل القفزة من الثبات فقط (${cmjScore.toFixed(1)} سم). الفحص البيوميكانيكي غير مكتمل لعدم توفر قفزة حركة (Approach Jump). من الضروري إجراء اختبار قفزة الاقتراب لتحديد الفارق الديناميكي وتشخيص ما إذا كان اللاعب يعاني من عجز مطاطي أو توافقي.`;
      
      if (rsiScore > 0 && rsiScore < 2.0) {
        prescriptionText = language === 'en'
          ? 'Focus on strengthening ankle joint stiffness and minimizing ground contact time using short repeated Pogo jumps, fast jump rope, and resistive ankle exercises to increase RSI.'
          : 'التركيز على تقوية صلابة المفصل الكاحلي (Ankle Stiffness) والحد من زمن التلامس مع الأرض باستخدام قفزات Pogo قصيرة متكررة، وقفز الحبل السريع، وتدريبات الكاحل المقاومة لزيادة مؤشر الـ RSI.';
      } else {
        prescriptionText = language === 'en'
          ? 'Focus on lower body maximum strength and explosive power exercises (Squats and Deadlifts) to increase the Rate of Force Development (RFD).'
          : 'التركيز على تمارين القوة العضلية القصوى والانفجارية للقسم السفلي (تمارين القرفصاء والرفعة المميتة) لزيادة إنتاج القوة الابتدائية (Rate of Force Development).';
      }
    } else {
      diagnosisText = language === 'en'
        ? 'Please record Static CMJ and Approach Jump measurements to begin diagnosing the athlete\'s mechanical efficiency.'
        : 'يرجى تسجيل قياسات القفز من الثبات (CMJ) وقفز الارتقاء من الحركة (Approach Jump) للبدء في تشخيص الكفاءة الميكانيكية للاعب.';
      prescriptionText = language === 'en'
        ? 'Diagnosing the athlete requires initiating a complete measurement cycle for vertical jumps and the reactive strength index.'
        : 'يتطلب تشخيص اللاعب البدء بإجراء دورة قياس كاملة للقفز العمودي ومؤشر الارتداد.';
    }

    return { positionText, diagnosisText, prescriptionText };
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === 'all' || player.gender === genderFilter;
    return matchesSearch && matchesGender;
  });

  return (
    <div className={`glass-panel p-4 md:p-6 shadow-2xl transition-all duration-300 ${language === 'en' ? 'text-left' : 'text-right'} animate-fade-in`} style={{ direction: language === 'en' ? 'ltr' : 'rtl' }}>
      
      {/* Top Controls: Header & Coach Dropdown */}
      <div className={`flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-gray-800/60 pb-5 mb-6 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex items-center gap-3 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-cyan-400">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{t.title}</h2>
            <p className="text-xs text-gray-400 mt-1">{t.subtitle}</p>
          </div>
        </div>

        {/* Coach Dropdown & Handbook Button */}
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
          <button
            onClick={() => setShowHandbookModal(true)}
            className="px-4 py-3 bg-cyan-950/40 hover:bg-cyan-600 text-cyan-400 hover:text-white border border-cyan-800/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 backdrop-blur-md transition-all shadow-md cursor-pointer"
          >
            <BookOpen size={14} /> {t.handbookBtn}
          </button>
          
          <div className={`flex items-center gap-3 relative ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
            <label className="text-xs font-bold text-gray-400 shrink-0">{t.coachLabel}</label>
            <div className="relative flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setIsCoachDropdownOpen(!isCoachDropdownOpen)}
                className={`w-full sm:w-60 bg-[#111827]/60 border border-gray-800 text-xs text-white p-3 px-4 rounded-xl outline-none font-bold focus:border-cyan-500 flex items-center justify-between gap-2 cursor-pointer ${language === 'en' ? 'text-left' : 'text-right'} min-w-[15rem]`}
              >
                <span>
                  {selectedCoachId === 'all' 
                    ? t.allPlayers 
                    : selectedCoachId === 'unassigned' 
                      ? t.unassignedPlayers 
                      : (coaches.find(c => c.id === selectedCoachId)?.full_name || t.chooseCoach)}
                </span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform duration-250 ${isCoachDropdownOpen ? 'rotate-180' : ''}`} />
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
                      className={`absolute ${language === 'en' ? 'left-0' : 'right-0'} z-50 mt-1.5 bg-[#0b1429]/95 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md max-h-72 overflow-y-auto w-full min-w-[15rem]`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCoachId('all');
                          setIsCoachDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 ${language === 'en' ? 'text-left' : 'text-right'} text-xs hover:bg-cyan-500/10 transition-colors block border-b border-gray-800/40 ${selectedCoachId === 'all' ? 'bg-cyan-500/20 text-white font-extrabold' : 'text-gray-450 font-bold'}`}
                      >
                        {t.allPlayers}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCoachId('unassigned');
                          setIsCoachDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 ${language === 'en' ? 'text-left' : 'text-right'} text-xs hover:bg-cyan-500/10 transition-colors block border-b border-gray-800/40 ${selectedCoachId === 'unassigned' ? 'bg-cyan-500/20 text-white font-extrabold' : 'text-gray-450 font-bold'}`}
                      >
                        {t.unassignedPlayers}
                      </button>
                      {coaches.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCoachId(c.id);
                            setIsCoachDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 ${language === 'en' ? 'text-left' : 'text-right'} text-xs hover:bg-cyan-500/10 transition-colors block border-b border-gray-800/40 last:border-b-0 ${selectedCoachId === c.id ? 'bg-cyan-500/20 text-white font-extrabold' : 'text-gray-300'}`}
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
        <div className={`flex flex-col sm:flex-row items-center gap-4 w-full ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-[#111827]/40 border border-gray-800 text-xs text-white p-3 ${language === 'en' ? 'pl-10 text-left' : 'pr-10 text-right'} rounded-xl outline-none font-bold focus:border-cyan-500 placeholder-gray-500`}
            />
            <span className={`absolute ${language === 'en' ? 'left-3' : 'right-3'} top-3.5 text-gray-500 text-sm`}>🔍</span>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setGenderFilter('all')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${genderFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-[#111827]/20 border-gray-800 text-gray-405 hover:text-white'}`}
            >
              {t.all}
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${genderFilter === 'male' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-[#111827]/20 border-gray-800 text-gray-405 hover:text-white'}`}
            >
              {t.male}
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${genderFilter === 'female' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-[#111827]/20 border-gray-800 text-gray-405 hover:text-white'}`}
            >
              {t.female}
            </button>
          </div>
        </div>
      </div>

      {/* Main Roster List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Loader2 className="animate-spin text-cyan-500" size={40} />
          <span className="text-xs font-bold">{t.loadingText}</span>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-3xl p-8">
          <AlertCircle size={48} className="mx-auto text-yellow-500/40 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">{t.noPlayersTitle}</h3>
          <p className="text-xs max-w-sm mx-auto leading-relaxed text-gray-400">
            {t.noPlayersDesc}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5 w-full max-w-4xl mx-auto">
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

            const initials = player.full_name 
              ? player.full_name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase() 
              : '??';

            return (
              <div 
                key={player.id} 
                className={`bg-[#111827]/40 backdrop-blur-xl border rounded-2xl hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 flex flex-col relative overflow-hidden group ${
                  isExpanded ? 'border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.1)]' : 'border-gray-800'
                } ${getBorderGlowClass(rating)}`}
              >
                {/* Compact Row Header */}
                <div 
                  onClick={() => toggleExpand(player.id)}
                  className={`flex items-center justify-between p-4 cursor-pointer select-none ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  <div className={`flex items-center gap-3 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-black text-sm">
                      {initials}
                    </div>
                    <div className={`flex flex-col ${language === 'en' ? 'text-left' : 'text-right'}`}>
                      <div className={`flex items-center gap-2 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                        <h4 className="font-extrabold text-white text-sm leading-tight">{player.full_name}</h4>
                        {onEditPlayer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditPlayer(player);
                            }}
                            className="p-1 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all cursor-pointer"
                            title={language === 'en' ? 'Edit athlete details' : 'تعديل بيانات اللاعب'}
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                      </div>
                      <div className={`text-[10px] text-gray-400 mt-1 font-semibold flex items-center gap-1.5 flex-wrap ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                        <span>{age} {t.ageYears}</span>
                        <span>•</span>
                        <span>{player.gender === 'female' ? t.genderFemale : t.genderMale}</span>
                        <span>•</span>
                        <span>{player.weight_kg} {t.kg}</span>
                        <span>•</span>
                        <span>{t.height} {playerHeight} {t.cm}</span>
                        <span>•</span>
                        <span>{t.standingReach} {playerStandingReach} {t.cm}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Overall Bio Score */}
                    {(() => {
                      const strokeDashoffset = 125.6 - (125.6 * rating) / 100;
                      return (
                        <div className="relative w-11 h-11 shrink-0 flex items-center justify-center bg-black/20 rounded-full border border-gray-800/40">
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
                            <span className="text-[10px] font-black text-white font-mono leading-none">{rating}%</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Chevron Indicator */}
                    <ChevronDown 
                      size={18} 
                      className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                  </div>
                </div>

                {/* Collapsible Content */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden border-t border-gray-800/80 bg-black/10"
                    >
                      <div className="p-4 space-y-4">
                        {/* Youth/Junior Flag */}
                        {age < 17 && (
                          <div className={`px-3 py-1.5 bg-cyan-950/20 border border-cyan-500/15 rounded-xl text-[10px] font-bold text-cyan-400 flex items-center gap-1.5 w-full ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                            <Scaling size={12} />
                            <span>{t.juniorFlag}</span>
                          </div>
                        )}

                        {/* Metrics Dashboard */}
                        <div className="grid grid-cols-3 gap-2 py-3 bg-black/15 rounded-xl px-2">
                          {/* CMJ Mini Gauge */}
                          <div className="flex flex-col items-center justify-between text-center">
                            <span className="text-[9px] text-gray-400 font-extrabold block mb-1">{t.cmjTitle}</span>
                            {cmjVal ? (
                              <>
                                <span className="text-xs font-black text-white font-mono leading-none">
                                  {cmjVal.toFixed(1)} <span className="text-[9px] text-gray-500 font-normal">{t.cm}</span>
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono mt-0.5">({cmjInches}")</span>
                                {maxReachCmj && (
                                  <span className="text-[9px] text-cyan-400 font-bold mt-1">
                                    {t.reach} {maxReachCmj} {t.cm}
                                  </span>
                                )}
                                <span className={`text-[8px] px-1.5 py-0.5 mt-1.5 rounded-md font-bold leading-none ${cmjStatus.color}`}>
                                  {cmjStatus.text.replace(/[🏆⭐⚡⚠️]/g, '').trim()}
                                </span>
                                {getComparisonBadge(cmjVal, teamAverages.cmj)}
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-600 font-bold mt-1.5">{t.notMeasured}</span>
                            )}
                          </div>

                          {/* Approach Mini Gauge */}
                          <div className="flex flex-col items-center justify-between text-center border-r border-l border-gray-800/80">
                            <span className="text-[9px] text-gray-400 font-extrabold block mb-1">{t.approachTitle}</span>
                            {approachVal ? (
                              <>
                                <span className="text-xs font-black text-white font-mono leading-none">
                                  {approachVal.toFixed(1)} <span className="text-[9px] text-gray-500 font-normal">{t.cm}</span>
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono mt-0.5">({approachInches}")</span>
                                {maxReachApproach && (
                                  <span className="text-[9px] text-cyan-400 font-bold mt-1">
                                    {t.reach} {maxReachApproach} {t.cm}
                                  </span>
                                )}
                                <span className={`text-[8px] px-1.5 py-0.5 mt-1.5 rounded-md font-bold leading-none ${approachStatus.color}`}>
                                  {approachStatus.text.replace(/[🏆⭐⚡⚠️]/g, '').trim()}
                                </span>
                                {getComparisonBadge(approachVal, teamAverages.approach)}
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-600 font-bold mt-1.5">{t.notMeasured}</span>
                            )}
                          </div>

                          {/* RSI Mini Gauge */}
                          <div className="flex flex-col items-center justify-between text-center">
                            <span className="text-[9px] text-gray-400 font-extrabold block mb-1">{t.rsiTitle}</span>
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
                              <span className="text-[10px] text-gray-600 font-bold mt-1.5">{t.notMeasured}</span>
                            )}
                          </div>
                        </div>

                        {/* Detailed Critique Section */}
                        <div className={`space-y-3.5 text-xs leading-relaxed ${language === 'en' ? 'text-left' : 'text-right'}`}>
                          <div className={`flex items-center gap-2 border-b border-gray-800/60 pb-1.5 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                            <Award className="text-cyan-400" size={14} />
                            <h4 className="font-extrabold text-xs text-gray-200">{t.detailedAnalysis}</h4>
                          </div>

                          <div className="space-y-2.5">
                            <div className={`bg-cyan-950/20 border border-cyan-500/15 p-3 rounded-xl flex items-start gap-2 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                              <HelpCircle size={14} className="text-cyan-455 shrink-0 mt-0.5" />
                              <div className={`flex-1 ${language === 'en' ? 'text-left' : 'text-right'}`}>
                                <span className="block font-black text-cyan-455 mb-0.5">{t.standardStatus}</span>
                                <p className="text-gray-300 font-semibold">{critique.positionText}</p>
                              </div>
                            </div>

                            <div className={`bg-amber-950/20 border border-amber-500/15 p-3 rounded-xl flex items-start gap-2 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                              <Activity size={14} className="text-amber-400 shrink-0 mt-0.5" />
                              <div className={`flex-1 ${language === 'en' ? 'text-left' : 'text-right'}`}>
                                <span className="block font-black text-amber-400 mb-0.5">{t.biomechanicalDiag}</span>
                                <p className="text-gray-300 font-semibold">{critique.diagnosisText}</p>
                              </div>
                            </div>

                            <div className={`bg-emerald-950/20 border border-emerald-500/15 p-3 rounded-xl flex items-start gap-2 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                              <Zap size={14} className="text-emerald-450 shrink-0 mt-0.5" />
                              <div className={`flex-1 ${language === 'en' ? 'text-left' : 'text-right'}`}>
                                <span className="block font-black text-emerald-450 mb-0.5">{t.trainingPresc}</span>
                                <p className="text-gray-300 font-semibold">{critique.prescriptionText}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Testing Button */}
                        <div className="pt-3 border-t border-gray-800/40">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectPlayer(player);
                              onChangeTab('calculator');
                            }}
                            className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-orange-500/10 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Play size={12} fill="currentColor" />
                            <span>{t.startJumpBtn}</span>
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

      {/* Floating Benchmarks Handbook Modal */}
      {showHandbookModal && (
        <div 
          className={`fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in ${language === 'en' ? 'text-left' : 'text-right'}`} 
          style={{ direction: language === 'en' ? 'ltr' : 'rtl' }}
        >
          <div className="bg-[#0b1429] border border-gray-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative">
            <button 
              onClick={() => setShowHandbookModal(false)} 
              className={`absolute top-4 ${language === 'en' ? 'right-4' : 'left-4'} text-gray-400 hover:text-white transition-all bg-black/20 p-2 rounded-full border border-gray-800 cursor-pointer`}
            >
              <X size={18} />
            </button>
            
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400 mb-4 border-b border-gray-850 pb-2 flex items-center gap-2">
              <BookOpen className="text-cyan-400" size={22} /> {t.modalTitle}
            </h2>
            
            {/* Modal Tabs */}
            <div className="flex border-b border-gray-800 mb-6 bg-black/20 p-1.5 rounded-2xl">
              <button 
                onClick={() => setActiveHandbookTab('men')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeHandbookTab === 'men' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                {t.modalMen}
              </button>
              <button 
                onClick={() => setActiveHandbookTab('women')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeHandbookTab === 'women' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                {t.modalWomen}
              </button>
              <button 
                onClick={() => setActiveHandbookTab('rsi')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeHandbookTab === 'rsi' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                {t.modalRsi}
              </button>
              <button 
                onClick={() => setActiveHandbookTab('juniors')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeHandbookTab === 'juniors' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                {t.modalJuniors}
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {activeHandbookTab === 'men' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t.menDesc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#111827]/40 border border-cyan-500/20 p-3 rounded-2xl">
                      <span className="text-cyan-400 font-extrabold block">{t.menElite}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.menEliteVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.menEliteDesc}</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-emerald-500/20 p-3 rounded-2xl">
                      <span className="text-emerald-400 font-extrabold block">{t.menExcellent}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.menExcellentVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.menExcellentDesc}</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-yellow-500/20 p-3 rounded-2xl">
                      <span className="text-yellow-400 font-extrabold block">{t.menGood}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.menGoodVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.menGoodDesc}</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-orange-500/20 p-3 rounded-2xl">
                      <span className="text-orange-500 font-extrabold block">{t.menNeedsDev}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.menNeedsDevVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.menNeedsDevDesc}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeHandbookTab === 'women' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t.womenDesc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#111827]/40 border border-cyan-500/20 p-3 rounded-2xl">
                      <span className="text-cyan-400 font-extrabold block">{t.womenElite}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.womenEliteVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.womenEliteDesc}</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-emerald-500/20 p-3 rounded-2xl">
                      <span className="text-emerald-400 font-extrabold block">{t.womenExcellent}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.womenExcellentVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.womenExcellentDesc}</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-yellow-500/20 p-3 rounded-2xl">
                      <span className="text-yellow-400 font-extrabold block">{t.womenGood}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.womenGoodVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.womenGoodDesc}</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-orange-500/20 p-3 rounded-2xl">
                      <span className="text-orange-500 font-extrabold block">{t.womenNeedsDev}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.womenNeedsDevVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.womenNeedsDevDesc}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeHandbookTab === 'rsi' && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {t.rsiDesc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#111827]/40 border border-cyan-500/20 p-3 rounded-2xl">
                      <span className="text-cyan-400 font-extrabold block">{t.rsiElite}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.rsiEliteVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.rsiEliteDesc}</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-emerald-500/20 p-3 rounded-2xl">
                      <span className="text-emerald-400 font-extrabold block">{t.rsiExcellent}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.rsiExcellentVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.rsiExcellentDesc}</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-yellow-500/20 p-3 rounded-2xl">
                      <span className="text-yellow-400 font-extrabold block">{t.rsiGood}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.rsiGoodVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.rsiGoodDesc}</p>
                    </div>
                    <div className="bg-[#111827]/40 border border-orange-500/20 p-3 rounded-2xl">
                      <span className="text-orange-500 font-extrabold block">{t.rsiNeedsDev}</span>
                      <p className="text-gray-200 font-bold mt-1 text-sm">{t.rsiNeedsDevVal}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.rsiNeedsDevDesc}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeHandbookTab === 'juniors' && (
                <div className="bg-cyan-950/25 border border-cyan-800/35 p-5 rounded-2xl space-y-3">
                  <div className={`flex items-center gap-2 ${language === 'en' ? 'flex-row' : 'flex-row-reverse'}`}>
                    <Scaling className="text-cyan-400 shrink-0" size={20} />
                    <h4 className="font-extrabold text-cyan-400 text-sm">{t.juniorsTitle}</h4>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                    {t.juniorsDesc}
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed font-bold">
                    {t.juniorsFormula}
                  </p>
                  <div className="bg-black/35 p-3 rounded-xl border border-gray-800 font-mono text-[11px] text-cyan-300 text-center">
                    {t.juniorsLabel}
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
