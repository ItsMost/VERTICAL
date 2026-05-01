import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import JumpCalculator from './JumpCalculator';
import { Lock, Mail, Key, LogIn, UserPlus, LogOut, ShieldAlert, PlusCircle, Copy, CheckCircle2, FlaskConical, Eye, EyeOff } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // === إعدادات المدير (Super Admin) ===
  const ADMIN_EMAIL = 'mahmoud@thelab.com'; 

  // === حالات الفورمة ===
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false); 
  const [loading, setLoading] = useState(false);

  // === حالات لوحة المدير ===
  const [adminCodes, setAdminCodes] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');
  // 🌟 هنا السر: حالة عشان تنقل المدير بين لوحة التحكم والتطبيق 🌟
  const [viewMode, setViewMode] = useState('admin'); // 'admin' or 'coach'

  const isAdminEmail = email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.email === ADMIN_EMAIL) fetchAdminCodes();
  }, [session]);

  const fetchAdminCodes = async () => {
    const { data } = await supabase.from('invite_codes').select('*').order('created_at', { ascending: false });
    if (data) setAdminCodes(data);
  };

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
        // تسجيل دخول
        const { error } = await supabase.auth.signInWithPassword({ email: safeEmail, password });
        if (error) throw error;
      } else {
        // حساب جديد
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

  if (isAuthLoading) {
    return <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-blue-500"><FlaskConical size={48} className="animate-pulse" /></div>;
  }

  // === شاشة الدخول / التسجيل ===
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4" style={{ fontFamily: "'Tajawal', sans-serif", direction: "rtl" }}>
        <div className="w-full max-w-md bg-[#111827] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 opacity-10 rounded-full blur-3xl -z-10"></div>
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-900/30 border border-blue-500/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400">
              <FlaskConical size={32} />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">The Lab</h1>
            <p className="text-gray-400 text-sm">بوابة الدخول لمدربي النخبة</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-3.5 text-gray-500" size={20} />
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-xl py-3 pr-11 pl-4 outline-none focus:border-blue-500" placeholder="coach@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-3.5 text-gray-500" size={20} />
                <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#1f2937] border border-gray-700 text-white rounded-xl py-3 pr-11 pl-12 outline-none focus:border-blue-500" placeholder="••••••••" minLength="6" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-3.5 text-gray-400 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {!isLoginMode && !isAdminEmail && (
              <div className="animate-fade-in">
                <label className="block text-sm font-bold text-blue-400 mb-1">كود الدعوة (Invite Code)</label>
                <div className="relative">
                  <Key className="absolute right-3 top-3.5 text-blue-500" size={20} />
                  <input required={!isLoginMode && !isAdminEmail} type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} className="w-full bg-blue-900/10 border border-blue-800 text-white rounded-xl py-3 pr-11 pl-4 outline-none focus:border-blue-500 uppercase tracking-widest" placeholder="LAB-XXXXXX" />
                </div>
                <p className="text-xs text-gray-500 mt-2">مطلوب فقط للمدربين الجدد.</p>
              </div>
            )}

            <button disabled={loading} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 flex justify-center items-center gap-2 mt-6 transition-all">
              {loading ? 'جاري المعالجة...' : isLoginMode ? <><LogIn size={20} /> تسجيل الدخول</> : <><UserPlus size={20} /> إنشاء حساب</>}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-gray-800 pt-6">
            <button type="button" onClick={() => setIsLoginMode(!isLoginMode)} className="text-gray-400 hover:text-white text-sm font-bold transition-colors">
              {isLoginMode ? 'لا تملك حساباً؟ اضغط هنا للتسجيل' : 'لديك حساب بالفعل؟ سجل دخولك'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === لوحة تحكم المدير (Super Admin Dashboard) ===
  // 🌟 خلينا الشرط يتأكد إن المدير عايز يشوف لوحة التحكم مش التطبيق
  if (session.user.email === ADMIN_EMAIL && viewMode === 'admin') {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-gray-100 p-4 md:p-8" style={{ fontFamily: "'Tajawal', sans-serif", direction: "rtl" }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center bg-[#111827] p-6 rounded-3xl border border-blue-900/50 shadow-2xl mb-8">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-blue-500" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-white">لوحة تحكم The Lab</h1>
                <p className="text-sm text-gray-400">مرحباً بالمدير: {session.user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="px-5 py-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white rounded-xl font-bold flex items-center gap-2 transition-colors">
              <LogOut size={18} /> خروج
            </button>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-3xl p-6 shadow-xl mb-8">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Key className="text-emerald-500" /> إدارة أكواد الدعوة</h2>
              <button onClick={generateCode} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-transform hover:scale-105">
                <PlusCircle size={18} /> توليد كود جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminCodes.map(code => (
                <div key={code.code} className={`p-4 rounded-2xl border flex justify-between items-center ${code.is_used ? 'bg-gray-900/50 border-gray-800 opacity-50' : 'bg-[#1f2937] border-gray-700'}`}>
                  <div>
                    <p className="font-mono text-lg font-bold text-white tracking-widest">{code.code}</p>
                    <p className="text-xs mt-1 font-bold">{code.is_used ? <span className="text-red-400">تم الاستخدام 🔴</span> : <span className="text-emerald-400">متاح للاستخدام 🟢</span>}</p>
                  </div>
                  {!code.is_used && (
                    <button onClick={() => copyToClipboard(code.code)} className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors">
                      {copiedCode === code.code ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Copy size={20} />}
                    </button>
                  )}
                </div>
              ))}
              {adminCodes.length === 0 && <p className="text-gray-500 col-span-2 text-center py-8">لا توجد أكواد حالياً. قم بتوليد كود جديد.</p>}
            </div>
          </div>
          
          <div className="text-center mt-12">
             {/* 🌟 الزرار دلوقتي بيغير الحالة لـ coach بدل ما يعمل Refresh للصفحة 🌟 */}
             <button onClick={() => setViewMode('coach')} className="text-blue-500 hover:text-white underline transition-colors font-bold text-lg">الذهاب للتطبيق كمدرب</button>
          </div>
        </div>
      </div>
    );
  }

  // === التطبيق العادي للمدربين (وللمدير لو اختار يشوف التطبيق) ===
  return (
    <div className="relative">
      {/* زراير التحكم العائمة فوق على الشمال */}
      <div className="absolute top-4 left-4 z-50 flex gap-3">
        <button onClick={handleLogout} className="px-4 py-2 bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-800 rounded-xl text-sm font-bold flex items-center gap-2 backdrop-blur-md transition-all">
          <LogOut size={16} /> خروج
        </button>
        
        {/* زرار يرجع المدير للوحة التحكم لو هو اللي فاتح التطبيق */}
        {session?.user?.email === ADMIN_EMAIL && (
          <button onClick={() => setViewMode('admin')} className="px-4 py-2 bg-blue-900/40 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-800 rounded-xl text-sm font-bold flex items-center gap-2 backdrop-blur-md transition-all">
            <ShieldAlert size={16} /> لوحة التحكم
          </button>
        )}
      </div>
      
      <JumpCalculator />
    </div>
  );
}