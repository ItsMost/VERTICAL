import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { makeClient, LAB_KEY_STORAGE } from './supabaseClient';

const checkCode = async (code: string): Promise<boolean> => {
  const { data, error } = await makeClient(code).rpc('lab_key_ok');
  return !error && data === true;
};

export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'open' | 'locked'>('checking');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let saved = '';
    try { saved = localStorage.getItem(LAB_KEY_STORAGE) || ''; } catch { /* ignore */ }
    if (!saved) { setStatus('locked'); return; }
    checkCode(saved)
      .then(ok => setStatus(ok ? 'open' : 'locked'))
      .catch(() => setStatus('open')); // offline: keep the app open
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    const value = code.trim();
    if (await checkCode(value)) {
      try { localStorage.setItem(LAB_KEY_STORAGE, value); } catch { /* ignore */ }
      window.location.reload();
    } else {
      setMsg('الاسم غلط');
      setBusy(false);
    }
  };

  if (status === 'checking') return null;
  if (status === 'open') return <>{children}</>;

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4 bg-[#09090B] text-[#F4F4F5] font-arabic">
      <form onSubmit={submit} className="w-full max-w-sm bg-[#121215] border border-[#27272A] rounded-3xl p-6 space-y-4">
        <h1 className="text-xl font-black text-[#D4FF00] font-heading text-center">VERTICAL LAB</h1>
        <input required autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder="اكتب الاسم" value={code}
          onChange={e => setCode(e.target.value)}
          className="w-full bg-[#09090B] border border-[#27272A] rounded-xl p-3 text-sm outline-none focus:border-[#D4FF00] text-center font-mono" dir="ltr" />
        {msg && <p className="text-xs text-rose-400 text-center">{msg}</p>}
        <button disabled={busy} type="submit" className="w-full py-3 rounded-xl font-black text-sm bg-[#D4FF00] text-[#09090B] disabled:opacity-50 cursor-pointer">
          {busy ? '...' : 'دخول'}
        </button>
      </form>
    </div>
  );
}
