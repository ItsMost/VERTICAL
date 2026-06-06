import { useState, useEffect } from 'react';

export function useJumpMechanics(
  cameraFps,
  videoFps,
  takeoffTime,
  landingTime,
  bodyMass,
  legLength,
  boxTouchdownTime = 0,
  landingCorrectionMs = 0,
  jumpType = 'cmj',
  boxHeight = 30,
  useManualFrameDuration = false,
  manualFrameDuration = 0.033
) {
  const [stats, setStats] = useState({
    heightCm: '',
    heightInches: '',
    flightTime: '',
    takeoffVelocity: '',
    meanPower: '',
    harmanPeakPower: '',
    harmanMeanPower: '',
    sayersPeakPower: '',
    pushAcceleration: '',
    pushDuration: '',
    contactTime: '',
    rsi: '',
  });

  useEffect(() => {
    if (takeoffTime > 0 && landingTime > takeoffTime) {
      // 1. Calculate time delta in video
      const videoTime = landingTime - takeoffTime;

      // 2. Adjust for camera/video speed (slow-motion ratio) and apply landing correction
      let rawFlightTime;
      if (useManualFrameDuration && manualFrameDuration > 0) {
        const flightFrames = videoTime * videoFps;
        rawFlightTime = flightFrames * manualFrameDuration;
      } else {
        rawFlightTime = videoTime * (videoFps / cameraFps);
      }
      const realFlightTime = Math.max(0.01, rawFlightTime - (parseFloat(landingCorrectionMs) || 0) / 1000);

      // 3. Physical Constants & Parameters
      const g = 9.81;
      const mass = parseFloat(bodyMass) || 70;
      
      // Sanity check: if leg length seems to be in cm (> 2), convert to meters
      let rawLeg = parseFloat(legLength) || 1.0;
      if (rawLeg > 2) rawLeg = rawLeg / 100;
      const pushDistance = rawLeg * 0.45; // Est. push-off displacement

      // 4. Biomechanical calculations
      // Jump height (Bosco flight time formula)
      const h_meters = (g * Math.pow(realFlightTime, 2)) / 8;
      const h_cm = h_meters * 100;
      const h_inches = h_cm / 2.54;

      // Takeoff Velocity (m/s)
      const v_takeoff = Math.sqrt(2 * g * h_meters);

      // Mean Force during takeoff (Samozino model)
      const meanForce = mass * g * (h_meters / pushDistance + 1);

      // Mean Power (Samozino model)
      const power = meanForce * (v_takeoff / 2);

      // Peak & Mean Power (Sayers and Harman empirical equations)
      const sayersPeak = 60.7 * h_cm + 45.3 * mass - 2055;
      const harmanPeak = 61.9 * h_cm + 36.0 * mass - 1822;
      const harmanMean = 21.2 * h_cm + 23.0 * mass - 1393;

      // Push-off dynamics
      const pushAcc = Math.pow(v_takeoff, 2) / (2 * pushDistance); // m/s^2
      const pushDur = (2 * pushDistance) / v_takeoff; // seconds

      // Drop Jump Calculations (RSI & Contact Time)
      let contactTimeSec = 0;
      let rsiVal = 0;
      if (jumpType === 'dj' && boxTouchdownTime > 0 && takeoffTime > boxTouchdownTime) {
        if (useManualFrameDuration && manualFrameDuration > 0) {
          const contactFrames = (takeoffTime - boxTouchdownTime) * videoFps;
          contactTimeSec = contactFrames * manualFrameDuration;
        } else {
          contactTimeSec = (takeoffTime - boxTouchdownTime) * (videoFps / cameraFps);
        }
        if (contactTimeSec > 0) {
          rsiVal = (h_cm / 100) / contactTimeSec; // RSI = height (m) / contact time (s)
        }
      }

      setStats({
        heightCm: h_cm.toFixed(2),
        heightInches: h_inches.toFixed(2),
        flightTime: realFlightTime.toFixed(3),
        takeoffVelocity: v_takeoff.toFixed(2),
        meanPower: power.toFixed(2),
        harmanPeakPower: Math.max(0, harmanPeak).toFixed(2),
        harmanMeanPower: Math.max(0, harmanMean).toFixed(2),
        sayersPeakPower: Math.max(0, sayersPeak).toFixed(2),
        pushAcceleration: pushAcc.toFixed(2),
        pushDuration: pushDur.toFixed(3),
        contactTime: contactTimeSec > 0 ? contactTimeSec.toFixed(3) : '',
        rsi: rsiVal > 0 ? rsiVal.toFixed(2) : '',
      });
    } else {
      setStats({
        heightCm: '',
        heightInches: '',
        flightTime: '',
        takeoffVelocity: '',
        meanPower: '',
        harmanPeakPower: '',
        harmanMeanPower: '',
        sayersPeakPower: '',
        pushAcceleration: '',
        pushDuration: '',
        contactTime: '',
        rsi: '',
      });
    }
  }, [cameraFps, videoFps, takeoffTime, landingTime, bodyMass, legLength, boxTouchdownTime, landingCorrectionMs, jumpType, boxHeight, useManualFrameDuration, manualFrameDuration]);

  return stats;
}
