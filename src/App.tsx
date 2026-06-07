import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import JumpCalculator from './JumpCalculator';
import { Lock, Mail, Key, LogIn, UserPlus, LogOut, ShieldAlert, PlusCircle, Copy, CheckCircle2, FlaskConical, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<{
    user: {
      id: string;
      email: string;
    } | null;
  } | null>({
    user: {
      id: 'd3b07384-d113-4956-a5db-630d7830be1e',
      email: 'coach@thelab.com'
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    // Auth listener disabled to ensure direct bypass and maintain mock coach session.
    /*
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
    */
  }, []);

  // === Glowing Flask Loading Simulation ===
  const [appLoadingPercent, setAppLoadingPercent] = useState(0);
  const [isAppLoadingFinished, setIsAppLoadingFinished] = useState(false);

  // === Super Admin Configuration ===
  const ADMIN_EMAIL = 'mahmoud@thelab.com'; 

  // === Auth form states ===
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [loading, setLoading] = useState(false);

  // === Admin panel states ===
  const [adminCodes, setAdminCodes] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');
  const [viewMode, setViewMode] = useState('admin'); // 'admin' or 'coach'

  const isAdminEmail = email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();



  // Loading Simulation
  useEffect(() => {
    let currentPercent = 0;
    const interval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 8) + 4;
      if (currentPercent >= 100) {
        currentPercent = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsAppLoadingFinished(true);
        }, 500);
      }
      setAppLoadingPercent(currentPercent);
    }, 70);
    return () => clearInterval(interval);
  }, []);

  const fetchAdminCodes = async () => {
    const { data } = await supabase.from('invite_codes').select('*').order('created_at', { ascending: false });
    if (data) setAdminCodes(data);
  };

  useEffect(() => {
    if (session?.user?.email === ADMIN_EMAIL) {
      Promise.resolve().then(() => {
        fetchAdminCodes();
      });
    }
  }, [session]);

  const generateCode = async () => {
    const newCode = 'LAB-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase.from('invite_codes').insert([{ code: newCode }]);
    fetchAdminCodes();
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const safeEmail = email.trim().toLowerCase();

      if (isLoginMode) {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({ email: safeEmail, password });
        if (error) throw error;
      } else {
        // Sign up
        if (isAdminEmail) {
          const { error: signUpError } = await supabase.auth.signUp({ email: safeEmail, password });
          if (signUpError) throw signUpError;
          alert("تم إنشاء حساب المدير بنجاح!");
        } else {
          if (!inviteCode) throw new Error("كود الدعوة مطلوب لإنشاء حساب مدرب جديد.");

          const { data: codeData, error: codeError } = await supabase
              .from('invite_codes').select('*').eq('code', inviteCode).eq('is_used', false).single();

          if (codeError || !codeData) throw new Error("كود الدعوة غير صحيح أو تم استخدامه مسبقاً!");

          const { error: signUpError } = await supabase.auth.signUp({ email: safeEmail, password });
          if (signUpError) throw signUpError;

          await supabase.from('invite_codes').update({ is_used: true }).eq('code', inviteCode);
          alert("تم إنشاء الحساب بنجاح! مرحباً بك في The Lab.");
        }
      }
    } catch (error) {
      alert("خطأ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // === Glowing Flask Chemical Loading Animation ===
  if (isAuthLoading || !isAppLoadingFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ fontFamily: "'Cairo', sans-serif", direction: "rtl", background: 'var(--bg-base)', backgroundImage: 'var(--bg-gradient)' }}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600 opacity-10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-600 opacity-10 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Animated Flask Container */}
        <div className="relative w-28 h-28 flex items-center justify-center bg-cyan-950/20 border border-cyan-500/20 rounded-3xl mb-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
          <FlaskConical size={54} className="text-cyan-400 animate-pulse z-10 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
          {/* Float bubbling particles */}
          <span className="absolute bottom-2 left-6 w-1.5 h-1.5 bg-cyan-300 rounded-full loading-bubble" style={{ animationDelay: '0.1s', left: '25%' }}></span>
          <span className="absolute bottom-2 left-10 w-2.5 h-2.5 bg-cyan-300 rounded-full loading-bubble" style={{ animationDelay: '0.7s', left: '48%' }}></span>
          <span className="absolute bottom-2 left-14 w-1.5 h-1.5 bg-cyan-300 rounded-full loading-bubble" style={{ animationDelay: '1.2s', left: '72%' }}></span>
          <span className="absolute bottom-2 left-8 w-2 h-2 bg-cyan-300 rounded-full loading-bubble" style={{ animationDelay: '1.8s', left: '35%' }}></span>
        </div>
        
        <h1 className="text-3xl font-black text-white mb-2 tracking-wide font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">The Lab 🧪</h1>
        <p className="text-cyan-400 text-xs font-bold mb-6 animate-pulse">جاري تهيئة مختبر الأداء والتحليل البيوميكانيكي...</p>
        
        {/* Progress bar */}
        <div className="w-64 h-2 bg-cyan-950/40 rounded-full border border-cyan-500/20 overflow-hidden relative mb-2 shadow-inner">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 transition-all duration-100 rounded-full" style={{ width: `${appLoadingPercent}%` }}></div>
        </div>
        <span className="text-xs text-gray-400 font-mono font-bold">{appLoadingPercent}%</span>
      </div>
    );
  }

  // === Authentication Screens (Login / Signup) ===
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ fontFamily: "'Cairo', sans-serif", direction: "rtl", background: 'var(--bg-base)', backgroundImage: 'var(--bg-gradient)' }}>
        <div className="glass-panel w-full max-w-md p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600 opacity-10 rounded-full blur-3xl -z-10"></div>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-cyan-950/30 border border-cyan-500/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-cyan-400">
              <FlaskConical size={32} />
            </div>
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight font-mono">The Lab 🧪</h1>
            <p className="text-gray-400 text-sm">بوابة الدخول لمدربي النخبة والميكانيكا الحيوية</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-bold">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-3 text-gray-500" size={18} />
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full glass-input py-3 pr-11 pl-4 text-sm" placeholder="coach@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-bold">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3 text-gray-500" size={18} />
                <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full glass-input py-3 pr-11 pl-12 text-sm" placeholder="••••••••" minLength="6" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-3 text-gray-400 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLoginMode && !isAdminEmail && (
              <div className="animate-fade-in">
                <label className="block text-xs text-cyan-400 mb-1.5 font-bold">كود الدعوة (Invite Code)</label>
                <div className="relative">
                  <Key className="absolute right-3 top-3 text-cyan-500" size={18} />
                  <input required={!isLoginMode && !isAdminEmail} type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} className="w-full glass-input py-3 pr-11 pl-4 text-sm uppercase tracking-widest" style={{ borderColor: 'var(--border-color)' }} placeholder="LAB-XXXXXX" />
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">كود الدعوة مطلوب لإنشاء حساب مدرب جديد.</p>
              </div>
            )}

            <button disabled={loading} type="submit" className="w-full btn-orange-gradient py-3.5 mt-6 flex justify-center items-center gap-2">
              {loading ? 'جاري المعالجة...' : isLoginMode ? <><LogIn size={18} /> تسجيل الدخول</> : <><UserPlus size={18} /> إنشاء حساب جديد</>}
            </button>
          </form>

          <div className="mt-6 text-center border-t pt-6" style={{ borderColor: 'var(--border-light)' }}>
            <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-gray-400 hover:text-white text-xs font-bold transition-colors">
              {isLoginMode ? 'لا تملك حساباً؟ اضغط هنا للتسجيل' : 'لديك حساب بالفعل؟ سجل دخولك'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Super Admin Dashboard ===
  if (session.user.email === ADMIN_EMAIL && viewMode === 'admin') {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ fontFamily: "'Cairo', sans-serif", direction: "rtl", background: 'var(--bg-base)', backgroundImage: 'var(--bg-gradient)', color: 'var(--text-primary)' }}>
        <div className="max-w-4xl mx-auto animate-fade-in">
          
          <div className="glass-panel p-6 flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-cyan-500" size={32} />
              <div>
                <h1 className="text-2xl font-black text-white">لوحة تحكم إدارة The Lab</h1>
                <p className="text-xs text-gray-400">مرحباً بمدير النظام: {session.user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="px-5 py-2.5 bg-red-950/40 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/30 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm">
              <LogOut size={16} /> خروج
            </button>
          </div>

          <div className="glass-panel p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6 border-b border-[var(--border-light)] pb-4">
              <h2 className="text-xl font-black text-white flex items-center gap-2"><Key className="text-cyan-500" /> إدارة أكواد الدعوة للمدربين</h2>
              <button onClick={generateCode} className="px-4 py-2 btn-orange-gradient rounded-xl font-bold flex items-center gap-2 text-sm shadow-md transition-transform hover:scale-105">
                <PlusCircle size={16} /> توليد كود جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminCodes.map(code => (
                <div key={code.code} className={`glass-card p-4 flex justify-between items-center ${code.is_used ? 'opacity-40' : ''}`}>
                  <div>
                    <p className="font-mono text-base font-black text-white tracking-wider">{code.code}</p>
                    <p className="text-[10px] mt-1 font-bold">{code.is_used ? <span className="text-red-400">🔴 تم استخدامه</span> : <span className="text-cyan-400">🟢 متاح للاستخدام</span>}</p>
                  </div>
                  {!code.is_used && (
                    <button onClick={() => copyToClipboard(code.code)} className="p-3 bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-light)] text-gray-300 rounded-xl transition-colors">
                      {copiedCode === code.code ? <CheckCircle2 className="text-cyan-500" size={18} /> : <Copy size={18} />}
                    </button>
                  )}
                </div>
              ))}
              {adminCodes.length === 0 && <p className="text-gray-500 col-span-2 text-center py-8">لا توجد أكواد مولدة حالياً. اضغط على توليد كود لإنشاء كود جديد.</p>}
            </div>
          </div>
          
          <div className="text-center mt-12">
             <button onClick={() => setViewMode('coach')} className="text-cyan-500 hover:text-cyan-400 underline transition-colors font-bold text-base">الذهاب للتطبيق كمدرب 🏋️‍♂️</button>
          </div>
        </div>
      </div>
    );
  }

  // === Standard View (Coaches & Admin as coach) ===
  return (
    <div className="relative min-h-screen">
      {/* Floating control buttons at top-left corner */}
      <div className="absolute top-4 left-4 z-50 flex gap-3">
        <button onClick={handleLogout} className="px-4 py-2 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/30 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all">
          <LogOut size={14} /> خروج
        </button>
        
        {session?.user?.email === ADMIN_EMAIL && (
          <button onClick={() => setViewMode('admin')} className="px-4 py-2 bg-cyan-950/40 hover:bg-cyan-600 text-cyan-400 hover:text-white border border-cyan-800/30 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all">
            <ShieldAlert size={14} /> لوحة التحكم
          </button>
        )}
      </div>
      
      <JumpCalculator />
    </div>
  );
}