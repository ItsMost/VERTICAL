/** Turns a Supabase / PostgREST / network error into a short Arabic message. */
export function supabaseErrorAr(err: unknown, action = 'العملية'): string {
  const e = (err ?? {}) as { code?: string; message?: string; status?: number };
  const code = e.code || '';
  const msg = String(e.message || err || '');
  if (/failed to fetch|network|load failed|fetch/i.test(msg)) return `مفيش اتصال بالإنترنت؛ ${action} ما اتمّتش. جرّب تاني.`;
  if (code === '42501' || /row-level security|permission denied/i.test(msg) || e.status === 401 || e.status === 403)
    return `${action} مرفوضة: كود الدخول غير صحيح أو مش متسجل. اقفل التطبيق وادخل بالكود تاني.`;
  if (code === '23514') return `${action} ما اتمّتش: قيمة غير مسموح بيها (مثلاً نوع اختبار غير معروف).`;
  if (code === '23505') return `${action} ما اتمّتش: السجل ده موجود بالفعل.`;
  if (code === '23503') return `${action} ما اتمّتش: اللاعب أو المدرب المرتبط مش موجود.`;
  if (code === '22P02' || code === '22003') return `${action} ما اتمّتش: في رقم مكتوب بشكل غلط.`;
  if (code === 'PGRST204') return `${action} ما اتمّتش: في عمود ناقص في قاعدة البيانات.`;
  return `${action} ما اتمّتش: خطأ في قاعدة البيانات${code ? ` (${code})` : ''}.`;
}
