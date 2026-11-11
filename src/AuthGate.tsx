import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    if (error) setMsg(error.message);
    else if (mode === 'signup') setMsg('تم إنشاء الحساب. لو وصلك إيميل تأكيد، أكده وبعدين سجّل دخول.');
    setBusy(false);
  };

  if (!ready) return null;
  if (session) return <>{children}</>;

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-[#09090B] text-[#F4F4F5] font-arabic">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#121215] border border-[#27272A] rounded-3xl p-6 space-y-4">
        <h1 className="text-xl font-black text-[#D4FF00] font-heading text-center">VERTICAL LAB</h1>
        <p className="text-xs text-zinc-400 text-center">{mode === 'login' ? 'تسجيل الدخول (مرة واحدة على كل جهاز)' : 'إنشاء الحساب'}</p>
        <input type="email" required autoComplete="email" placeholder="الإيميل" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full bg-[#09090B] border border-[#27272A] rounded-xl p-3 text-sm outline-none focus:border-[#D4FF00]" dir="ltr" />
        <input type="password" required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="كلمة السر" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full bg-[#09090B] border border-[#27272A] rounded-xl p-3 text-sm outline-none focus:border-[#D4FF00]" dir="ltr" />
        {msg && <p className="text-xs text-amber-400">{msg}</p>}
        <button disabled={busy} type="submit" className="w-full py-3 rounded-xl font-black text-sm bg-[#D4FF00] text-[#09090B] disabled:opacity-50 cursor-pointer">
          {busy ? '...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(''); }} className="w-full text-xs text-zinc-400 hover:text-white cursor-pointer">
          {mode === 'login' ? 'أول مرة؟ اعمل حساب' : 'عندي حساب، دخول'}
        </button>
      </form>
    </div>
  );
}
