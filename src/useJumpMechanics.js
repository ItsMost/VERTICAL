import { useState, useEffect } from 'react';

export function useJumpMechanics(
  cameraFps,
  videoFps,
  takeoffTime,
  landingTime,
  bodyMass,
  legLength
) {
  // حالة مبدئية للنتائج (فاضية في البداية)
  const [stats, setStats] = useState({
    heightCm: '',
    heightInches: '',
    flightTime: '',
    takeoffVelocity: '',
    meanPower: '',
  });

  // الـ Hook ده بيشتغل تلقائياً أول ما تدوس تحليل أو الأرقام تتغير
  useEffect(() => {
    // التأكد إن الأوقات صحيحة ومنطقية (الهبوط بعد الإقلاع)
    if (takeoffTime > 0 && landingTime > takeoffTime) {
      // 1. حساب وقت الفيديو
      const videoTime = landingTime - takeoffTime;

      // 2. حساب وقت الطيران الحقيقي (لو الفيديو متصور Slow-Mo)
      // مثال: تصوير 240 فريم وعرض 30 فريم يعني الفيديو أبطأ 8 مرات
      const realFlightTime = videoTime * (videoFps / cameraFps);

      // 3. الثوابت الفيزيائية (Samozino & Bosco)
      const g = 9.81;
      const mass = parseFloat(bodyMass);
      const pushDistance = parseFloat(legLength) * 0.45; // مسافة الدفع التقريبية من طول الرجل

      // 4. الحسابات البيوميكانيكية
      // الارتفاع = (عجلة الجاذبية * مربع زمن الطيران) / 8
      const h_meters = (g * Math.pow(realFlightTime, 2)) / 8;
      const h_cm = h_meters * 100;
      const h_inches = h_cm / 2.54;

      // سرعة الإقلاع = (عجلة الجاذبية * زمن الطيران) / 2
      const v = (g * realFlightTime) / 2;

      // القوة المتوسطة والقدرة (Power)
      const meanForce = mass * g * (h_meters / pushDistance + 1);
      const power = meanForce * (v / 2);

      // 5. تحديث النتائج وتجهيزها للواجهة
      setStats({
        heightCm: h_cm.toFixed(2),
        heightInches: h_inches.toFixed(2),
        flightTime: realFlightTime.toFixed(3), // 3 أرقام عشرية للدقة
        takeoffVelocity: v.toFixed(2),
        meanPower: power.toFixed(2),
      });
    } else {
      // لو الأوقات لسة مش متحددة، نرجع المربعات فاضية
      setStats({
        heightCm: '',
        heightInches: '',
        flightTime: '',
        takeoffVelocity: '',
        meanPower: '',
      });
    }
  }, [cameraFps, videoFps, takeoffTime, landingTime, bodyMass, legLength]);

  return stats;
}
