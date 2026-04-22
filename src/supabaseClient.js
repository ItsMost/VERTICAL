import { createClient } from '@supabase/supabase-js';

// 1. ضع رابط مشروعك في Supabase هنا بدلاً من هذا النص
const supabaseUrl = 'https://koakdlbwsjekmtiunfhr.supabase.co';

// 2. مفتاح الـ Anon الخاص بك (تم إضافته مباشرة كما طلبت)
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYWtkbGJ3c2pla210aXVuZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDEyNDUsImV4cCI6MjA4OTcxNzI0NX0.ZTXsET8hhtIebRmXiv1fHELmReGjVJlrq7HdlO9uWMI';

// إنشاء وتصدير الاتصال بقاعدة البيانات
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
